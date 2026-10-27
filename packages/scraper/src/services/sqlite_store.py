"""SQLite sink compatible with the recovered Qrent server schema.

Source: /root/qrent-scraper/pipeline_runner.py, recovered 2026-10-27.
Partial or failed crawls never deactivate listings.
"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path

from ..models import PropertyData, PropertySource


FIELDS = ("house_id", "source", "price_per_week", "address_line1", "address_line2", "suburb", "state",
          "postcode", "bedroom_count", "bathroom_count", "parking_count", "property_type",
          "property_type_raw", "description_en", "description_cn", "keywords", "url", "thumbnail_url",
          "available_date", "published_at", "scraped_at")


class SQLiteStore:
    def __init__(self, path):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        self.connection.execute("PRAGMA journal_mode=WAL")
        definitions = ", ".join(f"{name} " + ("INTEGER" if name in {
            "price_per_week", "bedroom_count", "bathroom_count", "parking_count", "property_type"}
            else "TEXT") for name in FIELDS)
        self.connection.execute(f"CREATE TABLE IF NOT EXISTS properties (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                f"{definitions}, updated_at TEXT, is_active INTEGER DEFAULT 1, "
                                "UNIQUE(house_id, source))")
        self.connection.execute("CREATE TABLE IF NOT EXISTS property_enrichment (house_id TEXT, source TEXT, "
                                "payload TEXT NOT NULL, PRIMARY KEY(house_id, source))")
        self.connection.commit()

    def save(self, properties):
        stats = {"inserted": 0, "updated": 0}
        updates = []
        for name in FIELDS[2:]:
            expression = f"excluded.{name}"
            if name in {"description_en", "description_cn", "keywords", "thumbnail_url", "available_date"}:
                expression = f"COALESCE(NULLIF(excluded.{name}, ''), properties.{name})"
            updates.append(f"{name} = {expression}")
        sql = (f"INSERT INTO properties ({','.join(FIELDS)},updated_at,is_active) "
               f"VALUES ({','.join('?' for _ in range(len(FIELDS)+1))},1) "
               f"ON CONFLICT(house_id,source) DO UPDATE SET {','.join(updates)}, "
               "updated_at=excluded.updated_at,is_active=1")
        with self.connection:
            for prop in properties:
                data = prop.to_dict()
                existing = self.connection.execute(
                    "SELECT 1 FROM properties WHERE house_id=? AND source=?",
                    (prop.house_id, prop.source.value)).fetchone()
                values = [data[name].isoformat() if isinstance(data[name], datetime) else data[name]
                          for name in FIELDS]
                self.connection.execute(sql, values + [datetime.now().isoformat()])
                previous = self.connection.execute(
                    "SELECT payload FROM property_enrichment WHERE house_id=? AND source=?",
                    (prop.house_id, prop.source.value)).fetchone()
                if previous:
                    old = json.loads(previous[0])
                    for name in ("description_en", "description_cn", "keywords", "thumbnail_url",
                                 "available_date", "average_score", "scores"):
                        if not data.get(name) and old.get(name):
                            data[name] = old[name]
                    data["commute_times"] = {**old.get("commute_times", {}), **data.get("commute_times", {})}
                self.connection.execute("INSERT OR REPLACE INTO property_enrichment VALUES (?,?,?)",
                                        (prop.house_id, prop.source.value, json.dumps(data, default=str)))
                stats["updated" if existing else "inserted"] += 1
        return stats

    def recent(self, days=7):
        result = []
        cutoff = datetime.now().timestamp() - days * 86400
        for (payload,) in self.connection.execute("SELECT payload FROM property_enrichment"):
            data = json.loads(payload)
            for name in ("scraped_at", "published_at", "available_date"):
                if data.get(name):
                    try:
                        data[name] = datetime.fromisoformat(data[name])
                    except ValueError:
                        if name == "scraped_at":
                            data[name] = datetime.min
            if isinstance(data.get("scraped_at"), datetime) and data["scraped_at"].timestamp() >= cutoff:
                result.append(PropertyData.from_dict(data))
        return result

    def close(self):
        self.connection.close()
