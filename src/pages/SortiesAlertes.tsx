import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { OUTING_ALERT_COPY } from "@/lib/outings";
import { setOutingAlertsByToken } from "@/lib/outingsData";
import { trackEvent } from "@/lib/analytics";

type State = "ask" | "stopped" | "resumed" | "invalid";

/**
 * Lot SORT4 : arrivée du lien « Arrêter les alertes sorties » d'un email.
 * L'arrêt se fait d'un geste sur cette page, sans connexion, et se défait de même.
 * Ouvrir la page laisse le réglage tel quel : les messageries ouvrent les liens
 * d'un email pour les contrôler.
 * Seules les alertes sorties changent.
 */
const SortiesAlertes = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<State>(token.length < 32 ? "invalid" : "ask");
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await setOutingAlertsByToken(token, false);
    setBusy(false);
    setState(ok ? "stopped" : "invalid");
    if (ok) trackEvent("outing_alert_stopped", { source: "email_link", anonymous: true });
  };

  const resume = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await setOutingAlertsByToken(token, true);
    setBusy(false);
    if (ok) { setState("resumed"); trackEvent("outing_alert_resumed", { source: "email_link", anonymous: true }); }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
      <PageMeta title="Alertes sorties" description="Réglage des alertes sorties de Guardiens." path="/sorties/alertes" noindex />
      {state === "ask" && (
        <>
          <h1 className="font-heading text-2xl font-bold leading-tight">{OUTING_ALERT_COPY.askTitle}</h1>
          <p className="text-[15px] leading-relaxed">{OUTING_ALERT_COPY.stopKept}</p>
          <Button type="button" disabled={busy} onClick={stop} className="h-[52px] rounded-2xl text-base" data-testid="outing-alerts-stop">{OUTING_ALERT_COPY.askButton}</Button>
        </>
      )}
      {(state === "stopped" || state === "resumed") && (
        <>
          <div role="status" className="flex flex-col gap-2 rounded-2xl bg-primary/10 px-4 py-4">
            <h1 className="font-heading text-2xl font-bold leading-tight">{state === "stopped" ? OUTING_ALERT_COPY.stopTitle : OUTING_ALERT_COPY.resumedTitle}</h1>
            <p className="text-base text-primary">{state === "stopped" ? OUTING_ALERT_COPY.stopBody : OUTING_ALERT_COPY.resumedBody}</p>
          </div>
          <p className="text-[15px] leading-relaxed">{OUTING_ALERT_COPY.stopKept}</p>
          {state === "stopped" && (
            <Button type="button" variant="outline" disabled={busy} onClick={resume} className="h-[52px] rounded-2xl text-base">{OUTING_ALERT_COPY.resume}</Button>
          )}
        </>
      )}
      {state === "invalid" && (
        <div role="alert" className="rounded-2xl border border-border bg-card px-4 py-4">
          <h1 className="font-heading text-xl font-bold">{OUTING_ALERT_COPY.invalid}</h1>
        </div>
      )}
      {(
        <Link to="/settings?section=alerts" className="flex min-h-11 items-center justify-center text-[15px] font-semibold">{OUTING_ALERT_COPY.settingsLink}</Link>
      )}
    </div>
  );
};

export default SortiesAlertes;
