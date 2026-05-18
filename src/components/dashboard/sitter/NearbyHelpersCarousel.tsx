import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyHelpers, nextRadiusStep, type NearbyHelper } from "@/hooks/useNearbyHelpers";
import { useHelpersProximityCount } from "@/hooks/useHelpersProximityCount";
import { useCtaCooldown } from "@/hooks/useCtaCooldown";
import { capitalize } from "@/components/dashboard/owner/helpers";
import { tokenizeSkillPhrases, dedupeChipsByLabel } from "@/lib/skills/tokenize";
import { sanitizeBioForCard } from "@/lib/sanitizeBio";

/**
 * Compteur dual « local · national » de personnes prêtes à donner un coup de main.
 *
 * Pourquoi : un « 412 actifs en France » est trop abstrait sur un dashboard
 * utilisateur. On veut d'abord le SIGNAL LOCAL (« il y a du monde près de
 * vous »), puis le NATIONAL en filet (« sinon la communauté est vivante »).
 * Affiché en pastille horizontale dense, pulse vert pour la fraîcheur.
 */
const HelpersProximityTicker = ({ userId }: { userId?: string }) => {
  const { data } = useHelpersProximityCount(userId);
  if (!data) return null;
  const { localCount, nationalCount, radiusKm, hasGeo } = data;
  if (nationalCount < 5) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-foreground/75 font-sans">
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      {hasGeo && localCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-primary/70" aria-hidden="true" />
          <strong className="font-semibold text-foreground tabular-nums">{localCount}</strong>
          <span className="text-foreground/70">prêt·es à aider à moins de {radiusKm}&nbsp;km</span>
        </span>
      )}
      {hasGeo && localCount > 0 && <span className="text-muted-foreground/50">·</span>}
      <span>
        <strong className="font-semibold text-foreground tabular-nums">{nationalCount.toLocaleString("fr-FR")}</strong>{" "}
        <span className="text-foreground/70">{hasGeo && localCount > 0 ? "en France" : "personnes prêtes à aider en France"}</span>
      </span>
    </div>
  );
};

/**
 * Empty-state du carousel helpers — avec cooldown pour éviter la fatigue.
 *
 * 3 variantes selon l'historique d'exposition (localStorage, 7j glissants) :
 * - `primary` : carte complète + CTA bouton plein "Inviter un proche"
 * - `soft` : copy raccourcie + lien texte discret (après 3 vues en 7j)
 * - `hidden` : message minimal sans CTA promotionnel (si user a cliqué "Ne plus me proposer")
 *
 * Le ticker "X gardiens actifs" reste affiché dans tous les cas — c'est de la
 * preuve sociale, pas un CTA, donc pas concerné par le cooldown.
 */
const EmptyHelpersState = ({ hideHeader, userId }: { hideHeader: boolean; userId?: string }) => {
  const { variant, snooze } = useCtaCooldown("helpers_empty_referral", {
    softThreshold: 3,
    windowDays: 7,
    snoozeDays: 30,
  });

  return (
    <section aria-labelledby="nearby-helpers-empty-heading" className="space-y-3">
      {!hideHeader && (
        <div className="min-w-0">
          <h3
            id="nearby-helpers-empty-heading"
            className="font-heading text-base font-semibold text-foreground leading-tight"
          >
            Qui peut vous donner un coup de main&nbsp;?
          </h3>
        </div>
      )}
      <div
        className="
          relative overflow-hidden rounded-2xl
          bg-gradient-to-br from-primary/5 via-card to-warning/10
          ring-1 ring-primary/20
          p-5 sm:p-6
        "
      >
        <p className="text-[10px] uppercase tracking-[2px] text-primary font-sans font-semibold mb-2 text-center sm:text-left">
          Votre coin est encore calme
        </p>
        <h4 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-snug text-center sm:text-left">
          {variant === "hidden"
            ? "Personne disponible près de chez vous pour l'instant."
            : "Soyez la première personne de confiance de votre coin."}
        </h4>

        {variant === "primary" && (
          <>
            <p className="text-sm text-foreground/70 leading-relaxed mt-2 max-w-prose">
              Personne n'est encore disponible pour un coup de main près de chez vous. Invitez un proche&nbsp;: vous gagnez un mois offert, lui aussi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/mon-abonnement#parrainage">Inviter un proche</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="rounded-xl text-foreground/80 hover:text-primary">
                <Link to="/email-preferences">Activer une alerte</Link>
              </Button>
            </div>
            <button
              type="button"
              onClick={snooze}
              className="mt-3 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Ne plus me proposer pendant 30 jours
            </button>
          </>
        )}

        {variant === "soft" && (
          <>
            <p className="text-sm text-foreground/70 leading-relaxed mt-2 max-w-prose">
              De nouvelles personnes arrivent régulièrement. Activez une alerte pour être prévenu en priorité.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/email-preferences">Activer une alerte</Link>
              </Button>
              <Link
                to="/mon-abonnement#parrainage"
                className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                Ou inviter un proche
              </Link>
            </div>
          </>
        )}

        {variant === "hidden" && (
          <p className="text-sm text-foreground/70 leading-relaxed mt-2 max-w-prose">
            Repassez bientôt — la communauté s'agrandit chaque semaine près de chez vous.
          </p>
        )}

        <HelpersProximityTicker userId={userId} />
      </div>
    </section>
  );
};


/**
 * « Près de chez vous — qui peut donner un coup de main ? »
 *
 * Module intentionnel : l'utilisateur choisit une compétence (chips), la liste
 * filtre en direct, et chaque carte ouvre une conversation pré-contextualisée
 * via la RPC `get_or_create_conversation` (context = helper_inquiry).
 *
 * Pourquoi ce parti pris :
 * - on remplace l'affichage passif « 3 cards aléatoires » par une intention.
 * - on déplace la friction du « cliquer pour voir » vers le « cliquer pour
 *   écrire » — la promesse Guardiens, c'est le contact humain, pas le listing.
 * - le rayon (30 / 50 / 100 km) est affiché pour rester honnête (zone rurale).
 */

const SKILL_CHIPS: { key: string; label: string; intent: string }[] = [
  { key: "animaux", label: "Animaux", intent: "un coup de main avec un animal" },
  { key: "jardin", label: "Jardin", intent: "un coup de main au jardin" },
  { key: "coups_de_main", label: "Bricolage", intent: "un coup de main à la maison" },
  { key: "competences", label: "Compétences", intent: "votre savoir-faire" },
];

const HelperMiniCard = ({
  helper,
  ctaHref,
}: {
  helper: NearbyHelper;
  ctaHref: string;
}) => {
  const firstName = capitalize(helper.first_name || "Membre");

  // Pastilles synthétiques uniquement.
  // En base, `custom_skills` peut contenir une phrase entière ("Je peux promener
  // un chien, rendre visite à un chat, monter un meuble Ikea…") ou une liste
  // séparée par virgules/slashs. On tokenise sur les séparateurs courants puis
  // on filtre : longueur 2–22, sans ponctuation de phrase, dédupliqué.
  const customSkills = tokenizeSkillPhrases(helper.custom_skills, { maxLen: 42 });

  type Chip = { key: string; label: string };
  const categoryChips: Chip[] = helper.skill_categories
    .map((cat) => {
      const meta = SKILL_CHIPS.find((c) => c.key === cat);
      return meta ? { key: `k-${cat}`, label: meta.label } : null;
    })
    .filter(Boolean) as Chip[];
  const savoirFaireChips: Chip[] = dedupeChipsByLabel(
    customSkills.map((c) => ({ key: `c-${c}`, label: c })),
  );
  const MAX_CAT = 3;
  const MAX_SF = 3;
  const visibleCats = categoryChips.slice(0, MAX_CAT);
  const remainingCats = categoryChips.length - visibleCats.length;
  const visibleSF = savoirFaireChips.slice(0, MAX_SF);
  const remainingSF = savoirFaireChips.length - visibleSF.length;

  // Fallback : si la bio brute existe mais que la sanitization l'a vidée
  // (bio contenant uniquement email/tél/URL), on affiche un texte neutre
  // plutôt que rien — pour ne pas laisser la carte « muette ».
  const rawBio = (helper.bio || "").trim();
  const sanitized = sanitizeBioForCard(helper.bio);
  const bioTeaser =
    sanitized || (rawBio.length > 0 ? "Disponible pour un coup de main près de chez vous." : "");

  const distance =
    helper.distance_km !== null && helper.distance_km !== undefined
      ? Math.round(helper.distance_km)
      : null;

  return (
    <article
      className="
        group/card flex-shrink-0 w-[78vw] sm:w-[19rem] snap-start
        rounded-2xl bg-card
        ring-1 ring-border/60 hover:ring-primary/40
        shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]
        transition-all duration-300 ease-out hover:-translate-y-0.5
        flex flex-col overflow-hidden
      "
    >
      {/* En-tête : avatar + nom + ville + distance proéminente */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {helper.avatar_url ? (
          <img
            src={helper.avatar_url}
            alt={`Portrait de ${firstName}`}
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover ring-1 ring-border shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-muted text-accent-foreground font-heading font-semibold flex items-center justify-center shrink-0 ring-1 ring-border">
            {firstName.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/gardiens/${helper.id}`}
              className="block text-sm font-heading font-semibold text-foreground truncate hover:text-primary transition-colors"
            >
              {firstName}
            </Link>
            {helper.identity_verified && (
              <span
                className="inline-flex items-center text-primary shrink-0"
                title="Identité vérifiée"
                aria-label="Identité vérifiée"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {helper.city ? capitalize(helper.city) : "Près de chez vous"}
          </p>
        </div>
        {distance !== null && (
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold font-sans px-2 py-0.5 tabular-nums"
            aria-label={`À ${distance} kilomètres de chez vous`}
          >
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {distance}&nbsp;km
          </span>
        )}
      </div>

      <div className="px-4 pb-4 space-y-2.5">
        {/* Catégories génériques */}
        {visibleCats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleCats.map((chip) => (
              <span
                key={chip.key}
                className="text-[11px] rounded-full bg-primary/10 text-primary px-2.5 py-0.5 ring-1 ring-primary/15"
              >
                {chip.label}
              </span>
            ))}
            {remainingCats > 0 && (
              <span className="text-[11px] text-muted-foreground self-center">+{remainingCats}</span>
            )}
          </div>
        )}

        {/* Savoir-faire (custom) — section labellisée */}
        {visibleSF.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Savoir-faire
            </p>
            <div className="flex flex-wrap gap-1">
              {visibleSF.map((chip) => (
                <span
                  key={chip.key}
                  className="text-[11px] rounded-full bg-foreground/[0.06] text-foreground/85 px-2.5 py-0.5 ring-1 ring-border/40"
                >
                  {chip.label}
                </span>
              ))}
              {remainingSF > 0 && (
                <span className="text-[11px] text-muted-foreground self-center">+{remainingSF}</span>
              )}
            </div>
          </div>
        )}

        {/* Mini bio */}
        {bioTeaser && (
          <p className="text-[12px] text-foreground/75 leading-snug line-clamp-2 italic">
            « {bioTeaser} »
          </p>
        )}

        {categoryChips.length === 0 && savoirFaireChips.length === 0 && !bioTeaser && (
          <span className="inline-block text-[11px] rounded-full bg-muted/40 text-muted-foreground px-2.5 py-0.5">
            Disponible
          </span>
        )}
      </div>

      {/* CTA — redirige vers la création d'une petite mission (pas de DM direct). */}
      <div className="mt-auto border-t border-border/40 bg-muted/20 group-hover/card:bg-primary/5 transition-colors">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full rounded-none h-10 text-xs font-medium text-foreground hover:bg-transparent hover:text-primary justify-center"
        >
          <Link to={ctaHref}>
            Publier un coup de main
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
};

const NearbyHelpersCarousel = memo(({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { user } = useAuth();
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  // Override rayon — bumped via le lien « Élargir le rayon » dans l'empty-state
  // du filtre. Reset à null quand l'utilisateur change/retire le filtre, pour
  // ne pas garder un rayon de 100 km collant.
  const [forcedRadius, setForcedRadius] = useState<number | null>(null);
  const { data, isLoading, isFetching, refetch } = useNearbyHelpers(user?.id, { forcedRadius });

  const helpers = data?.helpers || [];
  const filtered = useMemo(() => {
    if (!activeSkill) return helpers;
    return helpers.filter((h) =>
      h.skill_categories.includes(activeSkill) || (activeSkill === "competences" && h.custom_skills.length > 0),
    );
  }, [helpers, activeSkill]);

  const handleSkillToggle = (key: string | null) => {
    setForcedRadius(null);
    setActiveSkill(key);
  };

  if (isLoading) {
    return (
      <section aria-label="Coups de main près de chez vous" className="space-y-3">
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-[78vw] sm:w-64 h-44 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Empty-state premium : pas de helpers dans le rayon max (100 km).
  // On transforme le vide en levier d'acquisition (parrainage) plutôt qu'en trou UX.
  if (!helpers.length) {
    return <EmptyHelpersState hideHeader={hideHeader} userId={user?.id} />;
  }

  const radiusLabel = data?.hasGeo
    ? data.includesExtendedSkillProfiles
      ? `dans un rayon de ${data.radiusUsed} km, avec des savoir-faire élargis France entière`
      : `dans un rayon de ${data.radiusUsed} km`
    : "dans la communauté";

  // Construit le lien vers la création d'une petite mission, pré-cadré par la
  // compétence active si l'utilisateur a filtré.
  const ctaHref = (() => {
    const intent = activeSkill
      ? SKILL_CHIPS.find((c) => c.key === activeSkill)?.intent
      : null;
    if (!intent) return "/petites-missions/creer";
    const params = new URLSearchParams({ intent });
    return `/petites-missions/creer?${params.toString()}`;
  })();

  return (
    <section aria-labelledby="nearby-helpers-heading" className="space-y-3">
      {!hideHeader && (
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3
              id="nearby-helpers-heading"
              className="font-heading text-base font-semibold text-foreground leading-tight"
            >
              Qui peut vous donner un coup de main&nbsp;?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Savoir-faire particuliers affichés en priorité, puis proximité — {radiusLabel}.
            </p>
          </div>
        </div>
      )}

      {/* Compteur dual local · national — preuve sociale localisée */}
      <HelpersProximityTicker userId={user?.id} />

      {/* Pas de géoloc → impossible de trier par distance. On le dit franchement
          plutôt que de faire passer 8 profils nationaux pour des « voisins ». */}
      {data && !data.hasGeo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning/10 ring-1 ring-warning/30 px-3 py-2 text-xs">
          <span className="text-foreground/80 font-sans">
            <MapPin className="inline h-3.5 w-3.5 mr-1 text-warning" aria-hidden="true" />
            Sans votre adresse, impossible de trier par proximité — résultats au hasard.
          </span>
          <Button asChild size="sm" variant="outline" className="h-7 rounded-lg text-xs">
            <Link to="/profile">Ajouter mon adresse</Link>
          </Button>
        </div>
      )}

      {/* Chips compétences */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => handleSkillToggle(null)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            activeSkill === null
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          Tout
        </button>
        {SKILL_CHIPS.map((chip) => {
          const count = helpers.filter((h) =>
            h.skill_categories.includes(chip.key) || (chip.key === "competences" && h.custom_skills.length > 0),
          ).length;
          if (count === 0) return null;
          const active = activeSkill === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleSkillToggle(active ? null : chip.key)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
              aria-pressed={active}
            >
              {chip.label}
              <span className={`ml-1.5 text-[10px] ${active ? "text-background/70" : "text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Carrousel horizontal premium — partout (hideHeader contrôle seulement le titre). */}
      {filtered.length === 0 ? (
        (() => {
          const activeChip = SKILL_CHIPS.find((c) => c.key === activeSkill);
          const currentRadius = data?.radiusUsed ?? 0;
          const nextRadius = data?.hasGeo ? nextRadiusStep(currentRadius) : null;
          return (
            <div
              role="status"
              className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-6 text-center"
            >
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-1.5">
                0 résultat · Filtre actif{activeChip ? ` · ${activeChip.label}` : ""}
              </p>
              <p className="text-sm font-heading font-semibold text-foreground leading-snug mb-1">
                Aucune personne disponible sur cette compétence
                {data?.hasGeo ? ` dans un rayon de ${currentRadius} km.` : " près de chez vous."}
              </p>
              <p className="text-xs text-muted-foreground font-sans mb-4 max-w-prose mx-auto">
                {nextRadius
                  ? `Élargissez le rayon pour garder ${activeChip?.label ?? "ce filtre"} actif, relancez la recherche, ou essayez une autre catégorie.`
                  : "Relancez la recherche pour vérifier les derniers inscrits, essayez une autre catégorie, ou retirez le filtre."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {nextRadius && (
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setForcedRadius(nextRadius)}
                  >
                    Élargir à {nextRadius}&nbsp;km
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  aria-label="Relancer la recherche pour vérifier les derniers inscrits"
                >
                  {isFetching ? "Recherche…" : "Réessayer"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => handleSkillToggle(null)}
                >
                  Voir tout le monde
                </Button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="relative -mx-1">
          <div className="flex gap-3 overflow-x-auto pb-3 px-1 snap-x snap-mandatory scrollbar-hide scroll-smooth">
            {filtered.map((helper) => (
              <HelperMiniCard
                key={helper.id}
                helper={helper}
                onWrite={() => handleWrite(helper)}
                pending={pending === helper.id}
              />
            ))}
          </div>
          {/* Fondus latéraux : indication subtile de scroll horizontal */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
        </div>
      )}
    </section>
  );
});

NearbyHelpersCarousel.displayName = "NearbyHelpersCarousel";
export default NearbyHelpersCarousel;
