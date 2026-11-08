/**
 * Lot L5 (08/11/2026) : publication rapide, carte de dates unique (A-02) et
 * retour au récit après publication (B-03).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import ExpressDatesCard, { expressDatesPhrase, datesValid } from "@/components/sits/create/ExpressDatesCard";
import PublishedNotice, { PUBLISHED_NOTICE_ARM_MS } from "@/components/dashboard/story/PublishedNotice";
import { afterPublishTarget, PUBLISHED_PARAM } from "@/lib/afterPublish";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("L5, dates en une phrase", () => {
  it("phrase et nuits", () => {
    expect(expressDatesPhrase("2026-12-19", "2027-01-03")).toBe("Du 19 décembre au 3 janvier · 15 nuits");
    expect(expressDatesPhrase("2026-12-20", "2026-12-21")).toBe("Du 20 décembre au 21 décembre · 1 nuit");
    expect(expressDatesPhrase("2026-12-20", "2026-12-20")).toBeNull();
    expect(expressDatesPhrase("", "2026-12-20")).toBeNull();
  });
  it("dates valides : début à partir d'aujourd'hui, fin après le début", () => {
    expect(datesValid("2026-12-01", "2026-12-05", "2026-11-08")).toBe(true);
    expect(datesValid("2026-11-01", "2026-12-05", "2026-11-08")).toBe(false);
    expect(datesValid("2026-12-05", "2026-12-05", "2026-11-08")).toBe(false);
  });
  it("autres dates dans la feuille : valider seulement des dates justes", () => {
    const onDates = vi.fn();
    render(
      <ExpressDatesCard period="hiver" today="2026-11-08" startDate="2027-01-10" endDate="2027-01-17"
        onDates={onDates} dateError={null} flexibleDates={false} onFlexibleDates={vi.fn()} />,
    );
    expect(screen.getByTestId("express-dates-summary").textContent).toContain("Du 10 janvier au 17 janvier · 7 nuits");
    fireEvent.click(screen.getByText("Modifier"));
    expect(screen.queryByTestId("express-date-presets")).toBeNull();
    const end = document.getElementById("express-sheet-end") as HTMLInputElement;
    fireEvent.change(end, { target: { value: "2027-01-05" } });
    expect((screen.getByTestId("express-dates-validate") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(end, { target: { value: "2027-01-24" } });
    const validate = screen.getByTestId("express-dates-validate") as HTMLButtonElement;
    expect(validate.disabled).toBe(false);
    expect(validate.textContent).toBe("Valider ces dates");
    expect(screen.getByTestId("express-dates-draft").textContent).toBe("Du 10 janvier au 24 janvier · 14 nuits");
    fireEvent.click(validate);
    expect(onDates).toHaveBeenCalledWith("2027-01-10", "2027-01-24", "autres");
  });
  it("case « dates flexibles » décochée par défaut", () => {
    render(
      <ExpressDatesCard period="noel" today="2026-11-08" startDate="" endDate=""
        onDates={vi.fn()} dateError={null} flexibleDates={false} onFlexibleDates={vi.fn()} />,
    );
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
  });
});

describe("L5, retour après publication", () => {
  it("téléphone et publication rapide : le récit ; ordinateur : la fiche ; inscription : affinités", () => {
    expect(afterPublishTarget({ sitId: "s1", express: true, arrivalSignup: false, phone: true })).toBe(`/dashboard?${PUBLISHED_PARAM}=s1`);
    expect(afterPublishTarget({ sitId: "s1", express: true, arrivalSignup: false, phone: false })).toBe("/sits/s1");
    expect(afterPublishTarget({ sitId: "s1", express: false, arrivalSignup: false, phone: true })).toBe("/sits/s1");
    expect(afterPublishTarget({ sitId: "s1", express: true, arrivalSignup: true, phone: true })).toBe("/arrivee/affinites?sit=s1");
  });

  it("CreateSit relit les annonces et suit cette règle", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).toContain("invalidateMySits(user.id)");
    expect(src).toContain("afterPublishTarget({");
  });

  it("confirmation en role=status jusqu'au geste suivant, paramètre retiré de l'adresse", () => {
    vi.useFakeTimers();
    let search = "";
    const Probe = () => { search = useLocation().search; return null; };
    render(
      <MemoryRouter initialEntries={[`/dashboard?${PUBLISHED_PARAM}=s1`]}>
        <Routes><Route path="/dashboard" element={<><PublishedNotice /><Probe /></>} /></Routes>
      </MemoryRouter>,
    );
    const notice = screen.getByTestId("story-published-notice");
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toContain("Votre annonce est en ligne.");
    expect(search).toBe("");
    // Le toucher qui a publié ne l'efface pas.
    fireEvent.pointerDown(window);
    expect(screen.queryByTestId("story-published-notice")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(PUBLISHED_NOTICE_ARM_MS + 10); });
    fireEvent.pointerDown(window);
    expect(screen.queryByTestId("story-published-notice")).toBeNull();
  });

  it("sans paramètre, rien", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><PublishedNotice /></MemoryRouter>);
    expect(screen.queryByTestId("story-published-notice")).toBeNull();
  });
});
