/**
 * N1, Application et notifications (lot 2, facultatif).
 * Sauté si les notifications sont déjà actives ici ou impossibles.
 * Sur iPhone hors application installée : deux étapes, aucun appel à enablePush.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { requestInstall } from "@/lib/pwa-install";
import { enablePush, getPushConfig, hasLocalPushSubscription, pushSupport, type PushConfig } from "@/lib/web-push";
import { N1_PENDING_KEY, afterN1, arrivalUrl, n1Mode, readCarry } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const sitterReady = new URL("../../assets/empty-states/v2/responsive/sitter-ready-384.webp", import.meta.url).href;

const clearPending = () => { try { localStorage.removeItem(N1_PENDING_KEY); } catch { /* rien */ } };

const ArriveeApplication = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const carry = readCarry(params);
  const owner = carry.flow === "owner";
  const nextUrl = afterN1(carry);
  const { canPrompt } = usePwaInstall();
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [nearby, setNearby] = useState(true);
  const [applications, setApplications] = useState(true);
  const [messages, setMessages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mode = user ? n1Mode({ support: pushSupport(), subscribed: hasLocalPushSubscription(user.id) }) : "skip";

  useEffect(() => {
    if (!user) return;
    if (mode === "skip") { clearPending(); navigate(nextUrl, { replace: true }); return; }
    if (mode === "ios-install") {
      try { localStorage.setItem(N1_PENDING_KEY, arrivalUrl("/arrivee/application", carry)); } catch { /* rien */ }
      return;
    }
    // Configuration lue d'avance : la demande d'autorisation part au clic, sans attente réseau.
    getPushConfig(user.id).then(setConfig).catch(() => setConfig({ enabled: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode]);
  useArrivalViewed("N1", !!user && mode !== "skip");

  const finish = () => { clearPending(); trackArrival("completed", "N1"); navigate(nextUrl); };
  const skip = () => { void trackEvent("arrival_push_skipped", { source: "/arrivee/application" }); clearPending(); navigate(nextUrl); };

  const activate = async () => {
    if (!user || !config) return;
    setBusy(true);
    setFailed(false);
    try {
      const nearbySits = !owner && nearby;
      await enablePush(user.id, config, { messages, applications, nearbySits });
      void trackEvent("arrival_push_enabled", { source: "/arrivee/application", metadata: { nearby: nearbySits } });
      finish();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  if (!user || mode === "skip") return null;

  const toggles = owner
    ? [{ id: "apps", label: t("arrival.n1.sitter_applies"), on: applications, set: setApplications }, { id: "msg", label: t("arrival.n1.messages"), on: messages, set: setMessages }]
    : [
        { id: "nearby", label: t("arrival.n1.nearby"), on: nearby, set: setNearby },
        { id: "apps", label: t("arrival.n1.owner_replies"), on: applications, set: setApplications },
        { id: "msg", label: t("arrival.n1.messages"), on: messages, set: setMessages },
      ];

  return (
    <ArrivalShell header={t("arrival.n1.header")}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={sitterReady} size={170} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.n1.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t(owner ? "arrival.n1.title_owner" : "arrival.n1.title_sitter")}</h1>
        <p className="text-foreground/80">{t(owner ? "arrival.n1.text_owner" : "arrival.n1.text_sitter")}</p>
      </div>
      {mode === "ios-install" ? (
        <ol className="space-y-4" data-testid="n1-ios">
          {[["ios1_title", "ios1_text"], ["ios2_title", "ios2_text"]].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card font-semibold">{i + 1}</span>
              <span>
                <span className="block font-semibold">{t(`arrival.n1.${title}`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`arrival.n1.${text}`)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-3">
          {canPrompt && (
            <button type="button" className="arrival-primary" onClick={() => { void trackEvent("arrival_install_clicked", { source: "/arrivee/application" }); void requestInstall(); }}>
              {t("arrival.n1.install")}
            </button>
          )}
          <button type="button" className="arrival-primary" disabled={!config?.enabled || busy} onClick={activate}>{t("arrival.n1.enable")}</button>
          {failed && <p role="alert" className="text-sm text-destructive">{t("arrival.n1.error")}</p>}
        </div>
      )}
      <fieldset className="space-y-3">
        <legend className="arrival-eyebrow mb-2">{t("arrival.n1.when")}</legend>
        {toggles.map((x) => (
          <label key={x.id} htmlFor={`n1-${x.id}`} className="flex min-h-[44px] items-center justify-between gap-3">
            <span>{x.label}</span>
            <Switch id={`n1-${x.id}`} checked={x.on} onCheckedChange={x.set} />
          </label>
        ))}
      </fieldset>
      <p className="text-center"><button type="button" className="arrival-link text-sm" onClick={skip}>{t("arrival.n1.later")}</button></p>
    </ArrivalShell>
  );
};

export default ArriveeApplication;
