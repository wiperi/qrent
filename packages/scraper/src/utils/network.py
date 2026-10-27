"""Bounded proxy sessions and resource routing for the property scrapers.

The session idea comes from /root/qrent-scraper's LycheeIP/gost deployment.
Provider credentials and targeting syntax are supplied through private env files.
"""
import os
import threading
import uuid
from dataclasses import dataclass, field
from urllib.parse import unquote, urlsplit

import requests


class BudgetExceeded(RuntimeError):
    pass


class ProxyPool:
    def __init__(self, source="realestate"):
        self.source = source
        self.session = os.getenv("PROXY_SESSION") or uuid.uuid4().hex[:12]
        self.server = os.getenv("PROXY_SERVER", "").strip()
        self.username = os.getenv("PROXY_USERNAME", "")
        self.password = os.getenv("PROXY_PASSWORD", "")
        self.country = os.getenv("PROXY_COUNTRY", "AU").upper()
        self.sources = os.getenv("PROXY_SOURCES", "realestate").split(",")
        if self.server:
            parsed = urlsplit(self.server)
            if parsed.scheme not in ("http", "https", "socks5") or not parsed.hostname:
                raise ValueError("PROXY_SERVER must be an HTTP(S) or SOCKS5 proxy URL")
            if self.country != "AU":
                raise ValueError("This deployment requires PROXY_COUNTRY=AU")
            self.username = self.username or unquote(parsed.username or "")
            self.password = self.password or unquote(parsed.password or "")
            host = parsed.hostname
            if ":" in host:
                host = f"[{host}]"
            self.server = f"{parsed.scheme}://{host}" + (f":{parsed.port}" if parsed.port else "")

    def config(self):
        if not self.server or self.source not in self.sources:
            return None
        config = {"server": self.server, "bypass": "localhost,127.0.0.1,[::1]"}
        if self.username:
            config["username"] = self.username.replace("{country}", "au").replace("{session}", self.session)
            config["password"] = self.password
        return config

    def rotate(self):
        self.session = uuid.uuid4().hex[:12]

    def __repr__(self):
        return f"ProxyPool(source={self.source!r}, country={self.country!r})"


def direct_headers(headers):
    allowed = {"accept", "accept-language", "user-agent"}
    return {k.lower(): v for k, v in headers.items() if k.lower() in allowed}


def target_hosts():
    hosts = {host.strip().lower().rstrip('.') for host in
             os.getenv("PROXY_TARGET_HOSTS", "realestate.com.au,domain.com.au").split(',') if host.strip()}
    sources = {source.strip() for source in os.getenv("PROXY_SOURCES", "realestate").split(',')}
    for source, suffix in (("realestate", "realestate.com.au"), ("domain", "domain.com.au")):
        if source not in sources:
            hosts = {host for host in hosts if host != suffix and not host.endswith('.' + suffix)}
    return hosts | {"www." + host for host in hosts if not host.startswith('www.')}


def resource_route(url, resource_type):
    if resource_type in {"image", "media", "font"}:
        return "block"
    # Same-origin bundles and the validation SDK are public downloads too.
    # Only documents and stateful validation/data requests need the AU session.
    if resource_type in {"script", "stylesheet"}:
        return "direct"
    hostname = (urlsplit(url).hostname or "").lower()
    if hostname.rstrip('.') in target_hosts():
        return "proxy"
    return "direct"


@dataclass
class TrafficBudget:
    max_requests: int = 1000
    max_proxy_bytes: int = 30_000_000
    requests: int = 0
    proxy_requests: int = 0
    direct_requests: int = 0
    proxy_bytes: int = 0
    direct_bytes: int = 0
    blocked: int = 0
    exhausted: bool = False
    proxy_wire_bytes: int = 0
    direct_wire_bytes: int = 0
    proxy_connections: int = 0
    direct_connections: int = 0
    _wire_hosts: dict = field(default_factory=dict, repr=False)
    _lock: object = field(default_factory=threading.Lock, repr=False, compare=False)

    def _check(self):
        if (self.exhausted or self.requests >= self.max_requests
                or max(self.proxy_bytes, self.proxy_wire_bytes) >= self.max_proxy_bytes):
            self.exhausted = True
            raise BudgetExceeded("Scraper network budget reached")

    def reserve(self, mode):
        with self._lock:
            self._check()
            self.requests += 1
            if mode == "proxy":
                self.proxy_requests += 1
            else:
                self.direct_requests += 1

    def record(self, mode, size):
        with self._lock:
            if mode == "proxy":
                self.proxy_bytes += max(0, size)
            else:
                self.direct_bytes += max(0, size)
            if self.proxy_bytes >= self.max_proxy_bytes:
                self.exhausted = True

    def reserve_connection(self, mode, host):
        with self._lock:
            if self.exhausted or max(self.proxy_bytes, self.proxy_wire_bytes) >= self.max_proxy_bytes:
                self.exhausted = True
                raise BudgetExceeded("Scraper network budget reached")
            if self.proxy_connections + self.direct_connections >= self.max_requests:
                self.exhausted = True
                raise BudgetExceeded("Scraper connection budget reached")
            name = mode + "_connections"
            setattr(self, name, getattr(self, name) + 1)
            entry = self._wire_hosts.setdefault((mode, host), {"mode": mode, "host": host,
                                                              "connections": 0, "bytes": 0})
            entry["connections"] += 1

    def record_wire(self, mode, host, size):
        with self._lock:
            name = mode + "_wire_bytes"
            setattr(self, name, getattr(self, name) + max(0, size))
            entry = self._wire_hosts.setdefault((mode, host), {"mode": mode, "host": host,
                                                              "connections": 0, "bytes": 0})
            entry["bytes"] += max(0, size)
            if self.proxy_wire_bytes >= self.max_proxy_bytes:
                self.exhausted = True

    def snapshot(self):
        with self._lock:
            result = {name: getattr(self, name) for name in self.__dataclass_fields__ if not name.startswith('_')}
            result["wire_hosts"] = [dict(entry) for entry in self._wire_hosts.values()]
            return result


_run_budget = None


def set_run_budget(budget):
    global _run_budget
    _run_budget = budget


def get_run_budget():
    global _run_budget
    if _run_budget is None:
        _run_budget = TrafficBudget(
            max_requests=int(os.getenv("SCRAPER_MAX_REQUESTS", "1000")),
            max_proxy_bytes=int(os.getenv("SCRAPER_MAX_PROXY_BYTES", "30000000")))
    return _run_budget


class NetworkPolicy:
    def __init__(self, proxied, budget=None):
        self.proxied = proxied
        self.budget = budget or get_run_budget()
        self.pending = {}
        self.direct = requests.Session()
        self.direct.trust_env = False

    def route(self, route):
        request = route.request
        mode = resource_route(request.url, request.resource_type)
        if mode == "block":
            self.budget.blocked += 1
            route.abort()
            return
        if not self.proxied:
            mode = "direct"
        try:
            self.budget.reserve(mode)
            if mode == "proxy" or not self.proxied:
                self.pending[request] = mode
                route.continue_()
                return
            # Independent, credential-free transport for public static resources.
            if request.method != "GET":
                route.abort()
                return
            with self.direct.get(request.url, headers=direct_headers(request.headers),
                                 timeout=8, stream=True, allow_redirects=False) as response:
                chunks = []
                size = 0
                for chunk in response.iter_content(65536):
                    size += len(chunk)
                    if size > 4_000_000:
                        raise ValueError("Static resource exceeds direct resource limit")
                    chunks.append(chunk)
                self.budget.record("direct", size)
                headers = {k: v for k, v in response.headers.items()
                           if k.lower() in {"content-type", "cache-control", "location", "vary",
                                            "access-control-allow-origin", "access-control-allow-credentials",
                                            "cross-origin-resource-policy", "etag", "last-modified"}}
                route.fulfill(status=response.status_code, headers=headers, body=b"".join(chunks))
        except (requests.RequestException, ValueError, BudgetExceeded):
            # Never retry a failed static download through the paid proxy.
            self.budget.blocked += 1
            route.abort()

    def finished(self, request):
        mode = self.pending.pop(request, None)
        if mode:
            try:
                self.budget.record(mode, sum(request.sizes().values()))
            except Exception:
                # Account conservatively if Chromium cannot provide wire sizes.
                self.budget.record(mode, 65536)

    def failed(self, request):
        mode = self.pending.pop(request, None)
        if mode:
            self.budget.record(mode, 1024)

    def close(self):
        self.direct.close()
