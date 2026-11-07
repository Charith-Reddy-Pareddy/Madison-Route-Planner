export function canSwapPlaces(nodes, startId, endId) {
  return nodes.some((node) => node.id === startId) && nodes.some((node) => node.id === endId);
}
