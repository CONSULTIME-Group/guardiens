import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
}

const defaultData: OwnerProfileData = {
  first_name: "", last_name: "", city: "", postal_code: "", bio: "", avatar_url: "",
  property_type: "", environment: "", rooms_count: 0, bedrooms_count: 0, car_required: false,
  accessible: false, equipments: [], photos: [], description: "", region_highlights: "",
  preferred_sitter_types: [], presence_expected: "", experience_required: false,
  specific_expectations: "", visits_allowed: "", overnight_guest: "", space_usage: [],
  smoker_accepted: "", rules_notes: "",
  meeting_preference: [], handover_preference: "", welcome_notes: "",
  news_frequency: "", news_format: [], preferred_time: "", communication_notes: "",
};

export function useOwnerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<OwnerProfileData>(defaultData);
  const [pets, setPets] = useState<Pet[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, propertyRes, ownerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
      supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const p = profileRes.data;
    const prop = propertyRes.data;
    const o = ownerRes.data;

    setData({
      first_name: p?.first_name || "", last_name: p?.last_name || "",
      city: p?.city || "", postal_code: p?.postal_code || "",
      bio: p?.bio || "", avatar_url: p?.avatar_url || "",
      property_type: prop?.type || "", environment: prop?.environment || "",
      rooms_count: prop?.rooms_count || 0, bedrooms_count: prop?.bedrooms_count || 0,
      car_required: prop?.car_required || false, accessible: prop?.accessible || false,
      equipments: (prop as any)?.equipments || [], photos: (prop as any)?.photos || [],
      description: prop?.description || "", region_highlights: prop?.region_highlights || "",
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
    });

    if (prop) {
      setPropertyId(prop.id);
      const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", prop.id);
      setPets(petsData?.map(a => ({
        id: a.id, property_id: a.property_id, species: a.species, breed: a.breed || "",
        name: a.name, age: a.age, photo_url: a.photo_url || "", character: a.character || "",
        alone_duration: a.alone_duration || "never", walk_duration: a.walk_duration || "none",
        medication: a.medication || "", food: a.food || "", special_needs: a.special_needs || "",
        activity_level: a.activity_level || "moderate",
      })) || []);
    }
    if (o) setOwnerProfileId(o.id);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const computeCompletion = useCallback((d: OwnerProfileData, petsCount: number): number => {
    let total = 0;
    // Step 1 (20%): avatar, first_name, last_name, city, bio
    const s1 = [d.avatar_url, d.first_name, d.last_name, d.city, d.bio].filter(Boolean).length / 5;
    total += s1 * 20;
    // Step 2 (20%): property_type, environment, description
    const s2 = [d.property_type, d.environment, d.description].filter(Boolean).length / 3;
    total += s2 * 20;
    // Step 3 (20%): at least one pet
    total += petsCount > 0 ? 20 : 0;
    // Step 4 (20%): presence_expected, visits_allowed
    const s4 = [d.presence_expected, d.visits_allowed].filter(Boolean).length / 2;
    total += s4 * 20;
    // Step 5 (10%): meeting_preference, news_frequency
    const s5 = [d.meeting_preference.length > 0, d.news_frequency].filter(Boolean).length / 2;
    total += s5 * 10;
    // Step 6 (10%): calendar - always partial for now
    total += 0;
    return Math.round(total);
  }, []);

  const saveStep = useCallback(async (stepData: Partial<OwnerProfileData>) => {
    if (!user) return;
    setSaving(true);
    const newData = { ...data, ...stepData };
    setData(newData);

    try {
      // Profile fields
      const profileFields = ["first_name", "last_name", "city", "postal_code", "bio", "avatar_url"] as const;
      const profileUpdate: any = {};
      profileFields.forEach(f => { if (f in stepData) profileUpdate[f] = (stepData as any)[f]; });
      profileUpdate.profile_completion = computeCompletion(newData, pets.length);
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
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
          await supabase.from("properties").update(propUpdate).eq("id", propertyId);
        } else {
          const { data: newProp } = await supabase
            .from("properties").insert({ ...propUpdate, user_id: user.id }).select("id").single();
          if (newProp) setPropertyId(newProp.id);
        }
      }

      // Owner profile fields
      const ownerFields = [
        "preferred_sitter_types", "presence_expected", "experience_required",
        "specific_expectations", "visits_allowed", "overnight_guest", "space_usage",
        "smoker_accepted", "rules_notes", "meeting_preference", "handover_preference",
        "welcome_notes", "news_frequency", "news_format", "preferred_time", "communication_notes",
      ] as const;
      const ownerUpdate: any = {};
      ownerFields.forEach(f => { if (f in stepData) ownerUpdate[f] = (stepData as any)[f]; });
      if (Object.keys(ownerUpdate).length > 0) {
        if (ownerProfileId) {
          await supabase.from("owner_profiles").update(ownerUpdate).eq("id", ownerProfileId);
        } else {
          const { data: newOwner } = await supabase
            .from("owner_profiles").insert({ ...ownerUpdate, user_id: user.id }).select("id").single();
          if (newOwner) setOwnerProfileId(newOwner.id);
        }
      }

      toast({ title: "Sauvegardé", description: "Vos modifications ont été enregistrées." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
    } finally {
      setSaving(false);
    }
  }, [user, data, pets.length, propertyId, ownerProfileId, computeCompletion, toast]);

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
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast({ variant: "destructive", title: "Erreur", description: "Upload échoué." }); return null; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  }, [user, toast]);

  return {
    data, pets, loading, saving, propertyId,
    saveStep, addPet, updatePet, removePet, uploadPhoto,
    completion: computeCompletion(data, pets.length),
  };
}
