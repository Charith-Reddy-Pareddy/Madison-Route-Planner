import { describe, expect, it } from 'vitest';
import { getGraph, getRoute } from './api.js';

describe('real Madison network', () => {
  it('loads named locations and road connections from the project CSV files', async () => {
    const graph = await getGraph();
    const place = graph.nodes.find((node) => node.id === 'grainger_hall');

    expect(place.name).toBe('Grainger Hall (Wisconsin School of Business)');
    expect(Number.isFinite(place.lat)).toBe(true);
    expect(Number.isFinite(place.lon)).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(100);
    expect(graph.edges.every((edge) => graph.nodes.some((node) => node.id === edge.from)
      && graph.nodes.some((node) => node.id === edge.to))).toBe(true);
  });

  it('finds the real walking route from Capitol Square to Grainger Hall', async () => {
    const route = await getRoute('capitol', 'grainger_hall', 'walk');

    expect(route.path[0].id).toBe('capitol');
    expect(route.path.at(-1).id).toBe('grainger_hall');
    expect(route.totalMiles).toBeGreaterThan(0);
    expect(route.segments.length).toBeGreaterThan(0);
  });
});
