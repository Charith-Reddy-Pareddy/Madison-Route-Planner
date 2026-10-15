import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RouteForm from './RouteForm.jsx';

const nodes = [
  { id: 'bascom', name: 'Bascom Hall' },
  { id: 'capitol', name: 'Capitol Square' },
  { id: 'grainger', name: 'Grainger Hall' },
];

function renderForm() {
  const onStartChange = vi.fn();
  const onEndChange = vi.fn();
  render(
    <RouteForm
      nodes={nodes}
      startId="bascom"
      endId="grainger"
      mode="walk"
      onModeChange={vi.fn()}
      live={false}
      onLiveChange={vi.fn()}
      onStartChange={onStartChange}
      onEndChange={onEndChange}
      onSubmit={vi.fn((event) => event.preventDefault())}
      onSwap={vi.fn()}
      loading={false}
    />,
  );
  return { onStartChange, onEndChange };
}

describe('searchable route locations', () => {
  it('filters places and selects a matching start location', () => {
    const { onStartChange } = renderForm();
    const start = screen.getByRole('combobox', { name: 'Start' });

    fireEvent.change(start, { target: { value: 'capitol' } });

    expect(screen.getByRole('option', { name: 'Capitol Square' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Bascom Hall' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Capitol Square' }));

    expect(start.value).toBe('Capitol Square');
    expect(onStartChange).toHaveBeenLastCalledWith('capitol');
  });

  it('selects the active matching place with the keyboard', () => {
    const { onEndChange } = renderForm();
    const end = screen.getByRole('combobox', { name: 'End' });

    fireEvent.change(end, { target: { value: 'grainger' } });
    fireEvent.keyDown(end, { key: 'Enter' });

    expect(end.value).toBe('Grainger Hall');
    expect(onEndChange).toHaveBeenLastCalledWith('grainger');
    expect(screen.queryByRole('listbox', { name: 'End places' })).toBeNull();
  });
});
