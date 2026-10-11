/**
 * Bannière /profile : invite le gardien disponible pour l'entraide à
 * remplir 2 à 3 savoir-faire (sitter_profiles.competences).
 *
 * Conditions d'affichage :
 *  - utilisateur connecté
 *  - profil avec `available_for_help = true`
 *  - moins de 2 savoir-faire dans `sitter_profiles.competences` (lot E1)
 *
 * Nudge passif, masquable 30 jours (localStorage). Le bouton ouvre la
 * section des savoir-faire du profil (/profile?section=savoir-faire).
 */
import { fetchMyProfile, fetchMySitterProfile } from "@/lib/myProfile";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SNOOZE_KEY = "fill_savoir_faire_banner_snoozed_until";
const SNOOZE_DAYS = 30;

const FillSavoirFaireBanner = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const until = localStorage.getItem(SNOOZE_KEY);
      if (until && Date.now() < parseInt(until, 10)) return;
    } catch {}

    let cancelled = false;
    (async () => {
      // Lot E1 : les savoir-faire vivent dans sitter_profiles.competences
      // (custom_skills n'est plus écrit par aucun écran depuis 2026).
      const [{ data }, { data: sitter }] = await Promise.all([fetchMyProfile(user.id!), fetchMySitterProfile(user.id!)]);
      if (cancelled || !data) return;
      const cs = Array.isArray(sitter?.competences) ? sitter.competences : [];
      const filled = cs.filter((s: unknown) => typeof s === "string" && s.trim().length > 0).length;
      if (data.available_for_help && filled < 2) setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!show) return null;

  const handleDismiss = () => {
    try {
      const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {}
    setShow(false);
  };

  return (
    <div
      role="status"
      className="relative mb-4 rounded-2xl bg-gradient-to-br from-primary/8 via-card to-warning/10 ring-1 ring-primary/20 p-4 sm:p-5"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Masquer pendant 30 jours"
        className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="pr-8">
        <p className="text-[10px] uppercase tracking-[2px] text-primary font-sans font-semibold mb-1.5">
          Augmentez vos chances d'être contacté
        </p>
        <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground leading-snug">
          Ajoutez 2 à 3 savoir-faire à votre profil
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed mt-1.5 max-w-prose">
          Vos savoir-faire apparaissent sur votre carte d'entraide : promenade
          canine, arrosage, petit bricolage. Les personnes autour de vous savent
          ainsi pour quoi vous solliciter.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to="/profile?section=savoir-faire"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-3.5 py-1.5 hover:bg-primary/90 transition-colors"
          >
            Ajouter mes savoir-faire
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default FillSavoirFaireBanner;
