import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EntraideSortiesTabs from "@/components/outings/EntraideSortiesTabs";
import OutingCard from "@/components/outings/OutingCard";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/lib/myProfile";
import { useOutingsEnabled } from "@/hooks/useOutingsEnabled";
import { fetchUpcomingOutings } from "@/lib/outingsData";
import { OUTING_CATEGORIES, OUTING_COPY, outingCategory, type OutingCategory, type PublicOuting } from "@/lib/outings";
import { capitalizeFirstName } from "@/lib/displayName";
import { trackEvent } from "@/lib/analytics";

/** Lot SORT1 : onglet Sorties de la rubrique « Entraide & sorties ». */
const Sorties = () => {
  const { enabled, loading: gateLoading, preview } = useOutingsEnabled();
  const { user, isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile(user?.id);
  const [outings, setOutings] = useState<PublicOuting[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<OutingCategory | "all">("all");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchUpcomingOutings().then(({ data, error }) => {
      if (cancelled) return;
      setOutings(data);
      setFailed(!!error);
      setLoading(false);
      if (!error) trackEvent("outings_list_viewed", { metadata: { count: data.length } });
    });
    return () => { cancelled = true; };
  }, [enabled]);

  const memberCity = capitalizeFirstName(profile?.city) || null;
  const memberPostal = profile?.postal_code || "";

  // Les sorties de la commune du membre d'abord, puis les autres par date.
  const { near, far } = useMemo(() => {
    const filtered = category === "all" ? outings : outings.filter((o) => o.category === category);
    if (!memberPostal) return { near: filtered, far: [] as PublicOuting[] };
    const dept = memberPostal.slice(0, 2);
    return {
      near: filtered.filter((o) => o.place_kind === "online" || o.postal_code.slice(0, 2) === dept),
      far: filtered.filter((o) => o.place_kind !== "online" && o.postal_code.slice(0, 2) !== dept),
    };
  }, [outings, category, memberPostal]);

  const usedCategories = useMemo(() => OUTING_CATEGORIES.filter((c) => outings.some((o) => o.category === c.value)), [outings]);

  if (gateLoading) return <div className="mx-auto max-w-2xl p-5"><Skeleton className="h-12 w-full rounded-2xl" /></div>;
  if (!enabled) return <Navigate to="/petites-missions" replace />;

  const proposeHref = isAuthenticated ? "/sorties/proposer" : `/inscription?redirect=${encodeURIComponent("/sorties/proposer")}`;
  const empty = !loading && !failed && near.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pb-10 pt-4">
      <PageMeta
        title="Sorties et parties près de chez vous"
        description="Belote, balade, vélo, atelier : des moments à quelques-uns entre membres Guardiens, avec des places comptées. Guardiens est gratuit."
        path="/sorties"
        noindex={preview}
      />
      <h1 className="font-heading text-[28px] font-bold leading-tight">{OUTING_COPY.hubTitle}</h1>
      <EntraideSortiesTabs active="sorties" />
      {preview && (
        <p role="status" className="rounded-xl bg-accent/40 px-4 py-3 text-sm">
          Aperçu réservé à l'équipe : la rubrique s'ouvre aux membres quand le réglage « sorties » est allumé.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{OUTING_COPY.sortiesTitle}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{OUTING_COPY.sortiesIntro}</p>
      </div>
      <Button asChild size="lg" className="h-[52px] rounded-2xl text-base">
        <Link to={proposeHref} onClick={() => trackEvent("outing_propose_clicked", { source: "sorties_tab" })}>{OUTING_COPY.propose}</Link>
      </Button>

      {usedCategories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Activités">
          {[{ value: "all" as const, label: "Tout" }, ...usedCategories].map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              className={`h-11 rounded-full border px-3.5 text-sm ${
                category === c.value ? "border-primary bg-primary/10 font-semibold text-primary" : "border-input bg-card font-medium text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[116px] w-full rounded-2xl" />)}
        </div>
      )}
      {failed && (
        <p role="alert" className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          Lecture impossible pour le moment. Rechargez la page dans un instant.
        </p>
      )}

      {!loading && !failed && near.length > 0 && (
        <div className="flex flex-col gap-3">
          {near.map((o) => <OutingCard key={o.id} outing={o} />)}
        </div>
      )}

      {empty && (
        <section className="flex flex-col items-center gap-3.5 rounded-[20px] bg-accent/30 px-5 py-6 text-center" data-testid="outings-empty">
          <img src={outingCategory("balades").art} alt="" width={180} height={180} className="h-[180px] w-[180px] object-contain" />
          <h2 className="font-heading text-2xl font-bold leading-tight">{OUTING_COPY.emptyTitle(memberCity)}</h2>
          <p className="text-base leading-relaxed">{OUTING_COPY.emptyBody}</p>
        </section>
      )}

      {!loading && !failed && far.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">Un peu plus loin</h2>
          {far.map((o) => <OutingCard key={o.id} outing={o} />)}
        </section>
      )}
    </div>
  );
};

export default Sorties;
