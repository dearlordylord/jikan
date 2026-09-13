# Development

Use Node.js 24 and npm 11.19.0 with the committed lockfile:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run dev          # http://localhost:4200
npm run demo:terminal # after build, in an interactive terminal
```

Turborepo builds the npm workspaces in dependency order and caches their `dist`
outputs. `npm run check` runs strict TypeScript checks, typed ESLint, formatting,
Jest, builds, and clean-consumer tarball checks. `npm run format` formats source.
TypeScript 7.0.2 performs checks and declaration/JavaScript emission; TypeScript 6
is installed under `typescript` only for ESLint's JavaScript compiler API.
Jest uses SWC for transformation and React tests use React 19.

The [archived native and XState demos](../archive/README.md) are outside the
workspace and its checks. They retain their historical configuration.

## Publishing

The ten libraries publish separately under their existing names (`jikan0` for
`facade`, `@jikan0/*` for the others). Demos and the root are private. Releases
use one version, exact internal dependency versions, public tarballs, and
prerelease channels (`alpha`, `beta`, `rc`) or `latest` for stable releases.
Version 2.0.0 marks the current API and Node 24/React 19 requirements.

Run `npm run version:set -- X.Y.Z`, then `npm install --package-lock-only` and
commit the manifests and lockfile. `npm run local-release` reinstalls from the
lockfile, checks the workspace, verifies tarballs in a temporary consumer, and
runs npm publish in dry-run mode. Inspect that result before publishing.

`npm run local-release -- --publish` requires a clean `master` matching
`origin/master` and npm authentication. It publishes verified tarballs in
dependency order and skips already published versions only when their tarball integrity matches,
allowing interrupted releases to resume. It waits for each package to become
visible before publishing its dependents. npm versions are immutable; fix a published package with a
new release version. This command does not create GitHub releases or Git tags.
