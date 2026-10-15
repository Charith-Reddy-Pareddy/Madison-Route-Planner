function formatMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}

function groupBusLegs(segments) {
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
      if (segment.arrivalTime) previous.arrivalTime = segment.arrivalTime;
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

const routeTones = ['route-tone-0', 'route-tone-1', 'route-tone-2', 'route-tone-3'];

export default function RouteResult({ statusType, statusMessage, route, nodesById }) {
  const pathNames = new Map((route?.path ?? []).map((node) => [node.id, node.name]));
  const nameOf = (id, fallback) => fallback ?? pathNames.get(id) ?? nodesById.get(id)?.name ?? id;
  const isDrive = route?.mode === 'drive';
  const isAccessible = route?.mode === 'accessible';
  const isBus = route?.mode === 'bus';
  const directions = isBus ? groupBusLegs(route.segments) : route?.segments ?? [];
  const busRouteSequence = directions.reduce((routes, leg) => {
    if (leg.mode === 'bus' && routes.at(-1) !== leg.busRoute) routes.push(leg.busRoute);
    return routes;
  }, []);
  const routeTone = (routeName) => routeTones[Math.max(0, busRouteSequence.indexOf(routeName)) % routeTones.length];
  const transferCount = directions.filter((leg) => leg.mode === 'transfer').length;

  return (
    <>
      <div className={statusType === 'error' ? 'status error' : 'status'} role="status" aria-live="polite">
        {statusMessage}
      </div>

      {route && route.path.length > 0 && (
        <div className="route-endpoints">
          <span className="endpoint-tag start">{nameOf(route.path[0].id, route.path[0].name)}</span>
          <span aria-hidden="true">&rarr;</span>
          <span className="endpoint-tag end">
            {nameOf(route.path[route.path.length - 1].id, route.path[route.path.length - 1].name)}
          </span>
        </div>
      )}

      {route && (
        <>
          <h3 className="section-label">
            {isBus
              ? 'Bus directions'
              : isDrive
                ? 'Driving directions'
                : isAccessible
                  ? 'Accessible walking directions (no stairs, no steep inclines)'
                  : 'Walking directions'}
          </h3>
          {isDrive && 'live' in route && (
            <p className={route.live ? 'live-status live' : 'live-status'}>
              {route.live
                ? 'Distances refreshed from a live routing API just now.'
                : 'Using precomputed distances (live data was off, or a leg fell back after the live API didn’t respond).'}
            </p>
          )}
          {isBus && busRouteSequence.length > 1 && (
            <section className="bus-itinerary-summary" aria-label="Bus route overview">
              <p>
                <strong>{busRouteSequence.length} bus routes</strong> · {transferCount} {transferCount === 1 ? 'transfer' : 'transfers'}
              </p>
              <ol className="bus-route-sequence" aria-label="Route order">
                {busRouteSequence.map((busRoute, i) => (
                  <li key={`${busRoute}-${i}`}>
                    <span aria-hidden="true" className="sequence-number">{i + 1}</span>
                    <span className={`route-pill ${routeTone(busRoute)}`}>{busRoute}</span>
                    {i < busRouteSequence.length - 1 && <span className="route-sequence-arrow" aria-hidden="true">→</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          <ol className={isBus ? 'transit-steps' : 'steps'}>
            {directions.map((segment, i) => {
              const from = nameOf(segment.from, segment.fromName);
              const to = nameOf(segment.to, segment.toName);
              if (segment.mode === 'transfer') {
                return (
                  <li className="transit-step transit-transfer" key={'transfer-' + i}>
                    <span className="transit-step-kind">Transfer</span>
                    <strong>Change buses at {nameOf(segment.at)}</strong>
                    <span className="transfer-routes">
                      <span className={`route-pill ${routeTone(segment.fromRoute)}`}>{segment.fromRoute}</span>
                      <span aria-hidden="true">→</span>
                      <span className={`route-pill ${routeTone(segment.toRoute)}`}>{segment.toRoute}</span>
                    </span>
                  </li>
                );
              }
              if (segment.mode === 'wait') {
                return (
                  <li className="transit-step transit-step-wait" key={'wait-' + i}>
                    <span className="transit-step-kind">Wait</span>
                    <strong>{from}</strong>
                    <span>About {formatMinutes(segment.minutes)} min</span>
                  </li>
                );
              }
              if (segment.mode === 'bus') {
                return (
                  <li className={`transit-step transit-step-bus ${routeTone(segment.busRoute)}`} key={'bus-' + i}>
                    <span className="transit-step-kind">Ride bus</span>
                    <strong className={`route-pill ${routeTone(segment.busRoute)}`}>{segment.busRoute}</strong>
                    <span className="transit-step-stops">{from} <span aria-hidden="true">→</span> {to}</span>
                    {segment.departureTime && (
                      <span className="transit-step-time">Departs {segment.departureTime} · Arrives {segment.arrivalTime}</span>
                    )}
                  </li>
                );
              }
              if (segment.mode === 'walk') {
                return (
                  <li className="transit-step transit-step-walk" key={'walk-' + i}>
                    <span className="transit-step-kind">Walk</span>
                    <strong className="transit-step-stops">{from} <span aria-hidden="true">→</span> {to}</strong>
                    <span>{segment.miles} mi · about {formatMinutes(segment.minutes)} min</span>
                  </li>
                );
              }
              return (
                <li key={String(segment.from) + '-' + String(segment.to) + '-' + i}>
                  {from} &rarr; {to} ({segment.miles} mi, {segment.minutes} min)
                </li>
              );
            })}
            <li className={isBus ? 'transit-total' : 'total'}>
              Total: {route.totalMiles} mi, ~{route.totalMinutes} min
              {isBus ? ' including waits' : isDrive ? ' by car' : ' on foot'}
            </li>
          </ol>

          {isBus && (
            <p className="transit-disclaimer">
              Times use Madison Metro’s published schedule.{' '}
              {route.feedSource && (
                <a href={route.feedSource} target="_blank" rel="noreferrer">Feed source</a>
              )}
              {route.retrievedAt && <> · Feed refreshed {new Date(route.retrievedAt).toLocaleDateString()}</>}
            </p>
          )}

          {!isDrive && !isBus && (
            <>
              <h3 className="section-label">Bus trips along this route</h3>
              {route.segments.some((segment) => segment.busRoute) ? (
                <ul className="bus-trips">
                  {route.segments.filter((segment) => segment.busRoute).map((segment, i) => (
                    <li key={'bus-suggestion-' + i}>
                      <span className="mode-tag bus">{segment.busRoute}</span>{' '}
                      {nameOf(segment.from, segment.fromName)} &rarr; {nameOf(segment.to, segment.toName)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-bus">No bus route covers this trip -- it’s a walk the whole way.</p>
              )}
              <p className="transit-disclaimer">
                Bus suggestions are illustrative, based on Metro Transit’s published routes -- check{' '}
                <a href="https://www.cityofmadison.com/metro/routes-schedules" target="_blank" rel="noreferrer">
                  Metro Transit
                </a>{' '}
                for live times.
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
