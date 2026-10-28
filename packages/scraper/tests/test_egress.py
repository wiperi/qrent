import base64
import socket
import socketserver
import sys
import threading
import unittest
import warnings
import gc
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class Origin(socketserver.StreamRequestHandler):
    def handle(self):
        head = self.rfile.readline()
        while True:
            line = self.rfile.readline()
            head += line
            if line in (b"\r\n", b""):
                break
        self.server.requests.append(head)
        self.wfile.write(b"HTTP/1.1 200 OK\r\nContent-Length: 6\r\nConnection: close\r\n\r\nDIRECT")


class PaidProxy(socketserver.StreamRequestHandler):
    def handle(self):
        head = self.rfile.readline()
        while True:
            line = self.rfile.readline()
            head += line
            if line in (b"\r\n", b""):
                break
        self.server.requests.append(head)
        if head.startswith(b"CONNECT "):
            self.wfile.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            self.wfile.flush()
            payload = self.rfile.read(4)
            self.wfile.write(b"PAID:" + payload)
        else:
            self.wfile.write(b"HTTP/1.1 200 OK\r\nContent-Length: 4\r\nConnection: close\r\n\r\nPAID")


class EgressTests(unittest.TestCase):
    def setUp(self):
        self.servers = []
        for handler in (Origin, PaidProxy):
            server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
            server.daemon_threads = True
            server.requests = []
            threading.Thread(target=server.serve_forever, daemon=True).start()
            self.servers.append(server)
        self.origin, self.paid = self.servers

    def tearDown(self):
        for server in self.servers:
            server.shutdown()
            server.server_close()

    def gateway(self, hosts=None, budget=None):
        from src.utils.egress import EgressProxy
        from src.utils.network import TrafficBudget
        return EgressProxy({"server": f"http://127.0.0.1:{self.paid.server_address[1]}",
                            "username": "customer", "password": "private"},
                           budget or TrafficBudget(), paid_hosts=hosts or {"www.realestate.com.au"})

    def test_background_connect_uses_ordinary_network_and_no_upstream_credentials(self):
        with self.gateway() as gateway:
            with socket.create_connection(("127.0.0.1", gateway.port), timeout=3) as client:
                host = f"127.0.0.1:{self.origin.server_address[1]}"
                client.sendall(f"CONNECT {host} HTTP/1.1\r\nHost: {host}\r\n\r\n".encode())
                self.assertIn(b"200", client.recv(4096))
                client.sendall(b"GET /filters HTTP/1.1\r\nHost: localhost\r\n\r\n")
                response = client.recv(4096)
                self.assertIn(b"DIRECT", response)
            self.assertEqual(self.paid.requests, [])
            self.assertNotIn(b"Proxy-Authorization", self.origin.requests[0])
        port = gateway.port
        with self.assertRaises(OSError):
            socket.create_connection(("127.0.0.1", port), timeout=0.2)

    def test_protected_connect_authenticates_upstream_and_counts_wire_bytes(self):
        from src.utils.network import TrafficBudget
        budget = TrafficBudget()
        with self.gateway(budget=budget) as gateway:
            with socket.create_connection(("127.0.0.1", gateway.port), timeout=3) as client:
                client.sendall(b"CONNECT www.realestate.com.au:443 HTTP/1.1\r\nHost: www.realestate.com.au:443\r\n\r\n")
                self.assertIn(b"200", client.recv(4096))
                client.sendall(b"PING")
                self.assertEqual(client.recv(4096), b"PAID:PING")
        authorization = base64.b64encode(b"customer:private")
        self.assertIn(b"Proxy-Authorization: Basic " + authorization, self.paid.requests[0])
        self.assertGreaterEqual(budget.snapshot()["proxy_wire_bytes"], 13)
        self.assertEqual(self.origin.requests, [])

    def test_http_background_request_is_direct_and_strips_proxy_authentication(self):
        with self.gateway() as gateway:
            with socket.create_connection(("127.0.0.1", gateway.port), timeout=3) as client:
                authority = f"127.0.0.1:{self.origin.server_address[1]}"
                client.sendall(f"GET http://{authority}/filters HTTP/1.1\r\nHost: {authority}\r\nProxy-Authorization: Basic private\r\n\r\n".encode())
                self.assertIn(b"DIRECT", client.recv(4096))
        self.assertTrue(self.origin.requests[0].startswith(b"GET /filters HTTP/1.1"))
        self.assertNotIn(b"Proxy-Authorization", self.origin.requests[0])
        self.assertEqual(self.paid.requests, [])

    def test_exhausted_wire_budget_does_not_open_paid_connection(self):
        from src.utils.network import TrafficBudget
        budget = TrafficBudget(max_proxy_bytes=10)
        budget.record_wire("proxy", "www.realestate.com.au", 10)
        with self.gateway(budget=budget) as gateway:
            with socket.create_connection(("127.0.0.1", gateway.port), timeout=3) as client:
                client.sendall(b"CONNECT www.realestate.com.au:443 HTTP/1.1\r\nHost: www.realestate.com.au:443\r\n\r\n")
                self.assertIn(b"502", client.recv(4096))
        self.assertEqual(self.paid.requests, [])

    def test_close_drops_just_accepted_connections(self):
        with warnings.catch_warnings(record=True) as recorded:
            warnings.simplefilter("always", ResourceWarning)
            for _ in range(12):
                gateway = self.gateway().__enter__()
                client = socket.create_connection(("127.0.0.1", gateway.port), timeout=0.3)
                try:
                    gateway.close()
                    try:
                        self.assertEqual(client.recv(1), b"")
                    except ConnectionResetError:
                        pass
                    self.assertFalse(gateway.thread.is_alive())
                finally:
                    client.close()
                    gateway.close()
                gc.collect()
            self.assertFalse([warning for warning in recorded if warning.category is ResourceWarning])


if __name__ == "__main__":
    unittest.main()
