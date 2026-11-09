"""Read one public Domain search page through the production server's network."""

from contextlib import closing
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
from tempfile import TemporaryDirectory
import time

from notify_rental_alerts import NotificationError, RemoteStore


URL = "https://www.domain.com.au/rent/newtown-nsw-2042/?excludedeposittaken=1"
REQUEST_LIMIT = 450


def wait_for_forward(process, port):
    for _ in range(60):
        if process.poll() is not None:
            return False
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def inspect_page(proxy, profile):
    from playwright.sync_api import Error, sync_playwright

    result = {"status": "browser_unavailable", "requests": 0, "explicit_navigations": 0}
    browser = shutil.which("google-chrome")
    if not browser:
        return result
    result["browser"] = subprocess.check_output([browser, "--version"], text=True).strip()
    try:
        with sync_playwright() as driver, driver.chromium.launch_persistent_context(
            profile, executable_path=browser, headless=False, no_viewport=True,
            service_workers="block", proxy={"server": proxy}, timeout=9000,
        ) as context:
            def count_request(route):
                if result["requests"] >= REQUEST_LIMIT:
                    route.abort()
                    return
                result["requests"] += 1
                route.continue_()

            context.route("**/*", count_request)
            page = context.pages[0]
            result["explicit_navigations"] = 1
            response = page.goto(URL, timeout=18000, wait_until="domcontentloaded")
            result["http"] = response.status if response else None
            result["akamai"] = bool(response and "akamaighost" in (response.header_value("server") or "").lower())
            result["status"] = "upstream_response_unavailable"
            if not response or response.status != 200:
                return result
            page.wait_for_selector('li[data-testid^="listing-"]', state="attached", timeout=7500)
            matches = page.evaluate(r"""() => {
                const source = document.querySelector('#__NEXT_DATA__');
                if (!source) return 0;
                const props = JSON.parse(source.textContent).props?.pageProps?.componentProps;
                const ids = new Set((props?.listingSearchResultIds || []).map(String));
                const cards = document.querySelectorAll('li[data-testid^="listing-"]');
                const matching = [...cards].flatMap(card => [
                    card.dataset.testid.match(/^listing-(\d{7,12})$/)?.[1],
                    ...[...card.querySelectorAll('a[href]')].map(link => {
                        const url = new URL(link.href);
                        return url.hostname === 'www.domain.com.au' ? url.pathname.match(/-(\d{7,12})\/?$/)?.[1] : null;
                    }),
                ]).filter(id => ids.has(id));
                return new Set(matching).size;
            }""")
            result["matched_listing_ids"] = matches
            result["status"] = "verified_listings" if matches and page.url.startswith(
                "https://www.domain.com.au/rent/newtown-nsw-2042/"
            ) else "listing_identity_unverified"
    except Error as error:
        result["status"] = (
            "domain_connection_through_forward_failed" if "ERR_SOCKS_CONNECTION" in str(error)
            else "browser_did_not_verify_listings"
        )
    return result


def main():
    os.umask(0o077)
    with TemporaryDirectory(prefix="qrent-domain-ssh-") as directory:
        try:
            remote = RemoteStore(directory)
        except NotificationError:
            print(json.dumps({"status": "production_ssh_configuration_unavailable"}))
            return
        for name in ("DEPLOY_SERVER_HOST", "DEPLOY_SERVER_USERNAME", "DEPLOY_SERVER_PASSWORD"):
            os.environ.pop(name, None)
        with closing(socket.socket()) as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        options, host = remote.command[:-1], remote.command[-1]
        options[options.index("ClearAllForwardings=yes")] = "ClearAllForwardings=no"
        command = [*options, "-N", "-o", "ExitOnForwardFailure=yes", "-D", f"127.0.0.1:{port}", host]
        with subprocess.Popen(
            command, env=remote.environment, stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        ) as forward:
            try:
                if not wait_for_forward(forward, port):
                    result = {"status": "temporary_ssh_forward_unavailable"}
                else:
                    result = inspect_page(f"socks5://127.0.0.1:{port}", Path(directory) / "profile")
                print(json.dumps(result), flush=True)
            finally:
                if forward.poll() is None:
                    forward.terminate()
                    try:
                        forward.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        forward.kill()


if __name__ == "__main__":
    main()
