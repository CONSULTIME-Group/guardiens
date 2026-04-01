import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TwoColumnLayout from "@/components/layout/TwoColumnLayout";
import OwnerStepIdentity from "@/components/owner-profile/OwnerStepIdentity";
import OwnerStepHousing from "@/components/owner-profile/OwnerStepHousing";
import OwnerStepAnimals from "@/components/owner-profile/OwnerStepAnimals";
import OwnerStepRules from "@/components/owner-profile/OwnerStepRules";
import OwnerStepCommunication from "@/components/owner-profile/OwnerStepCommunication";
import OwnerStepCalendar from "@/components/owner-profile/OwnerStepCalendar";
import OwnerGallery from "@/components/owner-profile/OwnerGallery";
import OwnerExperiences from "@/components/owner-profile/OwnerExperiences";
import OwnerStepSkills from "@/components/owner-profile/OwnerStepSkills";
import ProfileSidebar, { type SidebarSection } from "@/components/profile/ProfileSidebar";
import { useOwnerProfile, type OwnerProfileData } from "@/hooks/useOwnerProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS_META = [
  { id: "identity", num: 1, label: "Identité", subtitle: "Qui vous êtes", missingHint: "+15 pts · Photo et bio" },
  { id: "housing", num: 2, label: "Logement", subtitle: "Votre maison", missingHint: "+20 pts · Description maison" },
  { id: "animals", num: 3, label: "Animaux", subtitle: "Vos animaux", missingHint: "+20 pts · Fiche de vos animaux" },
  { id: "rules", num: 4, label: "Attentes", subtitle: "Ce que vous cherchez", missingHint: "+10 pts · Vos préférences" },
  { id: "communication", num: 5, label: "Accueil", subtitle: "Comment vous accueillez" },
  { id: "calendar", num: 6, label: "Calendrier", subtitle: "Vos disponibilités" },
  { id: "gallery", num: 7, label: "Galerie", subtitle: "Photos de votre maison", missingHint: "+15 pts · Photos attirent 3× plus" },
  { id: "skills", num: 8, label: "Compétences", subtitle: "Ce que vous proposez", missingHint: "Missions d'entraide" },
  { id: "guide", num: 9, label: "Guide de la maison", subtitle: "Codes et contacts" },
];

function sectionComplete(num: number, d: OwnerProfileData, petsCount: number): boolean {
  switch (num) {
    case 1: return !!(d.avatar_url && d.first_name && d.last_name && d.city && d.bio);
    case 2: return !!(d.property_type && d.environment && d.description);
    case 3: return petsCount > 0;
    case 4: return !!(d.presence_expected && d.visits_allowed);
    case 5: return !!(d.meeting_preference.length > 0 && d.news_frequency);
    default: return false;
  }
}

function countMissing(num: number, allMissing: { step: number; label: string }[]): number {
  return allMissing.filter(m => m.step === num).length;
}

const OwnerProfilePage = () => {
  const { user } = useAuth();
  const {
    data, pets, loading, saving, completion, missingFields,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
  } = useOwnerProfile();

  const [localData, setLocalData] = useState<Partial<OwnerProfileData>>({});
  const [activeSection, setActiveSection] = useState("identity");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_founder").eq("id", user.id).single().then(({ data: p }) => {
      setIsFounder(p?.is_founder || false);
    });
  }, [user]);

  const mergedData = { ...data, ...localData } as OwnerProfileData;

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((partial: Partial<OwnerProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
    setDirty(true);
    setSaved(false);
  }, []);

  // Auto-save debounce 800ms
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (Object.keys(localData).length > 0) {
        saveStep(localData).then(() => {
          setLocalData({});
          setDirty(false);
          setSaved(true);
        });
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [dirty, localData, saveStep]);

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
    complete: sectionComplete(s.num, mergedData, pets.length),
    missingCount: countMissing(s.num, missingFields),
  }));

  if (loading) {
    return (
      <div className="w-full animate-fade-in">
        <div className="text-center text-muted-foreground py-20">Chargement du profil...</div>
      </div>
    );
  }

  const leftContent = (
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
        const url = await uploadPhoto(file, "avatars");
        if (url) handleChange({ avatar_url: url });
      }}
      publicProfileUrl={user ? `/profil/${user.id}` : "#"}
      role="owner"
      identityVerified={user?.identityVerified}
      isFounder={isFounder}
    />
  );

  const rightContent = (
    <div className="pb-32">
      <div className="bg-card rounded-2xl border border-border p-6">
        {activeSection === "identity" && <OwnerStepIdentity data={mergedData} onChange={handleChange} onUploadPhoto={uploadPhoto} />}
        {activeSection === "housing" && <OwnerStepHousing data={mergedData} onChange={handleChange} onUploadPhoto={uploadPhoto} />}
        {activeSection === "animals" && <OwnerStepAnimals pets={pets} onAddPet={addPet} onUpdatePet={updatePet} onRemovePet={removePet} />}
        {activeSection === "rules" && <OwnerStepRules data={mergedData} onChange={handleChange} />}
        {activeSection === "communication" && <OwnerStepCommunication data={mergedData} onChange={handleChange} />}
        {activeSection === "calendar" && <OwnerStepCalendar />}
        {activeSection === "gallery" && <OwnerGallery />}
        {activeSection === "skills" && (
          <OwnerStepSkills
            competences={mergedData.owner_competences || []}
            competencesDisponible={mergedData.owner_competences_disponible || false}
            skillCategories={mergedData.owner_skill_categories || []}
            onChange={(partial) => handleChange(partial as any)}
          />
        )}
        {activeSection === "guide" && <OwnerExperiences />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background w-full">
      <TwoColumnLayout
        leftWidth={280}
        stickyLeft
        leftContent={leftContent}
        rightContent={rightContent}
      />

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
          disabled={saving || !dirty}
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

export default OwnerProfilePage;
