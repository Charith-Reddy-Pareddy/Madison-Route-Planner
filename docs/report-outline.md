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
The earlier benchmark output for larger graph sizes is not present in this checkout. Add those results only after recovering their raw measurements and recording the graph source, benchmark command, runtime and hardware, warm-up procedure, and repeat count. The real-network measurement above does not replace the missing scale results.

## Discussion
Compare the measured scaling with the routing behavior users can observe. Separate limitations of the benchmark setup from limitations of the Madison data and the route planner.

## Sources and reproducibility
Cite the data sources in `data/sources.md` and link each reported measurement to its raw output and command.
