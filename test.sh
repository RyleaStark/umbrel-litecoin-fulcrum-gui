#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose down --volumes
}
trap cleanup EXIT

docker compose up --build --detach

for _ in $(seq 1 120); do
  if docker compose exec -T litecoind litecoin-cli -regtest -rpcuser=umbrel -rpcpassword=umbrel getblockchaininfo >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

address="$(docker compose exec -T litecoind litecoin-cli -regtest -rpcuser=umbrel -rpcpassword=umbrel getnewaddress)"
docker compose exec -T litecoind litecoin-cli -regtest -rpcuser=umbrel -rpcpassword=umbrel generatetoaddress 110 "${address}" >/dev/null

for _ in $(seq 1 120); do
  if curl --fail --silent http://127.0.0.1:3006/ping >/dev/null; then
    echo "Fulcrum (LTC) GUI smoke test passed"
    exit 0
  fi
  sleep 1
done

echo "Fulcrum (LTC) GUI did not become ready" >&2
exit 1
