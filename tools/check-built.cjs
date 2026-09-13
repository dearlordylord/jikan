const path = require('node:path');

// Source tests cannot catch rewritten external imports in emitted libraries.
for (const name of [
  'utils',
  'fsm',
  'adapters',
  'facade',
  'test-utils',
  'ui',
  'react',
  'react-time-gremlin',
  'ui-react-utils',
  'reference-react',
]) {
  require(path.resolve(__dirname, '../dist/maintained', name, 'src'));
}
console.log('Built library entry points load.');
