/**
 * Provenance d'une réponse à une publication d'entraide.
 *
 * Capturée à l'ouverture de la fiche, conservée en sessionStorage, puis lue au
 * moment où la réponse part. Sans cela, on mesure des réponses sans savoir d'où
 * vient la personne : fil, email de digest, invitation ou lien direct.
 *
 * Aucune donnée personnelle n'est stockée, seulement la campagne et l'horodatage.
 */

export type MissionResponseSource = "feed" | "digest_email" | "invitation" | "direct";

const KEY = "guardiens_mission_source";
const TTL_MS = 24 * 60 * 60 * 1000;

interface StoredSource {
  mission_id: string;
  source: MissionResponseSource;
  utm_campaign?: string | null;
  utm_source?: string | null;
  timestamp: number;
}

/** Déduit la provenance à partir des UTM puis, à défaut, du référent interne. */
export function resolveMissionSource(
  search: string,
  referrer: string,
): { source: MissionResponseSource; utm_campaign: string | null; utm_source: string | null } {
  let utm_campaign: string | null = null;
  let utm_source: string | null = null;
  try {
    const params = new URLSearchParams(search);
    utm_campaign = params.get("utm_campaign");
    utm_source = params.get("utm_source");
  } catch {
    /* URL illisible, on retombe sur le référent */
  }

  const campaign = (utm_campaign || "").toLowerCase();
  if (campaign.includes("invitation")) {
    return { source: "invitation", utm_campaign, utm_source };
  }
  if (campaign.includes("digest") || campaign.includes("nudge")) {
    return { source: "digest_email", utm_campaign, utm_source };
  }
  if ((utm_source || "").toLowerCase() === "email") {
    return { source: "digest_email", utm_campaign, utm_source };
  }

  // Arrivée depuis le fil de l'entraide, sans campagne.
  if (/\/petites-missions\/?($|\?)/.test(referrer || "")) {
    return { source: "feed", utm_campaign, utm_source };
  }
  return { source: "direct", utm_campaign, utm_source };
}

/** À appeler à l'affichage d'une fiche. Renvoie la provenance retenue. */
export function captureMissionSource(missionId: string): MissionResponseSource {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const resolved = resolveMissionSource(search, referrer);
  if (typeof window === "undefined") return resolved.source;
  try {
    const payload: StoredSource = {
      mission_id: missionId,
      source: resolved.source,
      utm_campaign: resolved.utm_campaign,
      utm_source: resolved.utm_source,
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* mode privé ou quota */
  }
  return resolved.source;
}

/** Lit la provenance stockée pour cette publication. Retombe sur « direct ». */
export function readMissionSource(missionId: string): {
  source: MissionResponseSource;
  utm_campaign: string | null;
} {
  if (typeof window === "undefined") return { source: "direct", utm_campaign: null };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { source: "direct", utm_campaign: null };
    const parsed = JSON.parse(raw) as StoredSource;
    if (!parsed || parsed.mission_id !== missionId) return { source: "direct", utm_campaign: null };
    if (Date.now() - (parsed.timestamp || 0) > TTL_MS) return { source: "direct", utm_campaign: null };
    return { source: parsed.source, utm_campaign: parsed.utm_campaign ?? null };
  } catch {
    return { source: "direct", utm_campaign: null };
  }
}
