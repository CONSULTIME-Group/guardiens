import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InstallAppWelcome from "@/components/settings/InstallAppWelcome";
const mock = vi.hoisted(() => ({
  user: { id: "A" } as { id: string } | null, path: "/dashboard", due: true, mobile: true,
  state: { standalone: false, knownInstalled: false, canPrompt: false },
  mark: vi.fn(), navigate: vi.fn(), declare: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: mock.path }), useNavigate: () => mock.navigate }));
vi.mock("@/hooks/usePwaInstall", () => ({ usePwaInstall: () => mock.state }));
vi.mock("@/lib/pwa-install", () => ({
  installPlatform: () => ({ mobile: mock.mobile }), firstInstallVisitDue: () => mock.due,
  markInstallWelcome: mock.mark, declareInstalled: mock.declare,
}));
beforeEach(() => {
  vi.clearAllMocks(); mock.user = { id: "A" }; mock.path = "/dashboard"; mock.due = true; mock.mobile = true;
  Object.assign(mock.state, { standalone: false, knownInstalled: false, canPrompt: false });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
describe("première connexion mobile", () => {
  it("propose l'installation sans dépendre d'Alma ou du prompt natif", () => {
    render(<InstallAppWelcome paused={false} />);
    expect(screen.getByText("Guardiens sur votre téléphone")).toBeInTheDocument();
    expect(mock.mark).toHaveBeenCalledWith("A");
    fireEvent.click(screen.getByRole("button", { name: "Installer Guardiens" }));
    expect(mock.navigate).toHaveBeenCalledWith("/settings?section=installation");
  });
  it("attend la fin de l'accueil d'inscription, sans impression prématurée", () => {
    const { rerender } = render(<InstallAppWelcome paused />);
    expect(screen.queryByRole("button")).toBeNull(); expect(mock.mark).not.toHaveBeenCalled();
    rerender(<InstallAppWelcome paused={false} />);
    expect(screen.getByRole("button", { name: "Plus tard" })).toBeInTheDocument();
    rerender(<InstallAppWelcome paused={false} />); expect(mock.mark).toHaveBeenCalledOnce();
  });
  it("permet de reporter sans gêner la navigation", () => {
    render(<InstallAppWelcome paused={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(screen.queryByText("Guardiens sur votre téléphone")).toBeNull();
  });
  it.each(["anonymous", "desktop", "standalone", "known", "seen", "form", "messages"])("ne présente pas l'encart : %s", (condition) => {
    if (condition === "anonymous") mock.user = null;
    if (condition === "desktop") mock.mobile = false;
    if (condition === "standalone") mock.state.standalone = true;
    if (condition === "known") mock.state.knownInstalled = true;
    if (condition === "seen") mock.due = false;
    if (condition === "form") mock.path = "/sits/create";
    if (condition === "messages") mock.path = "/messages";
    render(<InstallAppWelcome paused={false} />);
    expect(screen.queryByRole("button")).toBeNull(); expect(mock.mark).not.toHaveBeenCalled();
  });
});
