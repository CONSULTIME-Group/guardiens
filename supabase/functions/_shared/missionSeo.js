export function isIndexableEntraideMission(mission, now = new Date()) {
  if (mission.status !== "open" || !mission.slug || (mission.description?.trim().length ?? 0) < 200) return false;
  if (mission.mission_type === "offre") return true;
  const deadline = mission.end_date || mission.date_needed;
  return !deadline || new Date(deadline).getTime() >= now.getTime();
}
/**
 * Fiche projet participatif indexable, servie sous /projets/{slug}.
 * Même règle de substance et d'expiration que l'entraide (statut ouvert, slug,
 * description d'au moins 200 caractères, date non passée), restreinte à la
 * catégorie projet. Source unique : sitemap de build, fonction sitemap et
 * balise robots de la fiche.
 */
export function isIndexableProjetMission(mission, now = new Date()) {
  if (mission.category !== "projet") return false;
  return isIndexableEntraideMission({ ...mission, mission_type: "besoin" }, now);
}
