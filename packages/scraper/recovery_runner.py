#!/usr/bin/env python3
"""Bounded Domain-first capture for the existing Qrent SQLite deployment."""
import argparse
import csv
import json
import logging
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlsplit

import requests

from src.config import ScraperConfig, TARGET_AREAS, settings
from src.models import PropertySource
from src.scrapers import DomainScraper, RealEstateScraper
from src.services.incremental import reuse_details
from src.services.sqlite_store import SQLiteStore
from src.utils.network import ProxyPool, TrafficBudget, set_run_budget

logger = logging.getLogger(__name__)
FACTORIES = {"domain": DomainScraper, "realestate": RealEstateScraper}
CITY_AREAS = {
    "sydney": list(dict.fromkeys(area for areas in TARGET_AREAS.values() for area in areas)),
    "melbourne": ["melbourne-vic-3000", "carlton-vic-3053", "parkville-vic-3052",
                  "north-melbourne-vic-3051", "southbank-vic-3006", "docklands-vic-3008",
                  "brunswick-vic-3056", "richmond-vic-3121", "clayton-vic-3168"],
}


def positive(value):
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cities", nargs="+", choices=list(CITY_AREAS), default=["sydney", "melbourne"])
    parser.add_argument("--areas", nargs="+", help="Explicit suburb-state-postcode slugs; overrides cities")
    parser.add_argument("--scrapers", nargs="+", choices=list(FACTORIES), default=list(FACTORIES))
    parser.add_argument("--pages", type=positive, default=1)
    parser.add_argument("--limit", type=positive, default=2000, help="Maximum unique listings per source and area")
    parser.add_argument("--detail-limit", type=positive, default=50, help="Maximum detail downloads per run")
    parser.add_argument("--no-details", action="store_true")
    parser.add_argument("--full-details", action="store_true", help="Disable detail reuse")
    parser.add_argument("--score", action="store_true", help="Score up to score-limit new descriptions")
    parser.add_argument("--score-limit", type=positive, default=5)
    parser.add_argument("--retries", type=int, choices=[0, 1], default=1)
    parser.add_argument("--db", type=Path, default=Path(__file__).parent / "output/properties.db")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "output")
    parser.add_argument("--max-requests", type=positive, default=int(os.getenv("SCRAPER_MAX_REQUESTS", "1000")))
    parser.add_argument("--proxy-bytes", type=positive, default=int(os.getenv("SCRAPER_MAX_PROXY_BYTES", "30000000")))
    parser.add_argument("--skip-proxy-check", action="store_true", help="Use only with a previously verified AU session")
    return parser


def verify_au_proxy(source, budget):
    proxy = ProxyPool(source).config()
    if not proxy:
        raise RuntimeError("An Australian proxy is required; configure PROXY_SERVER/USERNAME/PASSWORD")
    parsed = urlsplit(proxy["server"])
    credentials = ""
    if proxy.get("username"):
        credentials = quote(proxy["username"], safe="") + ":" + quote(proxy["password"], safe="") + "@"
    url = f"{parsed.scheme}://{credentials}{parsed.netloc}"
    with requests.Session() as session:
        session.trust_env = False
        budget.reserve("proxy")
        response = session.get("https://ipinfo.io/json", proxies={"http": url, "https": url}, timeout=20)
        budget.record("proxy", len(response.content) + 2048)
        response.raise_for_status()
        info = response.json()
        if info.get("country") != "AU":
            raise RuntimeError("Proxy exit country was not AU; capture stopped")
        return {key: info.get(key) for key in ("country", "region", "org")}


def write_csv(properties, path):
    rows = [prop.to_dict() for prop in properties]
    if not rows:
        return
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def capture(args, factories=None):
    factories = factories or FACTORIES
    args.output.mkdir(parents=True, exist_ok=True)
    tag = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    budget = TrafficBudget(max_requests=args.max_requests, max_proxy_bytes=args.proxy_bytes)
    set_run_budget(budget)
    os.environ["PROXY_SESSION"] = uuid.uuid4().hex[:12]
    result = {"run": tag, "status": "failed", "exit_code": 1, "listings": 0, "reused": 0,
              "detail_requests": 0, "details_failed": 0, "areas": [], "errors": [], "scored": 0}
    areas = args.areas or list(dict.fromkeys(area for city in args.cities for area in CITY_AREAS[city]))
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", area) for area in areas):
        result["errors"].append({"stage": "configuration", "error": "Invalid area slug"})
        return result
    store = None
    try:
        if not args.skip_proxy_check:
            result["exit"] = verify_au_proxy(args.scrapers[0], budget)
        store = SQLiteStore(args.db)
        references = [] if args.full_details else store.recent()
        collected = {}
        scoring = None
        if args.score:
            if not settings.scoring.api_key:
                raise RuntimeError("Scoring requested but no DashScope key is configured")
            from src.services.scoring import ScoringService
            scoring = ScoringService()
        # Domain has the first opportunity to provide complete data.
        sources = sorted(dict.fromkeys(args.scrapers), key=lambda source: source != "domain")
        for source in sources:
            for area in areas:
                if budget.exhausted:
                    result["errors"].append({"source": source, "area": area, "error": "Budget reached"})
                    break
                props = []
                item = {"source": source, "area": area, "count": 0, "reused": 0, "attempts": 0}
                for attempt in range(args.retries + 1):
                    item["attempts"] += 1
                    if attempt:
                        os.environ["PROXY_SESSION"] = uuid.uuid4().hex[:12]
                    scraper = factories[source](config=ScraperConfig(max_pages=args.pages),
                        profile_dir=str(args.output / "profiles" / f"{source}-{os.environ['PROXY_SESSION']}"))
                    try:
                        props = scraper.scrape_area(area)
                        # A nonempty prefix followed by an error is still incomplete.
                        if not props or getattr(scraper, "last_run_error", None):
                            raise RuntimeError("No valid listings or incomplete listing scan")
                        props = list({prop.house_id: prop for prop in props}.values())[:args.limit]
                        props = [prop for prop in props if (source, prop.house_id) not in collected]
                        if not args.full_details:
                            item["reused"] = reuse_details(props, references, allow_same_source=True)
                            result["reused"] += item["reused"]
                        remaining = max(0, args.detail_limit - result["detail_requests"])
                        details = [prop for prop in props if not prop.description_en][:remaining]
                        if not args.no_details and details:
                            result["detail_requests"] += len(details)
                            scraper.scrape_property_details(details, skip_existing=True)
                            result["details_failed"] += sum(not prop.description_en for prop in details)
                        if scoring:
                            to_score = [prop for prop in props if prop.description_en and not prop.average_score]
                            to_score = to_score[:max(0, args.score_limit - result["scored"])]
                            if to_score:
                                scoring.process_properties(to_score)
                                result["scored"] += sum(bool(prop.scores) for prop in to_score)
                        item.update(store.save(props))
                        item["count"] = len(props)
                        for prop in props:
                            collected[(source, prop.house_id)] = prop
                        references.extend(props)
                        write_csv(props, args.output / f"{tag}_{source}_{area}.csv")
                        break
                    except Exception as exc:
                        logger.error("%s %s attempt %s failed: %s", source, area, attempt + 1, type(exc).__name__)
                        if attempt == args.retries or budget.exhausted:
                            item["error"] = type(exc).__name__
                            result["errors"].append({"source": source, "area": area, "error": item["error"]})
                    finally:
                        if getattr(scraper, "browser", None):
                            scraper.browser.close()
                            scraper.browser = None
                result["areas"].append(item)
        result["listings"] = len(collected)
        if not result["errors"] and collected:
            result.update(status="success", exit_code=0)
        elif collected:
            result["status"] = "partial"
    except Exception as exc:
        result["errors"].append({"stage": "preflight", "error": type(exc).__name__})
        logger.error("Capture stopped: %s", type(exc).__name__)
    finally:
        if store:
            store.close()
        result["traffic"] = budget.snapshot()
        result["report"] = str(args.output / f"{tag}_result.json")
        Path(result["report"]).write_text(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = capture(build_parser().parse_args())
    print(json.dumps(result, ensure_ascii=False))
    return result["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
