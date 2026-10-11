# Route planning report outline

## Research question
How do walking route choices and measured graph performance change with the Madison network and the available routing preferences?

## Network data
The current data contains 57 mapped locations, 212 directed road records, and 108 grouped location connections. Of the directed records, 86 include stairs and 188 include accessible mileage. These counts are summarized from `data/locations.csv` and `data/roads.csv` and checked by `test/report-outline.test.mjs`.

## Benchmark method
Record the graph sizes, benchmark command, runtime and hardware, warm-up procedure, and repeat count from the original run records. Keep the existing measured results and their provenance together.

## Results
Add the measured runtime and memory results by graph size after locating and checking the original benchmark output. Benchmark result files are not present in this checkout, so this outline makes no performance claims yet.

## Discussion
Compare the measured scaling with the routing behavior users can observe. Separate limitations of the benchmark setup from limitations of the Madison data and the route planner.

## Sources and reproducibility
Cite the data sources in `data/sources.md` and link each reported measurement to its raw output and command.
