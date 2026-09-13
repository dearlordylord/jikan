const path = require('node:path');
const { root, packages } = require('./packages.cjs');
for (const manifest of packages) {
  require(path.join(root, manifest.directory, manifest.main));
}
console.log('Built library entry points load.');
