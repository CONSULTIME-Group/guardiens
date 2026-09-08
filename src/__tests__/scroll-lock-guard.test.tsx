import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ScrollLockGuard from "@/components/layout/ScrollLockGuard";

/**
 * Filet de sécurité : un verrou de défilement laissé par une couche démontée
 * doit être levé au premier changement de chemin, à condition qu'aucune
 * couche ne soit réellement ouverte.
 */

const lockBody = () => {
  document.body.setAttribute("data-scroll-locked", "1");
  document.body.style.overflow = "hidden";
  document.body.style.pointerEvents = "none";
};

const GoTo = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
};

describe("ScrollLockGuard", () => {
  beforeEach(() => {
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("pointer-events");
    document.body.innerHTML = "";
  });

  it("libère le body au changement de chemin quand aucune couche n'est ouverte", async () => {
    lockBody();
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ScrollLockGuard />
        <Routes>
          <Route path="/a" element={<GoTo to="/b" />} />
          <Route path="/b" element={<div>page b</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.pointerEvents).toBe("");
  });

  it("laisse le verrou en place si une couche est réellement ouverte", async () => {
    lockBody();
    const layer = document.createElement("div");
    layer.setAttribute("role", "dialog");
    layer.setAttribute("data-state", "open");
    document.body.appendChild(layer);

    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ScrollLockGuard />
        <Routes>
          <Route path="/a" element={<GoTo to="/b" />} />
          <Route path="/b" element={<div>page b</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });
});
