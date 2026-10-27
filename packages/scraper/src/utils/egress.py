"""Loopback HTTP/CONNECT routing for page and browser-background connections.

TLS stays between the browser and origin. Only configured site hosts and small
IP checks use the residential upstream; updates, addons and CDNs connect directly.
"""
import asyncio
import base64
import threading
from urllib.parse import urlsplit, urlunsplit

from .network import target_hosts


IP_CHECK_HOSTS = {"api.ipify.org", "checkip.amazonaws.com", "ipinfo.io", "icanhazip.com",
                  "ifconfig.co", "ipecho.net", "ip-api.com"}


class EgressProxy:
    def __init__(self, upstream, budget, paid_hosts=None):
        self.upstream = upstream
        self.budget = budget
        self.paid_hosts = set(paid_hosts) if paid_hosts is not None else target_hosts() | IP_CHECK_HOSTS
        self.endpoint = urlsplit(upstream["server"])
        if self.endpoint.scheme not in {"http", "https"}:
            raise ValueError("Browser egress routing requires an HTTP(S) upstream proxy")
        self.loop = None
        self.thread = None
        self.server = None
        self.port = None
        self.clients = set()
        self.writers = set()
        self.closing = False

    def __enter__(self):
        ready = threading.Event()
        errors = []
        self.loop = asyncio.SelectorEventLoop()

        async def start():
            self.server = await asyncio.start_server(self._accept, "127.0.0.1", 0, limit=16384)
            self.port = self.server.sockets[0].getsockname()[1]

        def run():
            asyncio.set_event_loop(self.loop)
            try:
                self.loop.run_until_complete(start())
            except Exception as exc:
                errors.append(type(exc).__name__)
            finally:
                ready.set()
            if not errors:
                self.loop.run_forever()
            self.loop.run_until_complete(self._stop())
            self.loop.close()

        self.thread = threading.Thread(target=run, name="qrent-egress", daemon=True)
        self.thread.start()
        if not ready.wait(10) or errors:
            raise RuntimeError("Unable to start local egress routing")
        return self

    def browser_config(self):
        return {"server": f"http://127.0.0.1:{self.port}", "bypass": "localhost,127.0.0.1,[::1]"}

    def _accept(self, reader, writer):
        if self.closing:
            writer.transport.abort()
            return
        self.writers.add(writer)
        task = self.loop.create_task(self._handle(reader, writer))
        self.clients.add(task)
        task.add_done_callback(self.clients.discard)

    async def _close_stream(self, writer):
        writer.close()
        try:
            await asyncio.wait_for(writer.wait_closed(), 1)
        except (Exception, asyncio.CancelledError):
            writer.transport.abort()
        finally:
            self.writers.discard(writer)

    def _authorization(self):
        if not self.upstream.get("username"):
            return b""
        token = base64.b64encode((self.upstream["username"] + ":" + self.upstream.get("password", "")).encode())
        return b"Proxy-Authorization: Basic " + token + b"\r\n"

    async def _pipe(self, reader, writer, mode, host):
        while not (mode == "proxy" and self.budget.exhausted):
            data = await asyncio.wait_for(reader.read(16384), 60)
            if not data:
                break
            self.budget.record_wire(mode, host, len(data))
            writer.write(data)
            await writer.drain()

    async def _relay(self, reader, writer, upstream, remote, mode, host):
        tasks = [asyncio.create_task(self._pipe(reader, remote, mode, host)),
                 asyncio.create_task(self._pipe(upstream, writer, mode, host))]
        try:
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _handle(self, reader, writer):
        remote = None
        established = False
        try:
            head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 15)
            lines = head.split(b"\r\n")
            method, target, version = lines[0].decode("ascii").split()
            parsed = urlsplit("//" + target) if method == "CONNECT" else urlsplit(target)
            if (not parsed.hostname or parsed.username is not None or parsed.password is not None
                    or (method != "CONNECT" and parsed.scheme != "http")):
                raise ValueError("Invalid proxy target")
            host = parsed.hostname.lower().rstrip('.')
            port = parsed.port or (443 if method == "CONNECT" else 80)
            if not 0 < port <= 65535:
                raise ValueError("Invalid proxy port")
            mode = "proxy" if host in self.paid_hosts else "direct"
            self.budget.reserve_connection(mode, host)
            if mode == "proxy":
                upstream, remote = await asyncio.wait_for(asyncio.open_connection(
                    self.endpoint.hostname, self.endpoint.port or (443 if self.endpoint.scheme == "https" else 80),
                    ssl=True if self.endpoint.scheme == "https" else None, limit=16384), 15)
            else:
                upstream, remote = await asyncio.wait_for(asyncio.open_connection(host, port, limit=16384), 15)
            self.writers.add(remote)

            if method == "CONNECT":
                if mode == "proxy":
                    payload = (f"CONNECT {target} HTTP/1.1\r\nHost: {target}\r\n".encode()
                               + self._authorization() + b"\r\n")
                    remote.write(payload)
                    await remote.drain()
                    self.budget.record_wire(mode, host, len(payload))
                    reply = await asyncio.wait_for(upstream.readuntil(b"\r\n\r\n"), 15)
                    self.budget.record_wire(mode, host, len(reply))
                    if reply.split(b"\r\n", 1)[0].split()[1] != b"200":
                        raise ConnectionError("Upstream proxy rejected tunnel")
                writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                await writer.drain()
                established = True
            else:
                path = target if mode == "proxy" else urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
                payload = f"{method} {path} {version}\r\n".encode()
                payload += b"\r\n".join(line for line in lines[1:] if line and
                    line.split(b":", 1)[0].lower() not in {b"proxy-authorization", b"proxy-connection", b"connection"})
                payload += b"\r\nConnection: close\r\n"
                if mode == "proxy":
                    payload += self._authorization()
                payload += b"\r\n"
                remote.write(payload)
                await remote.drain()
                self.budget.record_wire(mode, host, len(payload))
                established = True
            await self._relay(reader, writer, upstream, remote, mode, host)
        except Exception:
            if not established:
                try:
                    writer.write(b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                    await writer.drain()
                except (OSError, ConnectionError):
                    pass
        finally:
            await asyncio.gather(*(self._close_stream(stream) for stream in (writer, remote) if stream))

    async def _stop(self):
        self.closing = True
        if self.server:
            # Stop accepting without closing Server yet. In Python 3.11,
            # a pending accept task must still be able to attach its transport.
            for listener in self.server.sockets:
                self.loop.remove_reader(listener.fileno())
        tasks = list(self.clients)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        # Pending asyncio accept tasks must run, not be cancelled before their
        # first step: they still own raw sockets. The closing accept callback
        # aborts their transports as soon as ownership has been established.
        pending = asyncio.all_tasks(self.loop) - {asyncio.current_task()}
        await asyncio.gather(*pending, return_exceptions=True)
        if self.server:
            self.server.close()
            await self.server.wait_closed()
        await asyncio.gather(*(self._close_stream(stream) for stream in list(self.writers)))
        await asyncio.sleep(0)  # Deliver transport-close callbacks before loop.close().

    def close(self):
        if self.loop is None or self.loop.is_closed():
            return
        future = asyncio.run_coroutine_threadsafe(self._stop(), self.loop)
        try:
            future.result(timeout=5)
        finally:
            self.loop.call_soon_threadsafe(self.loop.stop)
            self.thread.join(timeout=5)

    def __exit__(self, *args):
        self.close()
