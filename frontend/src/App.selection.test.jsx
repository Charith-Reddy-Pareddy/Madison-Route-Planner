import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('route selection updates', () => {
  it('clears the old route while the next map place is being selected', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelectorAll('.map-edge.on-path').length).toBeGreaterThan(0));

    const clickPlace = (name) => {
      const marker = [...container.querySelectorAll('.map-node')]
        .find((node) => node.querySelector('title')?.textContent.startsWith(name));
      expect(marker).toBeDefined();
      fireEvent.click(marker);
    };

    clickPlace('Capitol Square');

    expect(container.querySelectorAll('.map-edge.on-path')).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Walking directions' })).toBeNull();

    clickPlace('Grainger Hall (Wisconsin School of Business)');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Shortest route found/));
    expect(container.querySelectorAll('.map-edge.on-path').length).toBeGreaterThan(0);
  });
});
