import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlmaInstallSuggestion } from "@/hooks/usePwaInstall";
const mock = vi.hoisted(() => ({
  user: { id: "member-A" } as { id: string } | null, path: "/dashboard",
  state: { standalone: false, knownInstalled: false, canPrompt: true },
  platform: { ios: false, mobile: true, embedded: false },
  current: null as any, due: true, canEmit: vi.fn(), queue: vi.fn(), dismiss: vi.fn(), mark: vi.fn(), track: vi.fn(), navigate: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mock.user, activeRole: "sitter" }) }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: mock.path }), useNavigate: () => mock.navigate }));
vi.mock("@/contexts/AlmaContext", () => ({ useAlma: () => ({ currentWhisper: mock.current, queueWhisper: mock.queue, canEmit: mock.canEmit, dismissCurrent: mock.dismiss }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: mock.track }));
vi.mock("@/lib/pwa-install", () => ({
  getInstallState: () => mock.state, subscribeInstall: () => () => {}, installPlatform: () => mock.platform,
  reminderDue: () => mock.due, markInstallSuggestion: mock.mark, recordAppOpen: vi.fn(),
}));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  mock.user = { id: "member-A" }; mock.path = "/dashboard"; mock.current = null; mock.due = true;
  Object.assign(mock.state, { standalone: false, knownInstalled: false, canPrompt: true });
  Object.assign(mock.platform, { ios: false, mobile: true, embedded: false });
  mock.canEmit.mockReturnValue(true);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
afterEach(() => vi.useRealTimers());
describe("proposition mobile d'Alma", () => {
  it("attend 30 secondes, respecte le scheduler et pointe vers les paramètres", () => {
    renderHook(() => useAlmaInstallSuggestion(true));
    act(() => vi.advanceTimersByTime(29_000)); expect(mock.queue).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(mock.queue).toHaveBeenCalledOnce();
    const whisper = mock.queue.mock.calls[0][0];
    expect(whisper.type).toBe("usage_nudge");
    whisper.primaryAction.onClick(); expect(mock.navigate).toHaveBeenCalledWith("/settings?section=installation");
    expect(mock.mark).not.toHaveBeenCalled(); // Queued does not mean displayed.
  });
  it.each(["anonymous", "desktop", "standalone", "known", "embedded", "unsupported", "cooldown", "form", "silent_or_hidden"])("ne propose rien : %s", (condition) => {
    if (condition === "anonymous") mock.user = null;
    if (condition === "desktop") mock.platform.mobile = false;
    if (condition === "standalone") mock.state.standalone = true;
    if (condition === "known") mock.state.knownInstalled = true;
    if (condition === "embedded") mock.platform.embedded = true;
    if (condition === "unsupported") mock.state.canPrompt = false;
    if (condition === "cooldown") mock.due = false;
    if (condition === "form") mock.path = "/sits/create";
    renderHook(() => useAlmaInstallSuggestion(condition !== "silent_or_hidden"));
    act(() => vi.advanceTimersByTime(60_000)); expect(mock.queue).not.toHaveBeenCalled();
  });
  it("autorise le guide iPhone sans API native d'installation", () => {
    mock.platform.ios = true; mock.state.canPrompt = false;
    renderHook(() => useAlmaInstallSuggestion(true));
    act(() => vi.advanceTimersByTime(30_000)); expect(mock.queue).toHaveBeenCalledOnce();
  });
  it("ne force pas l'émission quand le quota d'Alma est atteint", () => {
    mock.canEmit.mockReturnValue(false); renderHook(() => useAlmaInstallSuggestion(true));
    act(() => vi.advanceTimersByTime(30_000)); expect(mock.queue).not.toHaveBeenCalled();
  });
  it("annule le timer à la navigation et au démontage", () => {
    const { rerender, unmount } = renderHook(() => useAlmaInstallSuggestion(true));
    mock.path = "/messages"; rerender();
    act(() => vi.advanceTimersByTime(30_000)); expect(mock.queue).not.toHaveBeenCalled();
    mock.path = "/dashboard"; rerender(); unmount();
    act(() => vi.advanceTimersByTime(30_000)); expect(mock.queue).not.toHaveBeenCalled();
  });
  it("compte une impression réelle une fois et ferme un conseil devenu inéligible", () => {
    mock.current = { id: "pwa-A", metadata: { pwa_install: true, member: "member-A" } };
    const { rerender } = renderHook(() => useAlmaInstallSuggestion(true));
    rerender(); expect(mock.mark).toHaveBeenCalledOnce();
    mock.user = { id: "member-B" }; rerender();
    expect(mock.dismiss).toHaveBeenCalledWith("navigation");
    expect(mock.mark).toHaveBeenCalledOnce();
  });
});
