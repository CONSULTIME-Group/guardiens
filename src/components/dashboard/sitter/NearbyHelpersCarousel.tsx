import { memo, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyHelpers, type NearbyHelper } from "@/hooks/useNearbyHelpers";
import { startConversation } from "@/lib/conversation";
import { toast } from "sonner";
import { capitalize } from "@/components/dashboard/owner/helpers";

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
  onWrite,
  pending,
}: {
  helper: NearbyHelper;
  onWrite: () => void;
  pending?: boolean;
}) => {
  const firstName = capitalize(helper.first_name || "Membre");
  const customSkills = (helper.custom_skills || [])
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
  const bioTeaser = helper.bio?.trim() || null;
  return (
    <article
      className="
        group/card flex-shrink-0 w-[78vw] sm:w-[19rem] snap-start
        rounded-2xl bg-card
        ring-1 ring-border/60 hover:ring-primary/30
        shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]
        transition-all duration-300 ease-out
        flex flex-col overflow-hidden
      "
    >
      {/* En-tête : avatar + nom + ville/distance + vérif */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
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
            {helper.distance_km !== null && helper.distance_km !== undefined
              ? ` · ${Math.round(helper.distance_km)} km`
              : ""}
          </p>
        </div>
      </div>

      {/* Bio teaser — typo serif italique, ton éditorial léger */}
      {bioTeaser ? (
        <p className="px-4 pb-3 text-[13px] text-foreground/75 leading-relaxed italic line-clamp-2 font-heading">
          « {bioTeaser} »
        </p>
      ) : (
        <div className="px-4 pb-3">
          <p className="text-[12px] text-muted-foreground/70 leading-snug italic">
            Disponible pour un coup de main près de chez vous.
          </p>
        </div>
      )}

      {/* Savoir-faire : 1 ligne, chips fines, débordement masqué */}
      {(customSkills.length > 0 || helper.skill_categories.length > 0) && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {customSkills.slice(0, 2).map((c) => (
            <span
              key={c}
              className="text-[11px] rounded-full bg-muted/60 text-foreground/80 px-2.5 py-0.5 ring-1 ring-border/40"
            >
              {c}
            </span>
          ))}
          {helper.skill_categories
            .filter((cat) => SKILL_CHIPS.find((c) => c.key === cat))
            .slice(0, customSkills.length > 0 ? 1 : 3)
            .map((cat) => {
              const meta = SKILL_CHIPS.find((c) => c.key === cat)!;
              return (
                <span
                  key={cat}
                  className="text-[11px] rounded-full bg-primary/8 text-primary px-2.5 py-0.5"
                >
                  {meta.label}
                </span>
              );
            })}
          {customSkills.length + helper.skill_categories.length > 3 && (
            <span className="text-[11px] text-muted-foreground self-center">
              +{customSkills.length + helper.skill_categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* CTA — discret, bord supérieur très léger, plein largeur */}
      <div className="mt-auto border-t border-border/40 bg-muted/20 group-hover/card:bg-muted/40 transition-colors">
        <Button
          variant="ghost"
          size="sm"
          className="w-full rounded-none h-10 text-xs font-medium text-foreground hover:bg-transparent hover:text-primary justify-center"
          onClick={onWrite}
          disabled={pending}
        >
          {pending ? "Ouverture…" : "Lui écrire"}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
};

const NearbyHelpersCarousel = memo(({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useNearbyHelpers(user?.id);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const helpers = data?.helpers || [];
  const filtered = useMemo(() => {
    if (!activeSkill) return helpers;
    return helpers.filter((h) => h.skill_categories.includes(activeSkill));
  }, [helpers, activeSkill]);

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

  if (!helpers.length) return null;

  const radiusLabel = data?.hasGeo
    ? `dans un rayon de ${data.radiusUsed} km`
    : "dans la communauté";

  const handleWrite = async (helper: NearbyHelper) => {
    if (!user?.id || pending) return;
    setPending(helper.id);
    const result = await startConversation({
      otherUserId: helper.id,
      context: "helper_inquiry",
    });
    setPending(null);
    if (result.conversationId) {
      const intent = activeSkill
        ? SKILL_CHIPS.find((c) => c.key === activeSkill)?.intent
        : null;
      const params = new URLSearchParams({ c: result.conversationId });
      if (intent) params.set("draft", `Bonjour, je cherche ${intent} près de chez moi. Seriez-vous disponible ?`);
      navigate(`/messages?${params.toString()}`);
    } else {
      toast.error(result.error || "Impossible d'ouvrir la conversation");
    }
  };

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
              Personnes du coin disponibles {radiusLabel}.
            </p>
          </div>
        </div>
      )}

      {/* Chips compétences */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveSkill(null)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            activeSkill === null
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          Tout
        </button>
        {SKILL_CHIPS.map((chip) => {
          const count = helpers.filter((h) => h.skill_categories.includes(chip.key)).length;
          if (count === 0) return null;
          const active = activeSkill === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveSkill(active ? null : chip.key)}
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

      {/* Liste : carrousel horizontal en mode standard, stack vertical en mode compact (aside étroit) */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4">
          Personne sur cette compétence pour l'instant — essayez une autre catégorie.
        </p>
      ) : hideHeader ? (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, 3).map((helper) => (
            <HelperMiniCard
              key={helper.id}
              helper={helper}
              onWrite={() => handleWrite(helper)}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {filtered.map((helper) => (
            <HelperMiniCard
              key={helper.id}
              helper={helper}
              onWrite={() => handleWrite(helper)}
            />
          ))}
        </div>
      )}
    </section>
  );
});

NearbyHelpersCarousel.displayName = "NearbyHelpersCarousel";
export default NearbyHelpersCarousel;
