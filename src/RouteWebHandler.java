import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;

/** Serves the browser app and its checked-in Madison data files. */
public final class RouteWebHandler implements HttpHandler {

  record Response(int status, String contentType, byte[] body) {}

  private static final Map<String, String> CONTENT_TYPES = Map.of(
      "html", "text/html; charset=utf-8",
      "css", "text/css; charset=utf-8",
      "mjs", "text/javascript; charset=utf-8",
      "js", "text/javascript; charset=utf-8",
      "csv", "text/csv; charset=utf-8");

  private final Path frontendDir;
  private final Path dataDir;

  public RouteWebHandler(Path frontendDir, Path dataDir) {
    this.frontendDir = Objects.requireNonNull(frontendDir, "frontendDir").toAbsolutePath().normalize();
    this.dataDir = Objects.requireNonNull(dataDir, "dataDir").toAbsolutePath().normalize();
  }

  @Override
  public void handle(HttpExchange exchange) throws IOException {
    String method = exchange.getRequestMethod();
    Response response = "GET".equals(method) || "HEAD".equals(method)
        ? respond(exchange.getRequestURI().getPath())
        : new Response(405, "text/plain; charset=utf-8", bytes("Method not allowed.\n"));
    exchange.getResponseHeaders().set("Content-Type", response.contentType());
    if (response.status() == 405) {
      exchange.getResponseHeaders().set("Allow", "GET, HEAD");
    }
    exchange.sendResponseHeaders(response.status(), "HEAD".equals(method) ? -1 : response.body().length);
    if (!"HEAD".equals(method)) {
      try (OutputStream output = exchange.getResponseBody()) {
        output.write(response.body());
      }
    }
    exchange.close();
  }

  Response respond(String requestPath) throws IOException {
    if (requestPath == null || !requestPath.startsWith("/")) {
      return notFound();
    }

    Path file;
    if (requestPath.equals("/") || requestPath.equals("/index.html")) {
      file = frontendDir.resolve("index.html");
    } else if (requestPath.startsWith("/data/")) {
      String name = requestPath.substring("/data/".length());
      if (!name.equals("locations.csv") && !name.equals("roads.csv")) {
        return notFound();
      }
      file = dataDir.resolve(name);
    } else {
      String name = requestPath.substring(1);
      if (name.contains("/") || name.isBlank()) {
        return notFound();
      }
      file = frontendDir.resolve(name).normalize();
      if (!file.startsWith(frontendDir)) {
        return notFound();
      }
    }

    if (!Files.isRegularFile(file)) {
      return notFound();
    }
    return new Response(200, contentType(file), Files.readAllBytes(file));
  }

  private String contentType(Path file) {
    String name = file.getFileName().toString();
    int dot = name.lastIndexOf('.');
    String extension = dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
    return CONTENT_TYPES.getOrDefault(extension, "application/octet-stream");
  }

  private Response notFound() {
    return new Response(404, "text/plain; charset=utf-8", bytes("Not found.\n"));
  }

  private static byte[] bytes(String text) {
    return text.getBytes(StandardCharsets.UTF_8);
  }
}
