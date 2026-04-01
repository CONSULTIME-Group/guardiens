import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
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
import BadgeShield from "@/components/badges/BadgeShield";
import { useSitterProfile, type SitterProfileData } from "@/hooks/useSitterProfile";
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
    case 4: return !!((d.has_license || d.has_vehicle) && d.availability_dates.length > 0);
    default: return false;
  }
}

function countMissing(num: number, d: SitterProfileData, allMissing: { step: number; label: string }[]): number {
  return allMissing.filter(m => m.step === num).length;
}

const SitterProfile = () => {
  const { user } = useAuth();
  const {
    data, pastAnimals, loading, saving, completion, missingFields,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
  } = useSitterProfile();

  const [localData, setLocalData] = useState<Partial<SitterProfileData>>({});
  const [activeSection, setActiveSection] = useState("identity");
  const [isFounder, setIsFounder] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_founder, created_at").eq("id", user.id).single().then(({ data: p }) => {
      if (p) {
        const created = p.created_at ? new Date(p.created_at) : new Date();
        setIsFounder(p.is_founder || created < new Date("2026-05-13T00:00:00Z"));
      }
    });
  }, [user]);

  const mergedData = { ...data, ...localData } as SitterProfileData;

  const handleChange = useCallback((partial: Partial<SitterProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
    setDirty(true);
    setSaved(false);
  }, []);

  const motivationLength = (mergedData.motivation || "").length;
  const canSave = !saving && dirty && motivationLength >= 50;

  const handleSave = useCallback(async () => {
    if (Object.keys(localData).length > 0) {
      await saveStep(localData);
      setLocalData({});
    }
    setDirty(false);
    setSaved(true);
  }, [localData, saveStep]);

  const sidebarSections: SidebarSection[] = SECTIONS_META.map(s => ({
    ...s,
    complete: sectionComplete(s.num, mergedData),
    missingCount: countMissing(s.num, mergedData, missingFields),
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
      <PageMeta title="Mon profil | Guardiens" description="Modifiez votre profil gardien Guardiens." />

      <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        {/* Founder badge */}
        {isFounder && (
          <div className="mb-4 flex gap-2">
            <BadgeShield badgeKey="founder" size="sm" />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left sidebar */}
          <ProfileSidebar
            avatarUrl={mergedData.avatar_url}
            firstName={mergedData.first_name}
            city={mergedData.city}
            completion={completion}
            sections={sidebarSections}
            activeSection={activeSection}
            onSectionClick={setActiveSection}
            onAvatarChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadAvatar(file);
              if (url) handleChange({ avatar_url: url });
            }}
            publicProfileUrl={user ? `/profil/${user.id}` : "#"}
            role="sitter"
          />

          {/* Right content */}
          <div className="flex-1 min-w-0 pb-32">
            <div className="bg-card rounded-xl border border-border p-5 md:p-8">
              {activeSection === "identity" && (
                <StepIdentity data={mergedData} onChange={handleChange} onUploadAvatar={uploadAvatar} />
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
