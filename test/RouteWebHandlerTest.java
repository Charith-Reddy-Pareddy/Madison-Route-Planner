import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class RouteWebHandlerTest {

  private final RouteWebHandler handler = new RouteWebHandler(
      Path.of("frontend"), Path.of("data"));

  @Test
  void servesTheAppAndItsModules() throws IOException {
    RouteWebHandler.Response page = handler.respond("/");
    RouteWebHandler.Response module = handler.respond("/app.mjs");

    assertEquals(200, page.status());
    assertTrue(new String(page.body(), StandardCharsets.UTF_8).contains("app.mjs"));
    assertEquals("text/javascript; charset=utf-8", module.contentType());
    assertTrue(new String(module.body(), StandardCharsets.UTF_8).contains("loadNetwork"));
  }

  @Test
  void servesOnlyTheRealMadisonDataFiles() throws IOException {
    RouteWebHandler.Response locations = handler.respond("/data/locations.csv");
    RouteWebHandler.Response roads = handler.respond("/data/roads.csv");
    RouteWebHandler.Response unknown = handler.respond("/data/secrets.csv");

    assertEquals(200, locations.status());
    assertTrue(new String(locations.body(), StandardCharsets.UTF_8)
        .startsWith("id,name,lat,lon,"));
    assertEquals(200, roads.status());
    assertTrue(new String(roads.body(), StandardCharsets.UTF_8)
        .startsWith("from,to,walkMiles,"));
    assertEquals(404, unknown.status());
  }

  @Test
  void doesNotServePathsOutsideTheFrontend() throws IOException {
    assertEquals(404, handler.respond("/../pom.xml").status());
    assertEquals(404, handler.respond("/nested/app.mjs").status());
  }
}
