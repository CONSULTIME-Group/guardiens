/**
 * G4, Savoir-faire (lot 2, facultatif). Reprend la liste de savoir-faire
 * existante (profiles.competences, catégories dérivées dans skill_categories)
 * et la phrase libre profiles.helps_with. Un choix pose available_for_help.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_CATEGORIES, deriveCategoriesFromCompetences } from "@/lib/skills/categories";
import { afterG4, readCarry } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, MultiChoice, SaveError, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const spotJardin = new URL("../../assets/missions/spot-jardin-160.webp", import.meta.url).href;

/** Écritures de G4 : rien n'est écrit si rien n'est renseigné. */
export function buildG4Writes(competences: string[], helpsWith: string): Record<string, unknown> | null {
  const row: Record<string, unknown> = {};
  if (competences.length) {
    row.competences = competences;
    row.skill_categories = deriveCategoriesFromCompetences(competences);
    row.available_for_help = true;
  }
  if (helpsWith.trim()) row.helps_with = helpsWith.trim();
  return Object.keys(row).length ? row : null;
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyProfile(user.id, { fresh: true }).then(({ data }) => {
      if (cancelled) return;
      const p = (data ?? {}) as { competences?: string[] | null; helps_with?: string | null };
      setCompetences(Array.isArray(p.competences) ? p.competences : []);
      setHelpsWith(p.helps_with || "");
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  useArrivalViewed("G4", !loading);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    const row = buildG4Writes(competences, helpsWith);
    if (row) {
      const { error } = await supabase.from("profiles").update(row as any).eq("id", user.id);
      if (error) { setSaving(false); setFailed(true); return; }
    }
    trackArrival("completed", "G4");
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(nextUrl);
  };

  if (!user || loading) return null;
  const sitter = carry.flow !== "owner";

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
        <Textarea id="g4-free" className="arrival-field" rows={3} maxLength={280} value={helpsWith} onChange={(e) => setHelpsWith(e.target.value)} />
        <p className="text-sm text-muted-foreground">{t("arrival.g4.free_help")}</p>
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={saving}>{t("arrival.continue")}</button>
      <p className="text-center"><button type="button" className="arrival-link text-sm" onClick={() => navigate(nextUrl)}>{t("arrival.g4.later")}</button></p>
    </ArrivalShell>
  );
};

export default ArriveeSavoirFaire;
