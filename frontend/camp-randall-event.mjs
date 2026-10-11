// Directed road connections modeled as closed for the Camp Randall event.
export const eventClosures = Object.freeze([
  Object.freeze({ from: 'camp_randall', to: 'regent_park', status: 'closed' }),
  Object.freeze({ from: 'regent_park', to: 'camp_randall', status: 'closed' }),
  Object.freeze({ from: 'camp_randall', to: 'monroe_edgewood', status: 'closed' }),
  Object.freeze({ from: 'monroe_edgewood', to: 'camp_randall', status: 'closed' })
]);
