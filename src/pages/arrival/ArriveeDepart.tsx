/**
 * P2, Quand partez-vous ? (lot 1). Choix d'une période, puis annonce express.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trans } from "react-i18next";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { trackEvent } from "@/lib/analytics";
import { PERIOD_LABEL, arrivalCreateUrl, resolveProximity, safeNext, upcomingPeriods } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const depart = new URL("../../assets/illustrations/howto-step-3-depart-224.webp", import.meta.url).href;

const ArriveeDepart = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"), "/sits/create?source=signup");
  const spaceHref = next.startsWith("/sits/create") ? "/dashboard" : next;
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [nearby, setNearby] = useState<{ count: number; radius: number } | null>(null);
  const [choice, setChoice] = useState<string>("");
  const today = new Date().toISOString().slice(0, 10);
  const periods = upcomingPeriods(today);
  useArrivalViewed("P2", !!user);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await fetchMyProfile(user.id);
      const p = (data ?? {}) as { first_name?: string; city?: string; latitude?: number | null; longitude?: number | null };
      if (cancelled) return;
      setName(p.first_name || user.firstName || "");
      setCity(p.city || "");
      if (p.latitude != null && p.longitude != null) {
        const res = await resolveProximity(async (r) => {
          const { data: n } = await supabase.rpc("count_eligible_sitters", { p_lat: p.latitude!, p_lng: p.longitude!, p_radius_km: r });
          return typeof n === "number" ? n : 0;
        });
        if (!cancelled) setNearby(res);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const go = (value: string) => {
    void trackEvent("arrival_owner_period_selected", { source: "/arrivee/depart", metadata: { periode: value } });
    trackArrival("completed", "P2");
    navigate(arrivalCreateUrl(value === "custom" ? null : (value as any)));
  };

  const options = [...periods.map((p) => ({ value: p, label: PERIOD_LABEL[p] })), { value: "custom", label: t("arrival.p2.custom") }];

  return (
    <ArrivalShell header={t("arrival.p2.header")} stepBar="departure">
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={depart} size={150} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.p2.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.p2.title", { name }) : t("arrival.p2.title_noname")}</h1>
        <p className="text-foreground/80">{t("arrival.p2.text")}</p>
      </div>
      <div role="radiogroup" aria-label={t("arrival.p2.eyebrow")} className="space-y-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={choice === o.value}
            className="arrival-card w-full px-4 py-3 text-left font-medium" onClick={() => setChoice(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" className="arrival-link block text-sm" onClick={() => go("plus_tard")}>{t("arrival.p2.later")}</button>
      <button type="button" className="arrival-primary" disabled={!choice} onClick={() => go(choice)}>{t("arrival.p2.cta")}</button>
      {nearby && city && (
        <p className="rounded-xl bg-card p-4 text-sm" data-testid="arrival-nearby">
          <Trans i18nKey="arrival.p2.nearby" values={{ count: nearby.count, radius: nearby.radius, city }} components={{ 1: <strong /> }} />
        </p>
      )}
      <p className="text-center">
        <Link to={spaceHref} className="arrival-link text-sm">{t("arrival.p2.dashboard")}</Link>
      </p>
    </ArrivalShell>
  );
};

export default ArriveeDepart;
