# Madison Route Planner

An interactive route planner for campus and nearby places in Madison, Wisconsin. Choose two locations to compare walking or driving routes, or find a trip using Madison Metro's scheduled bus service.

## Features

- Search for places or choose them from the map.
- Explore the local street and place network with map zoom and drag controls.
- Find walking and driving routes through the curated road graph.
- Browse scheduled bus trips, including transfers and walking connections.
- Run the browser app locally or start the Java HTTP server for the local API.

## Requirements

- Java 21 or newer
- Maven 3.9 or newer
- Node.js 24 and npm
- Python 3.10 or newer

## Run locally

Install the frontend dependencies:

```sh
npm ci --prefix frontend
```

Start the browser app in development mode:

```sh
npm --prefix frontend run dev
```

Open the local URL printed by Vite. The development and build commands prepare the Madison Metro schedule data with `scripts/gtfs_ingest.py`. The script downloads the current static GTFS feed and validates it before writing `frontend/public/metro-gtfs.json`.

To build the frontend and start the Java server instead:

```sh
./scripts/run-local.sh
```

Then open [http://localhost:8080](http://localhost:8080). The server loads the checked-in location and road data and serves the built app. Pass a port number to the script to use a different port:

```sh
./scripts/run-local.sh 8081
```

## Checks

Run the frontend lint and React tests:

```sh
npm ci --prefix frontend
npm --prefix frontend run lint
npm --prefix frontend test -- --configLoader runner
```

Run the standalone JavaScript tests and Java tests:

```sh
node --test frontend/*.test.mjs test/frontend-syntax.test.mjs test/report-outline.test.mjs
mvn test
```

Build the GitHub Pages site locally into a new output directory:

```sh
scripts/build-pages.sh /tmp/madison-route-planner-site
PAGES_DIR=/tmp/madison-route-planner-site node --test test/pages-artifact.test.mjs
```

For the longer local Pages build-and-serve checks, run `node --test test/pages-build.test.mjs test/pages-serve.test.mjs` after installing frontend dependencies.

GitHub Actions runs frontend lint, frontend and JavaScript tests, a production Pages build and artifact check, and the Maven test suite for pushes to `main` and pull requests targeting `main`. The separate Pages workflow builds and deploys the published site from `main`.

## Project layout

- `frontend/` — React app, route calculations, transit itinerary logic, and frontend tests.
- `src/` — Java graph, routing service, command-line tool, and local HTTP server.
- `data/locations.csv` and `data/roads.csv` — curated Madison place and road graph.
- `scripts/gtfs_ingest.py` — validates and normalizes Madison Metro's static GTFS feed.
- `benchmarks/` and `docs/` — graph measurements and the project research report.

## Data and attribution

The app's code is licensed under the MIT License; see [`LICENSE`](LICENSE). The location, road, and transit datasets come from separately identified sources and are not covered by the code license. See [`data/sources.md`](data/sources.md) for source details and data notes. Transit schedules are provided by [Madison Metro Transit](https://www.cityofmadison.com/metro).
