import os
import sys
import unittest
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class NetworkTests(unittest.TestCase):
    def test_sticky_session_and_explicit_rotation_keep_australian_targeting(self):
        from src.utils.network import ProxyPool
        with patch.dict(os.environ, {"PROXY_SERVER": "http://proxy.example:9000",
                                    "PROXY_USERNAME": "customer-country-{country}-session-{session}",
                                    "PROXY_PASSWORD": "secret", "PROXY_COUNTRY": "AU"}, clear=True):
            pool = ProxyPool("realestate")
            first = pool.config()
            self.assertEqual(pool.config(), first)
            pool.rotate()
            self.assertNotEqual(pool.config()["username"], first["username"])
            self.assertIn("country-au-", pool.config()["username"])
            self.assertNotIn("secret", repr(pool))

    def test_media_are_blocked_and_third_party_scripts_are_direct(self):
        from src.utils.network import resource_route
        self.assertEqual(resource_route("https://www.realestate.com.au/photo.jpg", "image"), "block")
        self.assertEqual(resource_route("https://cdn.example/app.js", "script"), "direct")
        self.assertEqual(resource_route("https://www.realestate.com.au/rent/", "document"), "proxy")
        self.assertEqual(resource_route("https://www.realestate.com.au.evil.test/x", "script"), "direct")

    def test_same_origin_scripts_are_direct_but_documents_and_validation_stay_proxied(self):
        from src.utils.network import resource_route
        for path in ("/static/js/app.js", "/challenge/session/ips.js"):
            self.assertEqual(resource_route("https://www.realestate.com.au" + path, "script"), "direct")
        self.assertEqual(resource_route("https://www.realestate.com.au/app.css", "stylesheet"), "direct")
        self.assertEqual(resource_route("https://www.realestate.com.au/rent/in-2042/list-1", "document"), "proxy")
        self.assertEqual(resource_route("https://www.realestate.com.au/challenge/tl", "xhr"), "proxy")
        self.assertEqual(resource_route("https://www.realestate.com.au/challenge/r", "fetch"), "proxy")
        self.assertEqual(resource_route("https://csp.sec-team.realestate.com.au/report", "fetch"), "direct")

    def test_domain_hosts_stay_direct_when_only_realestate_is_enabled(self):
        from src.utils.network import resource_route, ProxyPool
        with patch.dict(os.environ, {"PROXY_SOURCES": "realestate",
                                    "PROXY_TARGET_HOSTS": "realestate.com.au,domain.com.au"}, clear=True):
            self.assertEqual(resource_route("https://www.domain.com.au/rent/", "document"), "direct")
            self.assertEqual(resource_route("https://www.realestate.com.au/rent/", "document"), "proxy")
            self.assertIsNone(ProxyPool("domain").config())

    def test_static_direct_request_drops_sensitive_headers(self):
        from src.utils.network import direct_headers
        headers = direct_headers({"Cookie": "session=private", "Authorization": "Bearer private",
                                  "Proxy-Authorization": "Basic private", "Accept": "text/css",
                                  "User-Agent": "Test", "Referer": "https://example/?secret=private"})
        self.assertEqual(headers, {"accept": "text/css", "user-agent": "Test"})

    def test_budget_stops_new_requests_after_limit_or_response_bytes(self):
        from src.utils.network import TrafficBudget, BudgetExceeded
        budget = TrafficBudget(max_requests=2, max_proxy_bytes=100)
        budget.reserve("proxy")
        budget.reserve("direct")
        with self.assertRaises(BudgetExceeded):
            budget.reserve("proxy")
        budget = TrafficBudget(max_requests=10, max_proxy_bytes=100)
        budget.record("proxy", 100)
        with self.assertRaises(BudgetExceeded):
            budget.reserve("proxy")
        self.assertEqual(budget.snapshot()["proxy_bytes"], 100)

    def test_direct_cdn_script_keeps_cors_without_set_cookie(self):
        from src.utils.network import NetworkPolicy, TrafficBudget
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Set-Cookie", "private=value")
                self.end_headers()
                self.wfile.write(b"window.app=true")
            def log_message(self, *args): pass
        server = HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        class Route:
            request = SimpleNamespace(url=f"http://127.0.0.1:{server.server_port}/app.js",
                resource_type="script", method="GET", headers={"Cookie": "user=secret"})
            def fulfill(self, **kwargs): self.result = kwargs
            def abort(self): raise AssertionError("Direct script should load")
        policy = NetworkPolicy(proxied=True, budget=TrafficBudget())
        try:
            route = Route()
            policy.route(route)
            self.assertEqual(route.result["body"], b"window.app=true")
            headers = {k.lower():v for k,v in route.result["headers"].items()}
            self.assertEqual(headers.get("access-control-allow-origin"), "*")
            self.assertNotIn("set-cookie", headers)
        finally:
            policy.close()
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
