/**
 * G4, Savoir-faire (lot 2, facultatif ; corrigé au lot E1 le 11/10/2026).
 * Les savoir-faire vivent dans le profil du rôle (sitter_profiles et/ou
 * owner_profiles.competences, 10 au plus), les catégories dérivées et la
 * disponibilité dans profiles, la phrase libre dans profiles.helps_with
 * (200 caractères au plus). Un savoir-faire ou une phrase rend disponible
 * pour l'entraide.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyOwnerProfile, fetchMyProfile, fetchMySitterProfile, invalidateMyProfile } from "@/lib/myProfile";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_CATEGORIES, deriveCategoriesFromCompetences } from "@/lib/skills/categories";
import { afterG4, readCarry } from "@/lib/arrival";
import { hasMoneyMention } from "@/lib/missionContentGuards";
import { ArrivalShell, Eyebrow, Gouache, MultiChoice, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const spotJardin = new URL("../../assets/missions/spot-jardin-160.webp", import.meta.url).href;

/** Plafonds en base : max_competences (10) et profiles_helps_with_len (200). */
export const G4_MAX_COMPETENCES = 10;
export const G4_MAX_HELPS_WITH = 200;

type Row = Record<string, unknown>;
export type G4Writes = { profile: Row; sitter: Row | null; owner: Row | null };

/** Écritures de G4, pures : rien n'est écrit si rien n'est renseigné. */
export function buildG4Writes(i: { userId: string; role: string | null; competences: string[]; helpsWith: string }): G4Writes | null {
  const competences = Array.from(new Set(i.competences.map((c) => c.trim()).filter(Boolean))).slice(0, G4_MAX_COMPETENCES);
  const phrase = i.helpsWith.trim().slice(0, G4_MAX_HELPS_WITH);
  if (!competences.length && !phrase) return null;
  const profile: Row = { available_for_help: true };
  let sitter: Row | null = null;
  let owner: Row | null = null;
  if (competences.length) {
    profile.skill_categories = deriveCategoriesFromCompetences(competences);
    if (i.role !== "owner") sitter = { user_id: i.userId, competences };
    if (i.role === "owner" || i.role === "both") owner = { user_id: i.userId, competences, competences_disponible: true };
  }
  if (phrase) profile.helps_with = phrase;
  return { profile, sitter, owner };
}

const ArriveeSavoirFaire = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const carry = readCarry(params);
  const nextUrl = afterG4(carry);
  const [loading, setLoading] = useState(true);
  const [competences, setCompetences] = useState<string[]>([]);
  const [helpsWith, setHelpsWith] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const role: string = user?.role ?? (carry.flow === "owner" ? "owner" : "sitter");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const roleTable = role === "owner" ? fetchMyOwnerProfile(user.id, { fresh: true }) : fetchMySitterProfile(user.id, { fresh: true });
    Promise.all([fetchMyProfile(user.id, { fresh: true }), roleTable]).then(([me, mine]) => {
      if (cancelled) return;
      const p = (me.data ?? {}) as { helps_with?: string | null };
      const r = (mine.data ?? {}) as { competences?: string[] | null };
      setCompetences(Array.isArray(r.competences) ? r.competences : []);
      setHelpsWith(p.helps_with || "");
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, role]);
  useArrivalViewed("G4", !loading);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    if (helpsWith.trim() && hasMoneyMention(helpsWith)) { setSaving(false); setFailed(true); return; }
    const writes = buildG4Writes({ userId: user.id, role, competences, helpsWith });
    if (writes) {
      // Profil du rôle d'abord : la disponibilité n'est posée qu'une fois les savoir-faire enregistrés.
      if (writes.sitter) {
        const { error } = await supabase.from("sitter_profiles").upsert(writes.sitter as any, { onConflict: "user_id" });
        if (error) { setSaving(false); setFailed(true); return; }
      }
      if (writes.owner) {
        const { error } = await supabase.from("owner_profiles").upsert(writes.owner as any, { onConflict: "user_id" });
        if (error) { setSaving(false); setFailed(true); return; }
      }
      const { error } = await supabase.from("profiles").update(writes.profile as any).eq("id", user.id);
      if (error) { setSaving(false); setFailed(true); return; }
      invalidateMyProfile(user.id);
      invalidateMyProfile(user.id, "my-sitter-profile");
      invalidateMyProfile(user.id, "my-owner-profile");
    }
    trackArrival("completed", "G4");
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(nextUrl);
  };

  if (!user || loading) return null;
  const sitter = carry.flow === "sitter";

  return (
    <ArrivalShell header={t("arrival.g4.header")} sitterStep={sitter ? { current: "skills" } : undefined}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={spotJardin} size={150} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.g4.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t("arrival.g4.title")}</h1>
        <p className="text-foreground/80">{t("arrival.g4.text")}</p>
      </div>
      {SKILL_CATEGORIES.map((cat) => {
        const own = competences.filter((c) => !SKILL_CATEGORIES.some((k) => k.suggestions.includes(c)));
        const list = cat.key === "competences" ? [...cat.suggestions, ...own] : cat.suggestions;
        return (
          <MultiChoice key={cat.key} label={t(`arrival.g4.groups.${cat.key}`)} value={competences.filter((c) => list.includes(c))}
            options={list.map((s) => ({ value: s, label: s }))}
            onChange={(v) => setCompetences([...competences.filter((c) => !list.includes(c)), ...v])} />
        );
      })}
      <div className="space-y-2">
        <Label htmlFor="g4-free">{t("arrival.g4.free_label")}</Label>
        <Textarea id="g4-free" className="arrival-field" rows={3} maxLength={G4_MAX_HELPS_WITH} value={helpsWith} onChange={(e) => setHelpsWith(e.target.value)} />
        <p className="text-sm text-muted-foreground">{t("arrival.g4.free_help")}</p>
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={saving}>{t("arrival.continue")}</button>
      <p className="text-center"><button type="button" className="arrival-link text-sm" onClick={() => navigate(nextUrl)}>{t("arrival.g4.later")}</button></p>
    </ArrivalShell>
  );
};

export default ArriveeSavoirFaire;
