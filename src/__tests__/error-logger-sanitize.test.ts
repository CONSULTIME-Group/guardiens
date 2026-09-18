import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Garde-fou sécurité du logger : aucun jeton magic-link Supabase ni code
 * OAuth ne doit être stocké dans error_logs (url, hash, search, referrer).
 */

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(
    async (_fn: string, _args: Record<string, unknown>) =>
      ({ data: null, error: null }) as { data: unknown; error: unknown },
  ),
  getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  isInAppBrowser: vi.fn(() => false),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/inAppBrowser", () => ({
  isInAppBrowser: mocks.isInAppBrowser,
}));

import { reportError, sanitizeUrlSecrets } from "@/lib/errorLogger";

describe("sanitizeUrlSecrets", () => {
  it("masque access_token, refresh_token et expires_at en conservant la structure", () => {
    const out = sanitizeUrlSecrets(
      "https://guardiens.fr/candidatures?foo=bar&access_token=SECRET_A&refresh_token=SECRET_R&expires_at=1726600000#section",
    );
    expect(out).not.toContain("SECRET_A");
    expect(out).not.toContain("SECRET_R");
    expect(out).not.toContain("1726600000");
    expect(out).toContain("foo=bar");
    expect(out).toContain("#section");
    expect(out).toContain("access_token=[redacted]");
    expect(out).toContain("refresh_token=[redacted]");
    expect(out).toContain("expires_at=[redacted]");
  });

  it("masque les jetons dans un fragment multiple du type #candidatures#access_token=...", () => {
    const out = sanitizeUrlSecrets(
      "https://guardiens.fr/#candidatures#access_token=SECRET_A&refresh_token=SECRET_R",
    );
    expect(out).not.toContain("SECRET_A");
    expect(out).not.toContain("SECRET_R");
    expect(out).toContain("#candidatures#access_token=[redacted]");
  });

  it("masque le paramètre code OAuth", () => {
    const out = sanitizeUrlSecrets("https://guardiens.fr/auth/callback?code=OAUTH_CODE&state=ok");
    expect(out).not.toContain("OAUTH_CODE");
    expect(out).toContain("state=ok");
    expect(out).toContain("code=[redacted]");
  });

  it("masque id_token, token, token_type et expires_in", () => {
    const out = sanitizeUrlSecrets(
      "#id_token=ID&token=TOK&token_type=bearer&expires_in=3600",
    );
    expect(out).not.toContain("=ID");
    expect(out).not.toContain("=TOK");
    expect(out).not.toContain("=bearer");
    expect(out).not.toContain("=3600");
    expect(out).toBe(
      "#id_token=[redacted]&token=[redacted]&token_type=[redacted]&expires_in=[redacted]",
    );
  });

  it("laisse inchangée une chaîne sans secret", () => {
    const clean = "https://guardiens.fr/recherche?ville=Lyon&rayon=30#carte";
    expect(sanitizeUrlSecrets(clean)).toBe(clean);
  });

  it("est idempotente", () => {
    const dirty = "https://guardiens.fr/?access_token=SECRET&foo=1";
    const once = sanitizeUrlSecrets(dirty);
    expect(sanitizeUrlSecrets(once)).toBe(once);
  });

  it("retourne null / undefined proprement", () => {
    expect(sanitizeUrlSecrets(null)).toBeNull();
    expect(sanitizeUrlSecrets(undefined)).toBeNull();
  });
});

describe("reportError ne stocke aucun secret dans le payload RPC", () => {
  beforeEach(() => {
    mocks.rpc.mockClear();
    mocks.getUser.mockClear();
  });

  it("_url et context.hash/url ne contiennent pas le secret", async () => {
    const secret = "SECRET_MAGIC_LINK_TOKEN";
    // Simule une URL courante portant un jeton magic-link
    const originalHref = window.location.href;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        href: `https://guardiens.fr/#access_token=${secret}&refresh_token=REF`,
        search: `?code=${secret}`,
        hash: `#access_token=${secret}`,
        pathname: "/",
      },
    });
    try {
      reportError(new Error("boom secret url"), {
        url: `https://guardiens.fr/candidatures?access_token=${secret}`,
        hash: `#access_token=${secret}`,
        statut: 500,
      });
      await vi.waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledTimes(1);
      });

      const payload = mocks.rpc.mock.calls[0][1] as {
        _url: string | null;
        _context: Record<string, unknown>;
      };
      expect(payload._url).not.toContain(secret);
      expect(payload._url).not.toContain("REF");
      expect(payload._url).toContain("access_token=[redacted]");

      const ctx = payload._context as { url?: string; hash?: string; statut?: number };
      expect(ctx.url).not.toContain(secret);
      expect(ctx.url).toContain("access_token=[redacted]");
      expect(ctx.hash).not.toContain(secret);
      expect(ctx.statut).toBe(500);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, href: originalHref, search: "", hash: "", pathname: "/" },
      });
    }
  });
});
