import locationsCsv from '../../data/locations.csv?raw';
import roadsCsv from '../../data/roads.csv?raw';
import { parseCsv } from '../csv.mjs';
import { computeRoute } from './pathfinding.js';

function miles(value) {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number(raw);
}

const network = Object.freeze({
  nodes: parseCsv(locationsCsv).map((row) => ({
    id: row.id,
    name: row.name,
    lat: Number(row.lat),
    lon: Number(row.lon),
  })),
  edges: parseCsv(roadsCsv).map((row) => ({
    from: row.from,
    to: row.to,
    walkMiles: miles(row.walkMiles),
    driveMiles: miles(row.driveMiles),
    accessibleMiles: miles(row.accessibleMiles),
    busRoute: row.busRoute || null,
  })),
});

export async function getGraph() {
  return network;
}

export async function getRoute(startId, endId, mode = 'walk', live = false) {
  if (live) {
    throw new Error('Live routing is available through the local Java server only.');
  }
  return computeRoute(network, startId, endId, mode);
}
