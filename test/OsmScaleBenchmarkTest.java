import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OsmScaleBenchmarkTest {

  @TempDir Path tempDir;

  @Test
  void measuresConnectedNestedGraphAndCountsDistinctDirectedEdges() throws Exception {
    Path nodes = tempDir.resolve("node-order.csv");
    Path edges = tempDir.resolve("edges.csv");
    Files.writeString(nodes, "index,osm_node_id\n0,100\n1,200\n2,300\n3,400\n4,500\n");
    Files.writeString(edges, "from_osm_node_id,to_osm_node_id,miles\n"
        + "100,200,0.1\n200,100,0.1\n"
        + "200,300,0.1\n300,200,0.1\n"
        + "300,400,0.1\n400,300,0.1\n"
        + "400,500,0.1\n500,400,0.1\n");

    OsmScaleBenchmark.Result result = OsmScaleBenchmark.run(nodes, edges, List.of(5), 0, 1).get(0);

    assertEquals(5, result.nodes());
    assertEquals(8, result.edges());
    assertEquals(4, result.searchesPerRound());
    assertEquals(0.25, result.medianRouteMiles(), 0.0001);
    assertTrue(result.medianMicrosPerSearch() > 0);
  }
}
