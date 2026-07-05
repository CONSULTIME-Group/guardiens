import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ConvLike {
  id: string;
  owner_id: string;
  sitter_id: string;
  sit_id: string | null;
  small_mission_id: string | null;
  updated_at: string;
  archived_by: string[];
  unread_count: number;
}

interface Params<C extends ConvLike> {
  user: { id: string } | null;
  conversations: C[];
  setConversations: React.Dispatch<React.SetStateAction<C[]>>;
  activeConv: C | null;
  setActiveConv: (c: C | null) => void;
  loading: boolean;
  isMobile: boolean;
  enrichConv: (raw: any, otherProfile: any) => C;
}

/**
 * Gère l'auto-ouverture d'une conversation depuis l'URL :
 *   - ?gardien=<userId>  → ouvre la conv existante avec ce gardien, sinon en crée une (sitter_inquiry)
 *   - ?c=<convId>        → ouvre directement (alias supportés : ?conversation, ?conv, ?conversationId)
 *   - fallback desktop   → ouvre la conv non-lue la plus récente
 *
 * Le flag interne `autoOpened` est porté par un effet local pour ne tenter
 * qu'une seule fois par cycle de mount, évitant les races sur arrivée tardive.
 */
export function useAutoOpenConversation<C extends ConvLike>({
  user,
  conversations,
  setConversations,
  activeConv,
  setActiveConv,
  loading,
  isMobile,
  enrichConv,
}: Params<C>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Cas 1 : ?gardien= ──
  useEffect(() => {
    const gardienId = searchParams.get("gardien");
    if (!gardienId || !user || loading) return;
    // Garde : ne jamais déclencher la RPC sur soi-même (sinon 400 côté serveur).
    if (gardienId === user.id) {
      const next = new URLSearchParams(searchParams);
      next.delete("gardien");
      setSearchParams(next, { replace: true });
      return;
    }
    // Garde : ignorer un id qui n'est pas un UUID valide.
    if (!/^[0-9a-f-]{36}$/i.test(gardienId)) {
      const next = new URLSearchParams(searchParams);
      next.delete("gardien");
      setSearchParams(next, { replace: true });
      return;
    }

    const candidates = conversations.filter((c) => {
      const otherId = c.owner_id === user.id ? c.sitter_id : c.owner_id;
      return otherId === gardienId;
    });
    const existing =
      candidates.sort((a, b) => {
        if (a.sit_id && !b.sit_id) return -1;
        if (!a.sit_id && b.sit_id) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })[0] || null;

    if (existing) {
      setActiveConv(existing);
      const next = new URLSearchParams(searchParams);
      next.delete("gardien");
      setSearchParams(next, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: newConvId, error } = await supabase.rpc("get_or_create_conversation", {
          p_other_user_id: gardienId,
          p_context_type: "sitter_inquiry",
          p_sit_id: null,
          p_small_mission_id: null,
        });
        if (cancelled || error || !newConvId) return;

        const { data: newConv } = await supabase
          .from("conversations").select("*").eq("id", newConvId as string).single();
        if (cancelled || !newConv) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, first_name, avatar_url, identity_verified, city, is_founder")
          .eq("id", gardienId)
          .single();

        const enriched = enrichConv(newConv, profileData);
        setConversations((prev) => [enriched, ...prev]);
        setActiveConv(enriched);
        const next = new URLSearchParams(searchParams);
        next.delete("gardien");
        setSearchParams(next, { replace: true });
      } catch {
        /* silently fail */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("gardien"), user?.id, loading]);

  // ── Cas 2 : ?c= / ?conversation= / ?conv= / ?conversationId= ──
  useEffect(() => {
    const convId =
      searchParams.get("c") ||
      searchParams.get("conversation") ||
      searchParams.get("conv") ||
      searchParams.get("conversationId");
    if (!convId || !user) return;

    const target = conversations.find((c) => c.id === convId);
    if (target) {
      setActiveConv(target);
      const next = new URLSearchParams(searchParams);
      next.delete("conversation");
      next.delete("conv");
      next.delete("conversationId");
      next.set("c", convId);
      setSearchParams(next, { replace: true });
      return;
    }

    if (loading) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: fetchedConv } = await supabase
          .from("conversations").select("*").eq("id", convId).single();
        if (cancelled || !fetchedConv) return;
        const otherId =
          fetchedConv.owner_id === user.id ? fetchedConv.sitter_id : fetchedConv.owner_id;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, first_name, avatar_url, identity_verified, city, is_founder")
          .eq("id", otherId)
          .single();
        const enriched = enrichConv(fetchedConv, profileData);
        setConversations((prev) =>
          prev.some((c) => c.id === enriched.id) ? prev : [enriched, ...prev]
        );
        setActiveConv(enriched);
        const next = new URLSearchParams(searchParams);
        next.delete("conversation");
        next.delete("conv");
        next.delete("conversationId");
        next.set("c", convId);
        setSearchParams(next, { replace: true });
      } catch {
        /* silently fail */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.get("c"),
    searchParams.get("conversation"),
    searchParams.get("conv"),
    searchParams.get("conversationId"),
    user?.id,
    loading,
    conversations.length,
  ]);

  // ── Cas 3 : fallback desktop — ouvre la conv non-lue la plus récente ──
  useEffect(() => {
    if (loading || isMobile || activeConv || !user) return;
    const hasUrlParam =
      searchParams.get("c") || searchParams.get("conversation") ||
      searchParams.get("conv") || searchParams.get("conversationId") ||
      searchParams.get("gardien");
    if (hasUrlParam) return;
    const unread = conversations.find(
      (c) => c.unread_count > 0 && !c.archived_by.includes(user.id)
    );
    if (unread) setActiveConv(unread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isMobile, conversations.length, user?.id]);
}
