#!/usr/bin/env python3
"""Download and validate Madison Metro's published static GTFS schedule.

Run from the repository root:
    python3 scripts/gtfs_ingest.py
The normalized feed is written under frontend/public/ for the browser app.
"""

import argparse
import csv
import io
import json
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

FEED_URL = "https://transitdata.cityofmadison.com/GTFS/mmt_gtfs.zip"
USER_AGENT = "MadisonRoutePlanning/1.0 (static GTFS ingestion)"
CORE_FILES = {
    "agency.txt": ("agency_name", "agency_url", "agency_timezone"),
    "routes.txt": ("route_id", "route_type"),
    "stops.txt": ("stop_id", "stop_name", "stop_lat", "stop_lon"),
    "trips.txt": ("route_id", "service_id", "trip_id"),
    "stop_times.txt": (
        "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"
    ),
}
CALENDAR_FILES = {
    "calendar.txt": (
        "service_id", "monday", "tuesday", "wednesday", "thursday", "friday",
        "saturday", "sunday", "start_date", "end_date"
    ),
    "calendar_dates.txt": ("service_id", "date", "exception_type"),
}


def read_table(archive, filename, required, optional=False):
    matches = [
        name for name in archive.namelist()
        if name.rsplit("/", 1)[-1] == filename
    ]
    if not matches and optional:
        return []
    if len(matches) != 1:
        raise ValueError(f"feed must contain exactly one {filename}")
    rows = []
    with archive.open(matches[0]) as stream:
        reader = csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline=""))
        if reader.fieldnames is None:
            raise ValueError(f"{filename} has no header")
        missing = set(required) - set(reader.fieldnames)
        if missing:
            raise ValueError(f"{filename} is missing columns: {', '.join(sorted(missing))}")
        for line, row in enumerate(reader, start=2):
            if None in row:
                raise ValueError(f"{filename}:{line} has more values than its header")
            rows.append({key: (value or "").strip() for key, value in row.items()})
    return rows


def unique_ids(rows, field, filename):
    index = {}
    for line, row in enumerate(rows, start=2):
        value = row.get(field, "")
        if not value:
            raise ValueError(f"{filename}:{line} has an empty {field}")
        if value in index:
            raise ValueError(f"{filename}:{line} repeats {field} {value!r}")
        index[value] = row
    if not index:
        raise ValueError(f"{filename} contains no records")
    return index


def check_date(value, filename, field):
    try:
        datetime.strptime(value, "%Y%m%d")
    except ValueError as exc:
        raise ValueError(f"{filename} has invalid {field}: {value!r}") from exc


def check_time(value, filename, line, field):
    try:
        hour, minute, second = (int(part) for part in value.split(":"))
    except (ValueError, AttributeError) as exc:
        raise ValueError(f"{filename}:{line} has invalid {field}: {value!r}") from exc
    if len(value.split(":")) != 3 or not (0 <= hour <= 99 and 0 <= minute < 60 and 0 <= second < 60):
        raise ValueError(f"{filename}:{line} has invalid {field}: {value!r}")


def validate(archive):
    tables = {}
    for filename, columns in CORE_FILES.items():
        tables[filename] = read_table(archive, filename, columns)
    for filename, columns in CALENDAR_FILES.items():
        tables[filename] = read_table(archive, filename, columns, optional=True)

    agencies = unique_ids(tables["agency.txt"], "agency_id", "agency.txt") if (
        tables["agency.txt"] and tables["agency.txt"][0].get("agency_id")
    ) else {}
    routes = unique_ids(tables["routes.txt"], "route_id", "routes.txt")
    stops = unique_ids(tables["stops.txt"], "stop_id", "stops.txt")
    trips = unique_ids(tables["trips.txt"], "trip_id", "trips.txt")

    if not tables["calendar.txt"] and not tables["calendar_dates.txt"]:
        raise ValueError("feed must contain calendar.txt or calendar_dates.txt")
    services = set()
    for row in tables["calendar.txt"]:
        service_id = row.get("service_id", "")
        if not service_id:
            raise ValueError("calendar.txt contains an empty service_id")
        services.add(service_id)
        for day in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"):
            if row.get(day) not in ("0", "1"):
                raise ValueError(f"calendar.txt has invalid {day}: {row.get(day)!r}")
        check_date(row.get("start_date", ""), "calendar.txt", "start_date")
        check_date(row.get("end_date", ""), "calendar.txt", "end_date")
        if row["start_date"] > row["end_date"]:
            raise ValueError(f"calendar.txt has a start_date after end_date for {service_id!r}")

    for row in tables["calendar_dates.txt"]:
        service_id = row.get("service_id", "")
        if not service_id or row.get("exception_type") not in ("1", "2"):
            raise ValueError("calendar_dates.txt has an invalid service or exception type")
        check_date(row.get("date", ""), "calendar_dates.txt", "date")
        services.add(service_id)

    for route in routes.values():
        short = route.get("route_short_name", "")
        long = route.get("route_long_name", "")
        if not short and not long:
            raise ValueError(f"routes.txt route {route['route_id']!r} has no name")
        if route.get("agency_id") and agencies and route["agency_id"] not in agencies:
            raise ValueError(f"route {route['route_id']!r} references an unknown agency")

    for stop in stops.values():
        try:
            lat, lon = float(stop["stop_lat"]), float(stop["stop_lon"])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"stop {stop['stop_id']!r} has invalid coordinates") from exc
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError(f"stop {stop['stop_id']!r} has coordinates out of range")

    for trip in trips.values():
        if trip["route_id"] not in routes:
            raise ValueError(f"trip {trip['trip_id']!r} references an unknown route")
        if trip["service_id"] not in services:
            raise ValueError(f"trip {trip['trip_id']!r} references an unknown service")

    seen_sequences = set()
    for line, row in enumerate(tables["stop_times.txt"], start=2):
        trip_id, stop_id = row["trip_id"], row["stop_id"]
        if trip_id not in trips:
            raise ValueError(f"stop_times.txt:{line} references an unknown trip")
        if stop_id not in stops:
            raise ValueError(f"stop_times.txt:{line} references an unknown stop")
        for field in ("arrival_time", "departure_time"):
            check_time(row[field], "stop_times.txt", line, field)
        try:
            sequence = int(row["stop_sequence"])
        except ValueError as exc:
            raise ValueError(f"stop_times.txt:{line} has an invalid stop_sequence") from exc
        if sequence < 0:
            raise ValueError(f"stop_times.txt:{line} has a negative stop_sequence")
        key = (trip_id, sequence)
        if key in seen_sequences:
            raise ValueError(f"stop_times.txt:{line} repeats a trip stop_sequence")
        seen_sequences.add(key)

    return tables


def normalize(tables):
    fields = {
        "agency.txt": ("agency_id", "agency_name", "agency_url", "agency_timezone"),
        "routes.txt": (
            "route_id", "agency_id", "route_short_name", "route_long_name",
            "route_type", "route_color", "route_text_color"
        ),
        "stops.txt": ("stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station"),
        "trips.txt": (
            "route_id", "service_id", "trip_id", "trip_headsign", "direction_id", "shape_id"
        ),
        "stop_times.txt": (
            "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"
        ),
        "calendar.txt": tuple(CALENDAR_FILES["calendar.txt"]),
        "calendar_dates.txt": tuple(CALENDAR_FILES["calendar_dates.txt"]),
    }
    return {
        key.removesuffix(".txt"): [
            {field: row.get(field, "") for field in columns}
            for row in tables[key]
        ]
        for key, columns in fields.items()
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=Path("frontend/public/metro-gtfs.json"),
        help="normalized output path (default: frontend/public/metro-gtfs.json)"
    )
    args = parser.parse_args()

    request = urllib.request.Request(FEED_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        tables = validate(archive)

    result = {
        "source": FEED_URL,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        **normalize(tables),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    temporary.replace(args.output)

    print(
        f"Validated Madison Metro feed: {len(tables['routes.txt'])} routes, "
        f"{len(tables['stops.txt'])} stops, {len(tables['trips.txt'])} trips, "
        f"{len(tables['stop_times.txt'])} stop times."
    )
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"GTFS import failed: {exc}", file=sys.stderr)
        sys.exit(1)
