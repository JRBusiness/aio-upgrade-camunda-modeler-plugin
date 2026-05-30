import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const appData = process.env.APPDATA;
if (!appData) {
  console.error('APPDATA not set; this script targets Windows.');
  process.exit(1);
}

const pluginsDir = path.join(appData, 'camunda-modeler', 'plugins');
const dest = path.join(pluginsDir, 'camunda-modeler-plugin-resize-plus');
const root = process.cwd();

await mkdir(pluginsDir, { recursive: true });
if (existsSync(dest)) await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });

for (const entry of ['index.js', 'package.json', 'README.md', 'client']) {
  const from = path.join(root, entry);
  if (!existsSync(from)) continue;
  await cp(from, path.join(dest, entry), {
    recursive: true,
    filter: (src) => !src.endsWith('.map') && !src.includes(`${path.sep}node_modules${path.sep}`)
  });
}

// Remove the old superseded plugin if present.
const old = path.join(pluginsDir, 'camunda-modeler-plugin-resize-tasks');
if (existsSync(old)) await rm(old, { recursive: true, force: true });

console.log('Deployed to', dest);
