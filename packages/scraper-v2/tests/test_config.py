# tests/test_config.py - Validates configuration loading and parsing
from __future__ import annotations

from pathlib import Path

from scraper_v2.config import load_config


def test_load_config(tmp_path: Path) -> None:
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        """
version: "2.0"
global:
  max_concurrent_spiders: 2
sites: []
""",
        encoding="utf-8",
    )
    config = load_config(config_file)
    assert config.version == "2.0"
    assert config.global_.max_concurrent_spiders == 2
