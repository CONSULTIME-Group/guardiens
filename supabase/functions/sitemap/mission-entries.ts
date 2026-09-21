export interface SitemapMission {
  slug?: string | null;
  description?: string | null;
  status?: string | null;
  mission_type?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export function isIndexableEntraideMission(mission: SitemapMission, now = new Date()): boolean {
  if (mission.status !== "open" || !mission.slug || (mission.description?.trim().length ?? 0) < 200) return false;
  if (mission.mission_type === "offre") return true;
  const deadline = mission.end_date || mission.date_needed;
  return !deadline || new Date(deadline).getTime() >= now.getTime();
}