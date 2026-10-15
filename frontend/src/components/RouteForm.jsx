import { useEffect, useMemo, useState } from 'react';

function LocationPicker({ id, label, nodes, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = nodes.find((node) => node.id === value);
  const matches = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return nodes
      .filter((node) => !text || node.name.toLocaleLowerCase().includes(text))
      .slice(0, 8);
  }, [nodes, query]);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected?.id, selected?.name]);

  function choose(node) {
    setQuery(node.name);
    setOpen(false);
    setActive(0);
    onChange(node.id);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (e.key === 'Enter' && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="location-picker" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={`${id}-options`}
        aria-activedescendant={open && matches[active] ? `${id}-option-${matches[active].id}` : undefined}
        aria-invalid={!selected}
        autoComplete="off"
        required
        value={query}
        placeholder="Search places"
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const text = e.target.value;
          setQuery(text);
          setOpen(true);
          setActive(0);
          const exact = nodes.find((node) => node.name.toLocaleLowerCase() === text.trim().toLocaleLowerCase());
          onChange(exact?.id ?? '');
        }}
      />
      {open && matches.length > 0 && (
        <ul id={`${id}-options`} className="location-options" role="listbox" aria-label={`${label} places`}>
          {matches.map((node, index) => (
            <li
              id={`${id}-option-${node.id}`}
              key={node.id}
              role="option"
              aria-selected={node.id === value}
              className={index === active ? 'active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(node)}
            >
              {node.name}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && matches.length === 0 && (
        <p className="location-empty" role="status">No places match “{query}”.</p>
      )}
    </div>
  );
}

export default function RouteForm({
  nodes,
  startId,
  endId,
  mode,
  onModeChange,
  live,
  onLiveChange,
  onStartChange,
  onEndChange,
  onSubmit,
  onSwap,
  loading,
}) {
  const sorted = useMemo(() => [...nodes].sort((a, b) => a.name.localeCompare(b.name)), [nodes]);
  const [formError, setFormError] = useState('');

  function handleSubmit(e) {
    if (!nodes.some((node) => node.id === startId) || !nodes.some((node) => node.id === endId)) {
      e.preventDefault();
      setFormError('Choose both places from the search results before finding a route.');
      return;
    }
    setFormError('');
    onSubmit(e);
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="mode-toggle">
        <legend>Travel mode</legend>
        <label>
          <input type="radio" name="mode" value="walk" checked={mode === 'walk'} onChange={() => onModeChange('walk')} />
          Walk
        </label>
        <label>
          <input type="radio" name="mode" value="drive" checked={mode === 'drive'} onChange={() => onModeChange('drive')} />
          Drive
        </label>
        <label>
          <input type="radio" name="mode" value="bus" checked={mode === 'bus'} onChange={() => onModeChange('bus')} />
          Bus
        </label>
      </fieldset>
      {mode === 'drive' && (
        <label className="live-toggle">
          <input type="checkbox" checked={live} onChange={(e) => onLiveChange(e.target.checked)} />
          Use live routing data (real-time, requires the backend)
        </label>
      )}
      <LocationPicker id="route-start" label="Start" nodes={sorted} value={startId} onChange={(id) => { onStartChange(id); setFormError(''); }} />
      <button type="button" className="swap-button" onClick={onSwap} aria-label="Swap start and end">
        ⇅ Swap
      </button>
      <LocationPicker id="route-end" label="End" nodes={sorted} value={endId} onChange={(id) => { onEndChange(id); setFormError(''); }} />
      {formError && <p className="location-error" role="alert">{formError}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Calculating...' : 'Find shortest route'}
      </button>
    </form>
  );
}
