import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('campus route map', () => {
  it('lets a user choose two real places from the map and draws their route', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelectorAll('.map-node').length).toBeGreaterThan(0));

    function clickPlace(name) {
      const marker = [...container.querySelectorAll('.map-node')]
        .find((node) => node.querySelector('title')?.textContent.startsWith(name));
      expect(marker).toBeDefined();
      fireEvent.click(marker);
    }

    clickPlace('Capitol Square');
    clickPlace('Grainger Hall (Wisconsin School of Business)');

    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Shortest route found/));
    expect(container.querySelector('.map-node.start title').textContent).toContain('Capitol Square');
    expect(container.querySelector('.map-node.end title').textContent)
      .toContain('Grainger Hall (Wisconsin School of Business)');
    expect(container.querySelectorAll('.map-edge.on-path').length).toBeGreaterThan(0);
  });

  it('zooms the real map with its on-map controls', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.map')).not.toBeNull());
    const mapContent = container.querySelector('.map > g');
    const initial = mapContent.getAttribute('transform');

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(mapContent.getAttribute('transform')).not.toBe(initial);
  });
});
