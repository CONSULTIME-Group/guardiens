import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Eye, Camera, Briefcase, CheckCircle2, Circle, Save, Loader2,
  Star, MapPin,
} from "lucide-react";
import StepIdentity from "@/components/profile/StepIdentity";
import StepSitterProfile from "@/components/profile/StepSitterProfile";
import StepExperience from "@/components/profile/StepExperience";
import StepMobility from "@/components/profile/StepMobility";
import StepPreferences from "@/components/profile/StepPreferences";
import StepSkills from "@/components/profile/StepSkills";
import SitterGallery from "@/components/profile/SitterGallery";
import ExternalExperiences from "@/components/profile/ExternalExperiences";
import TrustProfile from "@/components/profile/TrustProfile";
import BadgeShield from "@/components/badges/BadgeShield";
import { useSitterProfile, type SitterProfileData } from "@/hooks/useSitterProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";

/* ── Section completion helpers ── */
function sectionComplete(section: number, d: SitterProfileData): boolean {
  switch (section) {
    case 1: return !!(d.avatar_url && d.first_name && d.last_name && d.city && d.bio && d.motivation);
    case 2: return !!(d.sitter_type && d.availability_during && d.lifestyle.length > 0);
    case 3: return !!(d.experience_years && d.animal_types.length > 0 && d.references_text);
    case 4: return !!((d.has_license || d.has_vehicle) && d.availability_dates.length > 0);
    case 5: return !!(d.languages.length > 0 && d.meeting_preference.length > 0 && d.handover_preference);
    default: return false;
  }
}

const sections = [
  { id: "identity", num: 1, label: "Identité" },
  { id: "sitter", num: 2, label: "Profil gardien" },
  { id: "experience", num: 3, label: "Expérience" },
  { id: "mobility", num: 4, label: "Mobilité" },
  { id: "preferences", num: 5, label: "Préférences de garde" },
  { id: "skills", num: 6, label: "Ce que je sais faire" },
];

const SitterProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data, pastAnimals, loading, saving, completion, missingFields,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
  } = useSitterProfile();

  const [localData, setLocalData] = useState<Partial<SitterProfileData>>({});
  const [activeTab, setActiveTab] = useState("profile");
  const [trustData, setTrustData] = useState({ identityVerified: false, hasAvatar: false, hasFirstActivity: false });
  const [galleryCount, setGalleryCount] = useState(0);
  const [experienceCount, setExperienceCount] = useState(0);
  const [isFounder, setIsFounder] = useState(false);
  const [dirty, setDirty] = useState(false);
  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("identity_verified, avatar_url, is_founder, created_at").eq("id", user.id).single(),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("sitter_id", user.id).eq("status", "accepted"),
      supabase.from("sitter_gallery").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([profileRes, appRes, galleryRes, expRes]) => {
      const p = profileRes.data;
      if (p) {
        setTrustData(prev => ({
          ...prev,
          identityVerified: p.identity_verified || false,
          hasAvatar: !!p.avatar_url,
        }));
        const created = p.created_at ? new Date(p.created_at) : new Date();
        setIsFounder(p.is_founder || created < new Date("2026-05-13T00:00:00Z"));
      }
      setTrustData(prev => ({ ...prev, hasFirstActivity: (appRes.count || 0) > 0 }));
      setGalleryCount(galleryRes.count || 0);
      setExperienceCount(expRes.count || 0);
    });
  }, [user]);

  const mergedData = { ...data, ...localData } as SitterProfileData;

  const handleChange = useCallback((partial: Partial<SitterProfileData>) => {
    setLocalData(prev => ({ ...prev, ...partial }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(localData).length > 0) {
      await saveStep(localData);
      setLocalData({});
    }
    setDirty(false);
  }, [localData, saveStep]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab("profile");
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in">
        <div className="text-center text-muted-foreground py-20">Chargement du profil...</div>
      </div>
    );
  }

  const completedSections = sections.filter(s => sectionComplete(s.num, mergedData)).length;

  return (
    <div className="min-h-screen" style={{ background: "#FAF9F6" }}>
      <PageMeta title="Mon profil | Guardiens" description="Modifiez votre profil gardien Guardiens." />

      <div className="p-4 sm:p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-6 pb-40 min-w-0">

        {/* ── Header card ── */}
        <div className="bg-card rounded-xl border border-border p-5 md:p-6 flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="relative group shrink-0">
            {mergedData.avatar_url ? (
              <img src={mergedData.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-border">
                {mergedData.first_name?.charAt(0) || "?"}
              </div>
            )}
            <label className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadAvatar(file);
                  if (url) handleChange({ avatar_url: url });
                }}
              />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h1 className="font-heading text-2xl font-bold">
              {mergedData.first_name || "Votre profil"}
            </h1>
            {mergedData.city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                <MapPin className="h-3.5 w-3.5" /> {mergedData.city}
              </p>
            )}
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap mt-1">
              {isFounder && <BadgeShield badgeKey="founder" size="sm" />}
              {trustData.identityVerified && <BadgeShield badgeKey="identity_verified" size="sm" />}
            </div>
          </div>

          {/* Completion + CTA */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="text-3xl font-bold text-primary font-heading">{completion}%</div>
            <p className="text-xs text-muted-foreground">complété</p>
            {user && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/profil/${user.id}`}>
                  <Eye className="w-4 h-4 mr-1.5" /> Voir mon profil public
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Trust profile ── */}
        <TrustProfile
          emailVerified={true}
          identityVerified={trustData.identityVerified}
          hasAvatar={trustData.hasAvatar}
          profileCompletion={completion}
          hasFirstActivity={trustData.hasFirstActivity}
          role="sitter"
        />
        <a href="/actualites/creer-profil-gardien-attractif" className="text-xs text-primary hover:underline mt-1 inline-block">
          💡 Comment créer un profil qui attire des missions →
        </a>

        {/* ── Missing items banner ── */}
        {completion < 100 && missingFields.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 p-4 space-y-2" style={{ background: "#FEF3C7" }}>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              ✨ Pour un profil au top, il vous manque :
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map(({ step, label }) => {
                const section = sections.find(s => s.num === step);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => section && scrollToSection(section.id)}
                    className="text-xs bg-amber-200/60 text-amber-900 hover:bg-amber-300/60 rounded-full px-3 py-1.5 transition-colors cursor-pointer font-medium"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">
              Profil ({completion}%)
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Ma galerie ({galleryCount})
            </TabsTrigger>
            <TabsTrigger value="experiences" className="flex-1 gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Expériences ({experienceCount})
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab: Accordion ── */}
          <TabsContent value="profile" className="mt-4 pb-32">
            <Accordion type="multiple" defaultValue={["identity"]} ref={accordionRef} className="space-y-3">
              {sections.map(({ id, num, label }) => {
                const complete = sectionComplete(num, mergedData);
                return (
                  <AccordionItem
                    key={id}
                    value={id}
                    id={`section-${id}`}
                    className="bg-card rounded-xl border border-border overflow-hidden data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        {complete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-amber-400 shrink-0" />
                        )}
                        <span className="font-heading font-semibold text-sm">{label}</span>
                        {complete && (
                          <span className="text-xs text-green-600 font-medium">Complété</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      {num === 1 && (
                        <StepIdentity data={mergedData} onChange={handleChange} onUploadAvatar={uploadAvatar} />
                      )}
                      {num === 2 && (
                        <StepSitterProfile data={mergedData} onChange={handleChange} />
                      )}
                      {num === 3 && (
                        <StepExperience
                          data={mergedData}
                          pastAnimals={pastAnimals}
                          onChange={handleChange}
                          onAddAnimal={addPastAnimal}
                          onRemoveAnimal={removePastAnimal}
                        />
                      )}
                      {num === 4 && (
                        <StepMobility data={mergedData} onChange={handleChange} />
                      )}
                      {num === 5 && (
                        <StepPreferences data={mergedData} onChange={handleChange} />
                      )}
                      {num === 6 && (
                        <StepSkills
                          skillCategories={mergedData.skill_categories || []}
                          availableForHelp={mergedData.available_for_help || false}
                          onChange={(partial) => handleChange(partial as any)}
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          {/* ── Gallery Tab ── */}
          <TabsContent value="gallery" className="mt-4">
            <SitterGallery />
          </TabsContent>

          {/* ── Experiences Tab ── */}
          <TabsContent value="experiences" className="mt-4">
            <ExternalExperiences />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sticky save button ── */}
      {activeTab === "profile" && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3 flex justify-center supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="gap-2 px-8"
            size="lg"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde en cours…</>
            ) : (
              <><Save className="h-4 w-4" /> Enregistrer les modifications</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SitterProfile;
