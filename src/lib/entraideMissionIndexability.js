export function isIndexableEntraideMission(mission, now = new Date()) {
  if (mission.status !== "open" || !mission.slug || (mission.description?.trim().length ?? 0) < 200) return false;
  if (mission.mission_type === "offre") return true;
  const deadline = mission.end_date || mission.date_needed;
  return !deadline || new Date(deadline).getTime() >= now.getTime();
}