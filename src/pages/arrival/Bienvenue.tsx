/**
 * C4, Bienvenue (lot 1, parcours d'arrivée v2). Montré une seule fois :
 * profiles.arrival_welcome_seen_at est écrit au clic sur le bouton.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { safeNext, welcomeUsesOrder, type WelcomeUse } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import gouacheWelcome from "@/assets/onboarding/gouache-welcome.png";
import maisonSeule from "@/assets/landing/maison-seule-450.webp";
import gouacheEntraide from "@/assets/onboarding/gouache-entraide.png";
import spotBricolage from "@/assets/missions/spot-bricolage-160.webp";
import jeremie from "@/assets/auteur-jeremie.jpg";
import elisa from "@/assets/auteur-elisa.jpg";

const USE_IMG: Record<WelcomeUse, string> = { gardes: maisonSeule, entraide: gouacheEntraide, projets: spotBricolage };
export const SIGNUP_INTENT_KEY = "guardiens_signup_intent";

const Bienvenue = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  let entraideFirst = /^\/(projets|petites-missions)/.test(next);
  try { entraideFirst = entraideFirst || localStorage.getItem(SIGNUP_INTENT_KEY) === "entraide"; } catch { /* rien */ }

  // Une seule fois par compte : déjà vu, on file à la destination prévue.
  const alreadySeen = !!user?.arrivalWelcomeSeenAt;
  useEffect(() => {
    if (alreadySeen) navigate(next, { replace: true });
  }, [alreadySeen, next, navigate]);
  useArrivalViewed("C4", !!user && !alreadySeen);

  const go = async () => {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    const { error } = await supabase.from("profiles").update({ arrival_welcome_seen_at: new Date().toISOString() } as any).eq("id", user.id);
    if (error) { setSaving(false); setFailed(true); return; }
    trackArrival("completed", "C4");
    try { localStorage.removeItem(SIGNUP_INTENT_KEY); } catch { /* rien */ }
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(user.role === "owner" ? `/arrivee/vous?next=${encodeURIComponent(next)}` : next, { replace: true });
  };

  if (!user || alreadySeen) return null;

  return (
    <ArrivalShell header={t("arrival.c4.header")}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={gouacheWelcome} size={180} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.c4.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold leading-tight">{t("arrival.c4.title")}</h1>
        <p className="italic text-foreground/80">{t("arrival.c4.lead")}</p>
        <p className="text-foreground/80">{t("arrival.c4.text")}</p>
      </div>
      <ul className="space-y-3">
        {welcomeUsesOrder(entraideFirst).map((u) => (
          <li key={u} className="flex items-center gap-4">
            <img src={USE_IMG[u]} alt="" aria-hidden="true" className="arrival-gouache h-16 w-16 shrink-0 object-contain" />
            <div>
              <p className="font-semibold">{t(`arrival.c4.${u}_title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`arrival.c4.${u}_text`)}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3">
          <img src={jeremie} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-background" />
          <img src={elisa} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-background" />
        </div>
        <div>
          <p className="font-semibold">{t("arrival.c4.signature")}</p>
          <p className="text-sm text-muted-foreground">{t("arrival.c4.signature_role")}</p>
        </div>
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={go} disabled={saving}>{t("arrival.c4.cta")}</button>
    </ArrivalShell>
  );
};

export default Bienvenue;
