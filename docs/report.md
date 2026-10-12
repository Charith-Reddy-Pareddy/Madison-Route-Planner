# Walking route choices and graph scale in Madison

## Research question

How do walking route choices and measured graph performance change with the Madison network and the available routing preferences?

## Study scope

This report considers the curated Madison walking graph and a larger, connected regional graph. The curated graph represents campus and nearby places as 57 mapped locations connected by 212 directed road records. The regional graph is drawn from mapped foot-accessible streets and paths around Madison. The two graphs serve different purposes: the curated graph reflects routes between places shown in the app, while the regional graph makes it possible to measure Dijkstra search on networks up to one million nodes.

## Data sources

The curated place coordinates and road records are stored in [`data/locations.csv`](../data/locations.csv) and [`data/roads.csv`](../data/roads.csv). Their sources and distance-generation process are documented in [`data/sources.md`](../data/sources.md). Place coordinates represent locations rather than building entrances; road distances follow mapped walking connections.

For the scale measurement, the graph was extracted from Geofabrik's Wisconsin OpenStreetMap snapshot dated October 9, 2026 ([source extract](https://download.geofabrik.de/north-america/us/wisconsin-261009.osm.pbf)). The extraction is centered on Madison and uses real mapped ways tagged for foot access. It excludes selected non-walkable or unsuitable ways and honors explicit `oneway:foot` restrictions. The data is made available under the Open Database License; attribution is given to OpenStreetMap contributors and Geofabrik.

## Measurement method

The curated graph measurement searches all ordered pairs of distinct locations. Three fresh JVM processes each use three warm-up rounds and seven measured rounds. The reported value is the median search time per pair within each process.

The scale benchmark uses the repository's `DijkstraGraph` with nested, connected prefixes of 100, 1,000, 10,000, 100,000, and 1,000,000 OSM nodes. The prefixes are formed by breadth-first traversal from the eligible OSM node nearest central Madison. For each graph size, searches run from that seed to five targets spaced through the prefix's node order. One warm-up round precedes three measured rounds. Graph construction time is measured separately from route-search time. Edge costs are great-circle distances between consecutive OSM way nodes, expressed in miles.

The scale results were collected with Java 21.0.4 on macOS aarch64, with eight processors available to the JVM. The benchmark implementation, filtering rules, source-file checksum, commands, and raw measurements are recorded in [`benchmarks/README.md`](../benchmarks/README.md) and [`benchmarks/osm-scale-results.csv`](../benchmarks/osm-scale-results.csv).

## Results

All 3,192 ordered pairs in the curated Madison graph had a walking route. Median search times across the three fresh JVM processes were 9.186, 6.996, and 12.343 microseconds. Their median was 9.186 microseconds, with a range of 6.996–12.343 microseconds.

The scale measurements show the repository's Dijkstra implementation routing over real, connected OSM graph prefixes. Values below are medians from three measured rounds; each round searches five destinations from the central Madison seed.

| Nodes | Directed edges | Build time (ms) | Median search (µs) | Mean target route (mi) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 214 | 1,113.429 | 689.216 | 0.0883 |
| 1,000 | 2,210 | 948.933 | 847.075 | 0.1504 |
| 10,000 | 23,358 | 1,087.477 | 10,211.558 | 0.5148 |
| 100,000 | 235,410 | 1,595.270 | 68,714.716 | 2.8888 |
| 1,000,000 | 2,191,516 | 7,009.139 | 965,105.566 | 24.2546 |

## Discussion and limitations

Search time rises sharply at the largest sizes, reaching about 0.97 seconds per search at one million nodes in this run. This reflects both the larger graph and the longer searches: mean target-route length rises from 0.09 miles at 100 nodes to 24.25 miles at one million nodes. The measurements therefore do not isolate node count as the only cause of slower searches.

The curated graph represents 57 selected places and their mapped connections; the larger graph is a regional OSM walking network. They answer different questions and their timings should not be compared as if they were the same graph growing in size. The scale run also measures one seed and five targets per size, on one machine and one OSM snapshot. OSM foot-access tags may be incomplete, and route distances sum straight-line lengths between consecutive mapped way nodes. Repeating the study with other seeds, snapshots, and hardware would help distinguish general scaling behavior from this particular run.
