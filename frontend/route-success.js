export function getRouteSuccessMessage(route) {
  if (route.path.length === 1) return 'Start and destination are the same place.';
  if (route.mode === 'bus') return 'Scheduled bus route found.';
  if (route.mode === 'drive') return 'Driving route found.';
  return `Shortest route found: ${route.path.length} stop(s).`;
}
