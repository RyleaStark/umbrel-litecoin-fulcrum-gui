import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard.js";

const connections = {
  local: { address: "umbrel.local", port: 51002, connectionString: "umbrel.local:51002", transport: "tcp" as const },
  tor: { address: "example.onion", port: 51002, connectionString: "example.onion:51002", transport: "tcp" as const }
};

describe("Dashboard", () => {
  it("renders the compact Node-style header and keeps connection details in the Connect dialog", async () => {
    render(<Dashboard status={{ state: "ready", version: "2.1.1", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Fulcrum is synchronized" }} connections={connections} />);
    expect(screen.getByRole("heading", { name: "Fulcrum (LTC)" })).toBeInTheDocument();
    expect(screen.getByText("Fulcrum 2.1.1")).toBeInTheDocument();
    expect(screen.queryByText("umbrel.local")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByRole("dialog", { name: "Connect to Fulcrum" })).toBeInTheDocument();
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });

  it("shows a privacy-safe unavailable state without disabling the Connect dialog", async () => {
    render(<Dashboard status={{ state: "degraded", version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Litecoin Core is unavailable" }} connections={connections} />);
    expect(screen.getByText("Litecoin Core is unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });
});
