/**
 * Liens d'une fiche de besoin vers les pages qui la prolongent (lot SEO-E,
 * arène entraide du 25/10/2026) :
 *  - fil d'Ariane vers la page ville d'entraide du rayon (/petites-missions/<ville>) ;
 *  - sur une fiche animaux, « Faire garder vos animaux près de {ville} » vers
 *    la page garde de la ville (/house-sitting/<slug>).
 * Les 14 villes d'entraide ont toutes leur page /house-sitting au même slug
 * (seo_city_pages publiées, vérifié en base le 25/10/2026). Hors de leurs
 * rayons, le slug se déduit du nom de ville et n'est retenu que si la page
 * seo_city_pages correspondante est publiée.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  entraideCityBySlug,
  entraideCityForPoint,
  houseSittingSlugFromCity,
  type EntraideCityCenter,
} from "@/lib/entraideCityIndexability";

export interface MissionPlace {
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  category?: string | null;
}

/** Page ville d'entraide de la fiche : rayon d'abord, nom de ville ensuite. */
export function missionEntraideCity(mission: MissionPlace): EntraideCityCenter | null {
  return entraideCityForPoint(mission.latitude, mission.longitude)
    ?? entraideCityBySlug(houseSittingSlugFromCity(mission.city) ?? "");
}

export function animalCareLabel(cityName: string): string {
  const near = /^[aeiouyàâéèêîôû]/i.test(cityName) ? `d'${cityName}` : `de ${cityName}`;
  return `Faire garder vos animaux près ${near}`;
}

export interface AnimalCareLink {
  href: string;
  label: string;
}

/**
 * Lien garde d'une fiche animaux. `ready` reste faux pendant la vérification
 * de la page ville, pour que le pré-rendu attende le lien.
 */
export function useAnimalCareLink(mission: MissionPlace, fallbackCityLabel: string): { link: AnimalCareLink | null; ready: boolean } {
  const isAnimals = mission.category === "animals";
  const entraideCity = useMemo(() => (isAnimals ? missionEntraideCity(mission) : null), [isAnimals, mission]);
  const candidate = isAnimals && !entraideCity ? houseSittingSlugFromCity(mission.city) : null;
  const [checked, setChecked] = useState<{ slug: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!candidate) return;
    let active = true;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("seo_city_pages")
          .select("slug")
          .eq("slug", candidate)
          .eq("published", true)
          .maybeSingle();
        if (active) setChecked({ slug: candidate, ok: Boolean(data?.slug) });
      } catch {
        if (active) setChecked({ slug: candidate, ok: false });
      }
    })();
    return () => { active = false; };
  }, [candidate]);

  if (!isAnimals) return { link: null, ready: true };
  if (entraideCity) {
    return { link: { href: `/house-sitting/${entraideCity.slug}`, label: animalCareLabel(entraideCity.name) }, ready: true };
  }
  if (!candidate) return { link: null, ready: true };
  if (!checked || checked.slug !== candidate) return { link: null, ready: false };
  return checked.ok
    ? { link: { href: `/house-sitting/${candidate}`, label: animalCareLabel(fallbackCityLabel) }, ready: true }
    : { link: null, ready: true };
}
