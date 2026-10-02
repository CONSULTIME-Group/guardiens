import {
  isIndexableEntraideMission as sharedIsIndexableEntraideMission,
  isIndexableProjetMission as sharedIsIndexableProjetMission,
} from "../_shared/entraideMissionIndexability.js";

export interface SitemapMission {
  slug?: string | null;
  description?: string | null;
  status?: string | null;
  mission_type?: string | null;
  category?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export function isIndexableEntraideMission(mission: SitemapMission, now = new Date()): boolean {
  return sharedIsIndexableEntraideMission(mission, now);
}

export function isIndexableProjetMission(mission: SitemapMission, now = new Date()): boolean {
  return sharedIsIndexableProjetMission(mission, now);
}
