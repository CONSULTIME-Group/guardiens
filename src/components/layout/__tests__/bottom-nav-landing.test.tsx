import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "../Navigation";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useLocation: vi.fn(() => ({ pathname: "/" })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("@/contexts/AuthContext", async () => ({
  useAuth: vi.fn(() => ({
    user: null,
    activeRole: "owner",
    setActiveRole: vi.fn(),
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useAdmin", async () => ({
  useAdmin: vi.fn(() => ({ isAdmin: false })),
}));

vi.mock("@/hooks/useSubscriptionAccess", async () => ({
  useSubscriptionAccess: vi.fn(() => ({ hasAccess: true })),
}));

vi.mock("@/hooks/useNavBadgeCounts", async () => ({
  useNavBadgeCounts: vi.fn(() => ({
    unreadCount: 0,
    ownerInboxCount: 0,
    sitterActionCount: 0,
    missionBadgeCount: 0,
  })),
}));

vi.mock("../AppShellContext", async () => ({
  useInAppShell: vi.fn(() => true),
}));

vi.mock("../ChromeVisibility", async () => ({
  useChromeVisibility: vi.fn(() => ({ bottomNavHidden: false })),
}));

const { useLocation } = await import("react-router-dom");
let animationFrameCallback: FrameRequestCallback | null = null;
const cancelAnimationFrame = vi.fn();

function setup(pathname: string, mdMatches = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: mdMatches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  (useLocation as ReturnType<typeof vi.fn>).mockReturnValue({ pathname });

  return render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
}

function queryNav() {
  return screen.queryByRole("navigation", { name: "Navigation mobile" });
}

function runAnimationFrameAt(scrollY: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
  act(() => {
    animationFrameCallback?.(0);
  });
}

describe("BottomNav landing hide-on-top", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    animationFrameCallback = null;
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      animationFrameCallback = callback;
      return 1;
    });
    window.cancelAnimationFrame = cancelAnimationFrame;
  });

  it("does not render the nav on / while at the top under md", () => {
    setup("/", false);
    expect(queryNav()).toBeNull();
  });

  it("renders the nav on / once scrollY exceeds 120", () => {
    setup("/", false);
    runAnimationFrameAt(300);
    expect(queryNav()).not.toBeNull();
  });

  it("hides the nav again on / when scrollY returns below 120", () => {
    setup("/", false);
    runAnimationFrameAt(300);
    expect(queryNav()).not.toBeNull();
    runAnimationFrameAt(0);
    expect(queryNav()).toBeNull();
  });

  it("uses restored scroll position on initial landing render", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    setup("/", false);
    expect(queryNav()).not.toBeNull();
  });

  it("renders the nav on / at the top on md", () => {
    setup("/", true);
    expect(queryNav()).not.toBeNull();
  });

  it("renders the nav on /dashboard at the top under md", () => {
    setup("/dashboard", false);
    expect(queryNav()).not.toBeNull();
  });

  it("renders the nav on /annonces at the top under md", () => {
    setup("/annonces", false);
    expect(queryNav()).not.toBeNull();
  });

  it("keeps the pill free from hide transforms when visible", () => {
    setup("/dashboard", false);
    const pill = queryNav()!.querySelector("[data-nav-pill]") as HTMLElement;
    expect(pill.className).not.toContain("translate-y-");
    expect(pill.getAttribute("style")).toBeNull();
  });

  it("cancels the animation loop on unmount", () => {
    const view = setup("/", false);
    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
