/**
 * Harnais de mocks réseau pour les specs du tunnel post-inscription
 * propriétaire (lots 1 et 2, 16/08/2026). Aucun accès backend réel :
 * les réponses auth et REST sont simulées, avec un mini magasin stateful
 * pour les tables que le parcours met à jour (profiles, owner_profiles).
 */
import type { Page } from "@playwright/test";

export const TUNNEL_USER_ID = "3f6b2a90-1234-4cde-8ab0-abcdef123456";
const PROJECT_REF = "erhccyqevdyevpyctsjj";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

const b64 = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

const fakeJwt = (userId: string) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.fakesignature`;

export interface TunnelMockOptions {
  /** Flag mandatory_affinity_onboarding côté serveur. */
  flagEnabled: boolean;
  /** owner_profiles déjà complet (onboarding d'affinité traversé). */
  affinityComplete: boolean;
  /** Prénom et code postal absents du profil (défaut true). */
  identityMissing?: boolean;
}

/** Session Supabase factice mais bien formée, non expirée. */
export function buildTunnelSession() {
  const now = new Date().toISOString();
  return {
    access_token: fakeJwt(TUNNEL_USER_ID),
    refresh_token: "fake-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: TUNNEL_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "marie@guardiens.test",
      created_at: now,
    },
  };
}

/** Injecte la session dans localStorage avant le premier script de la page. */
export async function injectTunnelSession(page: Page) {
  const session = buildTunnelSession();
  await page.addInitScript(
    ({ key, value }) => {
      try { window.localStorage.setItem(key, value); } catch { /* silencieux */ }
    },
    { key: STORAGE_KEY, value: JSON.stringify(session) },
  );
}

/**
 * Intercepte toutes les requêtes REST et auth. Le magasin profiles et
 * owner_profiles est stateful : les écritures du parcours (identité,
 * affinité) sont relues par les écrans suivants, comme en réel.
 */
export async function installTunnelRestMocks(page: Page, opts: TunnelMockOptions) {
  const now = new Date().toISOString();
  const identityMissing = opts.identityMissing !== false;
  const store = {
    profile: {
      id: TUNNEL_USER_ID,
      role: "owner",
      first_name: identityMissing ? null : "Marie",
      last_name: null,
      postal_code: identityMissing ? null : "69001",
      city: null,
      bio: null,
      avatar_url: null,
      profile_completion: 20,
      identity_verified: false,
      is_founder: false,
      onboarding_completed: false,
      onboarding_minimal_completed: false,
      onboarding_dismissed_at: null,
      created_at: now,
      email: "marie@guardiens.test",
    } as Record<string, any>,
    ownerProfile: (opts.affinityComplete
      ? {
          user_id: TUNNEL_USER_ID,
          presence_expected: "100% sur place",
          preferred_sitter_types: ["Sans préférence"],
        }
      : null) as Record<string, any> | null,
  };

  const session = buildTunnelSession();
  const json = (route: any, body: any, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/auth/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/token")) return json(route, session);
    if (url.includes("/user")) return json(route, session.user);
    return json(route, {});
  });

  await page.route("**/functions/v1/**", (route) => json(route, {}));

  await page.route("**/rest/v1/**", (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
    const accept = req.headers()["accept"] ?? "";
    const wantsObject = accept.includes("vnd.pgrst.object");

    if (method === "HEAD") {
      return route.fulfill({
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.includes("/analytics_events")) return json(route, {}, 201);

    if (url.includes("/profiles")) {
      if (method === "PATCH" || method === "POST") {
        try {
          const body = req.postDataJSON();
          Object.assign(store.profile, Array.isArray(body) ? body[0] : body);
        } catch { /* corps non JSON, ignoré */ }
        return json(route, [store.profile]);
      }
      return json(route, wantsObject ? store.profile : [store.profile]);
    }

    if (url.includes("/owner_profiles")) {
      if (method === "POST" || method === "PATCH") {
        try {
          const body = req.postDataJSON();
          const row = Array.isArray(body) ? body[0] : body;
          store.ownerProfile = { ...(store.ownerProfile ?? {}), ...row };
        } catch { /* corps non JSON, ignoré */ }
        return json(route, [store.ownerProfile], 201);
      }
      return json(
        route,
        wantsObject ? store.ownerProfile : store.ownerProfile ? [store.ownerProfile] : [],
      );
    }

    if (url.includes("/feature_flags")) {
      const row = {
        key: "mandatory_affinity_onboarding",
        enabled: opts.flagEnabled,
        applies_since: "2026-07-09T00:00:00+00:00",
      };
      return json(route, wantsObject ? row : [row]);
    }

    if (url.includes("/rpc/")) return json(route, null);

    // Tables lues à vide : properties, owner_gallery, sitter_profiles, sits...
    return json(route, wantsObject ? null : []);
  });
}

/** Session injectée + mocks REST : l'application démarre authentifiée. */
export async function installTunnelMocks(page: Page, opts: TunnelMockOptions) {
  await injectTunnelSession(page);
  await installTunnelRestMocks(page, opts);
}
