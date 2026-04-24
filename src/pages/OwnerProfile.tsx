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
import ScoreBreakdown, { type ScoreCriterion } from "@/components/profile/ScoreBreakdown";
import { useOwnerProfile, computeOwnerMissingFields, type OwnerProfileData } from "@/hooks/useOwnerProfile";
import { useAuth } from "@/contexts/AuthContext";

const SECTIONS_META = [
  { id: "identity", num: 1, label: "Identité", subtitle: "Qui vous êtes" },
  { id: "housing", num: 2, label: "Logement", subtitle: "Votre maison" },
  { id: "animals", num: 3, label: "Animaux", subtitle: "Vos animaux" },
  { id: "rules", num: 4, label: "Attentes", subtitle: "Ce que vous cherchez", optional: true },
  { id: "communication", num: 5, label: "Accueil", subtitle: "Accueil & guide", optional: true },
  { id: "skills", num: 6, label: "Compétences", subtitle: "Ce que vous pouvez offrir" },
  { id: "gallery", num: 7, label: "Galerie", subtitle: "Photos de votre maison" },
];

/**
 * Critère de score étendu : inclut la section où l'utilisateur peut le compléter.
 * Source UNIQUE de vérité — la jauge %, les sections « Complété ✓ » et les labels
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

  // Source UNIQUE pour la jauge ET la sidebar : un seul set de critères pondérés.
  const scoredCriteria: ScoredCriterion[] = [
    // Essentiels — 75 pts
    { section: "identity", kind: "essential", label: "Prénom + code postal", points: 10,
      ok: !!(mergedData.first_name && mergedData.postal_code) },
    { section: "identity", kind: "essential", label: "Photo de profil", points: 15,
      ok: !!mergedData.avatar_url, hint: "Onglet Identité." },
    { section: "animals", kind: "essential", label: "Au moins 1 animal renseigné", points: 20,
      ok: pets.length > 0, hint: "Onglet Animaux." },
    { section: "housing", kind: "essential", label: "Logement décrit (≥ 50 caractères)", points: 15,
      ok: (mergedData.description?.length ?? 0) >= 50, hint: `${mergedData.description?.length ?? 0}/50 caractères.` },
    { section: "gallery", kind: "essential", label: "Au moins 1 photo du logement", points: 15,
      ok: (mergedData.photos?.length ?? 0) > 0, hint: "Onglet Galerie." },
    // Bonus — 25 pts
    { section: "identity", kind: "bonus", label: "Bio ≥ 50 caractères", points: 10,
      ok: (mergedData.bio?.length ?? 0) >= 50, hint: `${mergedData.bio?.length ?? 0}/50 caractères.` },
    { section: "skills", kind: "bonus", label: "Au moins 1 compétence proprio", points: 10,
      ok: (mergedData.owner_competences?.length ?? 0) > 0, hint: "Onglet Compétences." },
    { section: "identity", kind: "bonus", label: "Identité vérifiée", points: 5,
      ok: !!user?.identityVerified, hint: "Paramètres → Vérification." },
  ];

  const ownerEssentials = scoredCriteria.filter(c => c.kind === "essential");
  const ownerBonuses = scoredCriteria.filter(c => c.kind === "bonus");
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
            completion={liveScore}
            sections={sidebarSections}
            activeSection={activeSection}
            onSectionClick={setActiveSection}
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
