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

      // Email transactionnel — best effort, ne bloque pas l'UX
      try {
        const [{ data: sitRow }, { data: ownerRow }, { data: sitterRow }] = await Promise.all([
          supabase.from("sits").select("title, start_date, end_date").eq("id", sitId).single(),
          supabase.from("profiles").select("first_name, city").eq("id", ownerId).single(),
          supabase.from("profiles").select("first_name").eq("id", sitterId).single(),
        ]);
        const { formatSitPeriod } = await import("@/lib/dateRange");
        const { sendTransactionalEmail } = await import("@/lib/sendTransactionalEmail");
        const period = formatSitPeriod(sitRow?.start_date, sitRow?.end_date);
        await sendTransactionalEmail({
          templateName: "sit-invitation",
          recipientUserId: sitterId,
          idempotencyKey: `sit-invite-${sitId}-${sitterId}`,
          templateData: {
            sitterFirstName: (sitterRow as any)?.first_name ?? null,
            ownerFirstName: (ownerRow as any)?.first_name ?? null,
            sitTitle: (sitRow as any)?.title ?? null,
            sitCity: (ownerRow as any)?.city ?? null,
            sitPeriod: period ? `du ${period}` : null,
            message: message?.trim() || null,
            sitId,
          },
        });
      } catch {
        // silencieux : la notif in-app est déjà envoyée par le trigger DB
      }
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
