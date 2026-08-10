import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHero } from "./StatusHero.js";

describe("StatusHero", () => {
  it("uses accurate indexing copy and exposes progress accessibly", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.1.1", coreHeight: 101, indexedHeight: 100, percent: 99.01, message: "Indexing Litecoin blocks" }} />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Fulcrum is indexing");
    expect(screen.getByText("Indexing Litecoin blocks")).toBeInTheDocument();
    expect(screen.queryByText("Synchronized")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99.01");
    expect(container.querySelectorAll(".is-indexed")).toHaveLength(5);
    expect(container.querySelector(".index-art")).toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
  });

  it("renders ready as six complete blocks without a syncing class", () => {
    const { container } = render(<StatusHero status={{ state: "ready", version: "2.1.1", coreHeight: 101, indexedHeight: 101, percent: 100, message: "Fulcrum is synchronized" }} />);
    expect(container.querySelector(".index-art")).toHaveClass("is-complete");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-indexed")).toHaveLength(6);
  });

  it.each(["waiting-for-core", "connecting", "degraded"] as const)("does not animate blocks in the %s state", (state) => {
    const { container } = render(<StatusHero status={{ state, version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Unavailable" }} />);
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
  });
});
