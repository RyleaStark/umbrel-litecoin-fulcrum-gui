// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createFulcrumGuiService } from "./fulcrum-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 51002, connectionString: "umbrel.local:51002:t", transport: "tcp" as const },
  tor: { address: "example.onion", port: 51002, connectionString: "example.onion:51002:t", transport: "tcp" as const }
};

describe("FulcrumGuiService", () => {
  it("waits for Litecoin Core without querying Fulcrum during IBD", async () => {
    const getFulcrumTip = vi.fn();
    const service = createFulcrumGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true }) },
      fulcrum: { getTip: getFulcrumTip, getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "waiting-for-core", coreHeight: 80 });
    expect(await service.getLegacySyncPercent()).toBe(0);
    expect(getFulcrumTip).not.toHaveBeenCalled();
  });

  it("returns an accurate synchronized status", async () => {
    const service = createFulcrumGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      fulcrum: { getTip: async () => 110, getVersion: async () => "2.1.1" },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "ready",
      version: "2.1.1",
      coreHeight: 110,
      indexedHeight: 110,
      percent: 100,
      message: "Fulcrum is synchronized"
    });
    expect(service.getConnections()).toBe(connections);
    expect(await service.getLegacyVersion()).toBe("2.1.1");
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("degrades safely when Litecoin Core is unavailable", async () => {
    const service = createFulcrumGuiService({
      core: { getBlockchainInfo: async () => { throw new Error("rpcuser:secret"); } },
      fulcrum: { getTip: vi.fn(), getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "degraded",
      version: null,
      coreHeight: null,
      indexedHeight: null,
      percent: null,
      message: "Litecoin Core is unavailable"
    });
  });

  it("reports connecting when Core is ready but Fulcrum is not", async () => {
    const service = createFulcrumGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      fulcrum: { getTip: async () => { throw new Error("not ready"); }, getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "connecting",
      coreHeight: 110,
      indexedHeight: null,
      percent: null
    });
    await expect(service.getLegacySyncPercent()).rejects.toThrow("not ready");
  });

  it("preserves the legacy unclamped synchronization percentage", async () => {
    const service = createFulcrumGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false }) },
      fulcrum: { getTip: async () => 110, getVersion: async () => "2.1.1" },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBeCloseTo(110);
  });
});
