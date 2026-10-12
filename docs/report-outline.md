# Route planning report outline

## Research question
How do walking route choices and measured graph performance change with the Madison network and the available routing preferences?

## Network data
The current data contains 57 mapped locations, 212 directed road records, and 108 grouped location connections. Of the directed records, 86 include stairs and 188 include accessible mileage. These counts are summarized from `data/locations.csv` and `data/roads.csv` and checked by `test/report-outline.test.mjs`.

## Real-network routing measurement
The current Madison graph was measured with `WalkingRouteBenchmark`, using the repository CSV files. Each process used three warm-up rounds and seven measured rounds; each round searched all 3,192 ordered pairs of distinct locations. All pairs had a walking route. The table gives the median time per search within each fresh JVM process.

| Process | Median microseconds per search |
| --- | ---: |
| 1 | 9.186 |
| 2 | 6.996 |
| 3 | 12.343 |

The median of these three medians is 9.186 microseconds; the observed range is 6.996–12.343 microseconds. Runs used Java 21.0.4 on macOS arm64 with eight processors available to the JVM. The variation is substantial for this small graph, so these timings describe this run and are not a reliable cross-size performance comparison. Reproduce with `mvn test` followed by `java -cp target/classes WalkingRouteBenchmark`.

## Larger-graph benchmarks
To measure scale with real mapped roads, a connected network was extracted from Geofabrik's Wisconsin OpenStreetMap snapshot dated 2026-10-09. The extractor starts at the mapped foot-accessible node nearest central Madison, includes walkable way segments within 110 km, and builds nested connected prefixes in breadth-first order. It produced 1,000,000 nodes and 2,191,566 distinct directed edges. The dated source PBF and its SHA-256, filters, and reproduction commands are in [`benchmarks/README.md`](../benchmarks/README.md); the recorded output is [`benchmarks/osm-scale-results.csv`](../benchmarks/osm-scale-results.csv).

Each size used one warm-up round followed by three measured rounds. A round searches from the seed to five targets spaced across the node order. The reported search time is the median round duration divided by five; graph build time is measured separately. Runs used Java 21.0.4 on macOS aarch64 with eight processors available to the JVM.

| Nodes | Directed edges | Build time (ms) | Median search (µs) | Mean target route (mi) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 214 | 1,113.429 | 689.216 | 0.0883 |
| 1,000 | 2,210 | 948.933 | 847.075 | 0.1504 |
| 10,000 | 23,358 | 1,087.477 | 10,211.558 | 0.5148 |
| 100,000 | 235,410 | 1,595.270 | 68,714.716 | 2.8888 |
| 1,000,000 | 2,191,516 | 7,009.139 | 965,105.566 | 24.2546 |

The benchmark starts each search at the Madison seed and chooses targets at 20%, 40%, 60%, 80%, and 100% of each prefix's breadth-first order. The increasing route distances mean the timings reflect both larger graphs and longer queries. These are measurements from one machine and one OSM snapshot; they should not be read as a controlled comparison of graph size alone. Graph build time includes reading the full extracted edge CSV for each graph size.

## Discussion
Compare the measured scaling with the routing behavior users can observe. Separate limitations of the benchmark setup from limitations of the Madison data and the route planner.

## Sources and reproducibility
Cite the data sources in `data/sources.md` and link each reported measurement to its raw output and command.
