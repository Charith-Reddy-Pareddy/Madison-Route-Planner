import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('travel mode labels', () => {
  it('identifies driving directions in the form and result status', async () => {
    render(<App />);
    const drive = await screen.findByRole('radio', { name: 'Drive' });

    fireEvent.click(drive);

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('Driving route found.');
    });
    expect(screen.getByRole('button', { name: 'Find driving route' })).toBeTruthy();
  });
});
