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

  it("rend un lien markdown classique et le texte barré", () => {
    render(<MarkdownBody>{"[Guardiens](https://guardiens.fr) et ~~barré~~"}</MarkdownBody>);
    expect(screen.getByRole("link", { name: "Guardiens" })).toHaveAttribute(
      "href",
      "https://guardiens.fr",
    );
    expect(screen.getByText("barré").tagName.toLowerCase()).toBe("del");
  });
});
