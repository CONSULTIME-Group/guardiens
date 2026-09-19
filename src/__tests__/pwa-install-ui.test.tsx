import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InstallAppSection from "@/components/settings/InstallAppSection";
const mocks = vi.hoisted(() => ({ state: { standalone: false, knownInstalled: false, canPrompt: false }, platform: { ios: false, mobile: true, embedded: false }, request: vi.fn(), declared: vi.fn() }));
vi.mock("@/hooks/usePwaInstall", () => ({ usePwaInstall: () => mocks.state }));
vi.mock("@/lib/pwa-install", () => ({ installPlatform: () => mocks.platform, requestInstall: mocks.request, declareInstalled: mocks.declared }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
beforeEach(() => {
  Object.assign(mocks.state, { standalone: false, knownInstalled: false, canPrompt: false });
  Object.assign(mocks.platform, { ios: false, mobile: true, embedded: false });
  vi.clearAllMocks(); mocks.request.mockResolvedValue("accepted");
});
describe("guide d'installation", () => {
  it("montre les étapes Android sans bouton natif indisponible", () => {
    render(<InstallAppSection />);
    expect(screen.getByText("Sur Android")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Installer Guardiens" })).toBeNull();
  });
  it("propose le partage sur iPhone", () => {
    mocks.platform.ios = true; render(<InstallAppSection />);
    expect(screen.getByText(/menu de partage/)).toBeInTheDocument();
  });
  it("redirige les navigateurs intégrés vers le navigateur externe", () => {
    mocks.platform.embedded = true; mocks.state.canPrompt = true;
    render(<InstallAppSection />);
    expect(screen.getByText("Ouvrez Guardiens dans votre navigateur")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Installer Guardiens" })).toBeNull();
  });
  it("déclenche l'installation uniquement au clic", async () => {
    mocks.state.canPrompt = true; render(<InstallAppSection />);
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Installer Guardiens" }));
    expect(await screen.findByText(/Demande acceptée/)).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it("ne propose plus d'installer depuis l'application", () => {
    mocks.state.standalone = true; mocks.state.canPrompt = true;
    render(<InstallAppSection />);
    expect(screen.getByText(/utilisez déjà Guardiens/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("permet de désactiver les relances sans fausse confirmation navigateur", () => {
    render(<InstallAppSection />);
    fireEvent.click(screen.getByRole("button", { name: "Je l'ai déjà installée" }));
    expect(mocks.declared).toHaveBeenCalledOnce();
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
