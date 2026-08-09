# Fulcrum (LTC) for Umbrel

A Litecoin-aware status and connection GUI for the Fulcrum Electrum server on umbrelOS.

This repository is derived from [`nmfretz/umbrel-fulcrum`](https://github.com/nmfretz/umbrel-fulcrum), the GUI used by Umbrel's official Fulcrum package. It is intentionally separate from Electrs and speaks to an actual Fulcrum runtime through the Electrum protocol.

## Runtime contract

The production Umbrel package supplies:

- `FULCRUM_HOST` and `FULCRUM_PORT` for Fulcrum's Electrum TCP service;
- `LITECOIN_HOST`, `RPC_PORT`, `RPC_USER`, and `RPC_PASSWORD` for Litecoin Core;
- `ELECTRUM_LOCAL_SERVICE`, `ELECTRUM_HIDDEN_SERVICE`, and `ELECTRUM_PUBLIC_CONNECTION_PORT` for connection instructions;
- `/fulcrum-logs/fulcrum.log` for persistent Fulcrum logs.

The `bitcoind-rpc` npm dependency is retained as a protocol-compatible JSON-RPC client library; the configured daemon and UI terminology are Litecoin-specific.

## Development

```bash
yarn install
yarn dev
```

Build the production image:

```bash
docker build -t umbrel-litecoin-fulcrum-gui .
```

Tagged `v*` releases publish multi-architecture images to `ghcr.io/ryleastark/umbrel-litecoin-fulcrum-gui`.

## License

MIT
