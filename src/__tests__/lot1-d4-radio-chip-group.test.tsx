import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import RadioChipGroup from "@/components/profile/RadioChipGroup";

/**
 * D4 : les six questions à réponse unique (news_frequency, guard_experience,
 * min_stay_duration, preferred_frequency, min_notice, vehicle_type) utilisent
 * un contrôle radio à choix unique, pas une sélection multiple.
 */
describe("D4 : RadioChipGroup à choix unique", () => {
  it("expose la sémantique radiogroup/radio", () => {
    render(
      <RadioChipGroup
        ariaLabel="Test"
        options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Bravo" }]}
        value="b"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Test" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
  });

  it("un clic sélectionne, un second clic sur la sélection désélectionne (jamais deux valeurs)", () => {
    const onChange = vi.fn();
    render(
      <RadioChipGroup
        ariaLabel="Test"
        options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Bravo" }]}
        value="b"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Alpha" }));
    expect(onChange).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("radio", { name: "Bravo" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("les six questions à réponse unique n'utilisent plus ChipSelect", () => {
    const mobility = readFileSync("src/components/profile/StepMobility.tsx", "utf8");
    const experience = readFileSync("src/components/profile/StepExperience.tsx", "utf8");
    const rules = readFileSync("src/components/owner-profile/OwnerStepRules.tsx", "utf8");

    // StepMobility : vehicle_type, min_stay_duration, preferred_frequency, min_notice en radio.
    const mobilityRadios = (mobility.match(/<RadioChipGroup/g) || []).length;
    expect(mobilityRadios).toBeGreaterThanOrEqual(4);
    expect(mobility).not.toContain("DURATION_VALUES");
    expect(mobility).not.toContain("FREQUENCY_VALUES");
    expect(mobility).not.toContain("NOTICE_VALUES");

    // StepExperience : guard_experience en radio.
    expect(experience).toContain("RadioChipGroup");

    // OwnerStepRules : news_frequency en radio.
    expect(rules).toMatch(/RadioChipGroup[^]*news_frequency/);
  });
});
