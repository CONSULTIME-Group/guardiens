/**
 * PetAdviceSection (lot 4, point 3 corrigé) — Les conseils pour Rex et Resa.
 *
 * Remplace l'ancienne grille d'articles génériques du bas de dashboard par un
 * bloc ancré sur les compagnons réellement déclarés par la personne.
 *
 * Ordre de résolution pour chaque animal :
 *   1. fiche de sa race (breed_profiles, match species + slug de race),
 *   2. à défaut, la porte d'entrée des fiches de son espèce,
 *   3. à défaut, un guide générique.
 * Aucune carte vide, aucune race sans rapport avec l'animal.
 *
 * S'y ajoutent un ou deux conseils choisis sur la situation réelle (garde à
 * venir, annonce en brouillon, profil incomplet, saison), puis une seule ligne
 * de sortie vers les conseils d'Alma.
 *
 * Cartes fonctionnelles standard : le traitement carnet déchiré reste réservé
 * à ce qui présente une personne, une maison ou une rencontre.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { SectionHeader } from "../sitter/SitterMatchSection";
import { capitalize, capitalizeWords } from "../owner/helpers";

export interface AdvicePet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}

export interface PetAdviceContext {
  /** Une garde est confirmée ou démarre bientôt. */
  hasUpcomingSit?: boolean;
  /** Une annonce est restée en brouillon. */
  hasDraftSit?: boolean;
  /** Le profil n'est pas encore complet. */
  profileIncomplete?: boolean;
}

interface PetAdviceSectionProps {
  pets?: AdvicePet[];
  context?: PetAdviceContext;
  /** Sans animaux déclarés, où l'on invite la personne à en présenter un. */
  addPetTo?: string;
}

const SPECIES_LABEL: Record<string, string> = {
  dog: "chien",
  cat: "chat",
  bird: "oiseau",
  rodent: "rongeur",
  farm_animal: "animal de ferme",
  horse: "équidé",
  fish: "poisson",
  reptile: "reptile",
  nac: "nouvel animal de compagnie",
};

const SPECIES_PLURAL: Record<string, string> = {
  dog: "chiens",
  cat: "chats",
  bird: "oiseaux",
  rodent: "rongeurs",
  farm_animal: "animaux de ferme",
  horse: "équidés",
};

const BREED_SPECIES = new Set(["dog", "cat", "bird", "rodent", "farm_animal", "horse"]);

type BreedRow = { species: string; breed: string; image_url: string | null };

type Tile = {
  key: string;
  to: string;
  eyebrow: string;
  title: string;
  image: string | null;
};

/** Liste les prénoms des compagnons, sans jamais dépasser trois mentions. */
export const petNamesPhrase = (pets: AdvicePet[]): string => {
  const names = pets.map((p) => capitalize(p.name)).filter(Boolean).slice(0, 3);
  if (names.length === 0) return "vos compagnons";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
};

/** Conseils contextuels, choisis sur la situation, jamais tirés au hasard. */
export const pickContextTips = (
  ctx: PetAdviceContext,
  month: number,
): { key: string; to: string; eyebrow: string; title: string }[] => {
  const tips: { key: string; to: string; eyebrow: string; title: string }[] = [];
  if (ctx.hasUpcomingSit) {
    tips.push({
      key: "upcoming",
      to: "/guides",
      eyebrow: "Avant la garde",
      title: "Préparer la maison et les habitudes avant l'arrivée du gardien",
    });
  }
  if (ctx.hasDraftSit) {
    tips.push({
      key: "draft",
      to: "/guides",
      eyebrow: "Votre annonce",
      title: "Ce qui fait qu'une annonce reçoit des candidatures",
    });
  }
  if (ctx.profileIncomplete) {
    tips.push({
      key: "profile",
      to: "/guides",
      eyebrow: "Votre profil",
      title: "Les quelques lignes qui rassurent vraiment",
    });
  }
  if (tips.length < 2) {
    const season =
      month >= 5 && month <= 8
        ? {
            key: "summer",
            to: "/guides",
            eyebrow: "Cette saison",
            title: "Chaleur, départs et animaux, les précautions de l'été",
          }
        : month >= 11 || month <= 2
          ? {
              key: "winter",
              to: "/guides",
              eyebrow: "Cette saison",
              title: "Sorties courtes et pattes fragiles, l'hiver au quotidien",
            }
          : {
              key: "midseason",
              to: "/guides",
              eyebrow: "Cette saison",
              title: "Reprendre le rythme des balades à la mi-saison",
            };
    tips.push(season);
  }
  return tips.slice(0, 2);
};

const AdviceCard = ({ tile }: { tile: Tile }) => (
  <li>
    <Link
      to={tile.to}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30"
    >
      {tile.image !== null && (
        <div aria-hidden="true" className="w-full overflow-hidden bg-muted" style={{ height: "90px" }}>
          {tile.image ? (
            <img
              src={getOptimizedImageUrl(tile.image, 320, 78)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--accent) / 0.4) 100%)",
              }}
            />
          )}
        </div>
      )}
      <div className="flex-1" style={{ padding: "14px" }}>
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-secondary-foreground/70">
          {tile.eyebrow}
        </p>
        <p
          className="font-sans text-foreground mt-[6px] line-clamp-2 [overflow-wrap:anywhere] hyphens-auto"
          lang="fr"
          style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.35 }}
        >
          {tile.title}
        </p>
      </div>
    </Link>
  </li>
);

const PetAdviceSection = ({
  pets: petsProp,
  context = {},
  addPetTo = "/owner-profile",
}: PetAdviceSectionProps) => {
  const [fetchedPets, setFetchedPets] = useState<AdvicePet[] | null>(null);
  const [breeds, setBreeds] = useState<BreedRow[] | null>(null);

  // Le dashboard gardien ne dispose pas des animaux dans ses données : on les
  // lit alors directement, la personne peut aussi être propriétaire.
  useEffect(() => {
    if (petsProp) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (!cancelled) setFetchedPets([]);
        return;
      }
      const { data: props } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", uid);
      const ids = (props ?? []).map((p) => p.id);
      if (ids.length === 0) {
        if (!cancelled) setFetchedPets([]);
        return;
      }
      const { data } = await supabase
        .from("pets")
        .select("id, name, species, breed")
        .in("property_id", ids);
      if (!cancelled) setFetchedPets((data as AdvicePet[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [petsProp]);

  const pets = petsProp ?? fetchedPets ?? [];
  const hasPets = pets.length > 0;

  useEffect(() => {
    if (!hasPets) return;
    let cancelled = false;
    const species = Array.from(
      new Set(pets.map((p) => p.species).filter((s) => BREED_SPECIES.has(s))),
    );
    if (species.length === 0) {
      setBreeds([]);
      return;
    }
    supabase
      .from("breed_profiles")
      .select("species, breed, image_url")
      .in("species", species)
      .then(({ data }) => {
        if (!cancelled) setBreeds((data as BreedRow[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [hasPets, pets.map((p) => p.species).join(",")]);

  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = [];
    const seen = new Set<string>();
    for (const pet of pets) {
      const speciesLabel = SPECIES_LABEL[pet.species] ?? "compagnon";
      const match = pet.breed
        ? (breeds ?? []).find(
            (b) => b.species === pet.species && slugify(b.breed) === slugify(pet.breed!),
          )
        : undefined;
      if (match) {
        const to = `/races/${match.species}-${slugify(match.breed)}`;
        if (seen.has(to)) continue;
        seen.add(to);
        out.push({
          key: pet.id,
          to,
          eyebrow: `Pour ${capitalize(pet.name)}`,
          title: `${capitalizeWords(match.breed)}, ce qu'il faut savoir pour bien s'en occuper`,
          image: match.image_url,
        });
        continue;
      }
      const plural = SPECIES_PLURAL[pet.species];
      const to = plural ? "/races" : "/guides";
      const key = `${pet.species}-fallback`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key: pet.id,
        to,
        eyebrow: `Pour ${capitalize(pet.name)}`,
        title: plural
          ? `Les fiches ${plural}, habitudes, soins et caractère`
          : `Vivre avec un ${speciesLabel}, les repères essentiels`,
        image: null,
      });
    }
    return out.slice(0, 3);
  }, [pets, breeds]);

  const contextTiles = useMemo<Tile[]>(
    () =>
      pickContextTips(context, new Date().getMonth() + 1).map((t) => ({
        ...t,
        image: null,
      })),
    [context.hasUpcomingSit, context.hasDraftSit, context.profileIncomplete],
  );

  if (!hasPets) {
    return (
      <section aria-label="Conseils pour vos compagnons" className="min-w-0">
        <SectionHeader
          eyebrow="Les conseils d'Alma"
          title="Dites-nous qui partage votre maison."
          subtitle="Dès qu'un compagnon est présenté, les conseils de sa race et de son espèce s'affichent ici."
        />
        <Link
          to={addPetTo}
          className="block text-center bg-card hover:bg-muted/40 transition-colors"
          style={{
            border: "1px dashed hsl(var(--border))",
            borderRadius: "16px",
            padding: "28px 20px",
          }}
        >
          <p className="font-heading text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>
            Tout commence par un prénom.
          </p>
          <p
            className="font-sans text-muted-foreground mt-[8px] mx-auto"
            style={{ fontSize: "13px", maxWidth: "40ch", lineHeight: 1.5 }}
          >
            Présentez votre compagnon, son espèce, sa race, et nous saurons quoi vous raconter d'utile.
          </p>
          <span className="inline-block mt-[14px] text-primary" style={{ fontSize: "13px", fontWeight: 700 }}>
            Ajouter un compagnon
          </span>
        </Link>
      </section>
    );
  }

  const all = [...tiles, ...contextTiles];

  return (
    <section aria-label="Conseils pour vos compagnons" className="min-w-0">
      <SectionHeader
        eyebrow="Les conseils d'Alma"
        title={`Ce qu'il faut savoir pour ${petNamesPhrase(pets)}.`}
        subtitle="Des repères tirés de leur race et de votre situation du moment."
      />

      <ul role="list" className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3" style={{ gap: "14px" }}>
        {all.map((t) => (
          <AdviceCard key={`${t.key}-${t.to}`} tile={t} />
        ))}
      </ul>

      <p className="font-sans text-[13px] text-muted-foreground" style={{ marginTop: "18px" }}>
        <Link to="/conseils" className="font-semibold text-primary underline-offset-4 hover:underline">
          Tous les conseils d'Alma
        </Link>
      </p>
    </section>
  );
};

export default PetAdviceSection;
