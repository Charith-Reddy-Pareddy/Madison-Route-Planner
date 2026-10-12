# OSM scale benchmark

This benchmark uses real OpenStreetMap foot-accessible ways from a dated Wisconsin extract and the repository's `DijkstraGraph`. The source PBF and generated CSV files stay outside the repository.

## Build the graph

Download the dated [Geofabrik Wisconsin extract](https://download.geofabrik.de/north-america/us/wisconsin-261009.osm.pbf), then install the pinned parser and run:

```sh
python3 -m pip install -r benchmarks/requirements.txt
python3 benchmarks/build_osm_graph.py /path/to/wisconsin-261009.osm.pbf /tmp/madison-osm-benchmark
```

The extractor uses way geometry within 110 km of central Madison (43.075, -89.403), excludes motorways, construction, platforms and ways tagged `area=yes`, `foot=no/private/use_sidepath` or `access=no/private`, and honors explicit `oneway:foot` restrictions. It finds the nearest eligible way node to the center, then takes a breadth-first prefix of its directed connected component. The prefix makes each reported size connected and nested. Edge costs are great-circle distances between consecutive mapped OSM way nodes, in miles. OSM data is available under the Open Database License; attribute OpenStreetMap contributors and Geofabrik.

## Run the benchmark

```sh
mvn package
java -Xmx4g -cp target/classes OsmScaleBenchmark \
  /tmp/madison-osm-benchmark/node-order.csv \
  /tmp/madison-osm-benchmark/edges.csv
```

The default sizes are 100, 1,000, 10,000, 100,000 and 1,000,000 nodes. Each graph is built before timing. One warm-up and three measured rounds each search from the Madison seed to five targets spaced through that graph's breadth-first node order. The reported time is the median per search across measured rounds. Build time and distinct directed-edge count are also reported. Results depend on the source snapshot, Java runtime and hardware; compare them only with those details recorded.

The benchmark outputs are intentionally generated locally. The source extract used for the checked-in results was `wisconsin-261009.osm.pbf`, dated 2026-10-09, SHA-256 `4e9bde4c9d3d2789808ffcd793da45a740defefd377bbaaf1564e23e38d46fde`.
