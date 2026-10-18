import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import LocalActionEditor from "@/pages/admin/_components/associations/LocalActionEditor";
import type { AssociationLocalAction } from "@/lib/localUsefulActions";

it("conserve les coordonnées lors d'un simple blur et les retire si la commune change", () => {
  const changed = vi.fn();
  function Editor() {
    const [value, setValue] = useState<AssociationLocalAction>({ city: "Lyon", postal_code: "69001", latitude: 45.76, longitude: 4.83 });
    return <LocalActionEditor index={0} value={value} onChange={next => { changed(next); setValue(next); }} />;
  }
  render(<Editor />);
  fireEvent.click(screen.getByText("Proposer une action sur les tableaux de bord"));
  const city = screen.getByLabelText("Commune où se déroule l’action");
  fireEvent.blur(city);
  expect(changed.mock.lastCall?.[0]).toMatchObject({ latitude: 45.76, longitude: 4.83 });
  fireEvent.change(city, { target: { value: "Villeurbanne" } });
  expect(changed.mock.lastCall?.[0]).toMatchObject({ latitude: null, longitude: null });
});
