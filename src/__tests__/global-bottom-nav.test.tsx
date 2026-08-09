import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { ChromeVisibilityProvider } from "@/components/layout/ChromeVisibility";
import GlobalBottomNav from "@/components/layout/GlobalBottomNav";

const authState = {
  user: null as unknown,
  hasSession: false,
  authChecked: true,
  loading: false,
  authTimeout: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/components/layout/Navigation", () => ({
  BottomNav: () => <nav aria-label="Navigation mobile" />,
  Sidebar: () => null,
}));

const signIn = () => {
  authState.user = { id: "u1" };
  authState.hasSession = true;
};

const signOut = () => {
  authState.user = null;
  authState.hasSession = false;
};

const renderAt = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <ChromeVisibilityProvider>
        <GlobalBottomNav />
      </ChromeVisibilityProvider>
    </MemoryRouter>,
  );

describe("barre de navigation basse montée globalement", () => {
  beforeEach(() => {
    signOut();
    authState.authChecked = true;
    authState.loading = false;
    authState.authTimeout = false;
  });

  it.each(["/", "/annonces", "/dashboard"])(
    "est rendue pour un utilisateur connecté sur %s",
    (route) => {
      signIn();
      renderAt(route);
      expect(screen.getAllByRole("navigation", { name: "Navigation mobile" })).toHaveLength(1);
    },
  );

  it("n'est pas rendue pour un visiteur", () => {
    renderAt("/");
    expect(screen.queryByRole("navigation", { name: "Navigation mobile" })).toBeNull();
  });

  it("n'est pas rendue pendant la vérification de session", () => {
    authState.authChecked = false;
    authState.hasSession = true;
    authState.authTimeout = true;
    renderAt("/dashboard");
    expect(screen.queryByRole("navigation", { name: "Navigation mobile" })).toBeNull();
  });

  it.each(["/login", "/onboarding/affinity", "/inscription", "/admin/users"])(
    "n'est pas rendue sur %s",
    (route) => {
      signIn();
      renderAt(route);
      expect(screen.queryByRole("navigation", { name: "Navigation mobile" })).toBeNull();
    },
  );

  it("n'existe qu'un seul point de montage de BottomNav dans le code applicatif", () => {
    const root = path.resolve(__dirname, "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(full);
        } else if (/\.tsx$/.test(entry.name)) {
          files.push(full);
        }
      }
    };
    walk(root);
    const mounts = files.filter((f) => /<BottomNav\b/.test(fs.readFileSync(f, "utf8")));
    expect(mounts.map((f) => path.basename(f))).toEqual(["GlobalBottomNav.tsx"]);
  });
});
