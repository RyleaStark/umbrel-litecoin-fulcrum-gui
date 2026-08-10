# Fulcrum (LTC) for Umbrel

A modern, Litecoin-aware Fulcrum status and wallet-connection interface for Umbrel.

This GUI is paired with [`RyleaStark/umbrel-fulcrum-ltc`](https://github.com/RyleaStark/umbrel-fulcrum-ltc), a Fulcrum implementation configured for Litecoin. It remains a distinct product from Electrs (LTC) and ElectrumX (LTC).

## Interface

- React 19, TypeScript, Vite, Fastify 5, TanStack Query, Radix UI, and Zod;
- current Umbrel Bitcoin Node/Litecoin Node visual conventions with Fulcrum's existing artwork;
- explicit waiting, connecting, indexing, synchronized, and degraded states;
- accessible local and Tor connection details, clipboard controls, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet information, or daemon responses;
- compatibility routes retained for existing Umbrel health and integration checks.

## Runtime contract

The Umbrel package supplies:

- `PORT` for the GUI service, normally `3006`;
- `FULCRUM_HOST` and `FULCRUM_PORT` for Fulcrum's private Electrum TCP service;
- `LITECOIN_HOST`, `RPC_PORT`, `RPC_USER`, and `RPC_PASSWORD` for scoped Litecoin Core access;
- `ELECTRUM_PORT`, `ELECTRUM_LOCAL_SERVICE`, and `ELECTRUM_HIDDEN_SERVICE` for wallet instructions, fixed to public port `51002` in the Litecoin suite.

`RPC_PASSWORD` is required. The backend uses bounded native HTTP/TCP clients, requests only Litecoin Core `getblockchaininfo` and Fulcrum `server.version`/`blockchain.headers.subscribe`, and exposes validated minimal responses.

## Compatibility routes

- `GET /ping`;
- `GET /v1/fulcrum/electrum-connection-details`;
- `GET /v1/fulcrum/version`;
- `GET /v1/fulcrum/syncPercent`.

## Development

Requires Node.js 24 and npm 12.0.2.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`docker compose up --build` starts the unchanged Fulcrum `2.1.1` daemon runtime and Litecoin Core regtest fixture for local integration work.

## Container

The production image uses digest-pinned Node 24 build stages and a Distroless Node 24 Debian 13 runtime, installs only production dependencies, runs as UID/GID `1000:1000`, and exposes only port `3006`.

Tagged `v*` releases publish multi-architecture images only after audit, lint, typecheck, tests, and production build pass.

## License

This repository retains its inherited PolyForm Noncommercial License 1.0.0. See [`LICENSE.md`](LICENSE.md) and [`LICENSE.legacy`](LICENSE.legacy). Bundled font notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
