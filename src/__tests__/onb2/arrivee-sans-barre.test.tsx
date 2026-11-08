/** Lot ONB2 : le parcours d'arrivée masque la barre basse, comme /bienvenue. */
import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ChromeVisibilityProvider, useChromeVisibility } from "@/components/layout/ChromeVisibility";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/analytics", () => ({ trackEvent: () => Promise.resolve() }));

import { ArrivalShell } from "@/components/arrival/ArrivalUI";

let hidden: boolean | null = null;
const Probe = () => { hidden = useChromeVisibility().bottomNavHidden; return null; };

describe("ArrivalShell", () => {
  it("masque la barre basse tant qu'une étape est affichée, la rend en sortant", () => {
    const { rerender } = render(
      <ChromeVisibilityProvider><Probe /><ArrivalShell header="Faisons connaissance"><p>étape</p></ArrivalShell></ChromeVisibilityProvider>,
    );
    expect(hidden).toBe(true);
    rerender(<ChromeVisibilityProvider><Probe /></ChromeVisibilityProvider>);
    expect(hidden).toBe(false);
    cleanup();
  });
});
