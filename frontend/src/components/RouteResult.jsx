function formatMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}

export default function RouteResult({ statusType, statusMessage, route, nodesById }) {
  const pathNames = new Map((route?.path ?? []).map((node) => [node.id, node.name]));
  const nameOf = (id, fallback) => fallback ?? pathNames.get(id) ?? nodesById.get(id)?.name ?? id;
  const isDrive = route?.mode === 'drive';
  const isAccessible = route?.mode === 'accessible';
  const isBus = route?.mode === 'bus';

  return (
    <>
      <div className={statusType === 'error' ? 'status error' : 'status'} role="status" aria-live="polite">
        {statusMessage}
      </div>

      {route && route.path.length > 0 && (
        <div className="route-endpoints">
          <span className="endpoint-tag start">{nameOf(route.path[0].id, route.path[0].name)}</span>
          <span aria-hidden="true">&rarr;</span>
          <span className="endpoint-tag end">{nameOf(route.path[route.path.length - 1].id, route.path[route.path.length - 1].name)}</span>
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
          <ol className="steps">
            {route.segments.map((segment, i) => {
              const from = nameOf(segment.from, segment.fromName);
              const to = nameOf(segment.to, segment.toName);
              if (segment.mode === 'wait') {
                return <li key={\`wait-\${i}\`}>Wait at {from} (~{formatMinutes(segment.minutes)} min)</li>;
              }
              if (segment.mode === 'bus') {
                return (
                  <li key={\`bus-\${i}\`}>
                    Board <span className="mode-tag bus">{segment.busRoute}</span> at {from} and get off at {to}
                    {segment.departureTime ? \` (\${segment.departureTime}–\${segment.arrivalTime})\` : ''}
                  </li>
                );
              }
              return (
                <li key={\`walk-\${i}\`}>
                  Walk {from} &rarr; {to} ({segment.miles} mi, ~{segment.minutes} min)
                </li>
              );
            })}
            <li className="total">
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
                    <li key={\`bus-suggestion-\${i}\`}>
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
