const ElectrumClient = require("@lily-technologies/electrum-client");
const litecoindService = require("services/litecoind");

const FULCRUM_HOST = process.env.FULCRUM_HOST || "0.0.0.0";
const FULCRUM_PORT = process.env.FULCRUM_PORT || 50001; // eslint-disable-line no-magic-numbers, max-len
const rpcClient = new ElectrumClient(FULCRUM_PORT, FULCRUM_HOST, "tcp");

let initClient;

async function initElectrumClient() {
  initClient = await rpcClient.initElectrum({
    client: "umbrel",
    version: "1.4",
  });
}

async function getVersion() {
  if (!initClient) {
    await initElectrumClient();
  }

  // versionInfo[0] comes in as Fulcrum 1.7.0, so we parse
  return initClient.versionInfo[0].substring(
    initClient.versionInfo[0].indexOf(" ") + 1
  );
}

// Determine whether Fulcrum has caught up with litecoind by comparing
// the Electrum header subscription height with Litecoin Core's chain height.
async function syncPercent() {
  // first, check if litecoind isn't still IBD
  const { result: litecoindResponse } =
    await litecoindService.getBlockChainInfo();
  if (litecoindResponse.initialblockdownload) {
    return 0;
  }

  // Compare Litecoin Core's chain height with Fulcrum's Electrum height.
  if (!initClient) {
    await initElectrumClient();
  }

  const { height: fulcrumHeight } =
    await initClient.blockchainHeaders_subscribe();
  return (fulcrumHeight / litecoindResponse.blocks) * 100;
}

module.exports = {
  getVersion,
  syncPercent,
};
