import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Camera, CheckCircle, Send, MessageCircle, Star, User, PawPrint, MapPin, Leaf, ShieldCheck, Home, Calendar, Plus, Zap, Activity, Heart, BookOpen, Key, Wifi, Phone, Wrench, ChefHat, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import ChipSelect from "@/components/profile/ChipSelect";
import { compressImageFile } from "@/lib/compressImage";
import { trackEvent } from "@/lib/analytics";

type ActiveTab = "gardien" | "proprio";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onMinimalComplete?: () => void;
}

const TOTAL_SLIDES = 6; // 0=welcome+fields, 1=photo+bio, 2=compétences+style, 3=entraide, 4=parcours, 5=CTA

const LIFESTYLE_OPTIONS = [
  "Sportif / grandes balades", "Joueur", "Tranquille / casanier",
  "Lève-tôt", "Couche-tard", "En télétravail", "Famille",
];

const SKILL_CATEGORIES = [
  { key: "jardin", label: "🌿 Jardin" },
  { key: "animaux", label: "🐾 Animaux" },
  { key: "competences", label: "📚 Compétences & Savoirs" },
  { key: "coups_de_main", label: "🤝 Coups de main" },
];

const OnboardingModal = ({ open, onClose, onMinimalComplete }: OnboardingModalProps) => {
  const { user, activeRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    activeRole === "owner" ? "proprio" : "gardien"
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const dontShowRef = useRef(false);
  // Use the actual profile role for scoring logic, not activeRole
  // DB uses sitter scoring for "both" role users
  const userRole = user?.role || "sitter";
  const usesSitterScoring = userRole === "sitter" || userRole === "both";
  const isOwnerOnly = userRole === "owner";

  // ── Slide 0: mandatory fields ──
  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [minimalSaved, setMinimalSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Slide 1: photo + bio ──
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Slide 2: compétences + lifestyle ──
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [skillCategories, setSkillCategories] = useState<string[]>([]);

  // ── Live completion ──
  const [liveCompletion, setLiveCompletion] = useState(0);

  const fieldsValid =
    firstName.trim().length > 0 &&
    postalCode.length === 5 &&
    city.trim().length > 0;

  // Calculate live completion estimate — must match DB function
  useEffect(() => {
    let score = 0;
    if (firstName.trim() && postalCode) score += 10;
    if (avatarUrl) score += 20;
    if (usesSitterScoring) {
      // Sitter/Both scoring: bio=15, compétences=10, lifestyle=10 (max here = 65)
      if (bio.length >= 50) score += 15;
      if (skillCategories.length > 0) score += 10;
      if (lifestyle.length > 0) score += 10;
    } else {
      // Owner-only scoring: bio=10, compétences=10 (max here = 50)
      if (bio.length >= 50) score += 10;
      if (skillCategories.length > 0) score += 10;
    }
    setLiveCompletion(score);
  }, [firstName, postalCode, avatarUrl, bio, skillCategories, lifestyle, usesSitterScoring]);

  // Load profile data on mount
  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, postal_code, city, avatar_url, bio, onboarding_minimal_completed, skill_categories")
        .eq("id", user.id)
        .single();
      if (p) {
        if (p.first_name) setFirstName(p.first_name);
        if (p.postal_code) setPostalCode(p.postal_code);
        if (p.city) setCity(p.city);
        if (p.avatar_url) setAvatarUrl(p.avatar_url);
        if (p.bio) setBio(p.bio);
        if (p.onboarding_minimal_completed) setMinimalSaved(true);
        if (Array.isArray((p as any).skill_categories)) {
          setSkillCategories((p as any).skill_categories as string[]);
        }
      }
      // Lifestyle reste propre au profil gardien
      if (usesSitterScoring) {
        const { data: sp } = await supabase
          .from("sitter_profiles")
          .select("lifestyle")
          .eq("user_id", user.id)
          .maybeSingle();
        if (sp?.lifestyle && Array.isArray(sp.lifestyle)) {
          setLifestyle(sp.lifestyle as string[]);
        }
      }
    };
    load();
  }, [user, open]);

  // Reset slide on open + track onboarding_started une seule fois par session
  const startedTrackedRef = useRef(false);
  useEffect(() => {
    if (open) {
      setSlide(0);
      setDontShowAgain(false);
      dontShowRef.current = false;
      setActiveTab(activeRole === "owner" ? "proprio" : "gardien");
      if (!startedTrackedRef.current && user?.id) {
        startedTrackedRef.current = true;
        trackEvent("onboarding_started", {
          source: "/onboarding",
          metadata: { role: user.role || null, user_id: user.id },
        });
      }
    } else {
      startedTrackedRef.current = false;
    }
  }, [open, activeRole, user?.id, user?.role]);

  const handleNextRef = useRef<() => Promise<void>>(async () => {});

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNextRef.current();
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ── Save functions ──

  const saveMinimalFields = async () => {
    if (!user || saving) return false;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        postal_code: postalCode,
        city: city.trim(),
        onboarding_minimal_completed: true,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur", { description: "Veuillez réessayer." });
      return false;
    }
    setMinimalSaved(true);
    refreshProfile();
    onMinimalComplete?.();
    return true;
  };

  const savePhotoAndBio = async () => {
    if (!user) return;
    const updates: Record<string, any> = {};
    if (bio.trim().length > 0) updates.bio = bio.trim();
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  };

  const saveCompetencesAndLifestyle = async () => {
    if (!user) return;

    // Whitelist stricte des catégories d'entraide pour éviter qu'une valeur
    // étrangère (ex: une compétence précise) ne soit classée par erreur ici.
    const ALLOWED_CATEGORIES = SKILL_CATEGORIES.map(c => c.key);
    const safeCategories = Array.from(
      new Set(
        (skillCategories || []).filter(
          (k): k is string => typeof k === "string" && ALLOWED_CATEGORIES.includes(k)
        )
      )
    );

    // Fallback : relire l'existant en base et fusionner pour ne rien écraser
    // si profiles.skill_categories est absent / null côté state local.
    const { data: existing } = await supabase
      .from("profiles")
      .select("skill_categories, available_for_help")
      .eq("id", user.id)
      .maybeSingle();

    const existingCategories = Array.isArray((existing as any)?.skill_categories)
      ? ((existing as any).skill_categories as string[]).filter(c => ALLOWED_CATEGORIES.includes(c))
      : [];

    const mergedCategories = Array.from(new Set([...existingCategories, ...safeCategories]));

    const profileUpdates: Record<string, any> = {
      skill_categories: mergedCategories,
    };
    if (mergedCategories.length > 0 && !(existing as any)?.available_for_help) {
      profileUpdates.available_for_help = true;
    }
    await supabase.from("profiles").update(profileUpdates).eq("id", user.id);

    // Lifestyle reste sur sitter_profiles (gardien / both uniquement).
    if ((userRole === "both" || userRole === "sitter") && lifestyle.length > 0) {
      await supabase
        .from("sitter_profiles")
        .upsert({ user_id: user.id, lifestyle }, { onConflict: "user_id" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || !user) return;
    e.currentTarget.value = "";
    setUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const ext = compressed.name.split(".").pop() || "webp";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      setAvatarUrl(url);
    } catch {
      toast.error("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (slide === 0 && !minimalSaved) {
      if (!fieldsValid) return;
      const ok = await saveMinimalFields();
      if (!ok) return;
    }
    if (slide === 1) {
      await savePhotoAndBio();
    }
    if (slide === 2) {
      await saveCompetencesAndLifestyle();
    }
    // Track step completion (étapes interactives uniquement: 0,1,2)
    if (slide <= 2 && user?.id) {
      try {
        trackEvent("onboarding_step_completed", {
          source: "/onboarding",
          metadata: {
            step: slide,
            step_name: ["fields", "photo_bio", "skills_lifestyle"][slide],
            role: user.role || null,
            user_id: user.id,
            completion: liveCompletion,
          },
        });
      } catch {}
    }
    if (slide < TOTAL_SLIDES - 1) setSlide((s) => s + 1);
  };
  // Keep ref in sync for keyboard handler
  useEffect(() => { handleNextRef.current = handleNext; });

  const canDismiss = minimalSaved;

  const dismiss = useCallback(async () => {
    if (!canDismiss) return;
    // Save any pending data from current slide
    if (slide === 1) await savePhotoAndBio();
    if (slide === 2) await saveCompetencesAndLifestyle();
    if (user) {
      const updates: Record<string, any> = {
        onboarding_dismissed_at: new Date().toISOString(),
      };
      if (dontShowRef.current) {
        updates.onboarding_completed = true;
      }
      await supabase.from("profiles").update(updates).eq("id", user.id);
      refreshProfile();
      try {
        trackEvent(dontShowRef.current ? "onboarding_completed" : "onboarding_dismissed", {
          source: "/onboarding",
          metadata: {
            slide,
            role: user.role || null,
            user_id: user.id,
            completion: liveCompletion,
          },
        });
      } catch {}
    }
    onClose();
  }, [user, onClose, canDismiss, refreshProfile, slide, bio, lifestyle, skillCategories, avatarUrl, liveCompletion]);

  const completeOnboarding = async (destination: string) => {
    if (user) {
      // Recalculate completion
      await supabase.rpc("calculate_profile_completion", { p_user_id: user.id });
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      refreshProfile();
      try {
        trackEvent("onboarding_completed", {
          source: "/onboarding",
          metadata: {
            destination,
            role: user.role || null,
            user_id: user.id,
            completion: liveCompletion,
          },
        });
      } catch {}
    }
    onClose();
    navigate(destination);
  };

  if (!open) return null;

  

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-sm bg-background/80">
      <div className="max-w-2xl w-full mx-auto mt-8 md:mt-16 bg-card rounded-2xl shadow-xl p-6 md:p-10 relative max-h-[90vh] overflow-y-auto">
        {canDismiss && (
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">
              {slide === 0 ? "Étape 1 sur 3 — Faisons connaissance" :
               slide === 1 ? "Étape 2 sur 3 — Votre première impression" :
               slide === 2 ? "Étape 3 sur 3 — Vos savoir-faire" :
               "Découverte de Guardiens"}
            </p>
            {slide <= 2 && (
              <p className="text-xs font-semibold text-primary">{liveCompletion}%</p>
            )}
          </div>
          <Progress value={slide <= 2 ? ((slide + 1) / 3) * 100 : 100} className="h-1.5" />
        </div>

        {/* Role tabs — only for read-only slides */}
        {slide >= 3 && (
          <div className="flex justify-center gap-1 mb-6">
            <button
              onClick={() => setActiveTab("gardien")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === "gardien"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Parcours gardien
            </button>
            <button
              onClick={() => setActiveTab("proprio")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === "proprio"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Parcours propriétaire
            </button>
          </div>
        )}

        <div className="min-h-[320px]">
          {/* ── Slide 0: Welcome + mandatory fields ── */}
          {slide === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Bienvenue sur Guardiens.
                </h2>
                <p className="text-base text-foreground/80 leading-relaxed mt-2">
                  En 2 minutes, rendez votre profil attractif. Commençons par faire connaissance — 30 secondes.
                </p>
              </div>

              <div className="space-y-4 bg-muted/50 rounded-xl p-5 border border-border">
                <div className="space-y-2">
                  <Label htmlFor="onb-firstname">Votre prénom</Label>
                  <Input
                    id="onb-firstname"
                    placeholder="Ex : Marie"
                    autoFocus
                    maxLength={50}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-lg h-12"
                    disabled={minimalSaved}
                  />
                </div>

                <PostalCodeCityFields
                  city={city}
                  postalCode={postalCode}
                  onChange={(partial) => {
                    if (partial.city !== undefined) setCity(partial.city);
                    if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
                  }}
                  cityLabel="Votre ville"
                  postalLabel="Code postal"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  inputClassName="rounded-lg h-12"
                  disabled={minimalSaved}
                />

                {minimalSaved && (
                  <p className="text-sm text-primary font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Informations enregistrées
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Slide 1: Photo + Bio ── */}
          {slide === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {userRole === "both"
                    ? "Votre photo et votre bio sont la première chose que les autres voient."
                    : isOwnerOnly
                      ? "Les gardiens regardent votre photo et votre bio en premier."
                      : "Les propriétaires regardent votre photo et votre bio en premier."}
                </h2>
                <p className="text-base text-foreground/80 leading-relaxed mt-2">
                  Montrez qui vous êtes. Une photo nette et quelques mots sincères suffisent.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                {/* Photo upload */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7 text-muted-foreground" />
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <span className="text-xs text-muted-foreground">
                    {uploading ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
                  </span>
                </div>

                {/* Bio */}
                <div className="flex-1 space-y-2">
                  <Label htmlFor="onb-bio">Présentez-vous en quelques mots</Label>
                  <Textarea
                    id="onb-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Qui êtes-vous ? Pourquoi Guardiens ? Ce que vous aimez chez les animaux…"
                    className="rounded-lg min-h-[120px] resize-none"
                    maxLength={2000}
                  />
                  <p className={`text-xs ${bio.length >= 50 ? "text-primary" : "text-muted-foreground"}`}>
                    {bio.length}/50 caractères min.
                    {bio.length >= 50 && " ✓"}
                  </p>
                </div>
              </div>

              {/* Mock preview */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Aperçu de votre profil public</p>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Votre photo de profil" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{firstName || "Votre prénom"}</p>
                    <p className="text-xs text-muted-foreground">{city || "Votre ville"}</p>
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                      {bio || <span className="italic text-muted-foreground">Votre bio apparaîtra ici…</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Slide 2: Compétences + Style de vie ── */}
          {slide === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Vos compétences apparaissent sur votre profil.
                </h2>
                <p className="text-base text-foreground/80 leading-relaxed mt-2">
                  {userRole === "both"
                    ? "Gardiens et propriétaires les voient avant même de vous écrire. Sélectionnez ce qui vous correspond."
                    : isOwnerOnly
                      ? "Les gardiens les voient avant même de vous écrire. Sélectionnez ce qui vous correspond."
                      : "Les propriétaires les voient avant même de vous écrire. Sélectionnez ce qui vous correspond."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Ce que je sais faire</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_CATEGORIES.map(({ key, label }) => {
                    const selected = skillCategories.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSkillCategories((prev) =>
                            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                          )
                        }
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {usesSitterScoring && (
                <div className="space-y-2">
                  <Label>Mon style de vie</Label>
                  <ChipSelect
                    options={LIFESTYLE_OPTIONS}
                    selected={lifestyle}
                    onChange={setLifestyle}
                  />
                </div>
              )}

              {/* Live mock preview */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Sur votre profil public</p>
                <div className="flex flex-wrap gap-1.5">
                  {skillCategories.length === 0 && (usesSitterScoring ? lifestyle.length === 0 : true) && (
                    <p className="text-xs text-muted-foreground italic">Sélectionnez pour voir l'aperçu…</p>
                  )}
                  {skillCategories.map((key) => {
                    const cat = SKILL_CATEGORIES.find((c) => c.key === key);
                    return (
                      <span key={key} className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">
                        {cat?.label || key}
                      </span>
                    );
                  })}
                  {usesSitterScoring && lifestyle.map((l) => (
                    <span key={l} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Slide 3: Entraide (read-only) ── */}
          {slide === 3 && <EntraideSlide />}

          {/* ── Slide 4: Parcours de garde (read-only) ── */}
          {slide === 4 && activeTab === "gardien" && <SitterParcoursSlide />}
          {slide === 4 && activeTab === "proprio" && <OwnerParcoursSlide />}

          {/* ── Slide 5: CTA final ── */}
          {slide === 5 && (
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Votre profil est prêt.
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                {liveCompletion >= 60
                  ? "Bravo ! Votre profil est déjà bien rempli. La communauté peut vous découvrir."
                  : "Vous pouvez encore améliorer votre profil depuis vos paramètres. En attendant, explorez !"}
              </p>

              <div className="bg-muted/50 rounded-xl p-5 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Votre profil</p>
                  <p className="text-sm font-bold text-primary">{liveCompletion}%</p>
                </div>
                <Progress value={liveCompletion} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {firstName && postalCode ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={firstName && postalCode ? "text-foreground" : "text-muted-foreground"}>Prénom & localisation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {avatarUrl ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={avatarUrl ? "text-foreground" : "text-muted-foreground"}>Photo de profil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {bio.length >= 50 ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={bio.length >= 50 ? "text-foreground" : "text-muted-foreground"}>Bio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {skillCategories.length > 0 ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={skillCategories.length > 0 ? "text-foreground" : "text-muted-foreground"}>Compétences</span>
                  </div>
                  {usesSitterScoring && (
                    <div className="flex items-center gap-1.5">
                      {lifestyle.length > 0 ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className={lifestyle.length > 0 ? "text-foreground" : "text-muted-foreground"}>Style de vie</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {userRole === "both" ? (
                  <>
                    <Button className="w-full" onClick={() => completeOnboarding("/search")}>
                      Explorer les annonces →
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => completeOnboarding("/sits")}>
                      Publier une annonce →
                    </Button>
                  </>
                ) : isOwnerOnly ? (
                  <Button className="w-full" onClick={() => completeOnboarding("/sits")}>
                    Publier une annonce →
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => completeOnboarding("/search")}>
                    Explorer les annonces →
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col gap-1">
            {canDismiss && slide < 5 ? (
              <>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => {
                        setDontShowAgain(e.target.checked);
                        dontShowRef.current = e.target.checked;
                      }}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-xs text-muted-foreground">Ne plus afficher</span>
                  </label>
                  <button
                    onClick={dismiss}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors ml-2"
                  >
                    Reprendre plus tard
                  </button>
                </div>
              </>
            ) : slide === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Ces informations sont nécessaires pour continuer.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            {slide > 0 && slide < 5 && (
              <Button variant="outline" size="sm" onClick={() => setSlide((s) => s - 1)}>
                Précédent
              </Button>
            )}
            {slide >= 1 && slide <= 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="text-muted-foreground hover:text-foreground"
              >
                Passer cette étape
              </Button>
            )}
            {slide < TOTAL_SLIDES - 1 && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={slide === 0 && !fieldsValid && !minimalSaved}
              >
                {slide === 0 && !minimalSaved
                  ? (saving ? "Enregistrement…" : "C'est parti →")
                  : "Suivant"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   READ-ONLY SLIDES
   ═══════════════════════════════════════════════════════ */

const EntraideSlide = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Au-delà des gardes : l'entraide entre gens du coin.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Promener un chien ce soir. Arroser un potager le week-end. Partager un
      conseil sur une race que vous connaissez bien.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Les petites missions d'entraide, c'est l'échange au quotidien — vos
      compétences contre un repas, un service rendu, une connexion qui dure.
      Jamais d'argent. Juste du concret.
    </p>
    {/* Mock */}
    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold">Petites missions</p>
        <div className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">1 mission</div>
      </div>
      <div className="p-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5">M'aider à ramasser les légumes du potager</p>
            <p className="text-xs text-muted-foreground mb-1">Poleymieux · Demi-journée</p>
            <p className="text-xs text-muted-foreground italic">En échange : un gros panier de légumes</p>
          </div>
        </div>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        <div className="bg-muted rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary/40" />
            </div>
            <div>
              <p className="text-xs font-semibold">Marie</p>
              <p className="text-xs text-muted-foreground">Lyon</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Animaux</span>
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Jardin</span>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary/40" />
            </div>
            <div>
              <p className="text-xs font-semibold">Lilit</p>
              <p className="text-xs text-muted-foreground">Collonges</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Animaux</span>
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Cuisine</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SitterParcoursSlide = () => {
  const steps = [
    { icon: Send, title: "Vous postulez", desc: "Un message sincère et direct. C'est votre première impression." },
    { icon: MessageCircle, title: "Vous échangez", desc: "Une conversation, quelques questions. Souvent une rencontre avant le départ." },
    { icon: CheckCircle, title: "La garde est confirmée", desc: "Un accord de garde est généré automatiquement. Chacun valide à son rythme." },
    { icon: Star, title: "Vous vous évaluez mutuellement", desc: "Un avis croisé, des écussons choisis. Une relation qui peut durer." },
  ];
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">
        Une garde, c'est simple.
      </h2>
      <div className="flex flex-col gap-4 mt-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <Icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OwnerParcoursSlide = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Notre accord de garde.
      <br />
      Un engagement mutuel, généré automatiquement.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Quand la garde est confirmée, Guardiens génère automatiquement un document
      qui résume ce que vous avez prévu ensemble. Chacun lit. Chacun valide.
      Vous partez l'esprit léger.
    </p>
    {/* Mock accord */}
    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Notre accord de garde</p>
          <p className="text-xs text-muted-foreground mt-0.5">Garde du 14 mai au 21 mai 2026</p>
        </div>
        <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">Généré automatiquement</div>
      </div>
      <div className="px-4 py-2.5 border-b border-border">
        <p className="text-xs font-semibold mb-1.5">Les animaux concernés</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-3 h-3 text-primary" />
            <p className="text-xs text-muted-foreground">Rex · Chien · 3 ans</p>
          </div>
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-3 h-3 text-primary" />
            <p className="text-xs text-muted-foreground">Resa · Chat · 4 ans</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 bg-primary/5">
        <p className="text-xs text-muted-foreground text-center mb-2">
          J'ai lu cet accord et je confirme que son contenu correspond à ce que nous avons prévu.
        </p>
        <div className="bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-lg text-center">
          C'est bon pour moi →
        </div>
      </div>
    </div>
  </div>
);

export default OnboardingModal;
