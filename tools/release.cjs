const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { root, packages } = require('./packages.cjs');
const { packAndCheck } = require('./check-packed.cjs');
async function waitForRegistry(name, version, integrity) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(
      'npm',
      [
        'view',
        `${name}@${version}`,
        'dist.integrity',
        '--json',
        '--registry=https://registry.npmjs.org/',
      ],
      { cwd: root, encoding: 'utf8' }
    );
    if (result.status === 0 && JSON.parse(result.stdout) === integrity) return;
    if (result.status === 0)
      throw new Error(`${name}@${version}: registry integrity mismatch`);
    if (!result.stderr.includes('E404'))
      throw new Error(result.stderr || 'Registry lookup failed');
    await delay(2000);
  }
  throw new Error(
    `${name}@${version} is not visible in the registry; rerun to resume.`
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args.length && !['--publish', '--dry-run'].includes(args[0]))
  )
    throw new Error('Usage: npm run local-release -- [--dry-run|--publish]');
  const publish = args[0] === '--publish';
  const run = (command, args) =>
    execFileSync(command, args, { cwd: root, stdio: 'inherit' });
  const read = (command, args) =>
    execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
  const version = require('../package.json').version;
  if (packages.some((manifest) => manifest.version !== version))
    throw new Error('Package versions must match the root version.');
  const tag = version.includes('-')
    ? version.split('-')[1].split('.')[0]
    : 'latest';
  if (!['latest', 'alpha', 'beta', 'rc'].includes(tag))
    throw new Error(`Unsupported release channel: ${tag}`);
  if (publish) {
    if (read('git', ['branch', '--show-current']) !== 'master')
      throw new Error('Publish from master.');
    if (read('git', ['status', '--porcelain']))
      throw new Error('Publish requires a clean worktree.');
    run('git', ['fetch', 'origin', 'master']);
    if (
      read('git', ['rev-parse', 'HEAD']) !==
      read('git', ['rev-parse', 'origin/master'])
    )
      throw new Error('Publish requires HEAD to equal origin/master.');
    run('npm', ['whoami', '--registry=https://registry.npmjs.org/']);
  }
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  run('npm', ['run', 'check']);
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'jikan-release-'));
  try {
    const archives = packAndCheck(destination);
    for (const [index, manifest] of packages.entries()) {
      const integrity =
        'sha512-' +
        createHash('sha512')
          .update(fs.readFileSync(archives[index]))
          .digest('base64');
      if (publish) {
        const result = spawnSync(
          'npm',
          [
            'view',
            `${manifest.name}@${version}`,
            'dist.integrity',
            '--json',
            '--registry=https://registry.npmjs.org/',
          ],
          { cwd: root, encoding: 'utf8' }
        );
        if (result.status === 0) {
          if (JSON.parse(result.stdout) !== integrity)
            throw new Error(
              `${manifest.name}@${version} already exists with different content; use a new version.`
            );
          console.log(
            `${manifest.name}@${version} already published; skipping.`
          );
          continue;
        }
        if (result.status !== 0 && !result.stderr.includes('E404'))
          throw new Error(result.stderr || 'Registry lookup failed');
      }
      run('npm', [
        'publish',
        archives[index],
        '--registry=https://registry.npmjs.org/',
        '--access',
        'public',
        '--tag',
        tag,
        ...(publish ? [] : ['--dry-run']),
      ]);
      if (publish) await waitForRegistry(manifest.name, version, integrity);
    }
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
