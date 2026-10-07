/**
 * P3, Vos affinités (lot 1). Pré-rempli depuis la base, écrit par
 * buildAffinityWrites : seules les colonnes renseignées partent, chaque
 * erreur est lue (comportement du lot 0).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyOwnerProfile } from "@/lib/myProfile";
import { buildAffinityWrites } from "@/lib/affinityOnboardingWrites";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import { trackEvent } from "@/lib/analytics";
import {
  HOME_AMBIANCE_SCORED_OPTIONS, IDEAL_SITTER_SCORED_OPTIONS, INTEREST_OPTIONS, LANGUAGE_OPTIONS, LIFE_PACE_OPTIONS,
  resolveAmbianceConflicts,
} from "@/lib/profileMatchingOptions";
import { ARRIVAL_MAIN_LANGUAGES, ARRIVAL_PRESENCE_OPTIONS, PERIOD_LABEL } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, MultiChoice, SaveError, SingleChoice, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";

const opts = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

/** Langues initiales : celles de la base, « Français » seulement si vide. */
export const initialLanguages = (fromDb: string[] | null | undefined) => (fromDb && fromDb.length ? fromDb : ["Français"]);

interface SitCard { id: string; title: string; cover: string | null; when: string; city: string }

function sitWhen(s: { start_date: string | null; end_date: string | null }): string {
  if (s.start_date === "2026-12-19") return PERIOD_LABEL.noel;
  const f = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  if (s.start_date && s.end_date) return `du ${f(s.start_date)} au ${f(s.end_date)}`;
  return "dates à préciser";
}

const ArriveeAffinites = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sitId = params.get("sit");
  const redirect = sanitizeRedirect(params.get("redirect"));
  const [loading, setLoading] = useState(true);
  const [sit, setSit] = useState<SitCard | null>(null);
  const [presence, setPresence] = useState("");
  const [ideal, setIdeal] = useState<string[]>([]);
  const [pace, setPace] = useState("");
  const [languages, setLanguages] = useState<string[]>(["Français"]);
  const [ambiance, setAmbiance] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [moreLang, setMoreLang] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: o }, sitRes] = await Promise.all([
        fetchMyOwnerProfile(user.id, { fresh: true }),
        sitId
          ? supabase.from("sits").select("id, title, cover_photo_url, start_date, end_date, city").eq("id", sitId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const op = (o ?? {}) as Record<string, any>;
      setPresence(op.presence_expected || "");
      setIdeal(op.preferred_sitter_types || []);
      setPace(op.life_pace || "");
      const langs = initialLanguages(op.languages);
      setLanguages(langs);
      setMoreLang(langs.some((l: string) => !ARRIVAL_MAIN_LANGUAGES.includes(l)));
      setAmbiance(op.home_ambiance || []);
      setInterests(op.interests || []);
      const s = (sitRes as any).data;
      if (s) setSit({ id: s.id, title: s.title, cover: s.cover_photo_url, when: sitWhen(s), city: s.city || "" });
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sitId]);
  useArrivalViewed("P3", !loading);

  const valid = !!presence && ideal.length > 0 && !!pace && languages.length > 0;

  const save = async () => {
    if (!user || !valid) return;
    setSaving(true);
    setFailed(false);
    const writes = buildAffinityWrites({
      userId: user.id, currentRole: (user.role as any) ?? null, chosenRole: (user.role as any) ?? "owner",
      needsPostal: false, postalCode: "", departementCode: null,
      showSitterBlock: false, showOwnerBlock: true,
      animalTypes: [], workDuringSit: "", sitterType: "",
      presenceExpected: presence, preferredSitterTypes: ideal, homeAmbiance: ambiance,
      lifePace: pace, interests, languages,
    });
    if (writes.owner) {
      const { error } = await supabase.from("owner_profiles").upsert(writes.owner as any, { onConflict: "user_id" });
      if (error) { setSaving(false); setFailed(true); return; }
    }
    void trackEvent("affinity_onboarding_completed", { source: "/arrivee/affinites", metadata: { role: user.role, via: "arrival_v2" } });
    trackArrival("completed", "P3");
    const qs = new URLSearchParams();
    if (sitId) qs.set("sit", sitId);
    if (redirect) qs.set("redirect", redirect);
    navigate(`/arrivee/aussi${qs.toString() ? `?${qs}` : ""}`);
  };

  if (!user || loading) return null;
  const langOptions = moreLang ? LANGUAGE_OPTIONS : ARRIVAL_MAIN_LANGUAGES;

  return (
    <ArrivalShell header={t("arrival.p3.header")} stepBar="affinities">
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      {sit && (
        <div className="flex items-center gap-3 rounded-xl bg-card p-3" data-testid="arrival-published">
          {sit.cover && <img src={sit.cover} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0">
            <p className="font-semibold">{t("arrival.p3.published")}</p>
            <p className="text-sm text-muted-foreground">{[sit.when, sit.city].filter(Boolean).join(" · ")}.</p>
            <Link to={`/sits/${sit.id}`} className="arrival-link text-sm">{t("arrival.p3.see")}</Link>
          </div>
        </div>
      )}
      <div className="space-y-3">
        <Eyebrow>{t("arrival.p3.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t("arrival.p3.title")}</h1>
        <p className="text-foreground/80">{t("arrival.p3.text")}</p>
      </div>
      <SingleChoice id="arrival-presence" label={t("arrival.p3.presence")} value={presence} onChange={setPresence} options={ARRIVAL_PRESENCE_OPTIONS} />
      <MultiChoice label={t("arrival.p3.ideal")} options={opts(IDEAL_SITTER_SCORED_OPTIONS)} value={ideal} onChange={setIdeal} />
      <SingleChoice id="arrival-pace" label={t("arrival.p3.pace")} value={pace} onChange={setPace}
        options={LIFE_PACE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      <div className="space-y-2">
        <MultiChoice label={t("arrival.p3.languages")} options={opts(langOptions)} value={languages} onChange={setLanguages} />
        {!moreLang && (
          <button type="button" className="arrival-link text-sm" onClick={() => setMoreLang(true)}>{t("arrival.p3.more_languages")}</button>
        )}
      </div>
      <MultiChoice label={t("arrival.p3.ambiance")} options={opts(HOME_AMBIANCE_SCORED_OPTIONS)} value={ambiance}
        onChange={(v) => setAmbiance(resolveAmbianceConflicts(v).value)} />
      {showInterests ? (
        <MultiChoice label={t("arrival.p3.interests")} options={opts(INTEREST_OPTIONS)} value={interests} onChange={setInterests} />
      ) : (
        <button type="button" className="arrival-link text-sm" aria-expanded={false} onClick={() => setShowInterests(true)}>{t("arrival.p3.interests")}</button>
      )}
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" disabled={!valid || saving} onClick={save}>{t("arrival.p3.save")}</button>
    </ArrivalShell>
  );
};

export default ArriveeAffinites;
