import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, LogOut, Camera, Briefcase } from "lucide-react";
import StepProgress from "@/components/profile/StepProgress";
import StepIdentity from "@/components/profile/StepIdentity";
import StepSitterProfile from "@/components/profile/StepSitterProfile";
import StepExperience from "@/components/profile/StepExperience";
import StepMobility from "@/components/profile/StepMobility";
import StepPreferences from "@/components/profile/StepPreferences";
import SitterGallery from "@/components/profile/SitterGallery";
import ExternalExperiences from "@/components/profile/ExternalExperiences";
import TrustProfile from "@/components/profile/TrustProfile";
import { useSitterProfile, type SitterProfileData } from "@/hooks/useSitterProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SitterProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data, pastAnimals, loading, saving, completion, missingFields,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
  } = useSitterProfile();

  const [currentStep, setCurrentStep] = useState(1);
  const [localData, setLocalData] = useState<Partial<SitterProfileData>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("profile");
  const [trustData, setTrustData] = useState({ identityVerified: false, hasAvatar: false, hasFirstActivity: false });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("identity_verified, avatar_url").eq("id", user.id).single().then(({ data: p }) => {
      if (p) setTrustData(prev => ({ ...prev, identityVerified: p.identity_verified || false, hasAvatar: !!p.avatar_url }));
    });
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("sitter_id", user.id).eq("status", "accepted").then(({ count }) => {
      setTrustData(prev => ({ ...prev, hasFirstActivity: (count || 0) > 0 }));
    });
  }, [user]);

  const mergedData = { ...data, ...localData } as SitterProfileData;

  const handleChange = useCallback((partial: Partial<SitterProfileData>) => {
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
    return <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in"><div className="text-center text-muted-foreground py-20">Chargement du profil...</div></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-3">Mon profil</h1>
      <p className="text-muted-foreground mb-6">Complétez votre profil pour augmenter vos chances.</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">Profil</TabsTrigger>
          <TabsTrigger value="gallery" className="flex-1 gap-1.5"><Camera className="h-3.5 w-3.5" /> Ma galerie</TabsTrigger>
          <TabsTrigger value="experiences" className="flex-1 gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Expériences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <StepProgress currentStep={currentStep} completion={completion} completedSteps={completedSteps} onStepClick={(step) => handleSaveAndNavigate(step)} missingFields={missingFields} />

          <div className="bg-card rounded-lg border border-border p-6 md:p-8 mb-6">
            {currentStep === 1 && <StepIdentity data={mergedData} onChange={handleChange} onUploadAvatar={uploadAvatar} />}
            {currentStep === 2 && <StepSitterProfile data={mergedData} onChange={handleChange} />}
            {currentStep === 3 && <StepExperience data={mergedData} pastAnimals={pastAnimals} onChange={handleChange} onAddAnimal={addPastAnimal} onRemoveAnimal={removePastAnimal} />}
            {currentStep === 4 && <StepMobility data={mergedData} onChange={handleChange} />}
            {currentStep === 5 && <StepPreferences data={mergedData} onChange={handleChange} />}
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
            {currentStep < 5 ? (
              <Button type="button" onClick={() => handleSaveAndNavigate(currentStep + 1)} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Sauvegarde..." : "Suivant"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={() => handleSaveAndNavigate()} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Sauvegarde..." : "Terminer"}
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <SitterGallery />
        </TabsContent>

        <TabsContent value="experiences" className="mt-4">
          <ExternalExperiences />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SitterProfile;
