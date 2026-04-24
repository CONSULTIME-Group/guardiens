import { useState, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import OwnerStepIdentity from "@/components/owner-profile/OwnerStepIdentity";
import OwnerStepHousing from "@/components/owner-profile/OwnerStepHousing";
import OwnerStepAnimals from "@/components/owner-profile/OwnerStepAnimals";
import OwnerStepRules from "@/components/owner-profile/OwnerStepRules";
import OwnerStepCommunication from "@/components/owner-profile/OwnerStepCommunication";
import OwnerGallery from "@/components/owner-profile/OwnerGallery";

import OwnerHouseGuideForm from "@/components/owner-profile/OwnerHouseGuideForm";
import OwnerStepSkills from "@/components/owner-profile/OwnerStepSkills";
import ProfileSidebar, { type SidebarSection } from "@/components/profile/ProfileSidebar";
import ScoreBreakdown from "@/components/profile/ScoreBreakdown";
import { useOwnerProfile, type OwnerProfileData } from "@/hooks/useOwnerProfile";
import { useAuth } from "@/contexts/AuthContext";

const SECTIONS_META = [
  { id: "identity", num: 1, label: "Identité", subtitle: "Qui vous êtes" },
  { id: "housing", num: 2, label: "Logement", subtitle: "Votre maison" },
  { id: "animals", num: 3, label: "Animaux", subtitle: "Vos animaux" },
  { id: "rules", num: 4, label: "Attentes", subtitle: "Ce que vous cherchez" },
  { id: "communication", num: 5, label: "Accueil", subtitle: "Accueil & guide" },
  { id: "skills", num: 6, label: "Compétences", subtitle: "Ce que vous pouvez offrir" },
  { id: "gallery", num: 7, label: "Galerie", subtitle: "Photos de votre maison" },
];

function sectionComplete(num: number, d: OwnerProfileData, petsCount: number): boolean {
  switch (num) {
    case 1: return !!(d.avatar_url && d.first_name && d.last_name && d.city && d.bio);
    case 2: return !!(d.property_type && d.environment && d.description);
    case 3: return petsCount > 0;
    case 4: return !!(d.presence_expected && d.visits_allowed && d.meeting_preference.length > 0 && d.news_frequency);
    case 5: return !!(d.handover_preference && d.news_format.length > 0);
    default: return false;
  }
}

function countMissing(num: number, allMissing: { step: number; label: string }[]): number {
  return allMissing.filter(m => m.step === num).length;
}

type ProfileDraft<T> = {
  updatedAt: string;
  values: Partial<T>;
};

const OwnerProfilePage = () => {
  const { user } = useAuth();
  const {
    data, pets, loading, saving, completion, missingFields, lastSyncedAt,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
  } = useOwnerProfile();

  const [localData, setLocalData] = useState<Partial<OwnerProfileData>>({});
  const [activeSection, setActiveSection] = useState("identity");
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

  const sidebarSections: SidebarSection[] = SECTIONS_META.map(s => ({
    ...s,
    complete: sectionComplete(s.num, mergedData, pets.length),
    missingCount: countMissing(s.num, missingFields),
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
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
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
            publicProfileUrl={user ? `/gardiens/${user.id}?tab=proprio` : "#"}
            role="owner"
            scoreBreakdown={
              <ScoreBreakdown
                role="owner"
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
                    points: 10,
                    ok: !!(mergedData.first_name && mergedData.postal_code),
                  },
                  {
                    label: "Photo de profil",
                    points: 15,
                    ok: !!mergedData.avatar_url,
                    hint: "Onglet Identité.",
                  },
                  {
                    label: "Au moins 1 animal renseigné",
                    points: 20,
                    ok: pets.length > 0,
                    hint: "Onglet Animaux.",
                  },
                  {
                    label: "Logement décrit (≥ 50 caractères)",
                    points: 15,
                    ok: (mergedData.description?.length ?? 0) >= 50,
                    hint: `${mergedData.description?.length ?? 0}/50 caractères.`,
                  },
                  {
                    label: "Au moins 1 photo du logement",
                    points: 15,
                    ok: (mergedData.photos?.length ?? 0) > 0,
                    hint: "Onglet Logement.",
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
                    label: "Au moins 1 compétence proprio",
                    points: 10,
                    ok: (mergedData.owner_competences?.length ?? 0) > 0,
                    hint: "Onglet Compétences.",
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
