import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StepIdentity from "@/components/profile/StepIdentity";
import StepSitterProfile from "@/components/profile/StepSitterProfile";
import StepExperience from "@/components/profile/StepExperience";
import StepMobility from "@/components/profile/StepMobility";
import StepPreferences from "@/components/profile/StepPreferences";
import StepSkills from "@/components/profile/StepSkills";
import SitterGallery from "@/components/profile/SitterGallery";
import ExternalExperiences from "@/components/profile/ExternalExperiences";
import ProfileSidebar, { type SidebarSection } from "@/components/profile/ProfileSidebar";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ScoreBreakdown, { type ScoreCriterion } from "@/components/profile/ScoreBreakdown";

import { useSitterProfile, type SitterProfileData } from "@/hooks/useSitterProfile";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import FillSavoirFaireBanner from "@/components/profile/FillSavoirFaireBanner";

const SECTIONS_BASE: Array<{ id: string; num: number; optional?: boolean }> = [
  { id: "identity", num: 1 },
  { id: "sitter", num: 2 },
  { id: "experience", num: 3 },
  { id: "mobility", num: 4 },
  { id: "gallery", num: 5, optional: true },
  { id: "experiences", num: 6, optional: true },
  { id: "skills", num: 7 },
];

/**
 * Critère de score étendu : inclut la section où l'utilisateur peut le compléter.
 * Source UNIQUE de vérité, la jauge %, les sections « Complété ✓ » et les labels
 * « → champ manquant » dérivent tous de la même liste.
 */
type ScoredCriterion = ScoreCriterion & { section: string; kind: "essential" | "bonus" };

function sectionComplete(sectionId: string, criteria: ScoredCriterion[]): boolean {
  const essentialsForSection = criteria.filter(c => c.section === sectionId && c.kind === "essential");
  if (essentialsForSection.length === 0) return false;
  return essentialsForSection.every(c => c.ok);
}

function missingLabelsFor(sectionId: string, criteria: ScoredCriterion[]): string[] {
  return criteria.filter(c => c.section === sectionId && !c.ok).map(c => c.label);
}

type ProfileDraft<T> = {
  updatedAt: string;
  values: Partial<T>;
};

const SECTION_PARAM_MAP: Record<string, string> = {
  identite: "identity",
  profil: "sitter",
  experience: "experience",
  competences: "skills",
  mobilite: "mobility",
  galerie: "gallery",
};

const SitterProfile = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(`profile_page.${k}`, opts) as string;
  const SECTIONS_META = useMemo(
    () => SECTIONS_BASE.map(s => ({
      ...s,
      label: tp(`sitter_sections.${s.id}.label`),
      subtitle: tp(`sitter_sections.${s.id}.subtitle`),
    })),
    [t]
  );
  const [searchParams] = useSearchParams();
  const {
    data, pastAnimals, loading, saving, completion, missingFields, lastSyncedAt,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
  } = useSitterProfile();

  const [localData, setLocalData] = useState<Partial<SitterProfileData>>({});
  const [activeSection, setActiveSection] = useState("identity");
  const [isFounder, setIsFounder] = useState(false);
  const [hasGalleryPhoto, setHasGalleryPhoto] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const draftKey = user ? `guardiens_sitter_profile_draft_${user.id}` : null;
  const draftHydratedRef = useRef(false);
  const lastAppliedFocusRef = useRef<string | null>(null);
  const lastAppliedSectionRef = useRef<string | null>(null);

  // Handle focus=postal_code and section= query params.
  // Réagit aussi aux changements d'URL (back/forward, ouverture en nouvel
  // onglet avec un section= différent) via comparaison de valeur, et non un
  // simple verrou booléen.
  useEffect(() => {
    if (loading) return;
    const focus = searchParams.get("focus");
    const section = searchParams.get("section");

    if (focus === "postal_code" && lastAppliedFocusRef.current !== focus) {
      lastAppliedFocusRef.current = focus;
      setActiveSection("identity");
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>('[name="postal_code"], [data-field="postal_code"]');
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
          el.classList.add("ring-2", "ring-primary");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 3000);
        }
      }, 500);
    } else if (section && SECTION_PARAM_MAP[section] && lastAppliedSectionRef.current !== section) {
      lastAppliedSectionRef.current = section;
      const mapped = SECTION_PARAM_MAP[section];
      setActiveSection(mapped);
      setTimeout(() => {
        const contentEl = document.querySelector(".bg-card.rounded-xl");
        contentEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }

    // Reset des refs si le param disparaît, pour réautoriser une future application.
    if (!focus) lastAppliedFocusRef.current = null;
    if (!section) lastAppliedSectionRef.current = null;
  }, [loading, searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_founder, created_at").eq("id", user.id).single().then(({ data: p }) => {
      if (p) {
        const created = p.created_at ? new Date(p.created_at) : new Date();
        setIsFounder(p.is_founder || created < new Date("2026-07-13T00:00:00Z"));
      }
    });
    supabase.from("sitter_gallery").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => {
      setHasGalleryPhoto((count ?? 0) > 0);
    });
  }, [user]);

  useEffect(() => {
    if (!draftKey || loading || draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    const rawDraft = localStorage.getItem(draftKey);
    if (!rawDraft) return;

    try {
      const parsedDraft = JSON.parse(rawDraft) as ProfileDraft<SitterProfileData>;
      if (!parsedDraft || typeof parsedDraft !== "object" || !("values" in parsedDraft) || !("updatedAt" in parsedDraft)) {
        localStorage.removeItem(draftKey);
        return;
      }

      if (lastSyncedAt && new Date(parsedDraft.updatedAt).getTime() <= new Date(lastSyncedAt).getTime()) {
        localStorage.removeItem(draftKey);
        return;
      }

      if (Object.keys(parsedDraft.values).length > 0) {
        setLocalData(parsedDraft.values);
        setDirty(true);
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, lastSyncedAt, loading]);

  useEffect(() => {
    if (!draftKey) return;
    if (Object.keys(localData).length > 0) {
      const draft: ProfileDraft<SitterProfileData> = {
        values: localData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, localData]);

  useEffect(() => {
    if (Object.keys(localData).length === 0) {
      setDirty(false);
    }
  }, [localData]);

  const mergedData = { ...data, ...localData } as SitterProfileData;

  const handleChange = useCallback((partial: Partial<SitterProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
    setDirty(true);
    setSaved(false);
  }, []);

  const motivationLength = (mergedData.motivation || "").length;
  // Block save only if user is editing motivation specifically and it's < 50
  const motivationBeingEdited = "motivation" in localData;
  const motivationBlocks = motivationBeingEdited && motivationLength > 0 && motivationLength < 50;
  const canSave = !saving && dirty && !motivationBlocks;

  const handleSave = useCallback(async () => {
    if (Object.keys(localData).length === 0) return;

    // Snapshot AVANT save : la section Mobilité était-elle déjà complète ?
    // (si oui, on ne re-toaste pas inutilement à chaque clic)
    const radiusBefore = data.geographic_radius ?? 0;
    const mobilityWasComplete = radiusBefore > 0;

    const success = await saveStep(localData);
    if (!success) return;

    // Track cp_recovered event when postal_code was saved via email relance
    if (
      "postal_code" in localData &&
      localData.postal_code &&
      searchParams.get("focus") === "postal_code" &&
      user
    ) {
      supabase.from("analytics_events").insert({
        user_id: user.id,
        event_type: "cp_recovered",
        source: "email_relance",
      }).then(() => {});
    }

    // Toast de confirmation spécifique à l'étape Mobilité (étape 4) :
    // déclenché uniquement si la section devient complète suite à ce save.
    if (activeSection === "mobility") {
      const merged = { ...data, ...localData } as SitterProfileData;
      const mobilityNowComplete = (merged.geographic_radius ?? 0) > 0;
      if (mobilityNowComplete && !mobilityWasComplete) {
        toast({
          title: tp("mobility_toast_title"),
          description: tp("mobility_toast_desc"),
        });
      }
    }

    setLocalData({});
    setDirty(false);
    setSaved(true);
    if (draftKey) localStorage.removeItem(draftKey);
  }, [activeSection, data, draftKey, localData, saveStep, searchParams, user]);

  const handleUploadAvatar = useCallback(async (file: File) => {
    const url = await uploadAvatar(file);
    if (!url) return null;

    setLocalData(prev => {
      if (!("avatar_url" in prev)) return prev;
      const next = { ...prev };
      delete next.avatar_url;
      return next;
    });
    setSaved(true);
    return url;
  }, [uploadAvatar]);

  // Source UNIQUE pour la jauge ET la sidebar : un seul set de critères pondérés.
  // Chaque critère est rattaché à la section où l'utilisateur peut le compléter.
  // Total = 100 par construction (essentiels 80 + bonus 20). Réplique du SQL.
  const scoredCriteria: ScoredCriterion[] = [
    { section: "identity", kind: "essential", label: tp("criteria.name_postal"), points: 15,
      ok: !!(mergedData.first_name && mergedData.postal_code) },
    { section: "identity", kind: "essential", label: tp("criteria.avatar"), points: 20,
      ok: !!mergedData.avatar_url, hint: tp("hints.add_avatar_identity") },
    { section: "skills", kind: "essential", label: tp("criteria.skill"), points: 15,
      ok: (mergedData.competences?.length ?? 0) > 0, hint: tp("hints.tab_skills") },
    { section: "sitter", kind: "essential", label: tp("criteria.lifestyle"), points: 15,
      ok: (mergedData.lifestyle?.length ?? 0) > 0, hint: tp("hints.tab_sitter") },
    { section: "mobility", kind: "essential", label: tp("criteria.radius"), points: 15,
      ok: (mergedData.geographic_radius ?? 0) > 0, hint: tp("hints.tab_mobility") },
    { section: "identity", kind: "bonus", label: tp("criteria.bio_50"), points: 10,
      ok: (mergedData.bio?.length ?? 0) >= 50, hint: tp("hints.chars_50", { count: mergedData.bio?.length ?? 0 }) },
    { section: "gallery", kind: "bonus", label: tp("criteria.sitter_gallery_one"), points: 5,
      ok: hasGalleryPhoto, hint: tp("hints.tab_gallery") },
    { section: "identity", kind: "bonus", label: tp("criteria.identity_verified"), points: 5,
      ok: !!user?.identityVerified, hint: tp("hints.settings_verif") },
  ];

  const sitterEssentials = scoredCriteria.filter(c => c.kind === "essential");
  const sitterBonuses = scoredCriteria.filter(c => c.kind === "bonus");
  const liveScore = Math.min(100, scoredCriteria.reduce((s, c) => s + (c.ok ? c.points : 0), 0));

  const sidebarSections: SidebarSection[] = SECTIONS_META.map(s => {
    const labels = missingLabelsFor(s.id, scoredCriteria);
    return {
      ...s,
      complete: s.optional ? false : sectionComplete(s.id, scoredCriteria),
      missingCount: s.optional ? 0 : labels.length,
      missingLabels: s.optional ? [] : labels,
    };
  });

  // Avertit l'utilisateur s'il quitte la page avec des modifications non sauvegardées.
  useUnsavedChanges(dirty);

  // Section suivante (pour le bouton « Suivant »).
  const currentIndex = SECTIONS_META.findIndex(s => s.id === activeSection);
  const nextSection = SECTIONS_META[currentIndex + 1];

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title={tp("sitter_meta_title")} description={tp("sitter_meta_description")} noindex />

      <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
          {/* Left sidebar */}
          <ProfileSidebar
            firstName={mergedData.first_name}
            city={mergedData.city}
            avatarUrl={mergedData.avatar_url || user?.avatarUrl}
            completion={liveScore}
            sections={sidebarSections}
            activeSection={activeSection}
            dirtySection={dirty ? activeSection : undefined}
            onSectionClick={(id) => {
              setActiveSection(id);
              // Scroll vers le contenu correspondant, utile sur mobile et quand
              // la sidebar est sticky : l'utilisateur voit immédiatement le
              // bloc de formulaire visé (ex: Mobilité & Rayon).
              requestAnimationFrame(() => {
                const el = document.getElementById("profile-section-content");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
            publicProfileUrl={user ? `/gardiens/${user.id}` : "#"}
            role="sitter"
            isFounder={isFounder}
            scoreBreakdown={
              <ScoreBreakdown
                role="sitter"
                total={liveScore}
                savedTotal={completion}
                isDirty={dirty}
                onReset={() => {
                  setLocalData({});
                  setDirty(false);
                  setSaved(false);
                  if (draftKey) localStorage.removeItem(draftKey);
                }}
                essentials={sitterEssentials}
                bonuses={sitterBonuses}
              />
            }
          />

          {/* Right content */}
          <div className="flex-1 min-w-0 pb-40 md:pb-32">
            <FillSavoirFaireBanner />
            <div id="profile-section-content" className="bg-card rounded-2xl border border-border p-5 md:p-8 scroll-mt-24">
              {activeSection === "identity" && (
                <StepIdentity data={mergedData} onChange={handleChange} onUploadAvatar={handleUploadAvatar} />
              )}
              {activeSection === "sitter" && (
                <StepSitterProfile data={mergedData} onChange={handleChange} />
              )}
              {activeSection === "experience" && (
                <StepExperience
                  data={mergedData}
                  pastAnimals={pastAnimals}
                  onChange={handleChange}
                  onAddAnimal={addPastAnimal}
                  onRemoveAnimal={removePastAnimal}
                />
              )}
              {activeSection === "mobility" && (
                <StepMobility data={mergedData} onChange={handleChange} />
              )}
              {activeSection === "gallery" && <SitterGallery />}
              {activeSection === "experiences" && <ExternalExperiences />}
              {activeSection === "skills" && (
                <StepSkills
                  skillCategories={mergedData.skill_categories || []}
                  availableForHelp={mergedData.available_for_help || false}
                  competences={mergedData.competences || []}
                  onChange={(partial) => handleChange(partial as any)}
                />
              )}

              {/* Bouton « Suivant », auto-sauvegarde puis avance. */}
              {nextSection && (
                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    disabled={saving || (dirty && !canSave)}
                    onClick={async () => {
                      if (dirty && canSave) await handleSave();
                      setActiveSection(nextSection.id);
                      requestAnimationFrame(() => {
                        document.getElementById("profile-section-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                  >
                    {tp("next", { label: nextSection.label })}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <TooltipProvider delayDuration={200}>
        <div className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4 md:py-4 md:px-6 flex items-center justify-between gap-3 bottom-16 md:bottom-0 before:pointer-events-none before:content-[''] before:absolute before:left-0 before:right-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-background before:to-transparent">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saved && !dirty ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {tp("saved")}
              </span>
            ) : dirty ? (
              tp("dirty")
            ) : null}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="rounded-full px-6 gap-2"
                  size="lg"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {tp("saving")}</>
                  ) : (
                    <><Check className="h-4 w-4" /> {tp("save")}</>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!canSave && !saving && (
              <TooltipContent side="top">
                {motivationBlocks
                  ? tp("tooltip_motivation", { count: motivationLength })
                  : !dirty
                    ? tp("tooltip_nothing")
                    : tp("tooltip_blocked")}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default SitterProfile;
