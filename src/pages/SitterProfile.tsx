import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepIdentity from "@/components/profile/StepIdentity";
import StepSitterProfile from "@/components/profile/StepSitterProfile";
import StepExperience from "@/components/profile/StepExperience";
import StepMobility from "@/components/profile/StepMobility";
import StepPreferences from "@/components/profile/StepPreferences";
import StepSkills from "@/components/profile/StepSkills";
import SitterGallery from "@/components/profile/SitterGallery";
import ExternalExperiences from "@/components/profile/ExternalExperiences";
import ProfileSidebar, { type SidebarSection } from "@/components/profile/ProfileSidebar";
import ScoreBreakdown from "@/components/profile/ScoreBreakdown";

import { useSitterProfile, computeSitterMissingFields, type SitterProfileData } from "@/hooks/useSitterProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";

const SECTIONS_META = [
  { id: "identity", num: 1, label: "Identité", subtitle: "Qui vous êtes" },
  { id: "sitter", num: 2, label: "Profil gardien", subtitle: "Votre expérience" },
  { id: "experience", num: 3, label: "Animaux", subtitle: "Ce que vous acceptez" },
  { id: "mobility", num: 4, label: "Mobilité & Rayon", subtitle: "Votre rayon" },
  { id: "gallery", num: 5, label: "Galerie", subtitle: "Vos gardes en photos", optional: true },
  { id: "experiences", num: 6, label: "Expériences", subtitle: "Expériences hors Guardiens", optional: true },
  { id: "skills", num: 7, label: "Compétences", subtitle: "Ce que vous savez faire" },
];

function sectionComplete(num: number, d: SitterProfileData): boolean {
  switch (num) {
    case 1: return !!(d.avatar_url && d.first_name && d.last_name && d.city && d.bio && d.motivation);
    case 2: return !!(d.sitter_type && d.availability_during && d.lifestyle.length > 0);
    case 3: return !!(d.experience_years && d.animal_types.length > 0 && d.references_text);
    case 4: return !!(d.has_license || d.has_vehicle);
    default: return false;
  }
}

function countMissing(num: number, d: SitterProfileData, allMissing: { step: number; label: string }[]): number {
  return allMissing.filter(m => m.step === num).length;
}

type ProfileDraft<T> = {
  updatedAt: string;
  values: Partial<T>;
};

const SECTION_PARAM_MAP: Record<string, string> = {
  identite: "identity",
  profil: "sitter",
  experience: "experience",
};

const SitterProfile = () => {
  const { user } = useAuth();
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
  const focusAppliedRef = useRef(false);

  // Handle focus=postal_code and section= query params
  useEffect(() => {
    if (loading || focusAppliedRef.current) return;
    const focus = searchParams.get("focus");
    const section = searchParams.get("section");

    if (focus === "postal_code") {
      focusAppliedRef.current = true;
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
    } else if (section && SECTION_PARAM_MAP[section]) {
      focusAppliedRef.current = true;
      const mapped = SECTION_PARAM_MAP[section];
      setActiveSection(mapped);
      setTimeout(() => {
        const contentEl = document.querySelector(".bg-card.rounded-xl");
        contentEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [loading, searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_founder, created_at").eq("id", user.id).single().then(({ data: p }) => {
      if (p) {
        const created = p.created_at ? new Date(p.created_at) : new Date();
        setIsFounder(p.is_founder || created < new Date("2026-05-13T00:00:00Z"));
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

    setLocalData({});
    setDirty(false);
    setSaved(true);
    if (draftKey) localStorage.removeItem(draftKey);
  }, [draftKey, localData, saveStep, searchParams, user]);

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

  const sidebarSections: SidebarSection[] = SECTIONS_META.map(s => ({
    ...s,
    complete: s.optional ? false : sectionComplete(s.num, mergedData),
    missingCount: s.optional ? 0 : countMissing(s.num, mergedData, missingFields),
  }));

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        <div className="text-center text-muted-foreground py-20">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title="Mon profil" description="Modifiez votre profil gardien Guardiens." noindex />

      <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left sidebar */}
          <ProfileSidebar
            firstName={mergedData.first_name}
            city={mergedData.city}
            completion={completion}
            sections={sidebarSections}
            activeSection={activeSection}
            onSectionClick={setActiveSection}
            publicProfileUrl={user ? `/gardiens/${user.id}` : "#"}
            role="sitter"
            isFounder={isFounder}
            scoreBreakdown={
              <ScoreBreakdown
                role="sitter"
                total={completion}
                isDirty={dirty}
                onReset={() => {
                  setLocalData({});
                  setDirty(false);
                  setSaved(false);
                  if (draftKey) localStorage.removeItem(draftKey);
                }}
                essentials={[
                  {
                    label: "Prénom + code postal",
                    points: 15,
                    ok: !!(mergedData.first_name && mergedData.postal_code),
                  },
                  {
                    label: "Photo de profil",
                    points: 20,
                    ok: !!mergedData.avatar_url,
                    hint: "Ajoutez une photo dans Identité.",
                  },
                  {
                    label: "Au moins 1 compétence",
                    points: 15,
                    ok: (mergedData.competences?.length ?? 0) > 0,
                    hint: "Onglet Compétences.",
                  },
                  {
                    label: "Au moins 1 mode de vie",
                    points: 15,
                    ok: (mergedData.lifestyle?.length ?? 0) > 0,
                    hint: "Onglet Profil gardien.",
                  },
                  {
                    label: "Rayon géographique défini",
                    points: 15,
                    ok: (mergedData.geographic_radius ?? 0) > 0,
                    hint: "Onglet Mobilité & Rayon.",
                  },
                ]}
                bonuses={[
                  {
                    label: "Bio ≥ 50 caractères",
                    points: 10,
                    ok: (mergedData.bio?.length ?? 0) >= 50,
                    hint: `${mergedData.bio?.length ?? 0}/50 caractères.`,
                  },
                  {
                    label: "Au moins 1 photo de galerie",
                    points: 5,
                    ok: hasGalleryPhoto,
                    hint: "Onglet Galerie.",
                  },
                  {
                    label: "Identité vérifiée",
                    points: 5,
                    ok: !!user?.identityVerified,
                    hint: "Paramètres → Vérification.",
                  },
                ]}
              />
            }
          />

          {/* Right content */}
          <div className="flex-1 min-w-0 pb-32">
            <div className="bg-card rounded-xl border border-border p-5 md:p-8">
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
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-6 flex items-center justify-between supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <p className="text-xs text-muted-foreground">
          {saved && !dirty ? (
            <span className="text-primary">✓ Profil à jour</span>
          ) : dirty ? (
            "Modifications non sauvegardées"
          ) : null}
        </p>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-full px-6 gap-2"
          size="lg"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
          ) : (
            <><Check className="h-4 w-4" /> Sauvegarder</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SitterProfile;
