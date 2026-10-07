/**
 * G3, Vos affinités, vous connaître (lot 2) : rythme de vie, langues,
 * centres d'intérêt. Écrit dans sitter_profiles par buildAffinityWrites.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMySitterProfile } from "@/lib/myProfile";
import { buildAffinityWrites } from "@/lib/affinityOnboardingWrites";
import { INTEREST_OPTIONS, LANGUAGE_OPTIONS, LIFE_PACE_OPTIONS } from "@/lib/profileMatchingOptions";
import { ARRIVAL_SITTER_LANGUAGES, afterG3, readCarry } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, MultiChoice, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import { initialLanguages } from "./ArriveeAffinites";
const spotBienEtre = new URL("../../assets/missions/spot-bienetre-160.webp", import.meta.url).href;

const VISIBLE_INTERESTS = 8;

export function buildG3Writes(i: { userId: string; role: string | null; pace: string; languages: string[]; interests: string[] }) {
  const role = (i.role as "owner" | "sitter" | "both" | null) ?? null;
  return buildAffinityWrites({
    userId: i.userId, currentRole: role, chosenRole: role ?? "sitter",
    needsPostal: false, postalCode: "", departementCode: null,
    showSitterBlock: true, showOwnerBlock: false,
    animalTypes: [], workDuringSit: "", sitterType: "",
    presenceExpected: "", preferredSitterTypes: [], homeAmbiance: [],
    lifePace: i.pace, interests: i.interests, languages: i.languages,
  }).sitter;
}

const ArriveeVousConnaitre = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const carry = readCarry(params);
  const [loading, setLoading] = useState(true);
  const [pace, setPace] = useState("");
  const [languages, setLanguages] = useState<string[]>(["Français"]);
  const [interests, setInterests] = useState<string[]>([]);
  const [moreLang, setMoreLang] = useState(false);
  const [allInterests, setAllInterests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMySitterProfile(user.id, { fresh: true }).then(({ data }) => {
      if (cancelled) return;
      const sp = (data ?? {}) as Record<string, any>;
      setPace(sp.life_pace || "");
      const langs = initialLanguages(sp.languages);
      setLanguages(langs);
      setMoreLang(langs.some((l: string) => !ARRIVAL_SITTER_LANGUAGES.includes(l)));
      const ints: string[] = Array.isArray(sp.interests) ? sp.interests : [];
      setInterests(ints);
      setAllInterests(ints.some((x) => !INTEREST_OPTIONS.slice(0, VISIBLE_INTERESTS).includes(x)));
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  useArrivalViewed("G3", !loading);

  const valid = !!pace && languages.length > 0;

  const save = async () => {
    if (!user || !valid) return;
    setSaving(true);
    setFailed(false);
    const row = buildG3Writes({ userId: user.id, role: user.role ?? null, pace, languages, interests });
    if (row) {
      const { error } = await supabase.from("sitter_profiles").upsert(row as any, { onConflict: "user_id" });
      if (error) { setSaving(false); setFailed(true); return; }
    }
    trackArrival("completed", "G3");
    navigate(afterG3(carry));
  };

  if (!user || loading) return null;
  const langOptions = (moreLang ? LANGUAGE_OPTIONS : ARRIVAL_SITTER_LANGUAGES).map((l) => ({ value: l, label: l }));
  const interestOptions = (allInterests ? INTEREST_OPTIONS : INTEREST_OPTIONS.slice(0, VISIBLE_INTERESTS)).map((l) => ({ value: l, label: l }));

  return (
    <ArrivalShell header={t("arrival.g3.header")} sitterStep={{ current: "affinities" }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={spotBienEtre} size={150} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.g3.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t("arrival.g3.title")}</h1>
        <p className="text-foreground/80">{t("arrival.g3.text")}</p>
      </div>
      <div className="space-y-2">
        <p id="g3-pace-label" className="text-sm font-medium">{t("arrival.g3.pace")}</p>
        <div role="radiogroup" aria-labelledby="g3-pace-label" className="grid grid-cols-3 gap-2">
          {LIFE_PACE_OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={pace === o.value} className="arrival-card p-3 text-center" onClick={() => setPace(o.value)}>
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{t(`arrival.g3.pace_sub.${o.value}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <MultiChoice label={t("arrival.g3.languages")} value={languages} onChange={setLanguages} options={langOptions} />
        {!moreLang && <button type="button" className="arrival-link text-sm" onClick={() => setMoreLang(true)}>{t("arrival.g3.more_languages")}</button>}
      </div>
      <div className="space-y-2">
        <MultiChoice label={t("arrival.g3.interests")} value={interests} onChange={setInterests} options={interestOptions} />
        {!allInterests && (
          <button type="button" className="arrival-link text-sm" onClick={() => setAllInterests(true)}>{t("arrival.g3.see_all", { count: INTEREST_OPTIONS.length })}</button>
        )}
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={!valid || saving}>{t("arrival.continue")}</button>
      <p className="text-center"><button type="button" className="arrival-link text-sm" onClick={() => navigate(-1)}>{t("arrival.back")}</button></p>
    </ArrivalShell>
  );
};

export default ArriveeVousConnaitre;
