import { memo, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, MapPin, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyHelpers, nextRadiusStep, type NearbyHelper } from "@/hooks/useNearbyHelpers";
import { useHelpersProximityCount } from "@/hooks/useHelpersProximityCount";
import { useCtaCooldown } from "@/hooks/useCtaCooldown";
import { capitalize } from "@/components/dashboard/owner/helpers";
import { tokenizeSkillPhrases, dedupeChipsByLabel } from "@/lib/skills/tokenize";
import { sanitizeBioForCard } from "@/lib/sanitizeBio";
import { startConversationAndNavigate } from "@/lib/conversation";
import { toast } from "sonner";


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
 * Empty-state du carousel helpers, avec cooldown pour éviter la fatigue.
 *
 * 3 variantes selon l'historique d'exposition (localStorage, 7j glissants) :
 * - `primary` : carte complète + CTA bouton plein "Inviter un proche"
 * - `soft` : copy raccourcie + lien texte discret (après 3 vues en 7j)
 * - `hidden` : message minimal sans CTA promotionnel (si user a cliqué "Ne plus me proposer")
 *
 * Le ticker "X gardiens actifs" reste affiché dans tous les cas, c'est de la
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
            Repassez bientôt, la communauté s'agrandit chaque semaine près de chez vous.
          </p>
        )}

        {/* Savoir-faire disponibles, pédagogie : on montre les catégories
            de coup de main même quand personne n'est listé, pour que
            l'utilisateur comprenne le périmètre. */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">
            Savoir-faire couverts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_CHIPS.map((chip) => (
              <span
                key={chip.key}
                className="px-2.5 py-1 bg-card border border-border text-foreground/80 text-[10px] font-semibold uppercase tracking-wider rounded-lg"
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <HelpersProximityTicker userId={userId} />

        {/* CTA navigation, toujours visible, même en empty-state, pour
            permettre de rejoindre la page des petites missions. */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-xs">
          <Link
            to="/petites-missions"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary font-semibold transition-colors"
          >
            Voir les petites missions
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            to="/petites-missions/creer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            Demander un coup de main
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};


/**
 * « Près de chez vous, qui peut donner un coup de main ? »
 *
 * Module intentionnel : l'utilisateur choisit une compétence (chips), la liste
 * filtre en direct, et chaque carte ouvre une conversation pré-contextualisée
 * via la RPC `get_or_create_conversation` (context = helper_inquiry).
 *
 * Pourquoi ce parti pris :
 * - on remplace l'affichage passif « 3 cards aléatoires » par une intention.
 * - on déplace la friction du « cliquer pour voir » vers le « cliquer pour
 *   écrire », la promesse Guardiens, c'est le contact humain, pas le listing.
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacting, setContacting] = useState(false);
  const firstName = capitalize(helper.first_name || "Membre");

  const handleContact = async () => {
    if (!user) {
      toast.error("Connectez-vous pour écrire à ce membre.");
      return;
    }
    if (contacting) return;
    setContacting(true);
    try {
      await startConversationAndNavigate(
        { otherUserId: helper.id, context: "helper_inquiry" },
        navigate,
      );
    } finally {
      setContacting(false);
    }
  };



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
  // plutôt que rien, pour ne pas laisser la carte « muette ».
  const rawBio = (helper.bio || "").trim();
  const sanitized = sanitizeBioForCard(helper.bio);
  const bioTeaser =
    sanitized || (rawBio.length > 0 ? "Disponible pour un coup de main près de chez vous." : "");

  const distance =
    helper.distance_km !== null && helper.distance_km !== undefined
      ? Math.round(helper.distance_km)
      : null;

  const isVeryClose = distance !== null && distance <= 5;

  return (
    <article
      className="
        group/card flex-shrink-0 w-[78vw] max-w-[20rem] sm:w-[20rem] snap-start
        rounded-[1.75rem] sm:rounded-[2rem] bg-card
        ring-1 ring-border/60 hover:ring-accent/50
        shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.22)]
        transition-all duration-500 ease-out hover:-translate-y-1
        flex flex-col overflow-hidden
      "
    >
      {/* En-tête : avatar rotaté façon gouache + nom + distance éditoriale */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-start justify-between gap-3">
        <div className="relative shrink-0">
          {helper.avatar_url ? (
            <img
              src={helper.avatar_url}
              alt={`Portrait de ${firstName}`}
              loading="lazy"
              className="w-16 h-16 rounded-[1.25rem] object-cover ring-1 ring-border rotate-2 group-hover/card:rotate-0 transition-transform duration-500"
            />
          ) : (
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-accent/40 to-muted text-accent-foreground font-heading text-xl font-semibold flex items-center justify-center ring-1 ring-border rotate-2 group-hover/card:rotate-0 transition-transform duration-500">
              {firstName.charAt(0)}
            </div>
          )}
          {isVeryClose && savoirFaireChips.length > 0 && (
            <span
              className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest rounded-md shadow-md"
              title="Savoir-faire à moins de 5 km, priorisé pour vous"
              aria-label="Tout près, à moins de 5 kilomètres"
            >
              Tout près
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <Link
              to={`/gardiens/${helper.id}`}
              className="block text-base font-heading font-semibold text-foreground truncate hover:text-primary transition-colors"
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
          {distance !== null ? (
            <span
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums ring-1 shadow-sm ${
                isVeryClose
                  ? "bg-accent text-accent-foreground ring-accent/60"
                  : "bg-primary text-primary-foreground ring-primary/60"
              }`}
              aria-label={`À environ ${distance} kilomètres de chez vous`}
            >
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {distance === 0 ? "< 1" : distance}&nbsp;km
            </span>
          ) : (
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
              {helper.city ? capitalize(helper.city) : "Près de chez vous"}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-5 space-y-3">
        {/* Savoir-faire (custom), affiché EN PREMIER car c'est le différenciant. */}
        {visibleSF.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-accent font-bold">
              Savoir-faire
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleSF.map((chip) => (
                <span
                  key={chip.key}
                  className="px-2.5 py-1 bg-accent/15 border border-accent/40 text-accent-foreground text-[10px] font-semibold uppercase tracking-wider rounded-lg"
                >
                  {chip.label}
                </span>
              ))}
              {remainingSF > 0 && (
                <span className="text-[11px] text-muted-foreground self-center">+{remainingSF}</span>
              )}
            </div>
          </div>
        ) : visibleCats.length === 0 ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Aucun savoir-faire renseigné
          </p>
        ) : null}

        {/* Catégories, labellisées explicitement pour ne pas laisser de chips orphelines */}
        {visibleCats.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold">
              {visibleSF.length > 0 ? "Domaines" : "Peut aider sur"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleCats.map((chip) => (
                <span
                  key={chip.key}
                  className="px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg"
                >
                  {chip.label}
                </span>
              ))}
              {remainingCats > 0 && (
                <span className="text-[11px] text-muted-foreground self-center">+{remainingCats}</span>
              )}
            </div>
          </div>
        )}

        {/* Mini bio */}
        {bioTeaser && (
          <p className="text-[13px] text-foreground/70 leading-relaxed line-clamp-3 italic">
            « {bioTeaser} »
          </p>
        )}

        {categoryChips.length === 0 && savoirFaireChips.length === 0 && !bioTeaser && (
          <span className="inline-block text-[11px] rounded-full bg-muted/40 text-muted-foreground px-2.5 py-0.5">
            Disponible
          </span>
        )}
      </div>

      {/* Footer carte : 2 actions claires, primaire « Lui écrire » qui ouvre
          une conversation pré-contextualisée (helper_inquiry), secondaire
          « Voir le profil » pour lever le doute avant de prendre contact. */}
      <div className="mt-auto px-4 sm:px-6 pb-4 sm:pb-5 pt-1 flex items-center gap-2 border-t border-border/40">
        <Button
          size="sm"
          onClick={handleContact}
          disabled={contacting}
          className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
          aria-label={`Écrire à ${firstName} pour un coup de main`}
        >
          {contacting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Lui écrire
        </Button>
        <Link
          to={`/gardiens/${helper.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          Profil
          <ArrowRight className="h-3 w-3 transition-transform group-hover/card:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

    </article>
  );
};

const NearbyHelpersCarousel = memo(({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { user } = useAuth();
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  // Override rayon, bumped via le lien « Élargir le rayon » dans l'empty-state
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
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent mb-1.5">
            Coup de main
          </p>
          <h3
            id="nearby-helpers-heading"
            className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight"
          >
            Entraide près de chez vous
          </h3>
        </div>
      )}

      {/* Explainer court : une phrase suffit, le reste se découvre en cliquant. */}
      <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed max-w-prose">
        Des membres prêts à rendre un service ponctuel près de chez vous. Cliquez sur «&nbsp;Lui écrire&nbsp;» pour proposer un échange, c'est gratuit.
      </p>

      {/* Compteur dual local · national, preuve sociale localisée */}
      <HelpersProximityTicker userId={user?.id} />

      {/* Pas de géoloc → impossible de trier par distance. */}
      {data && !data.hasGeo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning/10 ring-1 ring-warning/30 px-3 py-2 text-xs">
          <span className="text-foreground/80 font-sans">
            <MapPin className="inline h-3.5 w-3.5 mr-1 text-warning" aria-hidden="true" />
            Sans votre adresse, impossible de trier par proximité.
          </span>
          <Button asChild size="sm" variant="outline" className="h-7 rounded-lg text-xs">
            <Link to="/profile">Ajouter mon adresse</Link>
          </Button>
        </div>
      )}

      {/* Carrousel horizontal, sans filtres : la liste est déjà triée
          savoir-faire d'abord puis proximité. */}
      <div className="relative -mx-1">
        <div className="flex gap-3 overflow-x-auto pb-3 px-1 snap-x snap-mandatory scrollbar-hide scroll-smooth">
          {helpers.map((helper) => (
            <HelperMiniCard
              key={helper.id}
              helper={helper}
              ctaHref={ctaHref}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
      </div>


      {/* CTA section : alternative à l'écriture directe, publier une demande
          publique pour atteindre plus de monde que les profils affichés. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground leading-snug">
          Vous préférez décrire votre besoin&nbsp;? Publiez une demande&nbsp;:
          les membres du coin sont alertés.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/petites-missions"
            className="text-xs text-muted-foreground hover:text-primary font-semibold transition-colors"
          >
            Voir les demandes
          </Link>
          <Button asChild size="sm" className="h-8 rounded-xl text-xs font-semibold gap-1">
            <Link to={ctaHref}>
              Publier une demande
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

    </section>
  );
});

NearbyHelpersCarousel.displayName = "NearbyHelpersCarousel";
export default NearbyHelpersCarousel;
