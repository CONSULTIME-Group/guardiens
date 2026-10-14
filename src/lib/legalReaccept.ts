/**
 * Lot J2b : réacceptation des textes légaux (CGU v9, article 15.4).
 *
 * À sa première connexion après la date d'effet, le membre accepte la
 * nouvelle version par une case à cocher. Jusque-là, il garde la consultation
 * de ses données, la messagerie et la fermeture de son compte : la fenêtre
 * reste absente des routes listées ici.
 *
 * Le serveur décide seul des documents à accepter (my_pending_legal_documents)
 * et des versions enregistrées (record_my_legal_acceptance('reaccept')).
 */
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSIONS, parisToday, type LegalDocument } from "@/config/legalVersions";

export interface PendingLegalDocument {
  document: LegalDocument;
  version: string;
  effective_on: string;
}

/** Routes où le membre garde l'accès sans avoir accepté (CGU 15.4). */
export const REACCEPT_EXEMPT_PREFIXES = [
  "/messages",
  "/settings",
  "/cgu",
  "/cgs",
  "/confidentialite",
  "/mentions-legales",
  "/cookies",
] as const;

/** Paramètres, section de fermeture du compte (src/pages/Settings.tsx). */
export const CLOSE_ACCOUNT_PATH = "/settings?section=danger";

export function isReacceptExemptPath(pathname: string): boolean {
  return REACCEPT_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const DOCUMENT_TITLES: Record<LegalDocument, string> = {
  cgu: "les Conditions Générales d'Utilisation",
  cgs: "les Conditions Générales de Services",
  privacy: "la Politique de confidentialité",
};

/**
 * Dernières versions en vigueur qui exigent une acceptation expresse, dans
 * l'ordre CGU, CGS, confidentialité.
 */
export function reacceptVersionsInForce(today: string = parisToday()) {
  const order: LegalDocument[] = ["cgu", "cgs", "privacy"];
  return order
    .map((doc) =>
      LEGAL_VERSIONS.filter((v) => v.document === doc && v.effectiveOn <= today)
        .sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn))[0],
    )
    .filter((v): v is (typeof LEGAL_VERSIONS)[number] => !!v && v.requiresReaccept);
}

/** Libellé de la case : « J'accepte les Conditions ... (version 9) et ... ». */
export function reacceptCheckboxLabel(today: string = parisToday()): string {
  const parts = reacceptVersionsInForce(today).map((v) => `${DOCUMENT_TITLES[v.document]} (version ${v.version})`);
  if (parts.length === 0) return "J'accepte les conditions en vigueur";
  const last = parts.pop();
  return `J'accepte ${parts.length ? `${parts.join(", ")} et ${last}` : last}`;
}

export async function fetchMyPendingLegalDocuments(): Promise<PendingLegalDocument[]> {
  const { data, error } = await (supabase.rpc as any)("my_pending_legal_documents");
  if (error) throw error;
  return Array.isArray(data) ? (data as PendingLegalDocument[]) : [];
}

/** Enregistre la réacceptation ; lève si le serveur ne confirme pas. */
export async function recordMyReacceptance(): Promise<void> {
  const { data, error } = await (supabase.rpc as any)("record_my_legal_acceptance", { p_source: "reaccept" });
  if (error) throw error;
  if (data !== true) throw new Error("reaccept_not_recorded");
}
