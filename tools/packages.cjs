const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workspaces = require('../package.json').workspaces;
const packages = workspaces
  .map((directory) => ({
    directory,
    ...require(path.join(root, directory, 'package.json')),
  }))
  .filter((manifest) => !manifest.private);
// Order packages by their runtime dependencies before packing or publishing.
const ordered = [];
const visiting = new Set();
function visit(manifest) {
  if (ordered.includes(manifest)) return;
  if (visiting.has(manifest.name))
    throw new Error(`Dependency cycle: ${manifest.name}`);
  visiting.add(manifest.name);
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    const local = packages.find((candidate) => candidate.name === dependency);
    if (local) visit(local);
  }
  visiting.delete(manifest.name);
  ordered.push(manifest);
}
packages.forEach(visit);
module.exports = { root, packages: ordered };
