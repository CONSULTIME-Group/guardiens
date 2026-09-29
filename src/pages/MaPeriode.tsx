/**
 * /ma-periode/:token?p=noel (lot N4)
 * Enregistre la période choisie dans l'email, puis affiche « C'est noté ».
 * Avec jeton : sans connexion. Sans jeton : membre connecté.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import {
  callMaPeriode, finishUrl, isDeparturePeriod, remainingPhrase,
  PERIOD_NOTED, PERIOD_OF,
  type DeparturePayload, type DeparturePeriod,
} from "@/lib/ownerDeparture";
import { Faces, PeriodChoices, ProgressBar, ReadinessList } from "@/components/departure/DepartureParts";

export const RECORDED_LINE = "Votre réponse est enregistrée. Vous la retrouvez sur votre tableau de bord.";

type View = { kind: "loading" } | { kind: "error"; state?: string } | { kind: "ready"; data: DeparturePayload };

export const NotedView = ({ data }: { data: DeparturePayload }) => {
  const period = data.period as DeparturePeriod | null;
  if (period === "plus_tard") {
    return (
      <section data-testid="noted-later">
        <h1 className="font-heading text-[30px] leading-tight text-foreground">C'est noté.</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
          Prenez votre temps. {RECORDED_LINE} Votre annonce vous attend, avec ce que vous avez déjà renseigné.
        </p>
        <Button asChild variant="outline" className="mt-6 h-[48px] rounded-full px-6">
          <Link to="/dashboard">Aller à mon tableau de bord</Link>
        </Button>
      </section>
    );
  }
  if (!period) return null;
  const r = data.readiness;
  const pets = data.pet_names.length ? ` pour ${data.pet_names.slice(0, 3).join(", ")}` : "";
  return (
    <section data-testid="noted-period">
      <h1 className="font-heading text-[30px] leading-tight text-foreground">C'est noté : {PERIOD_NOTED[period]}.</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
        Votre annonce de {PERIOD_OF[period]}{pets} est prête à {r.percent} %. {remainingPhrase(r.todo)}
      </p>
      <div className="mt-5"><ProgressBar percent={r.percent} /></div>
      <ReadinessList readiness={r} />
      <Button asChild className="mt-6 h-[50px] w-full rounded-full text-[16px] sm:w-auto sm:px-8">
        {data.upcoming_sit_id
          ? <Link to={`/sits/${data.upcoming_sit_id}`} data-testid="noted-see-sit">Voir mon annonce</Link>
          : <Link to={finishUrl(period)}>Terminer mon annonce</Link>}
      </Button>
      {data.nearby && data.nearby.count > 0 && data.city ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4" data-testid="noted-nearby">
          <Faces sitters={data.nearby.sitters} />
          <p className="text-[15px] text-foreground">{data.nearby.count} {data.nearby.count === 1 ? "gardien" : "gardiens"} à moins de 50 km de {data.city}.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4" data-testid="noted-no-city">
          <p className="text-[15px] text-foreground">Ajoutez votre commune : votre annonce apparaît aux gardiens qui habitent près de chez vous.</p>
          <Link to="/owner-profile" className="mt-2 inline-block text-[15px] font-semibold text-primary underline-offset-4 hover:underline">Ajouter ma commune</Link>
        </div>
      )}
      <p className="mt-6 text-[14px] text-muted-foreground">{RECORDED_LINE}</p>
    </section>
  );
};

const MaPeriode = () => {
  const { token } = useParams<{ token?: string }>();
  const [params] = useSearchParams();
  const p = params.get("p");
  const [view, setView] = useState<View>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const run = async (mode: "peek" | "save", period?: DeparturePeriod) => {
    const res = await callMaPeriode({ mode, token: token || undefined, period });
    if (res.ok) setView({ kind: "ready", data: res });
    else setView({ kind: "error", state: (res as { state?: string }).state });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(isDeparturePeriod(p) ? "save" : "peek", isDeparturePeriod(p) ? p : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (period: DeparturePeriod) => {
    setBusy(true);
    await run("save", period);
    setBusy(false);
  };

  return (
    <main className="min-h-screen min-w-0 bg-background px-5 py-10">
      <PageMeta title="Votre période de départ | Guardiens" description="Dites-nous quand vous partez, on prépare votre annonce avec vous." noindex />
      <div className="mx-auto w-full max-w-[560px]">
        {view.kind === "loading" && <p className="text-muted-foreground">Un instant…</p>}
        {view.kind === "error" && (
          <section data-testid="departure-error">
            <h1 className="font-heading text-[26px] text-foreground">
              {view.state === "unauthenticated" ? "Connectez-vous pour répondre" : "Ce lien a expiré. Votre annonce vous attend dans votre tableau de bord."}
            </h1>
            {view.state === "unauthenticated" && <p className="mt-3 text-muted-foreground">Vous pouvez répondre depuis votre tableau de bord.</p>}
            <Button asChild className="mt-5 rounded-full"><Link to="/login?redirect=/dashboard">Se connecter</Link></Button>
          </section>
        )}
        {view.kind === "ready" && (view.data.period ? <NotedView data={view.data} /> : (
          <section>
            <h1 className="mb-5 font-heading text-[28px] text-foreground">Vous partez quand, cette année ?</h1>
            <PeriodChoices onPick={pick} busy={busy} />
          </section>
        ))}
      </div>
    </main>
  );
};

export default MaPeriode;
