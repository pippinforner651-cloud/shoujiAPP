import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const frontendRoot = resolve(process.argv[2] ?? resolve(repositoryRoot, 'frontend'));
const distRoot = resolve(frontendRoot, 'dist');
const stagingRoot = resolve(frontendRoot, '.sites-static-staging');
const workerSource = resolve(repositoryRoot, 'scripts/sites/static-worker.mjs');

if (!existsSync(resolve(distRoot, 'index.html'))) {
  throw new Error('Run the V2 Vite production build before preparing the Sites archive.');
}

rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagingRoot, { recursive: true });
for (const entry of readdirSync(distRoot)) {
  cpSync(resolve(distRoot, entry), resolve(stagingRoot, entry), { recursive: true });
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(resolve(distRoot, 'static'), { recursive: true });
mkdirSync(resolve(distRoot, 'server'), { recursive: true });
for (const entry of readdirSync(stagingRoot)) {
  cpSync(resolve(stagingRoot, entry), resolve(distRoot, 'static', entry), { recursive: true });
}
rmSync(stagingRoot, { recursive: true, force: true });

writeFileSync(
  resolve(distRoot, 'server', 'index.js'),
  readFileSync(workerSource, 'utf8'),
  'utf8',
);

console.log(`Prepared static Sites build at ${distRoot}`);

