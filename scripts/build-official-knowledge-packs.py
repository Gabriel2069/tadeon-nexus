#!/usr/bin/env python3
"""Build the selective Tadeon Nexus vaults from the canonical complete vault.

The complete archive remains the authority for cross-volume connections. The
selective archives are deterministic projections intended for focused imports.
"""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
PACKS_DIR = ROOT / "public" / "nexus-packs"
COMPLETE_PACK = PACKS_DIR / "tadeon-nexus-lote-01.zip"
FIXED_DATE = (2026, 1, 1, 0, 0, 0)

PROJECTIONS = {
    "tadeon-nexus-conexoes.zip": ("00-fontes/", "01-sintese/"),
    "tadeon-nexus-arden.zip": ("00-fontes/arden.md", "06-cenario/"),
    "tadeon-nexus-urdidura.zip": ("00-fontes/urdidura.md", "02-urdidura/"),
    "tadeon-nexus-regras.zip": ("00-fontes/regras.md", "03-regras/"),
    "tadeon-nexus-geografia.zip": ("00-fontes/geografia.md", "04-geografia/"),
    "tadeon-nexus-ciencias.zip": ("00-fontes/ciencias.md", "05-ciencias/"),
}


def selected(path: str, selectors: tuple[str, ...]) -> bool:
    return any(path == selector or path.startswith(selector) for selector in selectors)


def write_entry(archive: ZipFile, path: str, contents: bytes) -> None:
    info = ZipInfo(path, FIXED_DATE)
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, contents, compress_type=ZIP_DEFLATED, compresslevel=9)


def build_projection(source: ZipFile, manifest: dict, name: str, selectors: tuple[str, ...]) -> None:
    pages = [page for page in manifest["pages"] if selected(page["path"], selectors)]
    keys = {page["key"] for page in pages}
    relations = [
        relation
        for relation in manifest["relations"]
        if relation["source_key"] in keys and relation["target_key"] in keys
    ]
    projection = {
        **manifest,
        "pages": pages,
        "relations": relations,
        "attachments": [],
    }

    output = PACKS_DIR / name
    with ZipFile(output, "w") as target:
        manifest_bytes = json.dumps(
            projection,
            ensure_ascii=False,
            indent=2,
        ).encode("utf-8") + b"\n"
        write_entry(target, "manifest.yaml", manifest_bytes)
        for page in sorted(pages, key=lambda item: item["path"]):
            write_entry(target, page["path"], source.read(page["path"]))

    print(f"{name}: {len(pages)} pages, {len(relations)} relations")


def main() -> None:
    with ZipFile(COMPLETE_PACK) as source:
        manifest = json.loads(source.read("manifest.yaml"))
        for name, selectors in PROJECTIONS.items():
            build_projection(source, manifest, name, selectors)


if __name__ == "__main__":
    main()
