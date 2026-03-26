import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import StepProgress from "@/components/profile/StepProgress";
import OwnerStepIdentity from "@/components/owner-profile/OwnerStepIdentity";
import OwnerStepHousing from "@/components/owner-profile/OwnerStepHousing";
import OwnerStepAnimals from "@/components/owner-profile/OwnerStepAnimals";
import OwnerStepRules from "@/components/owner-profile/OwnerStepRules";
import OwnerStepCommunication from "@/components/owner-profile/OwnerStepCommunication";
import OwnerStepCalendar from "@/components/owner-profile/OwnerStepCalendar";
import OwnerGallery from "@/components/owner-profile/OwnerGallery";
import OwnerExperiences from "@/components/owner-profile/OwnerExperiences";
import TrustProfile from "@/components/profile/TrustProfile";
import { useOwnerProfile, type OwnerProfileData } from "@/hooks/useOwnerProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  { num: 1, label: "Identité" },
  { num: 2, label: "Logement" },
  { num: 3, label: "Animaux" },
  { num: 4, label: "Attentes" },
  { num: 5, label: "Accueil" },
  { num: 6, label: "Calendrier" },
  { num: 7, label: "Galerie" },
  { num: 8, label: "Expériences" },
];

const OwnerProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data, pets, loading, saving, completion, missingFields,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
  } = useOwnerProfile();

  const [currentStep, setCurrentStep] = useState(1);
  const [localData, setLocalData] = useState<Partial<OwnerProfileData>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [trustData, setTrustData] = useState({ identityVerified: false, hasAvatar: false, hasFirstActivity: false });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("identity_verified, avatar_url").eq("id", user.id).single().then(({ data: p }) => {
      if (p) setTrustData(prev => ({ ...prev, identityVerified: p.identity_verified || false, hasAvatar: !!p.avatar_url }));
    });
    supabase.from("sits").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published").then(({ count }) => {
      setTrustData(prev => ({ ...prev, hasFirstActivity: (count || 0) > 0 }));
    });
  }, [user]);

  const mergedData = { ...data, ...localData } as OwnerProfileData;

  const handleChange = useCallback((partial: Partial<OwnerProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSaveAndNavigate = useCallback(async (nextStep?: number) => {
    if (Object.keys(localData).length > 0) {
      await saveStep(localData);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setLocalData({});
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    if (nextStep) setCurrentStep(nextStep);
  }, [localData, saveStep, currentStep]);

  const handleSaveAndQuit = useCallback(async () => {
    if (Object.keys(localData).length > 0) await saveStep(localData);
    navigate("/dashboard");
  }, [localData, saveStep, navigate]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in">
        <div className="text-center text-muted-foreground py-20">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-3">Mon profil propriétaire</h1>
      <TrustProfile
        emailVerified={true}
        identityVerified={trustData.identityVerified}
        hasAvatar={trustData.hasAvatar}
        profileCompletion={completion}
        hasFirstActivity={trustData.hasFirstActivity}
        role="owner"
      />
      <p className="text-muted-foreground mb-8">
        Complétez votre profil pour attirer les meilleurs gardiens.
      </p>

      <StepProgress
        currentStep={currentStep}
        completion={completion}
        completedSteps={completedSteps}
        onStepClick={(step) => handleSaveAndNavigate(step)}
        steps={STEPS}
        missingFields={missingFields}
      />

      <div className="bg-card rounded-lg border border-border p-6 md:p-8 mb-6">
        {currentStep === 1 && <OwnerStepIdentity data={mergedData} onChange={handleChange} onUploadPhoto={uploadPhoto} />}
        {currentStep === 2 && <OwnerStepHousing data={mergedData} onChange={handleChange} onUploadPhoto={uploadPhoto} />}
        {currentStep === 3 && <OwnerStepAnimals pets={pets} onAddPet={addPet} onUpdatePet={updatePet} onRemovePet={removePet} />}
        {currentStep === 4 && <OwnerStepRules data={mergedData} onChange={handleChange} />}
        {currentStep === 5 && <OwnerStepCommunication data={mergedData} onChange={handleChange} />}
        {currentStep === 6 && <OwnerStepCalendar />}
        {currentStep === 7 && <OwnerGallery />}
        {currentStep === 8 && <OwnerExperiences />}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {currentStep > 1 && (
          <Button type="button" variant="outline" onClick={() => handleSaveAndNavigate(currentStep - 1)} disabled={saving} className="w-full sm:w-auto">
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={handleSaveAndQuit} disabled={saving} className="w-full sm:w-auto text-muted-foreground">
          <LogOut className="w-4 h-4 mr-1" /> Sauvegarder et quitter
        </Button>
        {currentStep < 8 ? (
          <Button type="button" onClick={() => handleSaveAndNavigate(currentStep + 1)} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Sauvegarde..." : "Suivant"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" onClick={() => handleSaveAndNavigate()} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Sauvegarde..." : "Terminer"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OwnerProfilePage;
