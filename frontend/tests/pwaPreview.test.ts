import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import staticWorker from '../../scripts/sites/static-worker.mjs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('PWA identifies itself as the E23 V2 preview and supports standalone launch', () => {
  const manifest = JSON.parse(read('../public/manifest.v2.json')) as {
    name: string;
    short_name: string;
    description: string;
    display: string;
    start_url: string;
    scope: string;
    icons: Array<{ sizes: string; purpose?: string }>;
  };
  const html = read('../index.html');
  const vite = read('../vite.config.ts');

  assert.match(manifest.name, /E23 V2预览测试版/);
  assert.match(manifest.short_name, /E23/);
  assert.match(manifest.description, /预览测试版/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /__E23_APP_TITLE__/);
  assert.match(vite, /E23 V2预览测试版/);
  assert.match(vite, /manifest\.v2\.json/);
});

test('PWA registers an offline-capable service worker without fake multiplayer data', () => {
  const main = read('../src/main.tsx');
  const worker = read('../public/sw.js');

  assert.match(main, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(worker, /fetch/);
  assert.match(worker, /caches\.open/);
  assert.match(worker, /manifest\.v2\.json/);
  assert.doesNotMatch(worker, /runner|ranking|leaderboard|multiplayer|跑者|排行/i);
});

test('preview startup records a local persistence probe only in the V2 preview', () => {
  const main = read('../src/main.tsx');

  assert.match(main, /IS_V2_PREVIEW/);
  assert.match(main, /E23_STARTUP_PERSISTENCE_V1/);
  assert.match(main, /\[E23_STARTUP\] PERSISTENCE_READY/);
});

test('Sites worker serves the PWA shell for direct Safari routes', async () => {
  const requests: string[] = [];
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        const pathname = new URL(request.url).pathname;
        requests.push(pathname);
        return pathname === '/index.html'
          ? new Response('E23 V2 preview shell', { status: 200 })
          : new Response('missing', { status: 404 });
      },
    },
  };

  const response = await staticWorker.fetch(
    new Request('https://preview.example/my', { headers: { accept: 'text/html' } }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'E23 V2 preview shell');
  assert.deepEqual(requests, ['/my', '/index.html']);
});
