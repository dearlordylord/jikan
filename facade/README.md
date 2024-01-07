Jikan0 strongly typed exercise timer core library

Consist of object-oriented Timer interface and functional timer finite state machine API under the hood.

Timer is modeled as a queue data structure with a `step(n: milliseconds)` function over it.

TODO more docs

# Publishing

Npm package exposed API

`npx nx build facade`

`node tools/scripts/publish.mjs facade 0.0.4 latest`

https://nx.dev/nx-api/js/executors/tsc external: none used to inline dependencies.
