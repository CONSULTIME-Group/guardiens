import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

// Exported so the page can recompute missing fields against the LIVE preview state
// (mergedData = data + localData) instead of the stale server snapshot.
export function computeOwnerMissingFields(d: OwnerProfileData, petsCount: number): { step: number; label: string }[] {
  const missing: { step: number; label: string }[] = [];
  if (!d.avatar_url) missing.push({ step: 1, label: "Photo de profil" });
  if (!d.first_name) missing.push({ step: 1, label: "Prénom" });
  if (!d.last_name) missing.push({ step: 1, label: "Nom" });
  if (!d.city) missing.push({ step: 1, label: "Ville" });
  if (!d.bio) missing.push({ step: 1, label: "Bio" });
  if (!d.property_type) missing.push({ step: 2, label: "Type de logement" });
  if (!d.environment) missing.push({ step: 2, label: "Environnement" });
  if (!d.description) missing.push({ step: 2, label: "Description du logement" });
  if (petsCount === 0) missing.push({ step: 3, label: "Ajouter un animal" });
  if (!d.presence_expected) missing.push({ step: 4, label: "Présence attendue" });
  if (!d.visits_allowed) missing.push({ step: 4, label: "Visites autorisées" });
  if (d.meeting_preference.length === 0) missing.push({ step: 4, label: "Préférence de rencontre" });
  if (!d.news_frequency) missing.push({ step: 4, label: "Fréquence des nouvelles" });
  return missing;
}

export interface OwnerProfileData {
  // Step 1 - Identity (profiles table)
  first_name: string;
  last_name: string;
  city: string;
  postal_code: string;
  bio: string;
  avatar_url: string;
  // Step 2 - Housing (properties table)
  property_type: string;
  environment: string;
  rooms_count: number;
  bedrooms_count: number;
  car_required: boolean;
  accessible: boolean;
  equipments: string[];
  photos: string[];
  description: string;
  region_highlights: string;
  // Owner environments (owner_profiles table)
  environments: string[];
  // Step 4 - Expectations (owner_profiles table)
  preferred_sitter_types: string[];
  presence_expected: string;
  experience_required: boolean;
  specific_expectations: string;
  visits_allowed: string;
  overnight_guest: string;
  space_usage: string[];
  smoker_accepted: string;
  rules_notes: string;
  // Step 5 - Communication
  meeting_preference: string[];
  handover_preference: string;
  welcome_notes: string;
  news_frequency: string;
  news_format: string[];
  preferred_time: string;
  communication_notes: string;
  // Skills (from profiles table)
  skill_categories: string[];
  available_for_help: boolean;
  // Owner competences (from owner_profiles table)
  owner_competences: string[];
  owner_competences_disponible: boolean;
  owner_skill_categories: string[];
}

export interface Pet {
  id?: string;
  property_id?: string;
  species: string;
  breed: string;
  name: string;
  age: number | null;
  photo_url: string;
  character: string;
  alone_duration: string;
  walk_duration: string;
  medication: string;
  food: string;
  special_needs: string;
  activity_level: string;
  owner_breed_note: string;
}

const defaultData: OwnerProfileData = {
  first_name: "", last_name: "", city: "", postal_code: "", bio: "", avatar_url: "",
  property_type: "", environment: "", rooms_count: 0, bedrooms_count: 0, car_required: false,
  accessible: false, equipments: [], photos: [], description: "", region_highlights: "",
  environments: [],
  preferred_sitter_types: [], presence_expected: "", experience_required: false,
  specific_expectations: "", visits_allowed: "", overnight_guest: "", space_usage: [],
  smoker_accepted: "", rules_notes: "",
  meeting_preference: [], handover_preference: "", welcome_notes: "",
  news_frequency: "", news_format: [], preferred_time: "", communication_notes: "",
  skill_categories: [], available_for_help: false,
  owner_competences: [], owner_competences_disponible: false, owner_skill_categories: [],
};

export function useOwnerProfile() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<OwnerProfileData>(defaultData);
  const [pets, setPets] = useState<Pet[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return;
    if (!opts?.silent) setLoading(true);

    const [profileRes, propertyRes, ownerRes, sitterRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("sitter_profiles").select("competences").eq("user_id", user.id).maybeSingle(),
    ]);

    const p = profileRes.data;
    const prop = propertyRes.data;
    const o = ownerRes.data;
    const sitter = sitterRes.data;

    // If owner has no competences yet, pre-populate from sitter profile
    const ownerCompetences = ((o as any)?.competences || []).length > 0
      ? (o as any).competences
      : ((sitter as any)?.competences || []);

    setData({
      first_name: p?.first_name || "", last_name: p?.last_name || "",
      city: p?.city || "", postal_code: p?.postal_code || "",
      bio: p?.bio || "", avatar_url: p?.avatar_url || "",
      property_type: prop?.type || "", environment: prop?.environment || "",
      rooms_count: prop?.rooms_count || 0, bedrooms_count: prop?.bedrooms_count || 0,
      car_required: prop?.car_required || false, accessible: prop?.accessible || false,
      equipments: (prop as any)?.equipments || [], photos: (prop as any)?.photos || [],
      description: prop?.description || "", region_highlights: prop?.region_highlights || "",
      environments: (o as any)?.environments || [],
      preferred_sitter_types: o?.preferred_sitter_types || [],
      presence_expected: o?.presence_expected || "",
      experience_required: o?.experience_required || false,
      specific_expectations: o?.specific_expectations || "",
      visits_allowed: o?.visits_allowed || "",
      overnight_guest: o?.overnight_guest || "",
      space_usage: o?.space_usage || [],
      smoker_accepted: o?.smoker_accepted || "",
      rules_notes: o?.rules_notes || "",
      meeting_preference: o?.meeting_preference || [],
      handover_preference: o?.handover_preference || "",
      welcome_notes: o?.welcome_notes || "",
      news_frequency: o?.news_frequency || "",
      news_format: o?.news_format || [],
      preferred_time: o?.preferred_time || "",
      communication_notes: o?.communication_notes || "",
      skill_categories: (p as any)?.skill_categories || [],
      available_for_help: (p as any)?.available_for_help || false,
      owner_competences: ownerCompetences,
      owner_competences_disponible: (o as any)?.competences_disponible ?? (sitter as any)?.competences_disponible ?? false,
      owner_skill_categories: (p as any)?.skill_categories || [],
    });
    setLastSyncedAt(
      [p?.updated_at, o?.updated_at]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
    );

    if (prop) {
      setPropertyId(prop.id);
      const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", prop.id);
      setPets(petsData?.map(a => ({
        id: a.id, property_id: a.property_id, species: a.species, breed: a.breed || "",
        name: a.name, age: a.age, photo_url: a.photo_url || "", character: a.character || "",
        alone_duration: a.alone_duration || "never", walk_duration: a.walk_duration || "none",
        medication: a.medication || "", food: a.food || "", special_needs: a.special_needs || "",
        activity_level: a.activity_level || "moderate",
        owner_breed_note: (a as any).owner_breed_note || "",
      })) || []);
    } else {
      setPropertyId(null);
      setPets([]);
    }
    setOwnerProfileId(o?.id ?? null);

    if (!opts?.silent) setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Canonical score from profiles.profile_completion (RPC calculate_profile_completion).
  // Local computeCompletion was removed to avoid divergence with the dashboard.
  const [completion, setCompletion] = useState<number>(0);
  const refreshCompletion = useCallback(async () => {
    if (!user) return;
    const { data: row } = await supabase
      .from("profiles")
      .select("profile_completion")
      .eq("id", user.id)
      .maybeSingle();
    setCompletion(row?.profile_completion || 0);
  }, [user]);
  useEffect(() => { refreshCompletion(); }, [refreshCompletion]);


  const computeMissingFields = useCallback((d: OwnerProfileData, petsCount: number): { step: number; label: string }[] => {
    return computeOwnerMissingFields(d, petsCount);
  }, []);

  const saveStep = useCallback(async (stepData: Partial<OwnerProfileData>): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const previousData = data;
    const newData = { ...data, ...stepData };
    setData(newData);

    try {
      // Profile fields
      const profileFields = ["first_name", "last_name", "city", "postal_code", "bio", "avatar_url", "skill_categories", "available_for_help"] as const;
      const profileUpdate: any = {};
      profileFields.forEach(f => { if (f in stepData) profileUpdate[f] = (stepData as any)[f]; });
      // Owner skill categories alias → canonical profiles.skill_categories
      if ("owner_skill_categories" in stepData) {
        profileUpdate.skill_categories = (stepData as any).owner_skill_categories;
      }
      // profile_completion is recomputed server-side via RPC after writes (canonical barème)
      if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
        if (error) throw error;
      }

      // Property fields
      const propFieldMap: Record<string, string> = {
        property_type: "type", environment: "environment",
        rooms_count: "rooms_count", bedrooms_count: "bedrooms_count",
        car_required: "car_required", accessible: "accessible",
        equipments: "equipments", photos: "photos",
        description: "description", region_highlights: "region_highlights",
      };
      const propUpdate: any = {};
      Object.entries(propFieldMap).forEach(([local, db]) => {
        if (local in stepData) propUpdate[db] = (stepData as any)[local];
      });
      if (Object.keys(propUpdate).length > 0) {
        if (propertyId) {
          const { error } = await supabase.from("properties").update(propUpdate).eq("id", propertyId);
          if (error) throw error;
        } else {
          const { data: newProp, error } = await supabase
            .from("properties").insert({ ...propUpdate, user_id: user.id }).select("id").single();
          if (error) throw error;
          if (newProp) setPropertyId(newProp.id);
        }
      }

      // Owner profile fields
      const ownerFields = [
        "preferred_sitter_types", "presence_expected", "experience_required",
        "specific_expectations", "visits_allowed", "overnight_guest", "space_usage",
        "smoker_accepted", "rules_notes", "meeting_preference", "handover_preference",
        "welcome_notes", "news_frequency", "news_format", "preferred_time", "communication_notes",
        "environments",
      ] as const;
      const ownerUpdate: any = {};
      ownerFields.forEach(f => { if (f in stepData) ownerUpdate[f] = (stepData as any)[f]; });
      // Map owner-specific competence fields
      if ("owner_competences" in stepData) ownerUpdate.competences = (stepData as any).owner_competences;
      if ("owner_competences_disponible" in stepData) ownerUpdate.competences_disponible = (stepData as any).owner_competences_disponible;
      if (Object.keys(ownerUpdate).length > 0) {
        if (ownerProfileId) {
          const { error } = await supabase.from("owner_profiles").update(ownerUpdate).eq("id", ownerProfileId);
          if (error) throw error;
        } else {
          const { data: newOwner, error } = await supabase
            .from("owner_profiles").insert({ ...ownerUpdate, user_id: user.id }).select("id").single();
          if (error) throw error;
          if (newOwner) setOwnerProfileId(newOwner.id);
        }
      }

      // Recompute canonical completion server-side and refresh local + global state
      await supabase.rpc("calculate_profile_completion", { p_user_id: user.id });
      // Re-fetch fresh data from DB so the sidebar reflects committed state immediately.
      await fetchData({ silent: true });
      await refreshCompletion();
      await refreshProfile();

      toast({ title: "Sauvegardé", description: "Vos modifications ont été enregistrées." });
      return true;
    } catch (error) {
      logger.error("Failed to save owner profile", { error: String(error) });
      setData(previousData);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, data, pets.length, propertyId, ownerProfileId, fetchData, refreshCompletion, refreshProfile, toast]);

  const addPet = useCallback(async (pet: Pet) => {
    const pid = propertyId;
    if (!pid && !user) return;
    let currentPropId = pid;
    if (!currentPropId) {
      const { data: newProp } = await supabase
        .from("properties").insert({ user_id: user!.id }).select("id").single();
      if (newProp) { currentPropId = newProp.id; setPropertyId(newProp.id); }
    }
    if (!currentPropId) return;
    const { data: created } = await supabase.from("pets").insert({
      property_id: currentPropId,
      species: pet.species as any, breed: pet.breed, name: pet.name, age: pet.age,
      photo_url: pet.photo_url || null, character: pet.character,
      alone_duration: pet.alone_duration as any, walk_duration: pet.walk_duration as any,
      medication: pet.medication, food: pet.food, special_needs: pet.special_needs,
      activity_level: pet.activity_level as any,
    }).select().single();
    if (created) setPets(prev => [...prev, { ...pet, id: created.id, property_id: currentPropId! }]);
  }, [propertyId, user]);

  const updatePet = useCallback(async (pet: Pet) => {
    if (!pet.id) return;
    await supabase.from("pets").update({
      species: pet.species as any, breed: pet.breed, name: pet.name, age: pet.age,
      photo_url: pet.photo_url || null, character: pet.character,
      alone_duration: pet.alone_duration as any, walk_duration: pet.walk_duration as any,
      medication: pet.medication, food: pet.food, special_needs: pet.special_needs,
      activity_level: pet.activity_level as any,
    }).eq("id", pet.id);
    setPets(prev => prev.map(p => p.id === pet.id ? pet : p));
  }, []);

  const removePet = useCallback(async (id: string) => {
    await supabase.from("pets").delete().eq("id", id);
    setPets(prev => prev.filter(p => p.id !== id));
  }, []);

  const uploadPhoto = useCallback(async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = bucket === "avatars"
      ? `${user.id}/avatar-${Date.now()}.${ext}`
      : `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) { toast({ variant: "destructive", title: "Erreur", description: "Upload échoué." }); return null; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    if (bucket === "avatars") {
      const nextData = { ...data, avatar_url: publicUrl };
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        logger.error("Failed to persist owner avatar", { error: String(updateError) });
        toast({ variant: "destructive", title: "Erreur", description: "Photo envoyée mais non sauvegardée." });
        return null;
      }

      setData(nextData);
      await supabase.rpc("calculate_profile_completion", { p_user_id: user.id });
      await refreshCompletion();
      await refreshProfile();
    }

    return publicUrl;
  }, [user, toast, data, refreshCompletion, refreshProfile]);

  return {
    data, pets, loading, saving, propertyId, lastSyncedAt,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
    completion,
    missingFields: computeMissingFields(data, pets.length),
  };
}
