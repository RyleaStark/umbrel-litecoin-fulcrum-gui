import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { FulcrumGuiService } from "./app.js";

export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface FulcrumClient {
  getTip(): Promise<number>;
  getVersion(): Promise<string>;
}

export function createFulcrumGuiService({
  core,
  fulcrum,
  connections,
}: {
  core: LitecoinCoreClient;
  fulcrum: FulcrumClient;
  connections: ConnectionDetails;
}): FulcrumGuiService {
  return {
    getConnections: () => connections,
    getLegacyVersion: () => fulcrum.getVersion(),
    async getLegacySyncPercent() {
      const coreInfo = await core.getBlockchainInfo();
      if (coreInfo.initialblockdownload) return 0;
      await fulcrum.getVersion();
      const indexedHeight = await fulcrum.getTip();
      return (indexedHeight / coreInfo.blocks) * 100;
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: { blocks: number; initialblockdownload: boolean };
      try {
        coreInfo = await core.getBlockchainInfo();
      } catch {
        return {
          state: "degraded",
          version: null,
          coreHeight: null,
          indexedHeight: null,
          percent: null,
          message: "Litecoin Core is unavailable",
        };
      }

      if (coreInfo.initialblockdownload) {
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: null,
          initialBlockDownload: true,
          version: null,
        });
      }

      try {
        const [indexedHeight, version] = await Promise.all([
          fulcrum.getTip(),
          Promise.resolve().then(() => fulcrum.getVersion()).catch(() => null),
        ]);
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight,
          initialBlockDownload: false,
          version,
        });
      } catch {
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: null,
          initialBlockDownload: false,
          version: null,
        });
      }
    },
  };
}
