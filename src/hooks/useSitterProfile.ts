import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
}

export interface PastAnimal {
  id?: string;
  species: string;
  name: string;
  photo_url?: string;
}

const defaultData: SitterProfileData = {
  first_name: "", last_name: "", city: "", postal_code: "", bio: "", avatar_url: "",
  motivation: "",
  sitter_type: "", accompanied_by: "", smoker: false, availability_during: "", lifestyle: [],
  animal_types: [], experience_years: "", references_text: "",
  has_license: false, has_vehicle: false, geographic_radius: 30, min_duration: 3, max_duration: 21, availability_dates: [], is_available: false,
  strict_rules_ok: false, prefer_visitors: false, farm_animals_ok: false, preferences_notes: "",
  meeting_preference: [], handover_preference: "", languages: [], bonus_skills: [], interests: [],
};

export function useSitterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<SitterProfileData>(defaultData);
  const [pastAnimals, setPastAnimals] = useState<PastAnimal[]>([]);
  const [sitterProfileId, setSitterProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, sitterRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("sitter_profiles").select("*").eq("user_id", user.id).single(),
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
      geographic_radius: s?.geographic_radius || 30,
      min_duration: s?.min_duration || 3,
      max_duration: s?.max_duration || 21,
      availability_dates: (s?.availability_dates as any[]) || [],
      is_available: s?.is_available || false,
      strict_rules_ok: s?.strict_rules_ok || false,
      prefer_visitors: s?.prefer_visitors || false,
      farm_animals_ok: s?.farm_animals_ok || false,
      preferences_notes: s?.preferences_notes || "",
      meeting_preference: s?.meeting_preference || [],
      handover_preference: s?.handover_preference || "",
      languages: s?.languages || [],
      bonus_skills: s?.bonus_skills || [],
      interests: s?.interests || [],
    };

    setData(merged);

    if (s) {
      setSitterProfileId(s.id);
      const { data: animals } = await supabase
        .from("past_animals")
        .select("*")
        .eq("sitter_profile_id", s.id);
      setPastAnimals(animals?.map(a => ({ id: a.id, species: a.species, name: a.name, photo_url: a.photo_url || undefined })) || []);
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

  const saveStep = useCallback(async (stepData: Partial<SitterProfileData>) => {
    if (!user) return;
    setSaving(true);

    const newData = { ...data, ...stepData };
    setData(newData);

    try {
      // Save profile fields
      const profileFields = ["first_name", "last_name", "city", "postal_code", "bio", "avatar_url"] as const;
      const profileUpdate: any = {};
      profileFields.forEach(f => { if (f in stepData) profileUpdate[f] = (stepData as any)[f]; });

      const completion = computeCompletion(newData);
      profileUpdate.profile_completion = completion;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
      }

      // Save sitter profile fields
      const sitterFields = [
        "motivation", "sitter_type", "accompanied_by", "smoker", "availability_during",
        "lifestyle", "animal_types", "experience_years", "references_text",
        "has_license", "has_vehicle", "geographic_radius", "min_duration", "max_duration",
        "availability_dates", "is_available", "strict_rules_ok", "prefer_visitors", "farm_animals_ok",
        "preferences_notes", "meeting_preference", "handover_preference",
        "languages", "bonus_skills", "interests",
      ] as const;

      const sitterUpdate: any = {};
      sitterFields.forEach(f => { if (f in stepData) sitterUpdate[f] = (stepData as any)[f]; });

      if (Object.keys(sitterUpdate).length > 0) {
        if (sitterProfileId) {
          await supabase.from("sitter_profiles").update(sitterUpdate).eq("id", sitterProfileId);
        } else {
          const { data: newProfile } = await supabase
            .from("sitter_profiles")
            .insert({ ...sitterUpdate, user_id: user.id })
            .select("id")
            .single();
          if (newProfile) setSitterProfileId(newProfile.id);
        }
      }

      toast({ title: "Sauvegardé", description: "Vos modifications ont été enregistrées." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
    } finally {
      setSaving(false);
    }
  }, [user, data, sitterProfileId, computeCompletion, toast]);

  const addPastAnimal = useCallback(async (animal: PastAnimal) => {
    if (!sitterProfileId) return;
    const { data: created } = await supabase
      .from("past_animals")
      .insert({ sitter_profile_id: sitterProfileId, species: animal.species, name: animal.name, photo_url: animal.photo_url || null })
      .select()
      .single();
    if (created) setPastAnimals(prev => [...prev, { id: created.id, species: created.species, name: created.name, photo_url: created.photo_url || undefined }]);
  }, [sitterProfileId]);

  const removePastAnimal = useCallback(async (id: string) => {
    await supabase.from("past_animals").delete().eq("id", id);
    setPastAnimals(prev => prev.filter(a => a.id !== id));
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de télécharger la photo." });
      return null;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  }, [user, toast]);

  return {
    data, pastAnimals, loading, saving, sitterProfileId,
    saveStep, addPastAnimal, removePastAnimal, uploadAvatar,
    completion: computeCompletion(data),
    missingFields: computeMissingFields(data),
  };
}
