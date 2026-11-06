export function getRouteProgress(mode) {
  if (mode === 'bus') return 'Finding bus directions...';
  if (mode === 'drive') return 'Finding driving route...';
  return 'Finding walking route...';
}
