/**
 * Contenu immersif d'une fiche annonce — adapté de DemoSitDetail pour
 * fonctionner avec les vraies entités (sit, owner, property, pets, ownerProfile).
 *
 * Sections rendues (toutes facultatives, masquées si données absentes) :
 *  - Hero photos + titre + ville
 *  - Quick facts (dates, logement, animaux, environnement)
 *  - Le cadre (description + property.description + équipements)
 *  - Vos pensionnaires (animaux + BreedProfileCard AI)
 *  - Une journée type (sit.daily_routine, formaté en blocs Matin/Midi/Soir si parsable)
 *  - Un mot de l'hôte (sit.owner_message)
 *  - Sidebar : profil hôte, CTA (slot via prop), guide local, page ville, réassurance
 */
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Home,
  PawPrint,
  ShieldCheck,
  Sun,
  Sunset,
  Moon,
  Heart,
  Wifi,
  Trees,
  Bike,
  Coffee,
  WashingMachine,
  Mountain,
  Waves,
  Flame,
  Building2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import { slugify } from "@/lib/normalize";
import { CITIES } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";

const GUIDE_SLUGS = new Set(CITIES.map((c) => c.slug));

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕", cat: "🐈", farm_animal: "🐔", rabbit: "🐰", bird: "🦜",
  fish: "🐠", rodent: "🐹", horse: "🐴", nac: "🦎", reptile: "🦎",
};

const ENV_META: Record<string, { label: string; icon: any }> = {
  city: { label: "Ville", icon: Building2 },
  city_center: { label: "Centre-ville", icon: Building2 },
  countryside: { label: "Campagne", icon: Trees },
  mountain: { label: "Montagne", icon: Mountain },
  lake: { label: "Lac", icon: Waves },
  garden: { label: "Jardin", icon: Trees },
  seaside: { label: "Bord de mer", icon: Waves },
  forest: { label: "Forêt", icon: Trees },
  suburban: { label: "Périurbain", icon: Building2 },
};

const AMENITY_META: Record<string, { label: string; icon: any }> = {
  wifi: { label: "Wifi", icon: Wifi },
  garden: { label: "Jardin", icon: Trees },
  washing_machine: { label: "Lave-linge", icon: WashingMachine },
  bikes: { label: "Vélos", icon: Bike },
  coffee_machine: { label: "Machine à café", icon: Coffee },
  lake_view: { label: "Vue lac", icon: Waves },
  wood_stove: { label: "Poêle à bois", icon: Flame },
  kayak: { label: "Kayak", icon: Waves },
  balcony: { label: "Balcon", icon: Sun },
  dishwasher: { label: "Lave-vaisselle", icon: WashingMachine },
  elevator: { label: "Ascenseur", icon: Building2 },
};

interface SitImmersiveContentProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
  /** Slot principal de droite (ex : bloc candidature côté gardien, gestion côté propriétaire). */
  ctaSlot?: React.ReactNode;
  /** Ajout sous le quick-facts (ex : badges de matching côté gardien). */
  topSlot?: React.ReactNode;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

/**
 * Tente de découper la routine en blocs Matin / Midi / Après-midi / Soir / Nuit.
 * Gère :
 *  - retours à la ligne, séparateurs ` / `, `•`, `|`, ` — ` entre blocs
 *  - puces en début de ligne (`-`, `*`, `•`, `–`, `—`, `→`)
 *  - séparateurs label/texte variés (`—`, `–`, `-`, `:`, ` ` simple)
 *  - casse et accents (Matin, MATIN, après-midi, Aprem, Après midi…)
 *  - format partiel (un seul moment renseigné) → on accepte 1 bloc minimum
 *  - texte libre sans label → on retourne null pour fallback whitespace-pre-line
 */
const stripBullet = (s: string) =>
  s.replace(/^\s*[-*•–—→▪►●·]+\s*/, "").trim();

const normalizeLabel = (k: string): "Matin" | "Midi" | "Après-midi" | "Soir" | "Nuit" => {
  const low = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (low.startsWith("matin")) return "Matin";
  if (low.startsWith("midi")) return "Midi";
  if (low.startsWith("apres") || low.startsWith("aprem")) return "Après-midi";
  if (low.startsWith("nuit")) return "Nuit";
  return "Soir";
};

const parseRoutine = (raw: string | null) => {
  if (!raw) return null;
  // Étape 1 : éclate sur retours à la ligne ET sur séparateurs ` / `, ` • `, ` | `
  const segments = raw
    .split(/\r?\n+|\s+[•|]\s+|\s+\/\s+/)
    .map((l) => stripBullet(l))
    .filter(Boolean);

  // Regex tolérante : label suivi d'un séparateur (—, –, -, :) OU d'un espace si label seul
  const re = /^\s*(matin|midi|soir|nuit|apr[èeé]s[- ]?midi|aprem)\b\s*[—–\-:.]?\s*(.*)$/i;

  const blocks: { key: string; label: string; text: string }[] = [];
  const leftover: string[] = [];

  for (const seg of segments) {
    const m = seg.match(re);
    if (m && m[2] && m[2].trim().length > 0) {
      const label = normalizeLabel(m[1]);
      blocks.push({ key: label.toLowerCase(), label, text: m[2].trim().replace(/[.;,]+$/, "") });
    } else if (m && (!m[2] || m[2].trim().length === 0)) {
      // label seul (ex: "Matin :") — on ignore mais on ne casse pas le parsing
      continue;
    } else {
      leftover.push(seg);
    }
  }

  if (blocks.length === 0) return null;

  // Tri logique Matin → Midi → Après-midi → Soir → Nuit
  const order = ["matin", "midi", "après-midi", "soir", "nuit"];
  blocks.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return { blocks, notes: leftover.join(" ").trim() };
};

const ROUTINE_ICONS: Record<string, { icon: any; bg: string; fg: string }> = {
  Matin: { icon: Sun, bg: "bg-amber-100", fg: "text-amber-700" },
  Midi: { icon: Sun, bg: "bg-orange-100", fg: "text-orange-700" },
  "Après-midi": { icon: Sunset, bg: "bg-sky-100", fg: "text-sky-700" },
  Soir: { icon: Moon, bg: "bg-indigo-100", fg: "text-indigo-700" },
  Nuit: { icon: Moon, bg: "bg-slate-100", fg: "text-slate-700" },
};

const SitImmersiveContent = ({
  sit,
  owner,
  property,
  pets,
  ownerProfile,
  ctaSlot,
  topSlot,
}: SitImmersiveContentProps) => {
  const photos: string[] = property?.photos || [];
  const coverPhoto = photos[0] || null;
  const ownerName = owner?.first_name || "L'hôte";
  const cityName = owner?.city || "";
  const citySlug = cityName ? slugify(cityName) : null;
  const department: string | undefined =
    owner?.department || (owner?.postal_code ? String(owner.postal_code).slice(0, 2) : undefined);

  const environments: string[] =
    sit?.environments?.length ? sit.environments : ownerProfile?.environments || [];
  const amenities: string[] = property?.equipments || property?.amenities || [];
  const durationDays =
    sit?.start_date && sit?.end_date
      ? Math.max(
          1,
          Math.round(
            (new Date(sit.end_date).getTime() - new Date(sit.start_date).getTime()) /
              86400000,
          ),
        )
      : null;

  const routine = parseRoutine(sit?.daily_routine || null);
  const speciesEmojis = pets.map((p) => SPECIES_EMOJI[p.species] || "🐾");

  return (
    <div>
      {/* Hero */}
      {coverPhoto && (
        <div className="rounded-3xl overflow-hidden border border-border bg-card mb-6">
          <div className="relative">
            <img
              src={coverPhoto}
              alt={sit?.title || "Photo de l'annonce"}
              className="w-full h-[280px] md:h-[420px] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 md:p-8">
              {(cityName || department) && (
                <div className="flex items-center gap-2 mb-2 text-white/90 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {cityName}
                    {department ? ` · ${department}` : ""}
                  </span>
                </div>
              )}
              {sit?.title && (
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
                  {sit.title}
                </h1>
              )}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-2 gap-1 p-1">
              {photos.slice(1, 3).map((p, i) => (
                <img key={i} src={p} alt="" className="w-full h-32 md:h-44 object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Calendar className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Dates</p>
          <p className="text-sm font-medium">{formatDate(sit?.start_date)}</p>
          <p className="text-sm font-medium">→ {formatDate(sit?.end_date)}</p>
          {durationDays && (
            <p className="text-xs text-muted-foreground mt-1">{durationDays} jours</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Home className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Logement</p>
          <p className="text-sm font-medium capitalize">
            {property?.type === "house" ? "Maison" : property?.type === "apartment" ? "Appartement" : property?.type || "—"}
          </p>
          {(property?.surface_m2 || property?.rooms_count) && (
            <p className="text-xs text-muted-foreground">
              {[property?.surface_m2 && `${property.surface_m2} m²`, property?.rooms_count && `${property.rooms_count} pièces`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <PawPrint className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Animaux</p>
          <p className="text-sm font-medium">
            {pets.length} pensionnaire{pets.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">{speciesEmojis.join(" ")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Trees className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Cadre</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {environments.length > 0 ? (
              environments.map((e) => {
                const meta = ENV_META[e];
                if (!meta) return null;
                const Ico = meta.icon;
                return (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
                  >
                    <Ico className="h-3 w-3" /> {meta.label}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {topSlot}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Le cadre */}
          {(sit?.specific_expectations || property?.description) && (
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Le cadre</h2>
              {sit?.specific_expectations && (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line mb-4">
                  {sit.specific_expectations}
                </p>
              )}
              {property?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {property.description}
                </p>
              )}
              {amenities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                  {amenities.map((a) => {
                    const meta = AMENITY_META[a];
                    if (!meta) {
                      return (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                        >
                          {a}
                        </span>
                      );
                    }
                    const Ico = meta.icon;
                    return (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                      >
                        <Ico className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Les animaux */}
          {pets.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-primary" /> Vos pensionnaires
              </h2>
              <div className="space-y-5">
                {pets.map((pet, i) => (
                  <div key={pet.id || i} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className="text-xl">{SPECIES_EMOJI[pet.species] || "🐾"}</span>
                      <h3 className="font-semibold text-foreground">{pet.name}</h3>
                      {pet.breed && (
                        <span className="text-sm text-muted-foreground">· {pet.breed}</span>
                      )}
                      {pet.age && (
                        <span className="text-xs text-muted-foreground">· {pet.age}</span>
                      )}
                    </div>
                    {pet.notes && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{pet.notes}</p>
                    )}
                    {pet.breed && (
                      <BreedProfileCard
                        species={pet.species}
                        breed={pet.breed}
                        ownerFirstName={ownerName}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Journée type */}
          {sit?.daily_routine && (
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4">Une journée type</h2>
              {routine ? (
                <div className="space-y-4">
                  {routine.blocks.map((b, i) => {
                    const meta = ROUTINE_ICONS[b.label] || ROUTINE_ICONS.Matin;
                    const Ico = meta.icon;
                    return (
                      <div key={i} className="flex gap-3">
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.bg} ${meta.fg}`}
                        >
                          <Ico className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{b.label}</p>
                          <p className="text-sm text-muted-foreground">{b.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {routine.notes && (
                    <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                      {routine.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {sit.daily_routine}
                </p>
              )}
            </section>
          )}

          {/* Mot du proprio */}
          {sit?.owner_message && (
            <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Un mot de {ownerName}</h2>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic whitespace-pre-line">
                « {sit.owner_message} »
              </p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Profil hôte */}
          {owner && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Votre hôte
              </p>
              <div className="flex items-center gap-3 mb-3">
                {owner.avatar_url ? (
                  <img
                    src={owner.avatar_url}
                    alt={ownerName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                    {ownerName[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/gardiens/${owner.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {ownerName}
                    </Link>
                    {owner.identity_verified && <VerifiedBadge size="sm" />}
                  </div>
                  {cityName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {cityName}
                    </p>
                  )}
                </div>
              </div>
              {(owner.bio || ownerProfile?.welcome_notes) && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                  {owner.bio || ownerProfile?.welcome_notes}
                </p>
              )}
            </div>
          )}

          {/* Slot CTA principal (candidature, gestion owner…) */}
          {ctaSlot}

          {/* Guide local */}
          {citySlug && (
            <Link
              to={`/guides/${citySlug}`}
              className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                    Guide local
                  </p>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Découvrir {cityName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Bonnes adresses, vétérinaires, parcs à chiens et spots à connaître.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>
          )}

          {/* Page ville */}
          {citySlug && (
            <Link
              to={`/house-sitting/${citySlug}`}
              className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                    Communauté locale
                  </p>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Gardiens à {cityName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Voir les profils vérifiés et l'activité du coin.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>
          )}

          {/* Réassurance */}
          <div className="rounded-2xl bg-muted/50 p-5 text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Sur Guardiens, c'est gratuit, entre voisins
            </p>
            <p>
              Aucun paiement entre membres. Profils vérifiés, avis croisés, accord de garde
              signé. La confiance entre gens du coin.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SitImmersiveContent;
