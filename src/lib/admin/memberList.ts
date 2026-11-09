import { getDeptLabel } from "@/lib/departments";
import { OVERSEAS_NAMES, homeDepartmentCodeFromPostal } from "@/lib/homeListingPlace";

/**
 * Lot ADM15 : liste des membres de /admin/users.
 * Les comptes supprimés quittent la liste par défaut ; un filtre les rend
 * visibles. Même définition « non supprimé » que la vue d'ensemble.
 */
export type MemberStatusFilter = "current" | "active" | "suspended" | "deleted" | "all";

export const DEFAULT_MEMBER_STATUS_FILTER: MemberStatusFilter = "current";

export const MEMBER_STATUS_FILTERS: { value: MemberStatusFilter; label: string }[] = [
  { value: "current", label: "Actifs et suspendus" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
  { value: "deleted", label: "Supprimés" },
  { value: "all", label: "Tous les comptes" },
];

/** Statut vide = actif, comme partout dans l'admin. */
export const MEMBER_STATUS_OR: Partial<Record<MemberStatusFilter, string>> = {
  current: "account_status.is.null,account_status.neq.deleted",
  active: "account_status.eq.active,account_status.is.null",
};

export function applyMemberStatusFilter<Q extends { or: (f: string) => Q; eq: (c: string, v: string) => Q }>(
  query: Q,
  filter: MemberStatusFilter,
): Q {
  const or = MEMBER_STATUS_OR[filter];
  if (or) return query.or(or);
  if (filter === "suspended" || filter === "deleted") return query.eq("account_status", filter);
  return query;
}

/** Collectivités d'outre-mer proposées dans le filtre Département. */
export const ADMIN_EXTRA_DEPT_NAMES: Record<string, string> = { ...OVERSEAS_NAMES };

/** Département d'un code postal, collectivités d'outre-mer comprises (987 Polynésie, 988 Nouvelle-Calédonie). */
export function adminDeptLabel(postalCode: string | null | undefined): string {
  const label = getDeptLabel(postalCode ?? null);
  if (label !== "-") return label;
  const code = homeDepartmentCodeFromPostal(postalCode);
  if (code && OVERSEAS_NAMES[code]) return `${code} ${OVERSEAS_NAMES[code]}`;
  return "·";
}
