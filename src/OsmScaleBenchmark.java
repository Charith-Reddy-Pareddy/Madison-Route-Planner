import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashMap;

/** Measures Dijkstra searches on nested, connected graphs extracted from real OSM ways. */
public final class OsmScaleBenchmark {

  private OsmScaleBenchmark() {}

  public record Result(int nodes, int edges, double buildMillis, double medianMicrosPerSearch,
      double medianRouteMiles, int searchesPerRound) {}

  public static List<Result> run(Path nodeFile, Path edgeFile, List<Integer> sizes,
      int warmupRounds, int measuredRounds) throws IOException {
    if (warmupRounds < 0 || measuredRounds < 1) {
      throw new IllegalArgumentException("Use zero or more warm-up rounds and at least one measured round.");
    }
    List<Long> order = readNodeOrder(nodeFile);
    List<Result> results = new ArrayList<>();
    int previousSize = 0;
    for (int size : sizes) {
      if (size < 2 || size > order.size() || size <= previousSize) {
        throw new IllegalArgumentException("Graph sizes must be increasing and within node-order.csv: " + size);
      }
      previousSize = size;
      List<Long> nodes = order.subList(0, size);
      long buildStart = System.nanoTime();
      Map<Long, Boolean> selected = new HashMap<>(size * 2);
      DijkstraGraph<Long, Double> graph = new DijkstraGraph<>();
      for (long id : nodes) {
        graph.insertNode(id);
        selected.put(id, Boolean.TRUE);
      }
      try (BufferedReader reader = Files.newBufferedReader(edgeFile)) {
        String line = reader.readLine(); // CSV header
        while ((line = reader.readLine()) != null) {
          String[] fields = line.split(",", 3);
          long from = Long.parseLong(fields[0]);
          long to = Long.parseLong(fields[1]);
          if (selected.containsKey(from) && selected.containsKey(to)) {
            graph.insertEdge(from, to, Double.parseDouble(fields[2]));
          }
        }
      }
      double buildMillis = (System.nanoTime() - buildStart) / 1_000_000.0;
      List<Long> targets = new ArrayList<>();
      int targetCount = Math.min(5, size - 1);
      for (int part = 1; part <= targetCount; part++) {
        int index = (int) Math.ceil((size - 1) * part / (double) targetCount);
        targets.add(nodes.get(index));
      }
      List<Long> elapsed = new ArrayList<>();
      List<Double> routeMiles = new ArrayList<>();
      for (int round = 0; round < warmupRounds + measuredRounds; round++) {
        long start = System.nanoTime();
        double cost = 0;
        for (long target : targets) {
          cost += graph.shortestPathCost(nodes.get(0), target);
        }
        long duration = System.nanoTime() - start;
        if (round >= warmupRounds) {
          elapsed.add(duration);
          routeMiles.add(cost / targets.size());
        }
      }
      results.add(new Result(size, graph.getEdgeCount(), buildMillis,
          median(elapsed) / targets.size() / 1_000.0,
          medianDouble(routeMiles), targets.size()));
      graph = null;
      selected = null;
      System.gc();
    }
    return List.copyOf(results);
  }

  private static List<Long> readNodeOrder(Path file) throws IOException {
    List<Long> ids = new ArrayList<>();
    try (BufferedReader reader = Files.newBufferedReader(file)) {
      reader.readLine();
      String line;
      int expected = 0;
      while ((line = reader.readLine()) != null) {
        String[] fields = line.split(",", 2);
        if (Integer.parseInt(fields[0]) != expected++) {
          throw new IllegalArgumentException("Node order indices must start at zero and be contiguous");
        }
        ids.add(Long.parseLong(fields[1]));
      }
    }
    return ids;
  }

  private static long median(List<Long> values) {
    List<Long> sorted = new ArrayList<>(values);
    Collections.sort(sorted);
    int mid = sorted.size() / 2;
    return sorted.size() % 2 == 0 ? sorted.get(mid - 1) / 2 + sorted.get(mid) / 2 : sorted.get(mid);
  }

  private static double medianDouble(List<Double> values) {
    List<Double> sorted = new ArrayList<>(values);
    Collections.sort(sorted);
    int mid = sorted.size() / 2;
    return sorted.size() % 2 == 0 ? (sorted.get(mid - 1) + sorted.get(mid)) / 2 : sorted.get(mid);
  }

  public static void main(String[] args) throws IOException {
    if (args.length < 2 || args.length > 3) {
      System.err.println("Usage: java OsmScaleBenchmark node-order.csv edges.csv [comma-separated-sizes]");
      System.exit(2);
    }
    List<Integer> sizes = args.length == 3
        ? java.util.Arrays.stream(args[2].split(",")).map(Integer::parseInt).toList()
        : List.of(100, 1_000, 10_000, 100_000, 1_000_000);
    List<Result> results = run(Path.of(args[0]), Path.of(args[1]), sizes, 1, 3);
    System.out.printf(Locale.ROOT, "java=%s%n", Runtime.version());
    System.out.printf(Locale.ROOT, "os=%s %s%n", System.getProperty("os.name"), System.getProperty("os.arch"));
    System.out.printf(Locale.ROOT, "processors=%d%n", Runtime.getRuntime().availableProcessors());
    System.out.println("nodes,directed_edges,graph_build_ms,median_us_per_search,mean_target_route_miles,searches_per_round");
    for (Result row : results) {
      System.out.printf(Locale.ROOT, "%d,%d,%.3f,%.3f,%.4f,%d%n", row.nodes(), row.edges(),
          row.buildMillis(), row.medianMicrosPerSearch(), row.medianRouteMiles(), row.searchesPerRound());
    }
  }
}
