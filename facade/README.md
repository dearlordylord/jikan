Jikan0 strongly typed exercise timer core library

Consist of object-oriented Timer interface and functional timer finite state machine API under the hood.

Timer is modeled as a queue data structure with a `step(n: milliseconds)` function over it.

TODO more docs

# Publishing

Npm package exposed API

`npx nx release p` - will release dependencies

`npx nx build facade`

`node tools/scripts/publish.mjs facade 0.0.4 latest`

used https://github.com/nrwl/nx/issues/4620#issuecomment-1546737883 as build solution for now
