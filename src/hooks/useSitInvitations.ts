/**
 * Hook React Query pour les invitations envoyées par un propriétaire sur SES annonces.
 * - list: toutes les invitations pour un sit donné
 * - create: insère une nouvelle invitation (gère erreurs quota / doublon)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SitInvitation {
  id: string;
  sit_id: string;
  owner_id: string;
  sitter_id: string;
  message: string | null;
  status: "sent" | "viewed" | "applied" | "declined";
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
}

export function useSitInvitations(sitId: string | undefined) {
  return useQuery({
    queryKey: ["sit_invitations", sitId],
    queryFn: async () => {
      if (!sitId) return [] as SitInvitation[];
      const { data, error } = await (supabase as any)
        .from("sit_invitations")
        .select("*")
        .eq("sit_id", sitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SitInvitation[];
    },
    enabled: !!sitId,
  });
}

export function useSendSitInvitation(sitId: string, ownerId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sitterId, message }: { sitterId: string; message: string }) => {
      const { error } = await (supabase as any).from("sit_invitations").insert({
        sit_id: sitId,
        owner_id: ownerId,
        sitter_id: sitterId,
        message: message?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sit_invitations", sitId] });
      toast({ title: "Invitation envoyée", description: "Le gardien recevra une notification." });
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast({ variant: "destructive", title: "Déjà invité", description: "Vous avez déjà invité ce gardien." });
      } else if (msg.includes("row-level security") || msg.includes("policy")) {
        toast({
          variant: "destructive",
          title: "Limite atteinte",
          description: "Vous avez atteint la limite de 20 invitations par 24 h, ou l'annonce n'est pas publiée.",
        });
      } else {
        toast({ variant: "destructive", title: "Envoi impossible", description: "Veuillez réessayer." });
      }
    },
  });
}
