#!/usr/bin/env python3
"""Extract a connected, walkable Madison-area graph from an OSM PBF."""

import argparse
import csv
import math
from collections import defaultdict, deque
from pathlib import Path

import osmium

LAT0 = 43.075
LON0 = -89.403
RADIUS_KM = 110
MILES_PER_KM = 0.621371192237334
EXCLUDED = {
    "motorway", "motorway_link", "trunk", "trunk_link", "construction",
    "proposed", "raceway", "bus_stop", "platform", "elevator",
    "services", "rest_area",
}


def distance_km(lat, lon):
    lat1 = math.radians(LAT0)
    lat2 = math.radians(lat)
    dlat = lat2 - lat1
    dlon = math.radians(lon - LON0)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(a))


def walkable(tags):
    return (
        tags.get("highway") not in (None, *EXCLUDED)
        and tags.get("area") != "yes"
        and tags.get("foot") not in {"no", "private", "use_sidepath"}
        and tags.get("access") not in {"no", "private"}
    )


def miles(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    area = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(area)) * MILES_PER_KM


class GraphHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.adj = defaultdict(list)
        self.coords = {}
        self.seed = None
        self.seed_km = float("inf")
        self.ways = 0

    def way(self, way):
        if not walkable(way.tags):
            return
        refs = []
        for node in way.nodes:
            if not node.location.valid():
                refs.append(None)
                continue
            lat, lon = node.location.lat, node.location.lon
            if distance_km(lat, lon) > RADIUS_KM:
                refs.append(None)
                continue
            ref = node.ref
            refs.append(ref)
            d = distance_km(lat, lon)
            if ref not in self.coords:
                self.coords[ref] = (lat, lon)
            if d < self.seed_km:
                self.seed, self.seed_km = ref, d
        oneway_foot = way.tags.get("oneway:foot") in {"yes", "1", "true"}
        for a, b in zip(refs, refs[1:]):
            if a is None or b is None or a == b:
                continue
            self.adj[a].append(b)
            if not oneway_foot:
                self.adj[b].append(a)
        self.ways += 1


class EdgeHandler(osmium.SimpleHandler):
    def __init__(self, selected, coords, writer):
        super().__init__()
        self.selected = selected
        self.coords = coords
        self.writer = writer
        self.edges = 0

    def way(self, way):
        if not walkable(way.tags):
            return
        refs = [node.ref for node in way.nodes]
        oneway_foot = way.tags.get("oneway:foot") in {"yes", "1", "true"}
        for a, b in zip(refs, refs[1:]):
            if a not in self.selected or b not in self.selected or a == b:
                continue
            cost = miles(self.coords[a], self.coords[b])
            self.writer.writerow((a, b, f"{cost:.10f}"))
            self.edges += 1
            if not oneway_foot:
                self.writer.writerow((b, a, f"{cost:.10f}"))
                self.edges += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", type=Path, help="Path to a Wisconsin OSM PBF extract")
    parser.add_argument("output", type=Path, help="Output directory for node-order.csv and edges.csv")
    parser.add_argument("--nodes", type=int, default=1_000_000, help="Maximum connected nodes (default: 1,000,000)")
    args = parser.parse_args()
    if args.nodes < 2:
        parser.error("--nodes must be at least 2")
    args.output.mkdir(parents=True, exist_ok=True)

    graph = GraphHandler()
    graph.apply_file(str(args.pbf), locations=True)
    if graph.seed is None:
        raise SystemExit("No eligible OSM footway nodes found within the extraction radius")
    order = []
    seen = {graph.seed}
    queue = deque([graph.seed])
    while queue and len(order) < args.nodes:
        node = queue.popleft()
        order.append(node)
        for nxt in graph.adj.get(node, ()):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    if len(order) < args.nodes:
        raise SystemExit(f"Connected component has {len(order)} nodes; {args.nodes} requested")

    with (args.output / "node-order.csv").open("w", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(("index", "osm_node_id"))
        writer.writerows(enumerate(order))

    selected = set(order)
    del graph.adj
    with (args.output / "edges.csv").open("w", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(("from_osm_node_id", "to_osm_node_id", "miles"))
        edge_handler = EdgeHandler(selected, graph.coords, writer)
        edge_handler.apply_file(str(args.pbf), locations=False)

    print(f"radius_km={RADIUS_KM}")
    print(f"walkable_ways={graph.ways}")
    print(f"seed_osm_node_id={order[0]}")
    print(f"seed_distance_from_center_km={graph.seed_km:.3f}")
    print(f"nodes={len(order)}")
    print(f"directed_edges={edge_handler.edges}")
    print(f"node_order={args.output / 'node-order.csv'}")
    print(f"edges={args.output / 'edges.csv'}")


if __name__ == "__main__":
    main()
