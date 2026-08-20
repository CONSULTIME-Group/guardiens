/**
 * useRailReadings — alimente le bloc « À lire » du rail droit des
 * dashboards (refonte rail, août 2026).
 *
 * Trois liens maximum, choisis dans cet ordre de priorité :
 *   1. une fiche de race d'un animal réellement lié au membre
 *      (animaux du foyer côté propriétaire, animaux déclarés côté gardien) ;
 *   2. le conseil de saison (/conseils#saison) ;
 *   3. un article du journal (côté propriétaire : le premier article de
 *      l'étape du parcours, sinon le plus récent publié).
 *
 * Si une source manque, le bloc affiche moins de trois liens. Jamais de
 * remplissage artificiel.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBreedFiche, type BreedFicheCandidate } from "@/lib/breedFicheMatch";
import { slugify } from "@/lib/normalize";
import { OWNER_STAGE_ARTICLES } from "@/lib/ownerArticleStages";
import type { OwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";

export interface RailReadingItem {
  key: string;
  title: string;
  context: string;
  href: string;
}

interface OwnerPetLite {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
}

interface UseRailReadingsInput {
  role: "owner" | "sitter";
  userId?: string;
  /** Animaux du foyer (rôle propriétaire uniquement). */
  pets?: OwnerPetLite[];
  /** Étape du parcours propriétaire (variant de useOwnerPriorityAction). */
  stageVariant?: OwnerPriorityAction["variant"];
}

export const useRailReadings = ({
  role,
  userId,
  pets = [],
  stageVariant,
}: UseRailReadingsInput): RailReadingItem[] => {
  const [items, setItems] = useState<RailReadingItem[]>([]);
  const petsKey = pets.map((p) => `${p.species}:${p.breed ?? ""}:${p.name}`).join("|");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const out: RailReadingItem[] = [];

      // 1. Fiche de race d'un animal réellement lié au membre.
      try {
        let animals: Array<{ name?: string | null; species: string; breed: string }> = [];
        if (role === "owner") {
          animals = pets
            .filter((p) => p.breed && p.species)
            .map((p) => ({ name: p.name, species: p.species, breed: p.breed as string }));
        } else if (userId) {
          const { data: sp } = await supabase
            .from("sitter_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          if (sp?.id) {
            const { data: past } = await supabase
              .from("past_animals")
              .select("name, species, breed")
              .eq("sitter_profile_id", sp.id);
            animals = (past ?? []).filter(
              (a): a is { name: string; species: string; breed: string } =>
                !!a.breed && !!a.species,
            );
          }
        }

        if (animals.length > 0) {
          const species = Array.from(new Set(animals.map((a) => a.species)));
          const { data: candidates } = await supabase
            .from("breed_profiles")
            .select("breed, species")
            .in("species", species);
          const list = (candidates ?? []) as BreedFicheCandidate[];
          for (const animal of animals) {
            const match = resolveBreedFiche(animal.breed, animal.species, list);
            if (match) {
              out.push({
                key: "breed",
                title: `La fiche ${match.breed}`,
                context: animal.name ? `Pour ${animal.name}` : "Depuis votre profil",
                href: `/races/${match.species}-${slugify(match.breed)}`,
              });
              break;
            }
          }
        }
      } catch {
        // Silencieux : le rail se contente des sources disponibles.
      }

      // 2. Conseil de saison (toujours disponible, ancre vérifiée).
      out.push({
        key: "saison",
        title: "Les conseils de saison",
        context: "Ce que la saison change pour votre maison et vos animaux.",
        href: "/conseils#saison",
      });

      // 3. Article du journal.
      try {
        let article: { slug: string; title: string } | null = null;
        const stageSlug =
          role === "owner" && stageVariant
            ? OWNER_STAGE_ARTICLES[stageVariant]?.slugs[0]
            : null;
        if (stageSlug) {
          const { data } = await supabase
            .from("articles")
            .select("slug, title")
            .eq("slug", stageSlug)
            .eq("published", true)
            .maybeSingle();
          article = data ?? null;
        }
        if (!article) {
          const { data } = await supabase
            .from("articles")
            .select("slug, title")
            .eq("published", true)
            .or("noindex.is.null,noindex.eq.false")
            .order("published_at", { ascending: false })
            .limit(1);
          article = data?.[0] ?? null;
        }
        if (article) {
          out.push({
            key: "journal",
            title: article.title,
            context: "Le journal Guardiens",
            href: `/actualites/${article.slug}`,
          });
        }
      } catch {
        // Silencieux.
      }

      if (!cancelled) setItems(out.slice(0, 3));
    };

    void load();
    return () => {
      cancelled = true;
    };
    // petsKey suffit à représenter pets (stabilité des dépendances).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, petsKey, stageVariant]);

  return items;
};
