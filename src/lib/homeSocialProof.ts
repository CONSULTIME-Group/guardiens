import { supabase } from "@/integrations/supabase/client";

export interface HomeSocialProof {
  proof_type: "avis" | "entraide";
  first_name: string;
  city: string;
  proof_text: string;
  happened_at: string;
}

export async function getHomeSocialProof(): Promise<HomeSocialProof[]> {
  const { data, error } = await (supabase.rpc as any)("home_social_proof");
  if (error) throw error;
  return (data ?? []) as HomeSocialProof[];
}

export const hasEnoughHomeSocialProof = (items: HomeSocialProof[]) => items.length >= 2;