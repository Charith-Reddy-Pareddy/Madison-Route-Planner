import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Measures all ordered, distinct location pairs in a loaded walking network. */
public final class WalkingRouteBenchmark {

  public record Results(int locations, int directedRoads, int searchesPerRound,
      int reachableRoutes, List<Long> roundNanos) {
    public Results {
      roundNanos = List.copyOf(roundNanos);
    }

    public double medianMicrosPerSearch() {
      List<Long> sorted = new ArrayList<>(roundNanos);
      sorted.sort(Comparator.naturalOrder());
      int middle = sorted.size() / 2;
      double medianNanos = sorted.size() % 2 == 0
          ? (sorted.get(middle - 1) / 2.0 + sorted.get(middle) / 2.0)
          : sorted.get(middle);
      return medianNanos / searchesPerRound / 1_000.0;
    }
  }

  private WalkingRouteBenchmark() {}

  public static Results run(RoadDataLoader.Dataset dataset, int warmupRounds, int measuredRounds) {
    if (warmupRounds < 0 || measuredRounds < 1) {
      throw new IllegalArgumentException("Use zero or more warm-up rounds and at least one measured round.");
    }

    List<RoadDataLoader.Location> locations = dataset.locations();
    int searches = Math.multiplyExact(locations.size(), locations.size() - 1);
    WalkingRouteService service = new WalkingRouteService(dataset);
    List<Long> elapsed = new ArrayList<>();
    int reachableRoutes = 0;

    for (int round = 0; round < warmupRounds + measuredRounds; round++) {
      int reachable = 0;
      long start = System.nanoTime();
      for (RoadDataLoader.Location from : locations) {
        for (RoadDataLoader.Location to : locations) {
          if (from.id().equals(to.id())) continue;
          try {
            service.findRoute(from.id(), to.id());
            reachable++;
          } catch (WalkingRouteService.NoWalkingRouteException ignored) {
            // Unreachable pairs are part of the real network's search workload.
          }
        }
      }
      long duration = System.nanoTime() - start;
      if (round < warmupRounds) continue;
      if (elapsed.isEmpty()) reachableRoutes = reachable;
      elapsed.add(duration);
    }

    return new Results(locations.size(), dataset.roads().size(), searches, reachableRoutes, elapsed);
  }

  public static void main(String[] args) throws IOException {
    if (args.length != 0 && args.length != 2) {
      System.err.println("Usage: java WalkingRouteBenchmark [locations.csv roads.csv]");
      System.exit(2);
    }
    Path locations = args.length == 0 ? Path.of("data/locations.csv") : Path.of(args[0]);
    Path roads = args.length == 0 ? Path.of("data/roads.csv") : Path.of(args[1]);
    RoadDataLoader.Dataset dataset = new RoadDataLoader().load(locations, roads);
    Results results = run(dataset, 3, 7);

    System.out.printf(Locale.ROOT, "java=%s%n", Runtime.version());
    System.out.printf(Locale.ROOT, "os=%s %s%n", System.getProperty("os.name"),
        System.getProperty("os.arch"));
    System.out.printf(Locale.ROOT, "processors=%d%n", Runtime.getRuntime().availableProcessors());
    System.out.printf(Locale.ROOT, "locations=%d%ndirected_roads=%d%nsearches_per_round=%d%n",
        results.locations(), results.directedRoads(), results.searchesPerRound());
    System.out.printf(Locale.ROOT, "reachable_routes=%d%nmeasured_rounds=%d%n",
        results.reachableRoutes(), results.roundNanos().size());
    System.out.printf(Locale.ROOT, "median_microseconds_per_search=%.3f%n",
        results.medianMicrosPerSearch());
  }
}
