import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export interface SitterProfileData {
  // Step 1 - Identity (from profiles table)
  first_name: string;
  last_name: string;
  city: string;
  postal_code: string;
  bio: string;
  avatar_url: string;
  // Step 1 - from sitter_profiles
  motivation: string;
  // Step 2
  sitter_type: string;
  accompanied_by: string;
  smoker: boolean;
  availability_during: string;
  lifestyle: string[];
  // Step 3
  animal_types: string[];
  experience_years: string;
  references_text: string;
  // Step 4
  has_license: boolean;
  has_vehicle: boolean;
  geographic_radius: number;
  min_duration: number;
  max_duration: number;
  availability_dates: any[];
  is_available: boolean;
  min_stay_duration: string;
  preferred_frequency: string;
  min_notice: string;
  preferred_periods: string[];
  preferred_environments: string[];
  // Step 5
  strict_rules_ok: boolean;
  prefer_visitors: boolean;
  farm_animals_ok: boolean;
  preferences_notes: string;
  meeting_preference: string[];
  handover_preference: string;
  languages: string[];
  bonus_skills: string[];
  interests: string[];
  // Skills
  skill_categories: string[];
  available_for_help: boolean;
  // Competences
  competences: string[];
}

export interface PastAnimal {
  id?: string;
  species: string;
  name: string;
  breed?: string;
  photo_url?: string;
}

const defaultData: SitterProfileData = {
  first_name: "", last_name: "", city: "", postal_code: "", bio: "", avatar_url: "",
  motivation: "",
  sitter_type: "", accompanied_by: "", smoker: false, availability_during: "", lifestyle: [],
  animal_types: [], experience_years: "", references_text: "",
  has_license: false, has_vehicle: false, geographic_radius: 15, min_duration: 3, max_duration: 21, availability_dates: [], is_available: false,
  min_stay_duration: "flexible", preferred_frequency: "flexible", min_notice: "asap", preferred_periods: [], preferred_environments: [],
  strict_rules_ok: false, prefer_visitors: false, farm_animals_ok: false, preferences_notes: "",
  meeting_preference: [], handover_preference: "", languages: [], bonus_skills: [], interests: [],
  skill_categories: [], available_for_help: false,
  competences: [],
};

export function useSitterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<SitterProfileData>(defaultData);
  const [pastAnimals, setPastAnimals] = useState<PastAnimal[]>([]);
  const [sitterProfileId, setSitterProfileId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, sitterRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const p = profileRes.data;
    const s = sitterRes.data;

    const merged: SitterProfileData = {
      first_name: p?.first_name || "",
      last_name: p?.last_name || "",
      city: p?.city || "",
      postal_code: p?.postal_code || "",
      bio: p?.bio || "",
      avatar_url: p?.avatar_url || "",
      motivation: s?.motivation || "",
      sitter_type: s?.sitter_type || "",
      accompanied_by: s?.accompanied_by || "",
      smoker: s?.smoker || false,
      availability_during: s?.availability_during || "",
      lifestyle: s?.lifestyle || [],
      animal_types: s?.animal_types || [],
      experience_years: s?.experience_years || "",
      references_text: s?.references_text || "",
      has_license: s?.has_license || false,
      has_vehicle: s?.has_vehicle || false,
      geographic_radius: s?.geographic_radius || 15,
      min_duration: s?.min_duration || 3,
      max_duration: s?.max_duration || 21,
      availability_dates: (s?.availability_dates as any[]) || [],
      is_available: s?.is_available || false,
       strict_rules_ok: s?.strict_rules_ok || false,
       min_stay_duration: (s as any)?.min_stay_duration || "flexible",
       preferred_frequency: (s as any)?.preferred_frequency || "flexible",
       min_notice: (s as any)?.min_notice || "asap",
       preferred_periods: (s as any)?.preferred_periods || [],
       preferred_environments: (s as any)?.preferred_environments || [],
      prefer_visitors: s?.prefer_visitors || false,
      farm_animals_ok: s?.farm_animals_ok || false,
      preferences_notes: s?.preferences_notes || "",
      meeting_preference: s?.meeting_preference || [],
      handover_preference: s?.handover_preference || "",
      languages: s?.languages || [],
      bonus_skills: s?.bonus_skills || [],
      interests: s?.interests || [],
      skill_categories: (p as any)?.skill_categories || [],
      available_for_help: (p as any)?.available_for_help || false,
      competences: (s as any)?.competences || [],
    };

    setData(merged);
    setLastSyncedAt(
      [p?.updated_at, s?.updated_at]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
    );

    if (s) {
      setSitterProfileId(s.id);
      const { data: animals } = await supabase
        .from("past_animals")
        .select("*")
        .eq("sitter_profile_id", s.id);
      setPastAnimals(animals?.map(a => ({ id: a.id, species: a.species, name: a.name, breed: (a as any).breed || undefined, photo_url: a.photo_url || undefined })) || []);
    } else {
      setSitterProfileId(null);
      setPastAnimals([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const computeCompletion = useCallback((d: SitterProfileData): number => {
    let total = 0;
    // Step 1 (25%): avatar, first_name, last_name, city, bio, motivation
    const s1Fields = [d.avatar_url, d.first_name, d.last_name, d.city, d.bio, d.motivation];
    const s1 = s1Fields.filter(Boolean).length / s1Fields.length;
    total += s1 * 25;
    // Step 2 (15%): sitter_type, availability_during, lifestyle
    const s2 = [d.sitter_type, d.availability_during, d.lifestyle.length > 0].filter(Boolean).length / 3;
    total += s2 * 15;
    // Step 3 (20%): animal_types, experience_years, references_text
    const s3 = [d.animal_types.length > 0, d.experience_years, d.references_text].filter(Boolean).length / 3;
    total += s3 * 20;
    // Step 4 (20%): has_license or has_vehicle, availability_dates
    const s4 = [d.has_license || d.has_vehicle, d.availability_dates.length > 0].filter(Boolean).length / 2;
    total += s4 * 20;
    // Step 5 (20%): languages, meeting_preference, handover_preference
    const s5 = [d.languages.length > 0, d.meeting_preference.length > 0, d.handover_preference].filter(Boolean).length / 3;
    total += s5 * 20;
    return Math.round(total);
  }, []);

  const computeMissingFields = useCallback((d: SitterProfileData): { step: number; label: string }[] => {
    const missing: { step: number; label: string }[] = [];
    if (!d.avatar_url) missing.push({ step: 1, label: "Photo de profil" });
    if (!d.first_name) missing.push({ step: 1, label: "Prénom" });
    if (!d.last_name) missing.push({ step: 1, label: "Nom" });
    if (!d.city) missing.push({ step: 1, label: "Ville" });
    if (!d.bio) missing.push({ step: 1, label: "Bio" });
    if (!d.motivation) missing.push({ step: 1, label: "Motivation" });
    if (!d.sitter_type) missing.push({ step: 2, label: "Type de gardien" });
    if (!d.availability_during) missing.push({ step: 2, label: "Disponibilité" });
    if (d.lifestyle.length === 0) missing.push({ step: 2, label: "Mode de vie" });
    if (d.animal_types.length === 0) missing.push({ step: 3, label: "Types d'animaux" });
    if (!d.experience_years) missing.push({ step: 3, label: "Années d'expérience" });
    if (!d.references_text) missing.push({ step: 3, label: "Références" });
    if (!d.has_license && !d.has_vehicle) missing.push({ step: 4, label: "Permis ou véhicule" });
    if (d.availability_dates.length === 0) missing.push({ step: 4, label: "Dates de disponibilité" });
    if (d.languages.length === 0) missing.push({ step: 5, label: "Langues" });
    if (d.meeting_preference.length === 0) missing.push({ step: 5, label: "Préférence de rencontre" });
    if (!d.handover_preference) missing.push({ step: 5, label: "Préférence de passation" });
    return missing;
  }, []);

  const saveStep = useCallback(async (stepData: Partial<SitterProfileData>): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const previousData = data;

    const newData = { ...data, ...stepData };
    setData(newData);

    try {
      // Save profile fields
      const profileFields = ["first_name", "last_name", "city", "postal_code", "bio", "avatar_url", "skill_categories", "available_for_help"] as const;
      const profileUpdate: any = {};
      profileFields.forEach(f => { if (f in stepData) profileUpdate[f] = (stepData as any)[f]; });

      const completion = computeCompletion(newData);
      profileUpdate.profile_completion = completion;

      if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
        if (error) throw error;
      }

      // Save sitter profile fields
      const sitterFields = [
        "motivation", "sitter_type", "accompanied_by", "smoker", "availability_during",
        "lifestyle", "animal_types", "experience_years", "references_text",
        "has_license", "has_vehicle", "geographic_radius", "min_duration", "max_duration",
        "availability_dates", "is_available", "strict_rules_ok", "prefer_visitors", "farm_animals_ok",
        "preferences_notes", "meeting_preference", "handover_preference",
        "languages", "bonus_skills", "interests", "competences",
        "min_stay_duration", "preferred_frequency", "min_notice", "preferred_periods", "preferred_environments",
      ] as const;

      const sitterUpdate: any = {};
      sitterFields.forEach(f => { if (f in stepData) sitterUpdate[f] = (stepData as any)[f]; });

      if (Object.keys(sitterUpdate).length > 0) {
        if (sitterProfileId) {
          const { error } = await supabase.from("sitter_profiles").update(sitterUpdate).eq("id", sitterProfileId);
          if (error) throw error;
        } else {
          const { data: newProfile, error } = await supabase
            .from("sitter_profiles")
            .insert({ ...sitterUpdate, user_id: user.id })
            .select("id")
            .single();
          if (error) throw error;
          if (newProfile) setSitterProfileId(newProfile.id);
        }
      }

      toast({ title: "Sauvegardé", description: "Vos modifications ont été enregistrées." });
      return true;
    } catch (error) {
      logger.error("Failed to save sitter profile", { error: String(error) });
      setData(previousData);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, data, sitterProfileId, computeCompletion, toast]);

  const addPastAnimal = useCallback(async (animal: PastAnimal) => {
    if (!sitterProfileId) return;
    const { data: created } = await supabase
      .from("past_animals")
      .insert({
        sitter_profile_id: sitterProfileId,
        species: animal.species,
        name: animal.name,
        photo_url: animal.photo_url || null,
        breed: animal.breed || null,
      } as any)
      .select()
      .single();
    if (created) setPastAnimals(prev => [...prev, { id: created.id, species: created.species, name: created.name, breed: (created as any).breed || undefined, photo_url: created.photo_url || undefined }]);
  }, [sitterProfileId]);

  const removePastAnimal = useCallback(async (id: string) => {
    await supabase.from("past_animals").delete().eq("id", id);
    setPastAnimals(prev => prev.filter(a => a.id !== id));
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de télécharger la photo." });
      return null;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    const nextData = { ...data, avatar_url: publicUrl };
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        profile_completion: computeCompletion(nextData),
      })
      .eq("id", user.id);

    if (updateError) {
      logger.error("Failed to persist sitter avatar", { error: String(updateError) });
      toast({ variant: "destructive", title: "Erreur", description: "Photo envoyée mais non sauvegardée." });
      return null;
    }

    setData(nextData);
    return publicUrl;
  }, [user, toast, data, computeCompletion]);

  return {
    data, pastAnimals, loading, saving, sitterProfileId, lastSyncedAt,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
    completion: computeCompletion(data),
    missingFields: computeMissingFields(data),
  };
}
