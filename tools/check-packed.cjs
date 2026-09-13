const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { root, packages } = require('./packages.cjs');
const { checkPackageImports } = require('./check-package-imports.cjs');

function packAndCheck(destination) {
  packages.forEach(checkPackageImports);
  const archives = packages.map((manifest) => {
    const [packed] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          `./${manifest.directory}`,
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          destination,
        ],
        { cwd: root, encoding: 'utf8' }
      )
    );
    for (const file of packed.files) {
      if (
        !/^(dist\/|README.md$|LICENSE$|package.json$)/.test(file.path) ||
        /\.(spec|test|typecheck)\./.test(file.path)
      ) {
        throw new Error(
          `Unexpected published file: ${manifest.name}/${file.path}`
        );
      }
    }
    for (const entry of [manifest.main, manifest.types]) {
      if (!packed.files.some((file) => `./${file.path}` === entry))
        throw new Error(`Missing ${manifest.name} entry: ${entry}`);
    }
    return path.join(destination, packed.filename);
  });
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'jikan-consumer-'));
  try {
    fs.writeFileSync(
      path.join(consumer, 'package.json'),
      JSON.stringify({ private: true })
    );
    execFileSync(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...archives],
      { cwd: consumer, stdio: 'inherit' }
    );
    const names = packages.map((manifest) => manifest.name);
    execFileSync(
      process.execPath,
      ['-e', `for (const name of ${JSON.stringify(names)}) require(name)`],
      { cwd: consumer, stdio: 'inherit' }
    );
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `for (const name of ${JSON.stringify(names)}) await import(name)`,
      ],
      { cwd: consumer, stdio: 'inherit' }
    );
    fs.writeFileSync(
      path.join(consumer, 'index.ts'),
      names
        .map((name, i) => `import * as p${i} from '${name}';\nvoid p${i};`)
        .join('\n')
    );
    fs.writeFileSync(
      path.join(consumer, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: 'Node16',
          moduleResolution: 'Node16',
          target: 'ES2022',
          types: [],
        },
        files: ['index.ts'],
      })
    );
    execFileSync(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--save-dev',
        `@types/react@${require('../package.json').devDependencies['@types/react']}`,
      ],
      { cwd: consumer, stdio: 'inherit' }
    );
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules/@typescript/native/bin/tsc'),
        '-p',
        path.join(consumer, 'tsconfig.json'),
      ],
      { cwd: consumer, stdio: 'inherit' }
    );
    console.log(
      'Packed packages load through require/import and typecheck in a clean consumer.'
    );
    return archives;
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true });
  }
}
if (require.main === module) {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'jikan-pack-'));
  try {
    packAndCheck(destination);
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
}
module.exports = { packAndCheck };
