// Chargement serveur de la préparation d'annonce et des gardiens proches (lot N4).
// Aucune coordonnée ne sort : seuls prénom, commune, noms d'animaux,
// pourcentage et cartes gardien (prénom, photo, distance) sont renvoyés.

import { computeReadiness, type Readiness } from "./owner-departure-logic.ts";
import { loadSitterPool, nearbySitters, pickThree, type SitterRow } from "./owner-noel-audience.ts";
import { capitalizePetName } from "./owner-departure-logic.ts";
import { emailAvatarUrl, emailCity } from "./entraide-card-data.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export interface ReadinessPayload {
  firstName: string;
  city: string | null;
  petNames: string[];
  readiness: Readiness;
  nearby: { count: number; sitters: Array<{ id: string; firstName: string; avatarUrl?: string; distanceKm: number }> } | null;
}

export async function ownerReadiness(client: Client, userId: string, pool?: SitterRow[]): Promise<ReadinessPayload> {
  const [{ data: profile }, { data: props }, { data: gallery }, { data: drafts }] = await Promise.all([
    client.from("profiles").select("id, first_name, city, latitude, longitude").eq("id", userId).maybeSingle(),
    client.from("properties").select("id, photos, cover_photo_url").eq("user_id", userId),
    client.from("owner_gallery").select("id").eq("user_id", userId).limit(30),
    client.from("sits").select("start_date").eq("user_id", userId).eq("status", "draft"),
  ]);
  const propertyIds = (props ?? []).map((p: { id: string }) => p.id);
  let pets: Array<{ name: string | null; species: string | null }> = [];
  if (propertyIds.length > 0) {
    const { data } = await client.from("pets").select("name, species").in("property_id", propertyIds);
    pets = data ?? [];
  }
  const propertyPhotoCount = (props ?? []).reduce(
    (n: number, p: { photos: string[] | null; cover_photo_url: string | null }) =>
      n + (p.photos?.length ?? 0) + (p.cover_photo_url ? 1 : 0), 0);
  const city = emailCity(profile?.city ?? null) || null;
  const readiness = computeReadiness({
    city,
    latitude: profile?.latitude ?? null,
    hasProperty: propertyIds.length > 0,
    pets,
    galleryPhotoCount: (gallery ?? []).length,
    propertyPhotoCount,
    draftStartDates: (drafts ?? []).map((d: { start_date: string | null }) => d.start_date),
  });

  let nearby: ReadinessPayload["nearby"] = null;
  if (profile && typeof profile.latitude === "number" && typeof profile.longitude === "number" && city) {
    const list = nearbySitters(profile, pool ?? await loadSitterPool(client));
    nearby = {
      count: list.length,
      sitters: pickThree(list).map(({ row, km }) => {
        const a = emailAvatarUrl(row.avatar_url);
        return { id: row.id, firstName: (row.first_name ?? "").trim(), ...(a ? { avatarUrl: a } : {}), distanceKm: Math.round(km) };
      }),
    };
  }
  return {
    firstName: (profile?.first_name ?? "").trim(),
    city,
    petNames: pets.map((p) => capitalizePetName(p.name)).filter(Boolean),
    readiness,
    nearby,
  };
}
