import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import HelpsWithLineForm from "@/components/entraide/HelpsWithLineForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

type Load =
  | { status: "loading" }
  | { status: "ready"; firstName: string; helpsWith: string }
  | { status: "expired" };

const callMaLigne = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("ma-ligne", { body });
  if (error) {
    // Les réponses 4xx portent un corps JSON exploitable.
    const ctx = (error as { context?: Response }).context;
    try { return ctx ? await ctx.json() : { ok: false, reason: "error" }; } catch { return { ok: false, reason: "error" }; }
  }
  return data;
};

/** /ma-ligne/:token (sans connexion) et /ma-ligne (membre connecté). */
const MaLigne = () => {
  const { token } = useParams<{ token?: string }>();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const source = token ? "token" : "session";

  useEffect(() => {
    if (!token && (authLoading || !user)) return;
    let active = true;
    void callMaLigne({ mode: "peek", token: token ?? undefined }).then((res) => {
      if (!active) return;
      if (res?.ok) {
        setLoad({ status: "ready", firstName: res.first_name ?? "", helpsWith: res.helps_with ?? "" });
        trackEvent("helps_line_page_viewed", { source, metadata: { mode: source } });
      } else {
        setLoad({ status: "expired" });
        if (token) trackEvent("helps_line_token_expired", { source, metadata: { state: res?.state ?? res?.reason ?? "unknown" } });
      }
    });
    return () => { active = false; };
  }, [token, user, authLoading, source]);

  if (!token && !authLoading && !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <main className="min-h-screen min-w-0 bg-background">
      <PageMeta title="Ma ligne d'entraide | Guardiens" description="Une ligne sur ce que vous aimez faire pour les gens du coin." noindex />
      {load.status === "loading" && (
        <div className="mx-auto max-w-[36rem] px-5 py-16" aria-busy="true">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-4 h-10 w-full rounded bg-muted" />
        </div>
      )}
      {load.status === "expired" && (
        <div className="mx-auto flex max-w-[36rem] flex-col gap-[52px] px-5 py-16">
          <header>
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[2px] text-secondary">
              <span aria-hidden="true" className="block h-px w-5 bg-secondary" />
              Entraide
            </p>
            <h1 className="mt-3 font-heading text-[1.75rem] font-semibold leading-tight text-foreground sm:text-4xl">
              Ce lien a fait son temps.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Connectez-vous pour écrire votre ligne, elle vous attend sur votre tableau de bord.
            </p>
          </header>
          <Link
            to="/login?redirect=%2Fma-ligne"
            className="inline-flex min-h-[48px] items-center justify-center self-start rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90"
          >
            Me connecter
          </Link>
          <Link to="/dashboard" className="inline-flex min-h-[44px] items-center self-start font-medium text-primary underline-offset-4 hover:underline">
            Aller au tableau de bord
          </Link>
        </div>
      )}
      {load.status === "ready" && (
        <HelpsWithLineForm
          firstName={load.firstName}
          initialValue={load.helpsWith}
          source={source}
          onSave={async (text) => {
            const res = await callMaLigne({ mode: "save", token: token ?? undefined, text });
            return { ok: Boolean(res?.ok), reason: res?.reason ?? res?.state };
          }}
        />
      )}
    </main>
  );
};

export default MaLigne;
