/**
 * Lot A11 : la page Emails transactionnels passe de 11 onglets à 4 sections.
 * Les anciennes valeurs de ?tab= restent valides : chaque ancien onglet
 * devient un sous-onglet de sa section.
 */
export type EmailSection = "modeles" | "envois" | "performance" | "resumes";

export const EMAIL_SECTIONS: { key: EmailSection; label: string; tabs: { key: string; label: string }[] }[] = [
  { key: "modeles", label: "Modèles", tabs: [{ key: "templates", label: "Modèles" }] },
  {
    key: "envois",
    label: "Envois",
    tabs: [
      { key: "logs", label: "Journaux" },
      { key: "queue", label: "File" },
      { key: "suppressions", label: "Suppressions" },
      { key: "config", label: "Réglages" },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    tabs: [
      { key: "engagement", label: "Engagement" },
      { key: "confirmations", label: "Confirmations" },
      { key: "delivery", label: "Délivrabilité" },
    ],
  },
  {
    key: "resumes",
    label: "Résumés quotidiens",
    tabs: [
      { key: "sitter-digest", label: "Gardien" },
      { key: "mission-digest", label: "Entraide" },
    ],
  },
];

/** Onglet Entraide sorti de la page : ?tab=mutual-aid redirige ici. */
export const MUTUAL_AID_PILOT_ROUTE = "/admin/pilotage-entraide";

export function resolveEmailTab(raw: string | null): { section: EmailSection; tab: string } | { redirect: string } {
  if (raw === "mutual-aid") return { redirect: MUTUAL_AID_PILOT_ROUTE };
  if (raw) {
    for (const s of EMAIL_SECTIONS) {
      if (s.key === raw) return { section: s.key, tab: s.tabs[0].key };
      if (s.tabs.some((t) => t.key === raw)) return { section: s.key, tab: raw };
    }
  }
  return { section: "modeles", tab: "templates" };
}
