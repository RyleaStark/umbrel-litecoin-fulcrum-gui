// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("reads the Umbrel Litecoin Fulcrum environment contract", () => {
    expect(readConfig({
      PORT: "3006",
      FULCRUM_HOST: "fulcrum_server_1",
      FULCRUM_PORT: "50001",
      ELECTRUM_PORT: "51002",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      LITECOIN_HOST: "litecoin_core_1",
      RPC_PORT: "9332",
      RPC_USER: "gui",
      RPC_PASSWORD: "secret"
    })).toMatchObject({
      port: 3006,
      fulcrum: { host: "fulcrum_server_1", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 51002 },
      core: { host: "litecoin_core_1", port: 9332, username: "gui", password: "secret" }
    });
  });

  it("preserves non-secret legacy defaults while requiring the RPC password", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3006,
      fulcrum: { host: "0.0.0.0", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "/var/lib/tor/electrum/hostname", port: 51002 },
      core: { host: "172.28.0.2", port: 18443, username: "umbrel", password: "secret" }
    });
  });

  it("rejects missing credentials rather than shipping fallback secrets", () => {
    expect(() => readConfig({})).toThrow("Invalid Fulcrum GUI configuration");
  });

  it("accepts the documented public-port alias while preferring ELECTRUM_PORT", () => {
    expect(readConfig({ RPC_PASSWORD: "secret", ELECTRUM_PUBLIC_CONNECTION_PORT: "52002" }).connections.port).toBe(52002);
    expect(readConfig({ RPC_PASSWORD: "secret", ELECTRUM_PUBLIC_CONNECTION_PORT: "52002", ELECTRUM_PORT: "51002" }).connections.port).toBe(51002);
  });
});
