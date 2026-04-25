import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Mock auth + supabase pour pouvoir rendre Login
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { resend: vi.fn() } },
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import Login from "@/pages/Login";

const renderLogin = () =>
  render(
    <HelmetProvider>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </HelmetProvider>,
  );

describe("Login autofill behavior", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("active l'autofill natif sur Chrome desktop standard", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120",
    });
    renderLogin();
    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const pwd = screen.getByLabelText(/mot de passe/i) as HTMLInputElement;
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(pwd.getAttribute("autocomplete")).toBe("current-password");
  });

  it("désactive l'autofill dans le WebView Facebook in-app", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent:
        "Mozilla/5.0 (Linux; Android 16; SM-S911B) AppleWebKit/537.36 Chrome/147 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/556.0.0.60.64;]",
    });
    renderLogin();
    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const pwd = screen.getByLabelText(/mot de passe/i) as HTMLInputElement;
    expect(email.getAttribute("autocomplete")).toBe("off");
    expect(pwd.getAttribute("autocomplete")).toBe("off");
    expect(email.getAttribute("data-form-type")).toBe("other");
    expect(email.getAttribute("data-lpignore")).toBe("true");
  });

  it("désactive l'autofill dans Instagram", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone) Instagram 300.0.0.0",
    });
    renderLogin();
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).getAttribute("autocomplete"))
      .toBe("off");
  });
});
