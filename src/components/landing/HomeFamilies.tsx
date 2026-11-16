/**
 * Lot ES-HOME (16/11/2026, conseil claude/conseil/2026-11-16-conseil-entraide-sorties-hub.md,
 * maquette Claude Design « Entraide & sorties, ordinateur et accueil, avant / après »,
 * « je valide les maquettes, go » de Jérémie) : les trois familles de Guardiens
 * en un seul bloc, chacune avec une phrase, un chiffre vivant lu en base et un
 * seul geste nommé (bouton plein pour la garde, priorité produit), plus un lien
 * vers sa page. Remplace aussi « Comment ça marche ».
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { HOME_BTN_PRIMARY, HOME_BTN_SECONDARY, homeCtaTarget } from "@/components/landing/homeCta";
import familyGardes from "@/assets/aquarelles/univers-gardes-320.webp";
import familyEntraide from "@/assets/aquarelles/univers-entraide-320.webp";
import familySorties from "@/assets/missions/spot-jeux-480.webp";

export type FamilyKey = "garde" | "entraide" | "sorties";
export type FamilyCounts = Record<FamilyKey, number | null>;

export const HOME_FAMILIES = [
  { key: "garde", list: "/annonces", action: "/sits/create", event: "cta_proprio_clicked", image: familyGardes, primary: true },
  { key: "entraide", list: "/petites-missions", action: "/petites-missions/creer", event: "cta_aid_clicked", image: familyEntraide, primary: false },
  { key: "sorties", list: "/sorties", action: "/sorties/proposer", event: "cta_outing_clicked", image: familySorties, primary: false },
] as const;

/** Phrase du chiffre vivant ; null quand il n'y a rien de juste à dire. */
export function familyCountLine(key: FamilyKey, count: number | null): string | null {
  if (count === null) return null;
  if (key === "sorties" && count === 0) return "Proposez la première près de chez vous";
  if (count <= 0) return null;
  if (key === "garde") return count === 1 ? "1 garde ouverte en ce moment" : `${count} gardes ouvertes en ce moment`;
  if (key === "entraide") return count === 1 ? "1 coup de main ouvert" : `${count} coups de main ouverts`;
  return count === 1 ? "1 sortie à venir" : `${count} sorties à venir`;
}

/**
 * Trois comptes légers (en-têtes seuls, aucune ligne lue), demandés quand le bloc
 * approche de l'écran : le bloc vit sous le hero, hors du premier écran, et
 * l'accueil garde son budget de lectures au chargement (verrou src/__tests__/p3/).
 * Une lecture en échec laisse la ligne vide, jamais un zéro.
 */
function useFamilyCounts(target: React.RefObject<HTMLElement>): FamilyCounts {
  const [counts, setCounts] = useState<FamilyCounts>({ garde: null, entraide: null, sorties: null });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = target.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    void Promise.all([
      supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published").or(`end_date.gte.${today},end_date.is.null`),
      db.from("public_small_missions").select("id", { count: "exact", head: true }).eq("status", "open").eq("mission_type", "besoin").neq("category", "projet"),
      db.from("public_outings").select("id", { count: "exact", head: true }).eq("status", "open").gt("starts_at", now),
    ]).then(([sits, needs, outings]) => {
      if (!active) return;
      const read = (result: { count: number | null; error: unknown }) => (result.error ? null : result.count ?? null);
      setCounts({ garde: read(sits), entraide: read(needs), sorties: read(outings) });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [visible]);
  return counts;
}

export function HomeFamilies() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);
  const counts = useFamilyCounts(sectionRef);
  return (
    <section ref={sectionRef} id="comment-ca-marche" className="scroll-mt-24" aria-labelledby="home-families-title">
      <h2 id="home-families-title" className="mx-auto mt-8 md:mt-10 max-w-3xl text-center font-heading text-xl md:text-2xl font-semibold text-foreground text-balance">
        {t("landing.families.title")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center font-body text-sm md:text-base leading-relaxed text-muted-foreground">
        {t("landing.hero.lede")}
      </p>
      <ul className="mt-5 md:mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {HOME_FAMILIES.map((family) => {
          const line = familyCountLine(family.key, counts[family.key]);
          return (
            <li key={family.key}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 md:p-6" data-testid={`home-family-${family.key}`}>
                <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
                  <img src={family.image} alt="" aria-hidden="true" width={320} height={320} loading="lazy" decoding="async" className="h-20 w-20 flex-none object-contain md:h-28 md:w-28" />
                  <h3 className="font-heading text-lg md:text-xl font-semibold text-foreground">{t(`landing.families.${family.key}_title`)}</h3>
                </div>
                <p className="font-body text-sm md:text-[15px] leading-relaxed text-muted-foreground">{t(`landing.families.${family.key}_text`)}</p>
                {line && (
                  <p className="font-body text-sm text-foreground" data-testid={`home-family-count-${family.key}`}>
                    {/^\d/.test(line) ? <><b className="font-heading text-lg font-bold text-primary">{line.split(" ")[0]}</b>{line.slice(line.indexOf(" "))}</> : line}
                  </p>
                )}
                <div className="mt-auto flex flex-col items-stretch gap-1 pt-1">
                  <Link
                    to={homeCtaTarget(family.action, isAuthenticated)}
                    onClick={() => void trackEvent(family.event, { metadata: { location: "home_families" } })}
                    className={family.primary ? HOME_BTN_PRIMARY : HOME_BTN_SECONDARY}
                  >
                    {t(`landing.families.${family.key}_cta`)}
                  </Link>
                  <Link
                    to={family.list}
                    onClick={() => void trackEvent("home_family_clicked", { metadata: { family: family.key } })}
                    className="inline-flex min-h-11 items-center justify-center font-body text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {t(`landing.families.${family.key}_list`)}
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
