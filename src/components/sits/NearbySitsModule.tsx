import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { sitLocationLabelLocal } from "@/lib/sitLocationLoad";
import { getDeptsInRegion, getRegionCode } from "@/lib/regions";
import { applyOpenSitFilter, isFranceSit } from "@/lib/sitSearchRules";

interface NearbySit {
  id: string;
  slug: string | null;
  title: string | null;
  city: string | null;
  country?: string | null;
  cover_photo_url: string | null;
  departement_code?: string | null;
  user_id?: string | null;
  /** Lot L1 : localisation selon la règle unique sitLocation. */
  location_label?: string;
}

/**
 * Lot PROX1 (29/10/2026, retour de Laurence : « dans le coin c'est le
 * département à côté, à 700 kms ») : le module cherche par paliers, même
 * ville, même département, même région, puis France, et son titre dit le
 * palier le plus large réellement utilisé. Plus jamais « près de chez vous »
 * au-dessus d'annonces prises au hasard dans tout le pays.
 */
export type NearbyTier = "city" | "dept" | "region" | "france";

const TIER_ORDER: NearbyTier[] = ["city", "dept", "region", "france"];

export const NEARBY_TITLES: Record<NearbyTier, string> = {
  city: "Des annonces à proximité",
  dept: "Des annonces à proximité",
  region: "Des annonces dans la région",
  france: "D'autres annonces ouvertes en France",
};

const WANTED = 3;

/**
 * Retient au plus trois annonces, palier par palier, sans doublon ni l'annonce
 * courante. Le palier rendu est le plus large dont une annonce a été retenue.
 */
export function pickNearby<T extends { id: string }>(
  groups: Partial<Record<NearbyTier, T[]>>,
  excludeId?: string,
): { sits: T[]; tier: NearbyTier | null } {
  const seen = new Set<string>();
  const sits: T[] = [];
  let tier: NearbyTier | null = null;
  for (const t of TIER_ORDER) {
    for (const s of groups[t] || []) {
      if (sits.length >= WANTED) break;
      if (s.id === excludeId || seen.has(s.id)) continue;
      seen.add(s.id);
      sits.push(s);
      tier = t;
    }
    if (sits.length >= WANTED) break;
  }
  return { sits, tier };
}

const NearbySitsModule = ({
  city,
  departementCode,
  excludeId,
}: {
  city?: string | null;
  /** Département de l'annonce consultée (code postal du propriétaire). */
  departementCode?: string | null;
  excludeId?: string;
}) => {
  const [sits, setSits] = useState<NearbySit[]>([]);
  const [tier, setTier] = useState<NearbyTier | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const base = () =>
          // Règle unique des annonces ouvertes (lot L1), fin passée exclue.
          applyOpenSitFilter(
            supabase
              .from("sits")
              .select("id, slug, title, city, country, cover_photo_url, departement_code, user_id"),
          )
            .order("created_at", { ascending: false })
            .limit(6);

        const dept = (departementCode || "").trim() || null;
        const regionCode = getRegionCode(dept);
        const groups: Partial<Record<NearbyTier, NearbySit[]>> = {};
        const enough = () => pickNearby(groups, excludeId).sits.length >= WANTED;

        if (city) {
          // Même nom de ville dans le même département : aucun homonyme lointain.
          const q = base().eq("city", city);
          const { data } = dept ? await q.eq("departement_code", dept) : await q;
          groups.city = (data || []) as NearbySit[];
        }
        if (!enough() && dept) {
          const { data } = await base().eq("departement_code", dept);
          groups.dept = (data || []) as NearbySit[];
        }
        if (!enough() && regionCode) {
          const { data } = await base().in("departement_code", getDeptsInRegion(regionCode));
          groups.region = (data || []) as NearbySit[];
        }
        if (!enough()) {
          const { data } = await base().limit(12);
          groups.france = ((data || []) as NearbySit[]).filter((s) => isFranceSit(s));
        }

        const picked = pickNearby(groups, excludeId);
        const top = picked.sits;
        // Lot L1 : ville du profil, puis code postal et département, pour
        // les seules annonces sans commune. Une lecture au plus.
        const ownerIds = Array.from(new Set(top.filter((s) => !(s.city || "").trim() && s.user_id).map((s) => s.user_id as string)));
        const owners = new Map<string, { city: string | null; postal_code: string | null }>();
        if (ownerIds.length > 0) {
          const { data } = await supabase.from("public_profiles").select("id, city, postal_code").in("id", ownerIds);
          for (const o of (data || []) as any[]) owners.set(o.id, o);
        }
        const labelled = top.map((s) => ({
          ...s,
          location_label: sitLocationLabelLocal(s, s.user_id ? owners.get(s.user_id) : null),
        }));
        if (!cancelled) {
          setSits(labelled);
          setTier(picked.tier);
        }
      } catch (e: any) {
        logger.warn("[NearbySitsModule] load failed", { error: e?.message });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [city, departementCode, excludeId]);

  if (sits.length === 0 || !tier) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <h2 className="font-heading text-lg md:text-xl font-semibold mb-4">{NEARBY_TITLES[tier]}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sits.map((s) => (
          <Link
            key={s.id}
            to={`/annonces/${s.slug || s.id}`}
            className="group rounded-2xl border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              {s.cover_photo_url && (
                <img
                  src={s.cover_photo_url}
                  alt={s.title || "Annonce de garde"}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2">{s.title || "Annonce de garde"}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.location_label}</p>
            </div>
          </Link>
        ))}
      </div>
      <Link to="/recherche" className="inline-flex mt-4 text-sm font-medium text-primary hover:underline">
        Voir toutes les annonces
      </Link>
    </section>
  );
};

export default NearbySitsModule;
