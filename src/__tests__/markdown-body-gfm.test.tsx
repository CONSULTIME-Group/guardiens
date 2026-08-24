import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownBody } from "@/components/MarkdownBody";

describe("MarkdownBody", () => {
  it("rend un tableau markdown en HTML table", () => {
    const markdown = `| Ville | Gardiens |
|-------|----------|
| Tahiti | 12 |`;

    render(<MarkdownBody>{markdown}</MarkdownBody>);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: /Ville/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Tahiti/ })).toBeInTheDocument();
  });
});
