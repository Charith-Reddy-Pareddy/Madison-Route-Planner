import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App.jsx';

it('resets the next map pick after swapping searched endpoints', async () => {
  const { container } = render(<App />);
  const start = await screen.findByRole('combobox', { name: 'Start' });
  const end = screen.getByRole('combobox', { name: 'End' });
  await waitFor(() => expect(end.value).not.toBe(''));
  const previousEnd = end.value;
  const hint = () => container.querySelector('.map-hint').textContent;

  fireEvent.change(start, { target: { value: 'Capitol Square' } });
  fireEvent.click(screen.getByRole('option', { name: 'Capitol Square' }));
  expect(hint()).toMatch(/set the end/i);

  fireEvent.click(screen.getByRole('button', { name: 'Swap start and end' }));

  await waitFor(() => expect(start.value).toBe(previousEnd));
  expect(end.value).toBe('Capitol Square');
  expect(hint()).toMatch(/set the start/i);
});
