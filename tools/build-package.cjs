const { rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
rmSync('dist', { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    path.resolve(__dirname, '../node_modules/@typescript/native/bin/tsc'),
    '-p',
    'tsconfig.build.json',
  ],
  { stdio: 'inherit' }
);
