/**
 * Attribution mail → conversion.
 *
 * Flow :
 *  1) `captureUtmFromUrl()` est appelé sur chaque changement de route.
 *     Si l'URL contient `?utm_source=email&utm_campaign=…`, on enregistre
 *     un événement `click` en base et on stocke la campagne en sessionStorage
 *     (TTL 7 jours).
 *  2) Quand une `small_mission` est créée avec succès, on appelle
 *     `recordMissionCreatedAttribution(missionId)`. Si une campagne active est
 *     présente en sessionStorage, on enregistre un événement `mission_created`
 *     attribué à cette campagne.
 *
 * Aucune donnée perso n'est stockée côté client : juste les UTM + un timestamp.
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "guardiens.email_campaign";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface ActiveCampaign {
  utm_campaign: string;
  utm_content?: string;
  utm_source?: string;
  utm_medium?: string;
  capturedAt: number;
}

function readStored(): ActiveCampaign | null {
  if (typeof window === "undefined") return null;
  try {
    // localStorage : partagé entre onglets de la même origine, survit à la fermeture
    // d'onglet — robuste aux bascules in-app browser → Safari/Chrome sur mobile.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCampaign;
    if (!parsed?.utm_campaign || typeof parsed.capturedAt !== "number") return null;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(c: ActiveCampaign) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* quota / mode privé */
  }
}

/** Renvoie la campagne active si toujours dans la fenêtre de 7 jours. */
export function getActiveCampaign(): ActiveCampaign | null {
  return readStored();
}

/**
 * À appeler à chaque changement de route. Si l'URL porte des UTM email,
 * on persiste la campagne et on enregistre un clic (best-effort, jamais bloquant).
 */
export async function captureUtmFromUrl(search: string, path: string): Promise<void> {
  if (!search) return;
  const params = new URLSearchParams(search);
  const utm_source = params.get("utm_source") ?? undefined;
  const utm_campaign = params.get("utm_campaign") ?? undefined;
  if (utm_source !== "email" || !utm_campaign) return;

  const utm_content = params.get("utm_content") ?? undefined;
  const utm_medium = params.get("utm_medium") ?? undefined;

  // Évite de logger deux fois le même clic en cas de remount React StrictMode.
  const existing = readStored();
  const sameClick =
    existing &&
    existing.utm_campaign === utm_campaign &&
    existing.utm_content === utm_content &&
    Date.now() - existing.capturedAt < 5_000;

  writeStored({
    utm_campaign,
    utm_content,
    utm_source,
    utm_medium,
    capturedAt: Date.now(),
  });

  if (sameClick) return;

  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from("email_campaign_events")
    .insert({
      event_type: "click",
      utm_campaign,
      utm_content,
      utm_source,
      utm_medium,
      user_id: user?.id ?? null,
      path,
    } as never)
    .then(() => undefined, () => undefined); // best-effort
}

/**
 * À appeler après une création réussie de small_mission.
 * Si une campagne est active, attribue la conversion.
 */
export async function recordMissionCreatedAttribution(missionId: string): Promise<void> {
  const c = readStored();
  if (!c) return;
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from("email_campaign_events")
    .insert({
      event_type: "mission_created",
      utm_campaign: c.utm_campaign,
      utm_content: c.utm_content,
      utm_source: c.utm_source,
      utm_medium: c.utm_medium,
      user_id: user?.id ?? null,
      mission_id: missionId,
    } as never)
    .then(() => undefined, () => undefined);
}
