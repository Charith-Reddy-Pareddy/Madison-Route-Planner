export function getRouteLegend(mode) {
  if (mode === 'bus') return { showRoadRoute: false, label: '' };
  return { showRoadRoute: true, label: mode === 'drive' ? 'Driving route' : 'Shortest route' };
}
