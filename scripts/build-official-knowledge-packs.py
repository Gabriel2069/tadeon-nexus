#!/usr/bin/env python3
"""Validate the single canonical Tadeon Nexus archive.

The former thematic projections duplicated the same pages. The current public
contract intentionally exposes one lossless archive until the source books are
reprocessed and enriched.
"""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
PACKS_DIR = ROOT / "public" / "nexus-packs"
CANONICAL_PACK = PACKS_DIR / "tadeon-nexus-canonico-atual.zip"


def main() -> None:
    with ZipFile(CANONICAL_PACK) as source:
        manifest = json.loads(source.read("manifest.yaml"))
        paths = set(source.namelist())
        missing = [
            page["path"] for page in manifest["pages"] if page["path"] not in paths
        ]
        keys = {page["key"] for page in manifest["pages"]}
        broken = [
            relation
            for relation in manifest["relations"]
            if relation["source_key"] not in keys or relation["target_key"] not in keys
        ]
        if missing or broken:
            raise SystemExit(
                f"Pacote inválido: {len(missing)} páginas ausentes, "
                f"{len(broken)} relações quebradas."
            )
        print(
            f"{CANONICAL_PACK.name}: {len(manifest['pages'])} páginas, "
            f"{len(manifest['relations'])} relações, sem perdas."
        )


if __name__ == "__main__":
    main()
