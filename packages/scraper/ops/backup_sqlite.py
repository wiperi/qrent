#!/usr/bin/env python3
"""Make a consistent SQLite backup, including committed WAL transactions."""
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=True)
    target = args.directory / f"properties_{datetime.now():%Y%m%d}.db"
    with sqlite3.connect(f"{args.database.resolve().as_uri()}?mode=ro", uri=True) as source:
        with sqlite3.connect(target) as destination:
            source.backup(destination)
    target.chmod(0o600)
    print(target)


if __name__ == "__main__":
    main()
