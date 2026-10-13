// Lot X3c (13/10/2026, audit D-10) : recherche admin d'un compte par adresse.
//
// 1. profiles, par ilike exact (« _ » et « % » échappés, sinon jokers) et
//    sans maybeSingle (deux lignes proches faisaient tomber la lecture à vide) ;
// 2. sinon auth.users, page après page jusqu'à la dernière (le repli lisait
//    les 200 premiers comptes sur plus de 1 600).
//
// Module pur (aucune variable globale Deno) : il est aussi chargé par Vitest.

// deno-lint-ignore no-explicit-any
type Client = any;

export interface FoundAccount {
  userId: string | null;
  profile: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null;
  source: "profiles" | "auth" | null;
  /** Lecture en échec : la réponse « aucun compte » n'est alors pas fiable. */
  error: string | null;
}

export const AUTH_PAGE_SIZE = 1000;
export const AUTH_MAX_PAGES = 100;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function findAccountByEmail(client: Client, rawEmail: string): Promise<FoundAccount> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { userId: null, profile: null, source: null, error: null };

  const { data: rows, error: profErr } = await client
    .from("profiles")
    .select("id, email, first_name, last_name")
    .ilike("email", escapeIlike(email))
    .limit(5);
  if (profErr) {
    return { userId: null, profile: null, source: null, error: String(profErr.message ?? profErr) };
  }
  const profile = ((rows as FoundAccount["profile"][] | null) ?? [])
    .find((r) => r && normalizeEmail(r.email) === email) ?? null;
  if (profile) return { userId: profile.id, profile, source: "profiles", error: null };

  for (let page = 1; page <= AUTH_MAX_PAGES; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error) {
      return { userId: null, profile: null, source: null, error: String(error.message ?? error) };
    }
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const match = users.find((u) => normalizeEmail(u.email) === email);
    if (match) return { userId: match.id, profile: null, source: "auth", error: null };
    if (users.length < AUTH_PAGE_SIZE) break;
  }
  return { userId: null, profile: null, source: null, error: null };
}
