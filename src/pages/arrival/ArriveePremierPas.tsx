/**
 * G5 / G5b, Premier pas (lot 2). Une garde à 30 km ou moins : la meilleure
 * proche. Sinon : les deux plus proches, quelle que soit la distance.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";
import { loadFirstStep, type FirstStepCard, type FirstStepData } from "@/lib/arrivalFirstStep";
import { arrivalUrl, stepsToReach } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const waitingBench = new URL("../../assets/empty-states/v2/responsive/waiting-bench-384.webp", import.meta.url).href;

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

  if (data.hasNear && data.best) {
    const b = data.best;
    return (
      <ArrivalShell header={t("arrival.steps_sitter.first")} sitterStep={{ current: "first" }}>
        <Head><meta name="robots" content="noindex, nofollow" /></Head>
        <div className="space-y-3">
          <Eyebrow>{t("arrival.g5.eyebrow")}</Eyebrow>
          <h1 className="text-3xl font-semibold">{name ? t("arrival.g5.title", { city, name }) : t("arrival.g5.title_noname", { city })}</h1>
        </div>
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
        {score >= MIN_COMPLETION_TO_APPLY && profileCard}
        <p className="text-center"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.g5.dashboard")}</Link></p>
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
      {data.alertActive && (
        <div className="arrival-card p-4 space-y-1" data-testid="g5b-alert">
          <p>{t("arrival.g5b.alert_text")}</p>
          <Link to="/settings?section=alerts" className="arrival-link text-sm">{t("arrival.g5b.alert_link")}</Link>
        </div>
      )}
      <div className="arrival-card p-4 space-y-3">
        <p className="font-semibold">{t("arrival.g5b.help_title")}</p>
        <p className="text-sm text-muted-foreground">{t("arrival.g5b.help_text", { city })}</p>
        <Link to={data.hasSkills ? "/petites-missions" : arrivalUrl("/arrivee/savoir-faire", { flow: "sitter", next: "/arrivee/premier-pas" })}
          className="arrival-primary inline-flex items-center justify-center">{t("arrival.g5b.help_cta")}</Link>
      </div>
      {score >= MIN_COMPLETION_TO_APPLY && profileCard}
      <p className="text-center"><Link to="/dashboard" className="arrival-link text-sm">{t("arrival.g5.dashboard")}</Link></p>
    </ArrivalShell>
  );
};

export default ArriveePremierPas;
