/**
 * P4, Et vous, aussi ? (lot 1). Deux cartes indépendantes.
 * « Garder » passe owner à both par change_user_role (chemin existant des
 * réglages), « Coup de main » pose available_for_help puis ouvre l'éditeur
 * de savoir-faire du profil.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import { alsoNextSteps } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import gouacheGarde from "@/assets/onboarding/gouache-garde.png";
import gouacheEntraide from "@/assets/onboarding/gouache-entraide.png";

const ArriveeAussi = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sitId = params.get("sit");
  const redirect = sanitizeRedirect(params.get("redirect"));
  const sitPath = sitId ? `/sits/${sitId}` : redirect || "/dashboard";
  const [garder, setGarder] = useState(false);
  const [aide, setAide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  useArrivalViewed("P4", !!user);
  useEffect(() => { if (user?.role === "both") setGarder(false); }, [user?.role]);

  const go = async () => {
    if (!user || (!garder && !aide)) return;
    setSaving(true);
    setFailed(false);
    if (garder && user.role === "owner") {
      const { error } = await supabase.rpc("change_user_role", { p_user_id: user.id, p_new_role: "both" as any });
      if (error) { setSaving(false); setFailed(true); return; }
    }
    if (aide) {
      const { error } = await supabase.from("profiles").update({ available_for_help: true } as any).eq("id", user.id);
      if (error) { setSaving(false); setFailed(true); return; }
    }
    void trackEvent("arrival_owner_also_selected", { source: "/arrivee/aussi", metadata: { garder, coup_de_main: aide } });
    trackArrival("completed", "P4");
    await Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(alsoNextSteps({ garder, coupDeMain: aide, sitPath }));
  };

  if (!user) return null;
  const name = user.firstName;
  const cards = [
    { on: garder, set: setGarder, img: gouacheGarde, title: t("arrival.p4.garder_title"), text: t("arrival.p4.garder_text"), hidden: user.role === "both" },
    { on: aide, set: setAide, img: gouacheEntraide, title: t("arrival.p4.aide_title"), text: t("arrival.p4.aide_text"), hidden: false },
  ];

  return (
    <ArrivalShell header={t("arrival.p4.header")}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.p4.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.p4.title", { name }) : t("arrival.p4.title_noname")}</h1>
        <p className="text-foreground/80">{t("arrival.p4.text")}</p>
      </div>
      <div className="space-y-3">
        {cards.filter((c) => !c.hidden).map((c) => (
          <button key={c.title} type="button" aria-pressed={c.on} onClick={() => c.set(!c.on)}
            className="arrival-card flex w-full items-center gap-4 p-4 text-left">
            <img src={c.img} alt="" aria-hidden="true" className="illustration-blend h-16 w-16 shrink-0 object-contain" />
            <span>
              <span className="block font-semibold">{c.title}</span>
              <span className="block text-sm text-muted-foreground">{c.text}</span>
            </span>
          </button>
        ))}
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" disabled={(!garder && !aide) || saving} onClick={go}>{t("arrival.continue")}</button>
      <p className="text-center"><Link to={sitPath} className="arrival-link text-sm">{t("arrival.p4.later")}</Link></p>
    </ArrivalShell>
  );
};

export default ArriveeAussi;
