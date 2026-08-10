import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "./ConnectionPanel.js";

const details = {
  local: { address: "umbrel.local", port: 51002, connectionString: "umbrel.local:51002:t", transport: "tcp" as const },
  tor: { address: "fulcrum.example.onion", port: 51002, connectionString: "fulcrum.example.onion:51002:t", transport: "tcp" as const }
};

describe("ConnectionPanel", () => {
  it("retains the privacy-safe Electrum-LTC wallet link", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const link = screen.getByRole("link", { name: "Electrum-LTC" });
    expect(link).toHaveAttribute("href", "https://electrum-ltc.org/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("switches between distinct Local and Tor endpoints", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Tor" }));
    expect(screen.getByText("fulcrum.example.onion")).toBeInTheDocument();
  });

  it("shows a QR code for the active wallet connection", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const image = await screen.findByRole("img", { name: "QR code for umbrel.local:51002:t" });
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("copies the complete wallet connection string", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy connection string" }));
    expect(writeText).toHaveBeenCalledWith("umbrel.local:51002:t");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("copies every exact Fulcrum payload without the secure-context Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    const copied: string[] = [];
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn((command: string) => {
        if (command !== "copy") return false;
        const selection = document.getSelection();
        if (!selection) return false;
        copied.push(selection.toString());
        return true;
      }),
    });

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    for (const [name, payload] of [
      ["Copy address", "umbrel.local"],
      ["Copy port", "51002"],
      ["Copy connection string", "umbrel.local:51002:t"],
    ] as const) {
      const button = screen.getByRole("button", { name });
      await userEvent.click(button);
      expect(copied.at(-1)).toBe(payload);
      expect(button.closest(".connection-row")).toHaveTextContent("Copied!");
    }

    expect(copied).toEqual(["umbrel.local", "51002", "umbrel.local:51002:t"]);
  });

  it("falls back to DOM copying when the Clipboard API rejects", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("insecure context")) } });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy port" }));
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("reports a clipboard failure without exposing an internal error", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("private clipboard detail")) } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn().mockReturnValue(false) });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));
    expect(screen.getByText("Copy failed")).toBeInTheDocument();
    expect(screen.queryByText(/private clipboard detail/i)).not.toBeInTheDocument();
  });
});
