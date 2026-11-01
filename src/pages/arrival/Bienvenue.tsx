/**
 * C4, Bienvenue (parcours d'arrivée v2). Montré une seule fois :
 * profiles.arrival_welcome_seen_at est écrit au clic sur le bouton.
 *
 * v4 du 01/11/2026 (maquette Claude Design « Bienvenue et annonce en ligne ») :
 * confirmation avec le prénom, lettre des fondateurs, aquarelle d'accueil,
 * trois univers (gardes, entraide, associations et projets participatifs) avec
 * le point de départ de la personne en tête, ligne « Ensuite » selon l'intention,
 * bouton collé en bas de l'écran sur téléphone, lettre et aquarelle côte à côte
 * sur ordinateur.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyProfile, patchMyProfileCache } from "@/lib/myProfile";
import { supabase } from "@/integrations/supabase/client";
import { afterWelcome, arrivalIntentFor, safeNext, welcomeUsesOrder, type WelcomeUse } from "@/lib/arrival";
import { Eyebrow, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const accueil880 = new URL("../../assets/aquarelles/accueil-rencontre-880.webp", import.meta.url).href;
const accueil440 = new URL("../../assets/aquarelles/accueil-rencontre-440.webp", import.meta.url).href;
const universGardes = new URL("../../assets/aquarelles/univers-gardes-320.webp", import.meta.url).href;
const universEntraide = new URL("../../assets/aquarelles/univers-entraide-320.webp", import.meta.url).href;
const universEnsemble = new URL("../../assets/aquarelles/univers-ensemble-320.webp", import.meta.url).href;
const jeremie = new URL("../../assets/auteur-jeremie.jpg", import.meta.url).href;
const elisa = new URL("../../assets/auteur-elisa.jpg", import.meta.url).href;

const USE_IMG: Record<WelcomeUse, string> = { gardes: universGardes, entraide: universEntraide, projets: universEnsemble };
export const SIGNUP_INTENT_KEY = "guardiens_signup_intent";

const Bienvenue = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [firstName, setFirstName] = useState("");

  let entraideIntent = false;
  try { entraideIntent = localStorage.getItem(SIGNUP_INTENT_KEY) === "entraide"; } catch { /* rien */ }
  const entraideFirst = entraideIntent || /^\/(projets|petites-missions)/.test(next);
  const intent = user ? arrivalIntentFor(user.role, entraideIntent) : null;

  // Une seule fois par compte : déjà vu, on file à la destination prévue.
  const [alreadySeen, setAlreadySeen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyProfile(user.id, { fresh: true }).then(({ data }) => {
      if (cancelled) return;
      const p = data as { arrival_welcome_seen_at?: string | null; first_name?: string | null } | null;
      setFirstName((p?.first_name ?? "").trim());
      setAlreadySeen(!!p?.arrival_welcome_seen_at);
    }).catch(() => { if (!cancelled) setAlreadySeen(false); });
    return () => { cancelled = true; };
  }, [user]);
  useEffect(() => {
    if (alreadySeen) navigate(next, { replace: true });
  }, [alreadySeen, next, navigate]);
  useArrivalViewed("C4", !!user && alreadySeen === false);

  const go = async () => {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    const patch = { arrival_welcome_seen_at: new Date().toISOString(), arrival_intent: intent };
    const { error } = await supabase.from("profiles").update(patch as any).eq("id", user.id);
    if (error) { setSaving(false); setFailed(true); return; }
    // Lot 2b : cache my-profile à jour, sinon le garde lirait l'ancien profil 5 min.
    patchMyProfileCache(user.id, patch);
    trackArrival("completed", "C4");
    try { localStorage.removeItem(SIGNUP_INTENT_KEY); } catch { /* rien */ }
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(afterWelcome(intent, next), { replace: true });
  };

  if (!user || alreadySeen !== false) return null;

  const uses = welcomeUsesOrder(entraideFirst);
  const nextLine = intent === "entraide" ? t("arrival.c4.next_entraide")
    : intent === "sitter" ? t("arrival.c4.next_sitter")
    : t("arrival.c4.next_owner");

  return (
    <main className="arrival-root min-h-screen min-w-0">
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="mx-auto w-full max-w-md px-[22px] pb-32 pt-[22px] lg:grid lg:max-w-[1120px] lg:grid-cols-[minmax(0,620px)_420px] lg:items-start lg:justify-between lg:gap-[60px] lg:pb-[52px] lg:pt-10">
        <div className="min-w-0">
          <p role="status" className="arrival-welcome-confirm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            {firstName ? t("arrival.c4.confirmed_name", { name: firstName }) : t("arrival.c4.confirmed")}
          </p>

          <img
            src={accueil440}
            srcSet={`${accueil440} 440w, ${accueil880} 880w`}
            sizes="168px"
            alt={t("arrival.c4.hero_alt")}
            width={440}
            height={583}
            className="mx-auto mt-[14px] block h-[200px] w-auto lg:hidden"
          />

          <div className="mt-[14px] flex items-center gap-[22px] lg:mt-[34px]">
            <div className="flex -space-x-4">
              <img src={jeremie} alt="Jérémie" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-[3px] ring-[var(--arrival-bg)]" />
              <img src={elisa} alt="Elisa" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-[3px] ring-[var(--arrival-bg)]" />
            </div>
            <span className="hidden lg:inline-flex"><Eyebrow>{t("arrival.c4.eyebrow")}</Eyebrow></span>
          </div>
          <div className="mt-[14px] lg:hidden"><Eyebrow>{t("arrival.c4.eyebrow")}</Eyebrow></div>

          <h1 className="mt-2 text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] lg:text-5xl">{t("arrival.c4.title")}</h1>
          <p className="arrival-title mt-[14px] text-lg italic leading-relaxed lg:text-xl">{t("arrival.c4.lead")}</p>
          <p className="mt-[14px] leading-relaxed text-foreground/80 lg:text-[17px]">{t("arrival.c4.text")}</p>
          <p className="mt-[14px]">
            <span className="arrival-title text-2xl italic text-[var(--arrival-green)] lg:text-[28px]">{t("arrival.c4.signature")}</span>
            <span className="ml-2 text-[13px] text-muted-foreground">{t("arrival.c4.signature_role")}</span>
          </p>

          <section aria-labelledby="c4-uses" className="mt-[52px] lg:mt-[34px]">
            <h2 id="c4-uses" className="text-sm font-semibold text-muted-foreground" style={{ fontFamily: "inherit" }}>{t("arrival.c4.uses_title")}</h2>
            <ul className="mt-2 lg:grid lg:grid-cols-3 lg:gap-[22px]">
              {uses.map((u, i) => (
                <li key={u} className="flex items-center gap-[14px] border-b border-border py-[14px] last:border-b-0 lg:flex-col lg:items-start lg:gap-2 lg:border-b-0 lg:py-0">
                  <img src={USE_IMG[u]} alt="" aria-hidden="true" width={112} height={96} className="h-24 w-28 shrink-0 object-contain lg:h-[120px] lg:w-[150px] lg:object-left-bottom" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold lg:text-base">
                      {t(`arrival.c4.${u}_title`)}
                      {i === 0 && <span className="arrival-start-tag">{t("arrival.c4.start_tag")}</span>}
                    </p>
                    <p className="mt-1 text-[15px] leading-snug text-muted-foreground lg:text-sm">{t(`arrival.c4.${u}_text`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-[34px] flex items-start gap-2 text-[15px] leading-normal text-foreground/80 lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--arrival-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            <span>{nextLine}</span>
          </p>

          <SaveError show={failed} />

          <div className="arrival-welcome-cta lg:mt-[34px] lg:flex lg:items-center lg:gap-[22px]">
            <button type="button" className="arrival-primary lg:w-auto lg:px-[34px]" onClick={go} disabled={saving}>
              <span className="inline-flex items-center justify-center gap-2">
                {t("arrival.c4.cta")}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </span>
            </button>
            <p className="hidden max-w-[260px] text-sm leading-snug text-foreground/80 lg:block">{nextLine}</p>
          </div>
        </div>

        <img
          src={accueil880}
          srcSet={`${accueil440} 440w, ${accueil880} 880w`}
          sizes="420px"
          alt=""
          aria-hidden="true"
          width={880}
          height={1167}
          className="mt-[70px] hidden h-auto w-[420px] lg:block"
        />
      </div>
    </main>
  );
};

export default Bienvenue;
