import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../location/LocationProfileCard", () => ({ default: () => null }));
vi.mock("../../profile/AiSuggestButton", () => ({ default: () => null }));

import OwnerStepHousing from "../OwnerStepHousing";

const base: any = { environment: "countryside", environments: ["ville"], equipments: [], description: "", city: "", postal_code: "" };

describe("OwnerStepHousing, environnement en source unique (L6 G1)", () => {
  it("n'écrit rien au montage et propose l'ancien choix sans l'imposer", () => {
    const onChange = vi.fn();
    render(<OwnerStepHousing data={base} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Ancien choix enregistré : Campagne/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ajouter « Campagne »/ }));
    expect(onChange).toHaveBeenCalledWith({ environments: ["ville", "campagne"] });
  });

  it("masque le rappel quand l'ancien choix figure déjà dans les puces", () => {
    render(<OwnerStepHousing data={{ ...base, environments: ["campagne"] }} onChange={vi.fn()} />);
    expect(screen.queryByText(/Ancien choix/)).toBeNull();
  });
});
