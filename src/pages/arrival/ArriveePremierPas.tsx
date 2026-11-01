/**
 * G5 / G5b, Premier pas (lot 2). Une garde à 30 km ou moins : la meilleure
 * proche. Sinon : les deux plus proches, quelle que soit la distance.
 * Lot G-ENT2 (01/11/2026) : l'entraide au premier pas (besoins proches avec
 * « Je peux », sinon proposition écrite d'après les savoir-faire) et la carte
 * miroir « Faites garder votre maison ». Deux colonnes sur ordinateur.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";
import { loadFirstStep, type FirstStepCard, type FirstStepData } from "@/lib/arrivalFirstStep";
import { stepsToReach } from "@/lib/arrival";
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";
import { ArrivalShell, Eyebrow, Gouache, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import { G5Needs, G5OwnerMirror } from "@/components/arrival/G5Entraide";
const waitingBench = new URL("../../assets/aquarelles/arrivee-banc-360.webp", import.meta.url).href;

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
export const sitDates = (s: { start_date: string | null; end_date: string | null }) =>
  s.start_date && s.end_date ? `du ${fmt(s.start_date)} au ${fmt(s.end_date)}` : "dates à préciser";

function Score({ a }: { a: FirstStepCard["affinity"] }) {
  const t = useArrivalT();
  if (!a || !a.displayed) return <span className="text-xs text-muted-foreground">{t("arrival.g5.affinity_pending")}</span>;
  return <span className="text-sm font-semibold">{Math.round(a.score)} <span className="text-xs font-normal text-muted-foreground">{t("arrival.g5.affinity")}</span></span>;
}

const ArriveePremierPas = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const [data, setData] = useState<FirstStepData | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadFirstStep(user.id).then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);
  useArrivalViewed("G5", !!data);

  if (!user || !data) return null;
  const name = user.firstName;
  const city = data.city;
  const score = data.completion;
  const steps = stepsToReach(score, data.missing.map((m) => m.points), MIN_COMPLETION_TO_APPLY);
  const firstMissing = [...data.missing].sort((a, b) => b.points - a.points)[0];

  const profileCard = score < MIN_COMPLETION_TO_APPLY ? (
    <div className="arrival-card p-4 space-y-3" data-testid="g5-profile">
      <p className="font-semibold">{t("arrival.g5.profile_steps", { count: Math.max(steps, 1) })}</p>
      <Link to={firstMissing?.href || "/profile"} className="arrival-primary inline-flex items-center justify-center">{t("arrival.g5.profile_cta")}</Link>
    </div>
  ) : (
    <div className="arrival-card p-4 flex items-center justify-between gap-3" data-testid="g5-profile-ok">
      <p className="text-sm">{t("arrival.g5.profile_ok")}</p>
      {!data.hasAvatar && <Link to="/profile?section=identite" className="arrival-choice shrink-0">{t("arrival.g5.add")}</Link>}
    </div>
  );

  // Lot 2b : phrase d'Alma, seulement si l'alerte de nouvelle garde est active.
  const almaLine = data.alertActive ? (
    <div className="flex items-start gap-3" data-testid="g5-alma-line">
      <AlmaAvatar size={32} mood="gentle" aria-hidden={true} />
      <p className="text-sm text-foreground/80">{t("arrival.g5.alma_line")}</p>
    </div>
  ) : null;

  const mirror = data.role === "owner" || data.role === "both" ? null : <G5OwnerMirror role={data.role} />;

  if (data.hasNear && data.best) {
    const b = data.best;
    return (
      <ArrivalShell header={t("arrival.steps_sitter.first")} sitterStep={{ current: "first" }} wide>
        <Head><meta name="robots" content="noindex, nofollow" /></Head>
        <div className="space-y-3">
          <Eyebrow>{t("arrival.g5.eyebrow")}</Eyebrow>
          <h1 className="text-3xl font-semibold lg:text-[44px] lg:leading-[1.1]">{name ? t("arrival.g5.title", { city, name }) : t("arrival.g5.title_noname", { city })}</h1>
        </div>
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[520px_minmax(0,1fr)] lg:items-start lg:gap-x-[60px]">
        <div className="space-y-6 lg:col-start-1">
        {score < MIN_COMPLETION_TO_APPLY && profileCard}
        <article className="arrival-card overflow-hidden" data-testid="g5-best">
          {b.cover && <img src={b.cover} alt="" className="h-40 w-full object-cover" />}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t("arrival.g5.at", { city: b.city, d: b.distanceKm })}</p>
              <Score a={b.affinity} />
            </div>
            <p className="font-semibold">{b.title}</p>
            <p className="text-sm text-muted-foreground">{sitDates(b)}</p>
            {!!b.affinity?.matched?.length && (
              <div className="flex flex-wrap gap-2 text-xs">
                {b.affinity.matched.slice(0, 2).map((m) => <span key={m} className="rounded-full bg-[color:var(--arrival-field)] px-3 py-1">{m}</span>)}
              </div>
            )}
            <Link to={`/annonces/${b.id}`} className="arrival-primary inline-flex items-center justify-center">{t("arrival.g5.discover")}</Link>
          </div>
        </article>
        <p className="text-sm">{t("arrival.g5.count_line", { n: data.nearCount, total: data.total })} <Link to="/search" className="arrival-link">{t("arrival.g5.all")}</Link></p>
        {almaLine}
        </div>
        <div className="space-y-6 pt-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-0">
          <G5Needs data={data} />
        </div>
        <div className="space-y-6 lg:col-start-1">
          {mirror}
          {score >= MIN_COMPLETION_TO_APPLY && profileCard}
          <p className="text-center lg:text-left"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.g5.dashboard")}</Link></p>
        </div>
        </div>
      </ArrivalShell>
    );
  }

  return (
    <ArrivalShell header={t("arrival.steps_sitter.first")} sitterStep={{ current: "first" }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={waitingBench} size={170} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.g5.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.g5b.title", { name }) : t("arrival.g5b.title_noname")}</h1>
        <p className="text-foreground/80">{t("arrival.g5b.text", { city })}</p>
      </div>
      {score < MIN_COMPLETION_TO_APPLY && profileCard}
      {data.closest.length > 0 && (
        <section className="space-y-3" data-testid="g5b-closest">
          <p className="arrival-eyebrow">{t("arrival.g5b.closest")}</p>
          {data.closest.map((s) => (
            <Link key={s.id} to={`/annonces/${s.id}`} className="arrival-card flex items-center justify-between gap-3 p-4">
              <span>
                <span className="block font-semibold">{t("arrival.g5b.sit_at", { city: s.city })}</span>
                <span className="block text-sm text-muted-foreground">
                  {s.distanceKm != null ? t("arrival.g5b.sit_meta", { d: s.distanceKm, dates: sitDates(s) }) : sitDates(s)}
                </span>
              </span>
              <Score a={s.affinity} />
            </Link>
          ))}
        </section>
      )}
      {almaLine}
      {data.alertActive && (
        <div className="arrival-card p-4 space-y-1" data-testid="g5b-alert">
          <p>{t("arrival.g5b.alert_text")}</p>
          <Link to="/settings?section=alerts" className="arrival-link text-sm">{t("arrival.g5b.alert_link")}</Link>
        </div>
      )}
      <G5Needs data={data} className="pt-4" />
      {mirror}
      {score >= MIN_COMPLETION_TO_APPLY && profileCard}
      <p className="text-center"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.g5.dashboard")}</Link></p>
    </ArrivalShell>
  );
};

export default ArriveePremierPas;
