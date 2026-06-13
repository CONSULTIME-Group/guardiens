import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import OwnerStepIdentity from "@/components/owner-profile/OwnerStepIdentity";
import OwnerStepHousing from "@/components/owner-profile/OwnerStepHousing";
import OwnerStepAnimals from "@/components/owner-profile/OwnerStepAnimals";
import OwnerStepRules from "@/components/owner-profile/OwnerStepRules";
import OwnerStepCommunication from "@/components/owner-profile/OwnerStepCommunication";
import OwnerGallery from "@/components/owner-profile/OwnerGallery";

import OwnerHouseGuideForm from "@/components/owner-profile/OwnerHouseGuideForm";
import OwnerStepSkills from "@/components/owner-profile/OwnerStepSkills";
import ProfileSidebar, { type SidebarSection } from "@/components/profile/ProfileSidebar";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ScoreBreakdown, { type ScoreCriterion } from "@/components/profile/ScoreBreakdown";
import { useOwnerProfile, type OwnerProfileData } from "@/hooks/useOwnerProfile";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS_BASE: Array<{ id: string; num: number; optional?: boolean }> = [
  { id: "identity", num: 1 },
  { id: "housing", num: 2 },
  { id: "animals", num: 3 },
  { id: "rules", num: 4, optional: true },
  { id: "communication", num: 5, optional: true },
  { id: "skills", num: 6 },
  { id: "gallery", num: 7 },
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

const OwnerProfilePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(`profile_page.${k}`, opts) as string;
  const SECTIONS_META = useMemo(
    () => SECTIONS_BASE.map(s => ({
      ...s,
      label: tp(`owner_sections.${s.id}.label`),
      subtitle: tp(`owner_sections.${s.id}.subtitle`),
    })),
    [t]
  );
  const {
    data, pets, loading, saving, completion, missingFields, lastSyncedAt,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
  } = useOwnerProfile();

  const [localData, setLocalData] = useState<Partial<OwnerProfileData>>({});
  const [activeSection, setActiveSection] = useState("identity");
  const [galleryCount, setGalleryCount] = useState(0);

  // Compte les photos dans owner_gallery (source de vérité unique).
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("owner_gallery")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (mounted) setGalleryCount(count || 0);
    };
    fetchCount();
    const handler = () => fetchCount();
    window.addEventListener("owner-gallery:changed", handler);
    return () => { mounted = false; window.removeEventListener("owner-gallery:changed", handler); };
  }, [user]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const draftKey = user ? `guardiens_owner_profile_draft_${user.id}` : null;
  const draftHydratedRef = useRef(false);

  const mergedData = { ...data, ...localData } as OwnerProfileData;

  const handleChange = useCallback((partial: Partial<OwnerProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
    setDirty(true);
    setSaved(false);
  }, []);

  // Permet aux composants enfants (ex. OwnerStepHousing) de demander un changement de section.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setActiveSection(detail);
    };
    window.addEventListener("owner-profile:goto-section", handler);
    return () => window.removeEventListener("owner-profile:goto-section", handler);
  }, []);

  useEffect(() => {
    if (!draftKey || loading || draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    const rawDraft = localStorage.getItem(draftKey);
    if (!rawDraft) return;

    try {
      const parsedDraft = JSON.parse(rawDraft) as ProfileDraft<OwnerProfileData>;
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
      const draft: ProfileDraft<OwnerProfileData> = {
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

  const handleSave = useCallback(async () => {
    if (Object.keys(localData).length === 0) return;
    const success = await saveStep(localData);
    if (!success) return;
    setLocalData({});
    setDirty(false);
    setSaved(true);
    if (draftKey) localStorage.removeItem(draftKey);
  }, [draftKey, localData, saveStep]);

  const handleUploadPhoto = useCallback(async (file: File, bucket: string) => {
    const url = await uploadPhoto(file, bucket);
    if (!url || bucket !== "avatars") return url;

    setLocalData(prev => {
      if (!("avatar_url" in prev)) return prev;
      const next = { ...prev };
      delete next.avatar_url;
      return next;
    });
    setSaved(true);
    return url;
  }, [uploadPhoto]);

  // Source UNIQUE pour la jauge ET la sidebar : un seul set de critères pondérés.
  const scoredCriteria: ScoredCriterion[] = [
    { section: "identity", kind: "essential", label: tp("criteria.name_postal"), points: 10,
      ok: !!(mergedData.first_name && mergedData.postal_code) },
    { section: "identity", kind: "essential", label: tp("criteria.avatar"), points: 15,
      ok: !!mergedData.avatar_url, hint: tp("hints.tab_identity") },
    { section: "animals", kind: "essential", label: tp("criteria.pet"), points: 20,
      ok: pets.length > 0, hint: tp("hints.tab_animals") },
    { section: "housing", kind: "essential", label: tp("criteria.housing_desc"), points: 15,
      ok: (mergedData.description?.length ?? 0) >= 50, hint: tp("hints.chars_50", { count: mergedData.description?.length ?? 0 }) },
    { section: "gallery", kind: "essential", label: tp("criteria.gallery_one"), points: 15,
      ok: galleryCount > 0, hint: tp("hints.tab_gallery") },
    { section: "identity", kind: "bonus", label: tp("criteria.bio_50"), points: 10,
      ok: (mergedData.bio?.length ?? 0) >= 50, hint: tp("hints.chars_50", { count: mergedData.bio?.length ?? 0 }) },
    { section: "skills", kind: "bonus", label: tp("criteria.owner_skill"), points: 10,
      ok: (mergedData.owner_competences?.length ?? 0) > 0, hint: tp("hints.tab_skills") },
    { section: "identity", kind: "bonus", label: tp("criteria.identity_verified"), points: 5,
      ok: !!user?.identityVerified, hint: tp("hints.settings_verif") },
  ];

  const ownerEssentials = scoredCriteria.filter(c => c.kind === "essential");
  const ownerBonuses = scoredCriteria.filter(c => c.kind === "bonus");
  const liveScore = Math.min(100, scoredCriteria.reduce((s, c) => s + (c.ok ? c.points : 0), 0));

  const sidebarSections: SidebarSection[] = SECTIONS_META.map(s => {
    const labels = missingLabelsFor(s.id, scoredCriteria);
    // Sections optionnelles : "complete" si au moins un bonus rempli, sinon neutre.
    const sectionBonuses = scoredCriteria.filter(c => c.section === s.id && c.kind === "bonus");
    const optionalDone = s.optional && sectionBonuses.length > 0 && sectionBonuses.some(c => c.ok);
    return {
      ...s,
      complete: s.optional ? !!optionalDone : sectionComplete(s.id, scoredCriteria),
      missingCount: s.optional ? 0 : labels.filter(l => !ownerBonuses.find(b => b.label === l)).length,
      missingLabels: s.optional ? [] : labels,
    };
  });

  // Avertit l'utilisateur s'il quitte la page avec des modifications non sauvegardées.
  useUnsavedChanges(dirty);

  // Section suivante (pour le bouton « Suivant »), ignore les sections déjà complètes.
  const currentIndex = SECTIONS_META.findIndex(s => s.id === activeSection);
  const nextSection = SECTIONS_META[currentIndex + 1];

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
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
              requestAnimationFrame(() => {
                const el = document.getElementById("profile-section-content");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
            publicProfileUrl={user ? `/gardiens/${user.id}?tab=proprio` : "#"}
            role="owner"
            scoreBreakdown={
              <ScoreBreakdown
                role="owner"
                total={liveScore}
                savedTotal={completion}
                isDirty={dirty}
                onReset={() => {
                  setLocalData({});
                  setDirty(false);
                  setSaved(false);
                  if (draftKey) localStorage.removeItem(draftKey);
                }}
                essentials={ownerEssentials}
                bonuses={ownerBonuses}
              />
            }
          />

          {/* Right content */}
          <div className="flex-1 min-w-0 pb-40 md:pb-32">
            <div id="profile-section-content" className="bg-card rounded-2xl border border-border p-5 md:p-8 scroll-mt-24">
              {activeSection === "identity" && <OwnerStepIdentity data={mergedData} onChange={handleChange} onUploadPhoto={handleUploadPhoto} />}
              {activeSection === "housing" && <OwnerStepHousing data={mergedData} onChange={handleChange} onUploadPhoto={uploadPhoto} />}
              {activeSection === "animals" && <OwnerStepAnimals pets={pets} onAddPet={addPet} onUpdatePet={updatePet} onRemovePet={removePet} />}
              {activeSection === "rules" && <OwnerStepRules data={mergedData} onChange={handleChange} />}
              {activeSection === "communication" && (
                <div className="space-y-8">
                  <OwnerStepCommunication data={mergedData} onChange={handleChange} />
                  <div className="border-t border-border pt-6">
                    <OwnerHouseGuideForm />
                  </div>
                </div>
              )}
              {activeSection === "skills" && (
                <OwnerStepSkills
                  competences={mergedData.owner_competences || []}
                  competencesDisponible={mergedData.owner_competences_disponible || false}
                  skillCategories={mergedData.owner_skill_categories || []}
                  onChange={(partial) => handleChange(partial as any)}
                />
              )}
              {activeSection === "gallery" && <OwnerGallery />}

              {/* Bouton « Suivant », auto-sauvegarde puis avance dans la liste. */}
              {nextSection && (
                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      if (dirty) await handleSave();
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
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4 md:py-4 md:px-6 flex items-center justify-between gap-3 before:pointer-events-none before:content-[''] before:absolute before:left-0 before:right-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-background before:to-transparent">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saved && !dirty ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {tp("saved")}
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
                  disabled={saving || !dirty}
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
            {!dirty && !saving && (
              <TooltipContent side="top">
                {tp("tooltip_nothing")}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default OwnerProfilePage;
