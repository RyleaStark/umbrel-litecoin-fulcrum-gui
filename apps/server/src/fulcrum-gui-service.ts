import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { FulcrumGuiService } from "./app.js";
import type { FulcrumLogProgress } from "./fulcrum-log-progress.js";

export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
  getTxIndexInfo(): Promise<{ synced: boolean; bestBlockHeight: number | null } | null>;
}

export interface FulcrumClient {
  getTip(): Promise<number>;
  getVersion(): Promise<string>;
}

function isInitialIndexingProgress(loggedHeight: number | null | undefined, coreHeight: number): loggedHeight is number {
  return loggedHeight !== null && loggedHeight !== undefined && loggedHeight < coreHeight;
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
  async function requiredCoreIndexStatus(coreHeight: number): Promise<IndexerStatus | null> {
    try {
      const index = await core.getTxIndexInfo();
      if (!index) return { state: "degraded", version: null, coreHeight, indexedHeight: null, percent: null, message: "Litecoin Core transaction index is unavailable" };
      if (!index.synced) return { state: "waiting-for-core", version: null, coreHeight, indexedHeight: null, percent: null, message: "Waiting for Litecoin Core transaction index" };
      return null;
    } catch {
      return { state: "degraded", version: null, coreHeight, indexedHeight: null, percent: null, message: "Litecoin Core transaction index is unavailable" };
    }
  }

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
        if (!isInitialIndexingProgress(loggedHeight, coreInfo.blocks)) throw error;
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
      const dependency = await requiredCoreIndexStatus(coreInfo.blocks);
      if (dependency) return dependency;

      try {
        const [indexedHeight, version] = await Promise.all([
          fulcrum.getTip(),
          Promise.resolve().then(() => fulcrum.getVersion()).catch(() => null),
        ]);
        const status = deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight,
          initialBlockDownload: false,
          version,
        });
        return status;
      } catch {
        const loggedHeight = await progress?.getIndexedHeight() ?? null;
        if (isInitialIndexingProgress(loggedHeight, coreInfo.blocks)) {
          return deriveIndexerStatus({
            coreHeight: coreInfo.blocks,
            indexedHeight: loggedHeight,
            initialBlockDownload: false,
            version: null,
          });
        }
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
