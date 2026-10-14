const EARTH_MI = 3958.8;
const WALK_MPH = 3;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function localDate(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]));
  values.weekday = values.weekday.toLowerCase();
  return values;
}

function dateKey(year, month, day) {
  return `${year}${month}${day}`;
}

function dayBefore({ year, month, day }) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) - 1));
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
    weekday: WEEKDAYS[date.getUTCDay()],
  };
}

function activeServices(feed, date) {
  const key = dateKey(date.year, date.month, date.day);
  const active = new Set();
  for (const row of feed.calendar ?? []) {
    if (row.start_date <= key && key <= row.end_date && row[date.weekday] === '1') {
      active.add(row.service_id);
    }
  }
  for (const row of feed.calendar_dates ?? []) {
    if (row.date !== key) continue;
    if (row.exception_type === '1') active.add(row.service_id);
    if (row.exception_type === '2') active.delete(row.service_id);
  }
  return active;
}

function distanceMiles(a, b) {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.sqrt(value));
}

function walkSeconds(miles) {
  return Math.ceil((miles / WALK_MPH) * 3600);
}

function formatClock(seconds) {
  const daySeconds = ((seconds % 86400) + 86400) % 86400;
  const hour = String(Math.floor(daySeconds / 3600)).padStart(2, '0');
  const minute = String(Math.floor((daySeconds % 3600) / 60)).padStart(2, '0');
  return `${hour}:${minute}`;
}

class TimeHeap {
  items = [];

  push(value) {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.items[p].at <= this.items[i].at) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      i = p;
    }
  }

  pop() {
    if (!this.items.length) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = left + 1;
        let min = i;
        if (left < this.items.length && this.items[left].at < this.items[min].at) min = left;
        if (right < this.items.length && this.items[right].at < this.items[min].at) min = right;
        if (min === i) break;
        [this.items[i], this.items[min]] = [this.items[min], this.items[i]];
        i = min;
      }
    }
    return top;
  }
}

function scheduleEdges(feed, nowAt, today, timezone, stopsById, routesById, tripsById) {
  const stopTimesByTrip = new Map();
  for (const row of feed.stop_times ?? []) {
    const trip = tripsById.get(row.trip_id);
    if (!trip) continue;
    let rows = stopTimesByTrip.get(row.trip_id);
    if (!rows) stopTimesByTrip.set(row.trip_id, (rows = []));
    rows.push(row);
  }

  const dates = [
    { date: dayBefore(today), offset: -86400 },
    { date: today, offset: 0 },
  ];
  const edges = [];
  for (const { date, offset } of dates) {
    const services = activeServices(feed, date);
    for (const [tripId, rows] of stopTimesByTrip) {
      const trip = tripsById.get(tripId);
      if (!services.has(trip.service_id)) continue;
      rows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
      for (let i = 0; i < rows.length - 1; i++) {
        const fromRow = rows[i];
        const toRow = rows[i + 1];
        const fromStop = stopsById.get(fromRow.stop_id);
        const toStop = stopsById.get(toRow.stop_id);
        const depart = parseTime(fromRow.departure_time);
        let arrive = parseTime(toRow.arrival_time);
        if (!fromStop || !toStop || depart === null || arrive === null) continue;
        if (arrive < depart) arrive += 86400;
        const departure = offset + depart;
        const arrival = offset + arrive;
        if (departure < nowAt || arrival < departure) continue;
        const route = routesById.get(trip.route_id);
        if (!route) continue;
        edges.push({
          from: fromStop.stop_id,
          to: toStop.stop_id,
          fromStop,
          toStop,
          departure,
          arrival,
          tripId,
          routeId: route.route_id,
          routeName: route.route_short_name || route.route_long_name || route.route_id,
        });
      }
    }
  }

  const byStop = new Map();
  for (const edge of edges) {
    let rows = byStop.get(edge.from);
    if (!rows) byStop.set(edge.from, (rows = []));
    rows.push(edge);
  }
  for (const rows of byStop.values()) rows.sort((a, b) => a.departure - b.departure);
  return byStop;
}

export function computeTransitRoute(network, feed, startId, endId, now = new Date()) {
  const places = new Map(network.nodes.map((node) => [node.id, node]));
  const start = places.get(startId);
  const end = places.get(endId);
  if (!start || !end) throw new Error('unknown intersection id');
  if (startId === endId) {
    return { path: [{ id: startId, name: start.name }], segments: [], totalMiles: 0, totalMinutes: 0, mode: 'bus' };
  }

  const agency = feed.agency?.[0];
  const timezone = agency?.agency_timezone || 'America/Chicago';
  const today = localDate(now, timezone);
  const nowAt = Number(today.hour) * 3600 + Number(today.minute) * 60 + Number(today.second);
  const stopsById = new Map((feed.stops ?? []).map((stop) => [stop.stop_id, {
    ...stop,
    lat: Number(stop.stop_lat),
    lon: Number(stop.stop_lon),
  }]));
  const routesById = new Map((feed.routes ?? []).map((route) => [route.route_id, route]));
  const tripsById = new Map((feed.trips ?? []).map((trip) => [trip.trip_id, trip]));
  if (!stopsById.size || !routesById.size || !tripsById.size) {
    throw new Error('Metro Transit schedule feed is empty or incomplete.');
  }

  const adjacent = scheduleEdges(feed, nowAt, today, timezone, stopsById, routesById, tripsById);
  const nearest = (place) => [...stopsById.values()]
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
    .map((stop) => ({ stop, miles: distanceMiles(place, stop) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 8);

  const starts = nearest(start);
  const ends = new Map(nearest(end).map(({ stop, miles }) => [stop.stop_id, miles]));
  if (!starts.length || !ends.size) throw new Error('No Metro Transit stops are near these locations.');

  const best = new Map();
  const cameBy = new Map();
  const startWalk = new Map();
  const heap = new TimeHeap();
  for (const { stop, miles } of starts) {
    const at = nowAt + walkSeconds(miles);
    if (at < (best.get(stop.stop_id) ?? Infinity)) {
      best.set(stop.stop_id, at);
      startWalk.set(stop.stop_id, miles);
      heap.push({ stopId: stop.stop_id, at });
    }
  }

  while (heap.items.length) {
    const current = heap.pop();
    if (current.at !== best.get(current.stopId)) continue;
    for (const edge of adjacent.get(current.stopId) ?? []) {
      if (edge.departure < current.at) continue;
      if (edge.arrival >= (best.get(edge.to) ?? Infinity)) continue;
      best.set(edge.to, edge.arrival);
      cameBy.set(edge.to, edge);
      heap.push({ stopId: edge.to, at: edge.arrival });
    }
  }

  let finish = null;
  for (const [stopId, walkMiles] of ends) {
    const at = best.get(stopId);
    if (at === undefined || !cameBy.has(stopId)) continue;
    const totalAt = at + walkSeconds(walkMiles);
    if (!finish || totalAt < finish.totalAt) finish = { stopId, walkMiles, at, totalAt };
  }
  if (!finish) throw new Error('No scheduled bus route is available between these locations right now.');

  const rides = [];
  let stopId = finish.stopId;
  while (cameBy.has(stopId)) {
    const edge = cameBy.get(stopId);
    rides.unshift(edge);
    stopId = edge.from;
  }
  const firstStop = stopId;
  const stopNames = new Map([...stopsById].map(([id, stop]) => [id, stop.stop_name || id]));
  const segments = [];
  let totalMiles = startWalk.get(firstStop) ?? 0;
  if (totalMiles > 0.005) {
    segments.push({
      mode: 'walk',
      from: startId,
      to: firstStop,
      fromName: start.name,
      toName: stopNames.get(firstStop),
      miles: Math.round(totalMiles * 100) / 100,
      minutes: Math.ceil(walkSeconds(totalMiles) / 60),
    });
  }

  let cursorAt = best.get(firstStop);
  let pathIds = [startId, firstStop];
  for (let i = 0; i < rides.length;) {
    const first = rides[i];
    if (first.departure > cursorAt) {
      segments.push({
        mode: 'wait',
        from: first.from,
        to: first.from,
        fromName: stopNames.get(first.from),
        toName: stopNames.get(first.from),
        miles: 0,
        minutes: Math.ceil((first.departure - cursorAt) / 60),
      });
    }
    let last = first;
    let miles = distanceMiles(first.fromStop, first.toStop);
    pathIds.push(first.to);
    i++;
    while (i < rides.length && rides[i].tripId === first.tripId && rides[i].from === last.to) {
      last = rides[i];
      miles += distanceMiles(last.fromStop, last.toStop);
      pathIds.push(last.to);
      i++;
    }
    segments.push({
      mode: 'bus',
      from: first.from,
      to: last.to,
      fromName: stopNames.get(first.from),
      toName: stopNames.get(last.to),
      busRoute: first.routeName,
      miles: Math.round(miles * 100) / 100,
      minutes: Math.ceil((last.arrival - first.departure) / 60),
      departureTime: formatClock(first.departure),
      arrivalTime: formatClock(last.arrival),
    });
    totalMiles += miles;
    cursorAt = last.arrival;
  }

  const lastStop = finish.stopId;
  if (finish.walkMiles > 0.005) {
    segments.push({
      mode: 'walk',
      from: lastStop,
      to: endId,
      fromName: stopNames.get(lastStop),
      toName: end.name,
      miles: Math.round(finish.walkMiles * 100) / 100,
      minutes: Math.ceil(walkSeconds(finish.walkMiles) / 60),
    });
  }
  totalMiles += finish.walkMiles;
  pathIds.push(endId);

  const path = [...new Set(pathIds)].map((id) => ({
    id,
    name: places.get(id)?.name ?? stopNames.get(id) ?? id,
  }));
  return {
    path,
    segments,
    totalMiles: Math.round(totalMiles * 100) / 100,
    totalMinutes: Math.ceil((finish.totalAt - nowAt) / 60),
    mode: 'bus',
    feedSource: feed.source,
    retrievedAt: feed.retrievedAt,
  };
}
