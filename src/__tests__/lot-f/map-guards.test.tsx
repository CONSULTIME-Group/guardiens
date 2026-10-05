import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MapErrorBoundary from "@/components/shared/MapErrorBoundary";
import { guardLayerCalls, isMapAlive } from "@/components/shared/LeafletUnmountGuard";
import type { Map as LeafletMap } from "leaflet";

const Boom = () => {
  throw new TypeError("Cannot use 'in' operator to search for '_leaflet_id' in null");
};

describe("lot F2 : une carte qui échoue ne fait pas tomber la page", () => {
  it("la page reste affichée sans la carte", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <h1>Entraide à Saint-Étienne</h1>
        <MapErrorBoundary><Boom /></MapErrorBoundary>
      </div>,
    );
    expect(screen.getByRole("heading", { name: "Entraide à Saint-Étienne" })).toBeTruthy();
  });

  it("addLayer et removeLayer ne font rien sur une carte détruite ou une couche nulle", () => {
    const add = vi.fn();
    const remove = vi.fn();
    const map = { _mapPane: {}, addLayer: add, removeLayer: remove } as unknown as LeafletMap;
    guardLayerCalls(map);
    const layer = {} as never;
    map.addLayer(layer);
    expect(add).toHaveBeenCalledTimes(1);
    map.addLayer(null as never);
    expect(add).toHaveBeenCalledTimes(1);
    delete (map as unknown as { _mapPane?: unknown })._mapPane;
    expect(isMapAlive(map)).toBe(false);
    map.addLayer(layer);
    map.removeLayer(layer);
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
