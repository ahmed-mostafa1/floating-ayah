#!/usr/bin/env python3
"""Generate the bundled Quran SQLite database.

Two modes:
  --download        Fetch Uthmani text + Sahih International from alquran.cloud
                    and write resources/quran.sqlite directly.
  --input <tsv>     Read a local TSV file (legacy/dev mode). Requires --allow-sample
                    unless the file contains all 6236 ayahs.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sqlite3
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


EXPECTED_TOTAL_AYAHS = 6236
SCHEMA_VERSION = "1"

ALQURAN_UTHMANI_URL = "https://api.alquran.cloud/v1/quran/quran-uthmani"
ALQURAN_SAHIH_URL = "https://api.alquran.cloud/v1/quran/en.sahih"


@dataclass(frozen=True)
class AyahRow:
    surah_id: int
    ayah_id: int
    surah_name: str
    text_uthmani: str
    text_english: str


# ── Download path ────────────────────────────────────────────────────────────

def _fetch_json(url: str) -> dict:
    print(f"  Fetching {url} …")
    req = urllib.request.Request(url, headers={"User-Agent": "noor-remind-db-builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download_rows() -> tuple[list[AyahRow], str]:
    """Return (rows, source_description) by fetching from alquran.cloud."""
    uthmani_data = _fetch_json(ALQURAN_UTHMANI_URL)
    sahih_data = _fetch_json(ALQURAN_SAHIH_URL)

    uthmani_surahs: list[dict] = uthmani_data["data"]["surahs"]
    sahih_surahs: list[dict] = sahih_data["data"]["surahs"]

    if len(uthmani_surahs) != 114 or len(sahih_surahs) != 114:
        raise ValueError("Expected 114 surahs in both editions")

    rows: list[AyahRow] = []
    for u_surah, s_surah in zip(uthmani_surahs, sahih_surahs):
        surah_id: int = u_surah["number"]
        surah_name: str = u_surah["englishName"]
        u_ayahs: list[dict] = u_surah["ayahs"]
        s_ayahs: list[dict] = s_surah["ayahs"]

        if len(u_ayahs) != len(s_ayahs):
            raise ValueError(
                f"Surah {surah_id}: Uthmani has {len(u_ayahs)} ayahs "
                f"but Sahih has {len(s_ayahs)}"
            )

        for u_ayah, s_ayah in zip(u_ayahs, s_ayahs):
            ayah_id: int = u_ayah["numberInSurah"]
            if ayah_id != s_ayah["numberInSurah"]:
                raise ValueError(
                    f"Ayah number mismatch at {surah_id}:{ayah_id}"
                )
            rows.append(
                AyahRow(
                    surah_id=surah_id,
                    ayah_id=ayah_id,
                    surah_name=surah_name,
                    text_uthmani=u_ayah["text"].strip(),
                    text_english=s_ayah["text"].strip(),
                )
            )

    source = f"{ALQURAN_UTHMANI_URL} + {ALQURAN_SAHIH_URL}"
    return rows, source


# ── TSV path (dev / legacy) ──────────────────────────────────────────────────

def read_rows_from_tsv(input_path: Path) -> list[AyahRow]:
    with input_path.open("r", encoding="utf-8", newline="") as source_file:
        reader = csv.DictReader(source_file, delimiter="\t")
        required_fields = {"surah_id", "ayah_id", "surah_name", "text_uthmani", "text_english"}
        if set(reader.fieldnames or []) != required_fields:
            raise ValueError(f"Input TSV must contain exactly these columns: {sorted(required_fields)}")

        rows: list[AyahRow] = []
        for line_number, row in enumerate(reader, start=2):
            try:
                ayah = AyahRow(
                    surah_id=int(row["surah_id"]),
                    ayah_id=int(row["ayah_id"]),
                    surah_name=row["surah_name"].strip(),
                    text_uthmani=row["text_uthmani"].strip(),
                    text_english=row["text_english"].strip(),
                )
            except ValueError as error:
                raise ValueError(f"Invalid numeric value at line {line_number}") from error

            if ayah.surah_id < 1 or ayah.ayah_id < 1:
                raise ValueError(f"Invalid Quran reference at line {line_number}")
            if not ayah.surah_name or not ayah.text_uthmani or not ayah.text_english:
                raise ValueError(f"Missing required text at line {line_number}")

            rows.append(ayah)

    return rows


# ── Validation ───────────────────────────────────────────────────────────────

def validate_rows(rows: list[AyahRow], allow_sample: bool) -> None:
    if not rows:
        raise ValueError("Input contains no ayahs")

    seen: set[tuple[int, int]] = set()
    previous = (0, 0)
    for row in rows:
        key = (row.surah_id, row.ayah_id)
        if key in seen:
            raise ValueError(f"Duplicate ayah reference: {row.surah_id}:{row.ayah_id}")
        if key <= previous:
            raise ValueError("Ayahs must be sorted by surah_id then ayah_id")
        seen.add(key)
        previous = key

    if len(rows) != EXPECTED_TOTAL_AYAHS and not allow_sample:
        raise ValueError(
            f"Expected {EXPECTED_TOTAL_AYAHS} ayahs, found {len(rows)}. "
            "Pass --allow-sample only for development fixtures."
        )


# ── Database generation ──────────────────────────────────────────────────────

def _source_checksum(rows: list[AyahRow]) -> str:
    digest = hashlib.sha256()
    for row in rows:
        digest.update(f"{row.surah_id}:{row.ayah_id}:{row.text_uthmani}:{row.text_english}\n".encode())
    return digest.hexdigest()


def create_database(
    rows: list[AyahRow],
    source_description: str,
    output_path: Path,
    allow_sample: bool,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    connection = sqlite3.connect(output_path)
    try:
        connection.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE surahs (
                id INTEGER PRIMARY KEY,
                name_latin TEXT NOT NULL
            );

            CREATE TABLE ayahs (
                surah_id INTEGER NOT NULL,
                ayah_id INTEGER NOT NULL,
                global_index INTEGER NOT NULL UNIQUE,
                text_uthmani TEXT NOT NULL,
                text_english TEXT NOT NULL,
                PRIMARY KEY (surah_id, ayah_id),
                FOREIGN KEY (surah_id) REFERENCES surahs(id)
            );

            CREATE TABLE metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )

        surahs = sorted({(row.surah_id, row.surah_name) for row in rows})
        connection.executemany("INSERT INTO surahs (id, name_latin) VALUES (?, ?)", surahs)
        connection.executemany(
            """
            INSERT INTO ayahs (surah_id, ayah_id, global_index, text_uthmani, text_english)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (row.surah_id, row.ayah_id, index, row.text_uthmani, row.text_english)
                for index, row in enumerate(rows, start=1)
            ],
        )
        connection.executemany(
            "INSERT INTO metadata (key, value) VALUES (?, ?)",
            [
                ("schema_version", SCHEMA_VERSION),
                ("ayah_count", str(len(rows))),
                ("source", source_description),
                ("source_sha256", _source_checksum(rows)),
                ("is_sample", "true" if allow_sample else "false"),
                ("generated_at_utc", datetime.now(timezone.utc).isoformat()),
            ],
        )
        connection.commit()
    finally:
        connection.close()


# ── CLI ──────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate quran.sqlite from a verified source.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/generate_db.py --download\n"
            "  python scripts/generate_db.py --input scripts/seed-quran.tsv --allow-sample"
        ),
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--download",
        action="store_true",
        help="Download Uthmani text + Sahih International from alquran.cloud.",
    )
    group.add_argument(
        "--input",
        metavar="TSV",
        help="Local TSV file with columns: surah_id, ayah_id, surah_name, text_uthmani, text_english.",
    )
    parser.add_argument(
        "--output",
        default="resources/quran.sqlite",
        help="SQLite output path (default: resources/quran.sqlite).",
    )
    parser.add_argument(
        "--allow-sample",
        action="store_true",
        help="Allow fewer than 6236 ayahs. Use only with --input for dev fixtures.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = Path(args.output)

    if args.download:
        print("Downloading Quran data from alquran.cloud…")
        rows, source = download_rows()
        allow_sample = False
    else:
        input_path = Path(args.input)
        rows = read_rows_from_tsv(input_path)
        source = input_path.as_posix()
        allow_sample = args.allow_sample

    print(f"Validating {len(rows)} ayahs…")
    validate_rows(rows, allow_sample=allow_sample)

    print(f"Writing {output_path}…")
    create_database(rows, source, output_path, allow_sample=allow_sample)
    print(f"Done. {output_path} contains {len(rows)} ayahs.")


if __name__ == "__main__":
    main()
