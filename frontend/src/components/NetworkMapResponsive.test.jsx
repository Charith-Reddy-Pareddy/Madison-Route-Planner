import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');

it('keeps map controls reachable on narrow screens', () => {
  expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
  expect(css).toMatch(/\.map-controls\s*\{[^}]*flex-direction:\s*row/s);
  expect(css).toMatch(/\.map-controls button\s*\{[^}]*width:\s*2\.75rem/s);
});
