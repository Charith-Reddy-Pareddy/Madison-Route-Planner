import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(root, '.github/workflows/pages.yml'), 'utf8');

test('Pages deployment builds the checked-in site on main and manual runs', () => {
  assert.match(workflow, /^on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:\s*$/m);
  assert.match(workflow, /run: scripts\/build-pages\.sh _site/);
  assert.match(workflow, /uses: actions\/configure-pages@v5\n        with:\n          enablement: true\n          token: \$\{\{ secrets\.PAGES_TOKEN \}\}/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /path: _site/);
});

test('Pages deployment waits for the artifact and grants deploy-only permissions', () => {
  assert.match(workflow, /deploy:\n    needs: build/);
  assert.match(workflow, /environment:\n      name: github-pages/);
  assert.match(workflow, /pages: write\n      id-token: write/);
  assert.match(workflow, /uses: actions\/deploy-pages@v5/);
});
