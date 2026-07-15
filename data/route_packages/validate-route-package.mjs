import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateRoutePackageV2 } from '../../frontend/src/utils/routePackageValidator.ts';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node data/route_packages/validate-route-package.mjs <route-package.json>');
  process.exitCode = 2;
} else {
  try {
    const route = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
    const result = validateRoutePackageV2(route);
    if (result.valid) {
      console.log(`VALID ${route.id}@${route.version}`);
    } else {
      console.error(`INVALID ${route.id ?? 'unknown'}@${route.version ?? 'unknown'}`);
      result.issues.forEach((issue) => console.error(`${issue.code} ${issue.path}: ${issue.message}`));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`INPUT_ERROR ${String(error)}`);
    process.exitCode = 2;
  }
}
