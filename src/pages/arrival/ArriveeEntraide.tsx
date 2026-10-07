/**
 * E1, Premier pas entraide (lot 2). Le besoin ouvre le formulaire existant
 * de coup de main, pré-rempli, avec ses règles de publication.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans } from "react-i18next";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { helpersCounter } from "@/lib/arrivalFirstStep";
import { arrivalUrl, resolveProximity } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";

export const entraideCreateUrl = (need: string) => {
  const q = new URLSearchParams({ titre: need.trim(), description: need.trim() });
  return `/petites-missions/creer?${q.toString()}`;
};

const ArriveeEntraide = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [need, setNeed] = useState("");
  const [near, setNear] = useState<{ count: number; radius: number; city: string } | null>(null);
  useArrivalViewed("E1", !!user);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    helpersCounter(user.id)
      .then(async (c) => { const r = await resolveProximity(c.count); if (!cancelled && r && c.city) setNear({ ...r, city: c.city }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;
  const name = user.firstName;

  return (
    <ArrivalShell header={t("arrival.steps_sitter.first")} sitterStep={{ current: "first", entraide: true }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.e1.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.e1.title", { name }) : t("arrival.e1.title_noname")}</h1>
        {near && (
          <p className="text-foreground/80" data-testid="e1-nearby">
            <Trans i18nKey="arrival.e1.nearby" values={{ count: near.count, radius: near.radius, city: near.city }} components={{ 1: <strong /> }} />
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="e1-need">{t("arrival.e1.need_label")}</Label>
        <Textarea id="e1-need" className="arrival-field" rows={3} maxLength={300} value={need} onChange={(e) => setNeed(e.target.value)} />
      </div>
      <button type="button" className="arrival-primary" disabled={need.trim().length < 3}
        onClick={() => { trackArrival("completed", "E1"); navigate(entraideCreateUrl(need)); }}>
        {t("arrival.e1.publish")}
      </button>
      <div className="space-y-3">
        <Link to={arrivalUrl("/arrivee/savoir-faire", { flow: "entraide", next: "/arrivee/entraide" })} className="arrival-card block p-4">
          <span className="block font-semibold">{t("arrival.e1.offer_title")}</span>
          <span className="block text-sm text-muted-foreground">{t("arrival.e1.offer_text")}</span>
        </Link>
        <Link to="/projets" className="arrival-card block p-4">
          <span className="block font-semibold">{t("arrival.e1.projects_title")}</span>
          <span className="block text-sm text-muted-foreground">{t("arrival.e1.projects_text")}</span>
        </Link>
      </div>
      <p className="text-center"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.e1.dashboard")}</Link></p>
    </ArrivalShell>
  );
};

export default ArriveeEntraide;
