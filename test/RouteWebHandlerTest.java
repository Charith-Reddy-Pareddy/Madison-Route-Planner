import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RouteWebHandlerTest {

  @TempDir Path frontendDir;
  private RouteWebHandler handler;

  @BeforeEach
  void setUp() throws IOException {
    Path assets = Files.createDirectories(frontendDir.resolve("assets"));
    Files.writeString(frontendDir.resolve("index.html"),
        "<script type=\"module\" src=\"./assets/app.js\"></script>");
    Files.writeString(assets.resolve("app.js"), "export const app = true;");
    handler = new RouteWebHandler(frontendDir, Path.of("data"));
  }

  @Test
  void servesTheBuiltAppAndItsAssets() throws IOException {
    RouteWebHandler.Response page = handler.respond("/");
    RouteWebHandler.Response bundle = handler.respond("/assets/app.js");

    assertEquals(200, page.status());
    assertTrue(new String(page.body(), StandardCharsets.UTF_8).contains("./assets/app.js"));
    assertEquals("text/javascript; charset=utf-8", bundle.contentType());
    assertTrue(new String(bundle.body(), StandardCharsets.UTF_8).contains("export const app"));
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
    assertEquals(404, handler.respond("/nested/app.js").status());
  }
}
