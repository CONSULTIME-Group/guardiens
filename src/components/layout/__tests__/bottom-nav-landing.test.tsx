import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "../Navigation";
import { useScrollDirection } from "@/hooks/useScrollDirection";

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

vi.mock("@/hooks/useScrollDirection", async () => ({
  useScrollDirection: vi.fn(() => "up"),
}));

vi.mock("../AppShellContext", async () => ({
  useInAppShell: vi.fn(() => true),
}));

vi.mock("../ChromeVisibility", async () => ({
  useChromeVisibility: vi.fn(() => ({ bottomNavHidden: false })),
}));

const { useLocation } = await import("react-router-dom");
const mockedUseScrollDirection = vi.mocked(useScrollDirection);

let observerCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
const disconnect = vi.fn();

class FakeIntersectionObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    observerCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {
    disconnect();
  }
}

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

function scrollPastSentinel() {
  act(() => {
    observerCallback?.([{ isIntersecting: false }]);
  });
}

function backToTop() {
  act(() => {
    observerCallback?.([{ isIntersecting: true }]);
  });
}

describe("BottomNav landing hide-on-top", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    mockedUseScrollDirection.mockReturnValue("up");
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      FakeIntersectionObserver;
  });

  it("does not render the nav on / while at the top under md", () => {
    setup("/", false);
    expect(queryNav()).toBeNull();
  });

  it("renders the nav on / once the sentinel leaves the viewport", () => {
    setup("/", false);
    scrollPastSentinel();
    expect(queryNav()).not.toBeNull();
  });

  it("hides the nav again on / when the sentinel comes back into view", () => {
    setup("/", false);
    scrollPastSentinel();
    expect(queryNav()).not.toBeNull();
    backToTop();
    expect(queryNav()).toBeNull();
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

  it("keeps the pill untranslated when visible", () => {
    setup("/dashboard", false);
    const pill = queryNav()!.querySelector("[data-nav-pill]") as HTMLElement;
    expect(pill.className).toContain("translate-y-0");
    expect(pill.getAttribute("style")).toBeNull();
  });

  it("preserves the scroll-down hide on /dashboard", () => {
    mockedUseScrollDirection.mockReturnValue("down");
    setup("/dashboard", false);
    const pill = queryNav()!.querySelector("[data-nav-pill]") as HTMLElement;
    expect(pill.className).toContain("motion-reduce:transition-none");
  });

  it("disconnects the observer on unmount", () => {
    const view = setup("/", false);
    view.unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
