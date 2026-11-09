"""Read one public Domain search page through the production server's network."""

import asyncio
from contextlib import closing
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
from tempfile import TemporaryDirectory
import time
from urllib.parse import urlsplit

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


async def inspect_page(proxy, profile):
    from playwright.async_api import Error, async_playwright

    result = {"status": "browser_unavailable", "requests": 0, "explicit_navigations": 0, "document_statuses": []}
    browser = shutil.which("google-chrome")
    if not browser:
        return result
    result["browser"] = subprocess.check_output([browser, "--version"], text=True).strip()
    try:
        async with async_playwright() as driver:
            context = await driver.chromium.launch_persistent_context(
                profile, executable_path=browser, headless=False, no_viewport=True,
                service_workers="allow", proxy={"server": proxy}, timeout=9000,
            )
            stop = None

            def observe_request(_request):
                nonlocal stop
                result["requests"] += 1
                if result["requests"] == REQUEST_LIMIT:
                    stop = asyncio.create_task(context.close())

            page = context.pages[0]

            def observe_response(response):
                if (response.request.is_navigation_request() and response.frame == page.main_frame
                        and urlsplit(response.url).hostname == "www.domain.com.au"):
                    if len(result["document_statuses"]) < 8:
                        result["document_statuses"].append(response.status)

            context.on("request", observe_request)
            page.on("response", observe_response)
            try:
                result["explicit_navigations"] = 1
                response = await page.goto(URL, timeout=15000, wait_until="commit")
                result["http"] = response.status if response else None
                server = await response.header_value("server") if response else None
                result["akamai"] = "akamaighost" in (server or "").lower()
                result["status"] = "upstream_response_unavailable"
                if not response or response.status != 200:
                    return result
                await page.wait_for_selector('li[data-testid^="listing-"]', state="attached", timeout=14000)
                matches = await page.evaluate(r"""() => {
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
            except Error:
                if not page.is_closed():
                    try:
                        result["document_state"] = await asyncio.wait_for(
                            page.evaluate("document.readyState"), timeout=1.5
                        )
                    except (Error, TimeoutError):
                        pass
                raise
            finally:
                if stop is None:
                    await context.close()
                else:
                    await stop
    except Error as error:
        result["status"] = "native_page_did_not_verify_listings"
        result["error_type"] = type(error).__name__
        if "ERR_SOCKS_CONNECTION" in str(error):
            result["status"] = "domain_connection_through_forward_failed"
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
                    result = asyncio.run(inspect_page(f"socks5://127.0.0.1:{port}", Path(directory) / "profile"))
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
