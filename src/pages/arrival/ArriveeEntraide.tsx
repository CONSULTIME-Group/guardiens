/**
 * E1, Premier pas entraide (lot 2). Le besoin ouvre le formulaire existant
 * de coup de main, pré-rempli, avec ses règles de publication.
 * Lot E1-v2 (01/11/2026, maquette « Entraide v2 ») : aquarelle, phrase qui
 * légitime la demande, initiales des personnes disponibles les plus proches,
 * idées à toucher, ce qui se passe ensuite, cartes illustrées.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans } from "@/i18n/react";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { helpersCounter } from "@/lib/arrivalFirstStep";
import { arrivalUrl, resolveProximity } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import { trackEvent } from "@/lib/analytics";
const universEntraide = new URL("../../assets/aquarelles/univers-entraide-320.webp", import.meta.url).href;
const universEnsemble = new URL("../../assets/aquarelles/univers-ensemble-320.webp", import.meta.url).href;
const spotJeux = new URL("../../assets/missions/spot-jeux-160.webp", import.meta.url).href;
const FACE_COLORS = ["#7A9E8A", "#B08463", "#6F8FA6"];
const IDEAS = ["idea1", "idea2", "idea3", "idea4"] as const;

export const entraideCreateUrl = (need: string) => {
  const q = new URLSearchParams({ titre: need.trim(), description: need.trim() });
  return `/petites-missions/creer?${q.toString()}`;
};

const ArriveeEntraide = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [need, setNeed] = useState("");
  const [near, setNear] = useState<{ count: number; radius: number; city: string; initials: string[] } | null>(null);
  useArrivalViewed("E1", !!user);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    helpersCounter(user.id)
      .then(async (c) => { const r = await resolveProximity(c.count); if (!cancelled && r && c.city) setNear({ ...r, city: c.city, initials: c.initials(r.radius) }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;
  const name = user.firstName;

  return (
    <ArrivalShell header={t("arrival.steps_sitter.first")} sitterStep={{ current: "first", entraide: true }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={universEntraide} size={130} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.e1.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.e1.title", { name }) : t("arrival.e1.title_noname")}</h1>
        <p className="arrival-title text-lg italic leading-relaxed text-foreground/80">{t("arrival.e1.lead")}</p>
        {near && (
          <div className="flex items-center gap-3" data-testid="e1-nearby">
            {near.initials.length > 0 && (
              <span className="flex shrink-0 pl-2.5" aria-hidden="true">
                {near.initials.map((l, i) => (
                  <span key={i} className="-ml-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--arrival-bg)] text-sm font-semibold text-white"
                    style={{ background: FACE_COLORS[i % FACE_COLORS.length] }}>{l}</span>
                ))}
              </span>
            )}
            <p className="text-sm leading-snug text-foreground/80">
              <Trans i18nKey="arrival.e1.nearby" values={{ count: near.count, radius: near.radius, city: near.city }} components={{ 1: <strong /> }} />
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="e1-need">{t("arrival.e1.need_label")}</Label>
        <Textarea id="e1-need" className="arrival-field" rows={3} maxLength={300} value={need} placeholder={t("arrival.e1.need_placeholder")}
          onChange={(e) => setNeed(e.target.value)} />
        <p className="pt-1 text-[13px] text-muted-foreground">{t("arrival.e1.ideas")}</p>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((k) => (
            <button key={k} type="button" className="arrival-choice inline-flex items-center text-sm" aria-pressed={need === t(`arrival.e1.${k}`)}
              onClick={() => { setNeed(t(`arrival.e1.${k}`)); void trackEvent("arrival_e1_idea_clicked", { source: "arrival", metadata: { idea: k } }); }}>
              {t(`arrival.e1.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <button type="button" className="arrival-primary" disabled={need.trim().length < 3}
          onClick={() => { trackArrival("completed", "E1"); navigate(entraideCreateUrl(need)); }}>
          {t("arrival.e1.publish")}
        </button>
        <p className="text-center text-[13px] leading-snug text-muted-foreground">{t("arrival.e1.how")}</p>
      </div>
      <div className="space-y-3">
        <Link to={arrivalUrl("/arrivee/savoir-faire", { flow: "entraide", next: "/arrivee/entraide" })} className="arrival-card flex items-center gap-[14px] p-[14px]">
          <img src={spotJeux} alt="" aria-hidden="true" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block font-semibold">{t("arrival.e1.offer_title")}</span>
            <span className="block text-sm text-muted-foreground">{t("arrival.e1.offer_text")}</span>
          </span>
        </Link>
        <Link to="/projets" className="arrival-card flex items-center gap-[14px] p-[14px]">
          <img src={universEnsemble} alt="" aria-hidden="true" width={56} height={48} className="h-12 w-14 shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block font-semibold">{t("arrival.e1.projects_title")}</span>
            <span className="block text-sm text-muted-foreground">{t("arrival.e1.projects_text")}</span>
          </span>
        </Link>
      </div>
      <p className="text-center"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.e1.dashboard")}</Link></p>
    </ArrivalShell>
  );
};

export default ArriveeEntraide;
