import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "../Navigation";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const setPathname = vi.fn();

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

function setup(pathname: string, scrollY = 0, mdMatches = false) {
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    writable: true,
    configurable: true,
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: mdMatches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  (useLocation as ReturnType<typeof vi.fn>).mockReturnValue({ pathname });

  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
}

function getNav() {
  return screen.getByRole("navigation", { name: "Navigation mobile" });
}

describe("BottomNav landing hide-on-top", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseScrollDirection.mockReturnValue("up");
  });

  it("hides the pill on / at scroll 0 under md", () => {
    setup("/", 0, false);
    expect(getNav().className).toContain("translate-y-[150%]");
  });

  it("shows the pill on / after 120 px of scroll under md", () => {
    setup("/", 120, false);
    fireEvent.scroll(window);
    expect(getNav().className).toContain("translate-y-0");
    expect(getNav().className).not.toContain("translate-y-[150%]");
  });

  it("keeps the pill visible on / when scrolling down past the threshold", () => {
    mockedUseScrollDirection.mockReturnValue("down");
    setup("/", 200, false);
    fireEvent.scroll(window);
    expect(getNav().className).toContain("translate-y-0");
    expect(getNav().className).not.toContain("translate-y-[150%]");
  });

  it("keeps the pill visible on / at scroll 0 on md", () => {
    setup("/", 0, true);
    expect(getNav().className).toContain("translate-y-0");
    expect(getNav().className).not.toContain("translate-y-[150%]");
  });

  it("keeps the pill visible on /dashboard at scroll 0 under md", () => {
    setup("/dashboard", 0, false);
    expect(getNav().className).toContain("translate-y-0");
    expect(getNav().className).not.toContain("translate-y-[150%]");
  });

  it("preserves the existing scroll-down hide on /dashboard", () => {
    mockedUseScrollDirection.mockReturnValue("down");
    setup("/dashboard", 200, false);
    fireEvent.scroll(window);
    expect(getNav().className).toContain("translate-y-[150%]");
    expect(getNav().className).not.toContain("translate-y-0");
  });

  it("hides the pill again on / when scrolling back to top", () => {
    setup("/", 200, false);
    fireEvent.scroll(window);
    expect(getNav().className).toContain("translate-y-0");

    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    fireEvent.scroll(window);
    expect(getNav().className).toContain("translate-y-[150%]");
  });

  it("preserves the existing transition utility and reduced-motion support", () => {
    setup("/", 0, false);
    const nav = getNav();
    expect(nav.className).toContain("transition-transform");
    expect(nav.className).toContain("duration-300");
    expect(nav.className).toContain("ease-out");
    expect(nav.className).toContain("motion-reduce:transition-none");
  });
});
