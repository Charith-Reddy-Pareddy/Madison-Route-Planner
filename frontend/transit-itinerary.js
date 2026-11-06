export function formatScheduleTime(time, dayOffset = 0) {
  const day = dayOffset === 1 ? ' (+1 day)' : dayOffset > 1 ? ` (+${dayOffset} days)` : '';
  return `${time}${day}`;
}

export function groupBusLegs(segments) {
  const grouped = [];
  for (const segment of segments) {
    const previous = grouped.at(-1);
    const sameMode = previous?.mode === segment.mode;
    const sameRoute = segment.mode !== 'bus' || previous?.busRoute === segment.busRoute;
    const canGroup = segment.mode === 'bus' || segment.mode === 'walk';
    if (canGroup && sameMode && sameRoute && previous.to === segment.from) {
      previous.to = segment.to;
      previous.toName = segment.toName;
      previous.miles += segment.miles;
      previous.minutes += segment.minutes;
      if (segment.arrivalTime) {
        previous.arrivalTime = segment.arrivalTime;
        previous.arrivalDayOffset = segment.arrivalDayOffset;
      }
    } else {
      grouped.push({ ...segment });
    }
  }

  const directions = [];
  let previousRoute = null;
  for (const leg of grouped) {
    if (leg.mode === 'bus' && previousRoute && leg.busRoute !== previousRoute) {
      const transfer = {
        mode: 'transfer',
        at: leg.from,
        fromRoute: previousRoute,
        toRoute: leg.busRoute,
      };
      const last = directions[directions.length - 1];
      const index = last?.mode === 'wait' ? directions.length - 1 : directions.length;
      directions.splice(index, 0, transfer);
    }
    directions.push(leg);
    if (leg.mode === 'bus') previousRoute = leg.busRoute;
  }
  return directions.map((leg) => (
    leg.miles == null ? leg : { ...leg, miles: Math.round(leg.miles * 100) / 100 }
  ));
}
