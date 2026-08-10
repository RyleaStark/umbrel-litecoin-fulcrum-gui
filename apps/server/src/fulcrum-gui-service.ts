import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { FulcrumGuiService } from "./app.js";
import type { FulcrumLogProgress } from "./fulcrum-log-progress.js";

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
  progress,
  connections,
}: {
  core: LitecoinCoreClient;
  fulcrum: FulcrumClient;
  progress?: FulcrumLogProgress;
  connections: ConnectionDetails;
}): FulcrumGuiService {
  return {
    getConnections: () => connections,
    getLegacyVersion: () => fulcrum.getVersion(),
    async getLegacySyncPercent() {
      const coreInfo = await core.getBlockchainInfo();
      if (coreInfo.initialblockdownload) return 0;

      let indexedHeight: number;
      try {
        await fulcrum.getVersion();
        indexedHeight = await fulcrum.getTip();
      } catch (error) {
        const loggedHeight = await progress?.getIndexedHeight();
        if (loggedHeight === null || loggedHeight === undefined) throw error;
        indexedHeight = loggedHeight;
      }
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
        const loggedHeight = await progress?.getIndexedHeight() ?? null;
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: loggedHeight,
          initialBlockDownload: false,
          version: null,
        });
      }
    },
  };
}
