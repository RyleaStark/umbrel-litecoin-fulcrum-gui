import { describe, expect, it } from "vitest";
import { createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Litecoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "fulcrum.example.onion", port: "51002" })).toEqual({
      local: { address: "umbrel.local", port: 51002, connectionString: "umbrel.local:51002:t", transport: "tcp" },
      tor: { address: "fulcrum.example.onion", port: 51002, connectionString: "fulcrum.example.onion:51002:t", transport: "tcp" }
    });
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });
});
