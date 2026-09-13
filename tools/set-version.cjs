const fs = require('node:fs');
const path = require('node:path');
const { root, packages } = require('./packages.cjs');
const version = process.argv[2];
if (
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta|rc)\.(0|[1-9]\d*))?$/.test(
    version ?? ''
  )
) {
  throw new Error(
    'Usage: npm run version:set -- X.Y.Z[-alpha.N|-beta.N|-rc.N]'
  );
}
const names = new Set(packages.map((manifest) => manifest.name));
for (const directory of ['.', ...require('../package.json').workspaces]) {
  const file = path.join(root, directory, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (directory === '.' || names.has(manifest.name)) manifest.version = version;
  for (const dependencies of [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ]) {
    for (const name of Object.keys(dependencies ?? {})) {
      if (names.has(name)) dependencies[name] = version;
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  'Versions updated. Run npm install --package-lock-only, then npm run check.'
);
