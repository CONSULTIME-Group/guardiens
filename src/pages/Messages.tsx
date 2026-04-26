import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Archive, X, Home, HeartHandshake, MessageSquare, Info, Search } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useSearchParams, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import HouseGuideBlock from "@/components/messages/HouseGuideBlock";
import ConversationHeader from "@/components/messages/ConversationHeader";
import ContextHeaderCard from "@/components/messages/ContextHeaderCard";
import PresenceBadge from "@/components/messages/PresenceBadge";
import DaySeparator from "@/components/messages/DaySeparator";
import MessageBubble from "@/components/messages/MessageBubble";
import { buildFirstMessageDraft, type ConversationContext } from "@/lib/conversation";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  sit_id: string | null;
  long_stay_id?: string | null;
  small_mission_id: string | null;
  owner_id: string;
  sitter_id: string;
  updated_at: string;
  archived_by: string[];
  context_type: string | null;
  sit?: { title: string; status: string; property_id: string; start_date?: string | null; end_date?: string | null; city?: string | null } | null;
  small_mission?: { id: string; title?: string | null; city?: string | null; date_needed?: string | null } | null;
  other_user?: { id: string; first_name: string; avatar_url: string | null; identity_verified: boolean; city?: string | null; is_founder?: boolean; last_seen_at?: string | null; show_last_seen?: boolean } | null;
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
  application_status?: string | null;
  other_user_rating?: number;
  other_user_is_emergency?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  photo_url: string | null;
  is_system: boolean;
  read_at: string | null;
  created_at: string;
  metadata: { action?: string; actor?: string; actor_id?: string; garde_id?: string; actor_name?: string; dates?: string } | null;
}

const appStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  viewed: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  discussing: { label: "En discussion", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Acceptée ✓", className: "bg-primary/10 text-primary" },
  rejected: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
};

const formatListDate = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier";
  return format(date, "d MMM", { locale: fr });
};

const capitalize = (s?: string | null) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

type ConvPill = "all" | "garde" | "mission" | "archived";

// ─── Suggested messages by context ─────────────────────────
const ownerGardeSuggestions = [
  "Bonjour, merci pour votre candidature !",
  "Pouvez-vous me dire plus sur votre expérience avec les chats ?",
  "Seriez-vous disponible pour une rencontre avant la garde ?",
];
const sitterGardeSuggestions = [
  "Bonjour, je suis très intéressé par cette garde.",
  "J'ai de l'expérience avec ce type d'animaux.",
  "Je serais disponible pour une rencontre si vous le souhaitez.",
];
const missionSuggestions = [
  "Bonjour, je peux vous aider !",
  "Quand seriez-vous disponible ?",
  "Qu'attendez-vous en échange ?",
];
const entraideContactSuggestions = [
  "Bonjour ! J'ai vu que vous étiez disponible pour aider.",
  "Quel type d'aide proposez-vous ?",
  "On pourrait en discuter ?",
];

const SuggestedMessages = ({
  messages: msgs, userId, activeConv, onSelect, isEntraideContact,
}: {
  messages: Message[]; userId?: string; activeConv: Conversation;
  onSelect: (text: string) => void; isEntraideContact?: boolean;
}) => {
  const userMsgs = msgs.filter(m => m.sender_id === userId && !m.is_system);
  if (userMsgs.length > 0) return null;

  const isOwner = activeConv.owner_id === userId;
  const isMission = !!activeConv.small_mission_id;

  let suggestions: string[];
  if (isEntraideContact) {
    suggestions = entraideContactSuggestions;
  } else if (isMission) {
    suggestions = missionSuggestions;
  } else if (isOwner) {
    suggestions = ownerGardeSuggestions;
  } else {
    suggestions = sitterGardeSuggestions;
  }

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="border border-border rounded-full px-3 py-1 text-xs text-foreground bg-card hover:bg-muted cursor-pointer transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

const Messages = () => {
  const { user, activeRole } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasAccess, loading: subLoading } = useSubscriptionAccess();
  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pill, setPill] = useState<ConvPill>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [isEntraideContact, setIsEntraideContact] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Fetch blocked users to filter them out
    const { data: blockedRows } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const blockedSet = new Set((blockedRows || []).map((b: any) => b.blocked_id));

    // Also fetch users who blocked us (hide their convs too)
    const { data: blockedByRows } = await supabase
      .from("blocked_users")
      .select("blocker_id")
      .eq("blocked_id", user.id);
    const blockedBySet = new Set((blockedByRows || []).map((b: any) => b.blocker_id));

    const filteredConvs = convs.filter((conv: any) => {
      const otherId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;
      return !blockedSet.has(otherId) && !blockedBySet.has(otherId);
    });

    const otherIds = filteredConvs.map((conv: any) => conv.owner_id === user.id ? conv.sitter_id : conv.owner_id);
    const convIds = filteredConvs.map((conv: any) => conv.id);
    const sitIds = filteredConvs.map((conv: any) => conv.sit_id).filter(Boolean);
    const missionIds = filteredConvs.map((conv: any) => conv.small_mission_id).filter(Boolean);

    const [profilesRes, allLastMsgsRes, allUnreadRes, ratingsRes, emergencyRes, sitsRes, applicationsRes, missionsRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, avatar_url, identity_verified, city, is_founder, last_seen_at").in("id", otherIds),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id").in("conversation_id", convIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id, id").in("conversation_id", convIds).neq("sender_id", user.id).is("read_at", null),
      supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", otherIds).eq("published", true),
      supabase.from("emergency_sitter_profiles").select("user_id, is_active").in("user_id", otherIds).eq("is_active", true),
      sitIds.length > 0
        ? supabase.from("sits").select("id, title, status, property_id, start_date, end_date, user_id").in("id", sitIds)
        : Promise.resolve({ data: [], error: null }),
      sitIds.length > 0
        ? supabase.from("applications").select("sit_id, sitter_id, status").in("sit_id", sitIds)
        : Promise.resolve({ data: [], error: null }),
      missionIds.length > 0
        ? supabase.from("small_missions").select("id, title, city, date_needed").in("id", missionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    // Résoudre la ville du propriétaire pour chaque sit (lieu de la garde)
    // — distinct de other_user.city qui peut être la ville du gardien.
    const ownerIdsForSits = Array.from(new Set((sitsRes.data || []).map((s: any) => s.user_id).filter(Boolean)));
    const missingOwnerIds = ownerIdsForSits.filter((id: string) => !profilesMap.has(id));
    if (missingOwnerIds.length > 0) {
      const { data: ownerProfiles } = await supabase
        .from("profiles").select("id, city").in("id", missingOwnerIds);
      (ownerProfiles || []).forEach((p: any) => {
        if (!profilesMap.has(p.id)) profilesMap.set(p.id, p);
      });
    }
    const sitsMap = new Map((sitsRes.data || []).map((s: any) => {
      const ownerCity = s.user_id ? (profilesMap.get(s.user_id)?.city ?? null) : null;
      return [s.id, { ...s, city: ownerCity }];
    }));
    const missionsMap = new Map((missionsRes.data || []).map((m: any) => [m.id, m]));

    const lastMsgMap = new Map<string, any>();
    (allLastMsgsRes.data || []).forEach((m: any) => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
    });

    const unreadMap = new Map<string, number>();
    (allUnreadRes.data || []).forEach((m: any) => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    const appMap = new Map<string, string>();
    (applicationsRes.data || []).forEach((a: any) => {
      appMap.set(`${a.sit_id}-${a.sitter_id}`, a.status);
    });

    const ratingMap = new Map<string, { sum: number; count: number }>();
    (ratingsRes.data || []).forEach((r: any) => {
      const cur = ratingMap.get(r.reviewee_id) || { sum: 0, count: 0 };
      ratingMap.set(r.reviewee_id, { sum: cur.sum + r.overall_rating, count: cur.count + 1 });
    });

    const emergencySet = new Set((emergencyRes.data || []).map((e: any) => e.user_id));

    const enriched = filteredConvs.map((conv: any) => {
      const otherId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;
      const sitterId = conv.sitter_id;
      const appStatus = conv.sit_id ? appMap.get(`${conv.sit_id}-${sitterId}`) : null;
      const rating = ratingMap.get(otherId);
      return {
        ...conv,
        archived_by: conv.archived_by || [],
        sit: conv.sit_id ? (sitsMap.get(conv.sit_id) || null) : null,
        small_mission: conv.small_mission_id ? (missionsMap.get(conv.small_mission_id) || null) : null,
        other_user: profilesMap.get(otherId) || null,
        last_message: lastMsgMap.get(conv.id) || null,
        unread_count: unreadMap.get(conv.id) || 0,
        application_status: appStatus || null,
        other_user_rating: rating ? rating.sum / rating.count : 0,
        other_user_is_emergency: emergencySet.has(otherId),
      } as Conversation;
    });

    enriched.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      const aDate = a.last_message?.created_at || a.updated_at;
      const bDate = b.last_message?.created_at || b.updated_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Auto-open conversation from query param (URL standardisée: ?c=, anciens params supportés)
  useEffect(() => {
    if (autoOpened) return;

    const gardienId = searchParams.get("gardien");
    const convId =
      searchParams.get("c") ||
      searchParams.get("conversation") ||
      searchParams.get("conv") ||
      searchParams.get("conversationId");

    // Handle ?gardien= : créer/récupérer conversation via RPC atomique
    if (gardienId && user && !loading) {
      const candidates = conversations.filter(c => {
        const otherId = c.owner_id === user.id ? c.sitter_id : c.owner_id;
        return otherId === gardienId;
      });
      const existing = candidates.sort((a, b) => {
        if (a.sit_id && !b.sit_id) return -1;
        if (!a.sit_id && b.sit_id) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })[0] || null;

      if (existing) {
        setActiveConv(existing);
        setIsEntraideContact(true);
        searchParams.delete("gardien");
        setSearchParams(searchParams, { replace: true });
        setAutoOpened(true);
        return;
      }

      // RPC atomique : sondage (sitter_inquiry) — pas de risque de pitch refusé ici
      (async () => {
        try {
          const { data: newConvId, error: rpcErr } = await supabase.rpc("get_or_create_conversation", {
            p_other_user_id: gardienId,
            p_context_type: "sitter_inquiry",
            p_sit_id: null,
            p_small_mission_id: null,
            p_long_stay_id: null,
          });
          if (rpcErr || !newConvId) return;

          const { data: newConv } = await supabase
            .from("conversations").select("*").eq("id", newConvId as string).single();
          if (!newConv) return;

          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, first_name, avatar_url, identity_verified, city, is_founder")
            .eq("id", gardienId)
            .single();

          const enriched: Conversation = {
            ...newConv,
            archived_by: newConv.archived_by || [],
            other_user: profileData || null,
            last_message: null,
            unread_count: 0,
            application_status: null,
            other_user_rating: 0,
            other_user_is_emergency: false,
          };

          setConversations(prev => [enriched, ...prev]);
          setActiveConv(enriched);
          setIsEntraideContact(true);
          searchParams.delete("gardien");
          setSearchParams(searchParams, { replace: true });
          setAutoOpened(true);
        } catch {
          // silently fail
        }
      })();
      return;
    }

    if (conversations.length === 0) return;

    if (convId) {
      const target = conversations.find(c => c.id === convId);
      if (target) {
        setActiveConv(target);
        // Normaliser l'URL : ?c=<id> uniquement
        const next = new URLSearchParams(searchParams);
        next.delete("conversation");
        next.delete("conv");
        next.delete("conversationId");
        next.set("c", convId);
        setSearchParams(next, { replace: true });
        setAutoOpened(true);
        return;
      }
      // Conversation not yet in local state — fetch it directly
      if (!autoOpened) {
        (async () => {
          try {
            const { data: fetchedConv } = await supabase
              .from("conversations")
              .select("*")
              .eq("id", convId)
              .single();
            if (!fetchedConv) return;
            const otherId = fetchedConv.owner_id === user?.id ? fetchedConv.sitter_id : fetchedConv.owner_id;
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, first_name, avatar_url, identity_verified, city, is_founder")
              .eq("id", otherId)
              .single();
            const enriched: Conversation = {
              ...fetchedConv,
              archived_by: fetchedConv.archived_by || [],
              other_user: profileData || null,
              last_message: null,
              unread_count: 0,
              application_status: null,
              other_user_rating: 0,
              other_user_is_emergency: false,
            };
            setConversations(prev => {
              if (prev.some(c => c.id === enriched.id)) return prev;
              return [enriched, ...prev];
            });
            setActiveConv(enriched);
            searchParams.delete("conversation");
            searchParams.delete("conv");
            searchParams.delete("conversationId");
            setSearchParams(searchParams, { replace: true });
            setAutoOpened(true);
          } catch {
            // silently fail
          }
        })();
        return;
      }
    }

    // Auto-open most recent unread
    const unread = conversations.find(c => c.unread_count > 0 && !c.archived_by.includes(user?.id || ""));
    if (unread) {
      setActiveConv(unread);
    }
    setAutoOpened(true);
  }, [conversations, searchParams, autoOpened, setSearchParams, user, loading]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);

    if (user) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }
  }, [user]);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
  }, [activeConv, loadMessages]);

  // Pré-remplir le 1er message UNIQUEMENT si :
  //  1) la conversation est totalement vide (aucun message non-système, peu importe l'expéditeur)
  //  2) ET le champ de saisie est vide (on n'écrase jamais ce que l'utilisateur tape)
  // Sinon, on informe l'utilisateur qu'aucun brouillon n'a été proposé (une seule fois par conv).
  const draftHandledConvRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeConv || !user) return;
    // On attend que les messages de la conv active soient chargés avant de décider
    // (évite un faux "vide" pendant le chargement initial).
    if (messages.length > 0 && messages[0].conversation_id !== activeConv.id) return;
    if (draftHandledConvRef.current === activeConv.id) return;

    const realMsgs = messages.filter(m => !m.is_system);
    const inputIsEmpty = newMessage.trim() === "";

    if (realMsgs.length === 0 && inputIsEmpty) {
      const ctx = (activeConv.context_type || "sitter_inquiry") as ConversationContext;
      const sitDates = activeConv.sit?.start_date && activeConv.sit?.end_date
        ? `${new Date(activeConv.sit.start_date).toLocaleDateString("fr-FR")} → ${new Date(activeConv.sit.end_date).toLocaleDateString("fr-FR")}`
        : null;
      const draft = buildFirstMessageDraft({
        context: ctx,
        recipientFirstName: activeConv.other_user?.first_name,
        city: activeConv.other_user?.city,
        sitTitle: activeConv.sit?.title || null,
        sitDates,
      });
      setNewMessage(draft);
      draftHandledConvRef.current = activeConv.id;
    } else if (realMsgs.length > 0) {
      // Conversation déjà entamée : pas de brouillon, on prévient discrètement.
      toast({
        title: "Conversation en cours",
        description: "Aucun message type proposé : la discussion est déjà entamée.",
      });
      draftHandledConvRef.current = activeConv.id;
    }
    // Si l'input n'est pas vide mais la conv est vide, on respecte la saisie en cours
    // sans marquer la conv comme traitée (au cas où l'utilisateur efface tout ensuite).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id, messages]);

  // Realtime
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (user && newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", newMsg.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !activeConv || !newMessage.trim()) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_id: user.id, content: newMessage.trim() });
    // last_message_at + first_message_sent gérés automatiquement par trigger DB
    setNewMessage("");
    setSending(false);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConv) return;
    const ext = file.name.split(".").pop();
    const path = `messages/${activeConv.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file);
    if (error) return;
    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
    await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_id: user.id, content: "", photo_url: urlData.publicUrl });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    loadConversations();
  };

  const handleArchive = async (conv: Conversation) => {
    if (!user) return;
    const newArchived = conv.archived_by.includes(user.id)
      ? conv.archived_by.filter(id => id !== user.id)
      : [...conv.archived_by, user.id];
    await supabase.from("conversations").update({ archived_by: newArchived } as any).eq("id", conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archived_by: newArchived } : c));
    if (activeConv?.id === conv.id && !conv.archived_by.includes(user.id)) setActiveConv(null);
    toast({ title: conv.archived_by.includes(user.id) ? "Conversation désarchivée" : "Conversation archivée" });
  };

  // ─── Reset active conv when role changes ───
  useEffect(() => {
    setActiveConv(null);
    setAutoOpened(false);
    loadConversations();
  }, [activeRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filtering ───
  const filteredConversations = conversations.filter(conv => {
    const isArchived = conv.archived_by.includes(user?.id || "");
    if (pill === "archived") return isArchived;
    if (isArchived) return false;

    // Role-based filtering: missions visible in both roles
    const isMission = !!conv.small_mission_id;
    if (!isMission && user) {
      if (effectiveRole === "owner" && conv.owner_id !== user.id) return false;
      if (effectiveRole === "sitter" && conv.sitter_id !== user.id) return false;
    }

    if (pill === "garde") return !!conv.sit_id;
    if (pill === "mission") return isMission;
    return true; // "all"
  });

  const displayConversations = filteredConversations.filter(conv => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const matchName = conv.other_user?.first_name?.toLowerCase().includes(q);
    const matchSit = conv.sit?.title?.toLowerCase().includes(q);
    return matchName || matchSit;
  });

  const showList = !activeConv || !isMobile;
  const showThread = !!activeConv;

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  const pills: { value: ConvPill; label: string }[] = [
    { value: "all", label: "Tout" },
    { value: "garde", label: "Gardes" },
    { value: "mission", label: "Missions" },
    { value: "archived", label: "Archivées" },
  ];

  const renderConvItem = (conv: Conversation) => {
    const hasUnread = conv.unread_count > 0;
    const appInfo = conv.application_status ? appStatusLabels[conv.application_status] : null;
    const isOwner = conv.owner_id === user?.id;
    const isMission = !!conv.small_mission_id;
    const roleLabel = isMission ? null : isOwner ? "Votre annonce" : "Vous avez postulé";

    return (
      <div
        key={conv.id}
        className={`group relative flex items-start gap-3 p-3.5 pl-6 text-left hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer ${activeConv?.id === conv.id ? "bg-accent/50" : ""}`}
        onClick={() => setActiveConv(conv)}
      >
        <div className="relative shrink-0">
          {conv.other_user?.avatar_url ? (
            <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
              {conv.other_user?.first_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate capitalize ${hasUnread ? "font-bold text-foreground" : "font-medium"}`}>
                {capitalize(conv.other_user?.first_name) || "Utilisateur"}
              </span>
              {/* MOD 3 — Application status badge */}
              {appInfo && !isMission && (
                <span className={`${appInfo.className} rounded-full px-2 py-0.5 text-xs shrink-0`}>
                  {appInfo.label}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {conv.last_message ? formatListDate(conv.last_message.created_at) : ""}
            </span>
          </div>
          {/* MOD 9 — Role indicator */}
          {roleLabel && (
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          )}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={`text-xs truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {conv.last_message?.sender_id === user?.id ? "Vous : " : ""}
              {conv.last_message?.content || "📷 Photo"}
            </p>
            {hasUnread && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0 font-bold">
                {conv.unread_count}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleArchive(conv); }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
          title={conv.archived_by.includes(user?.id || "") ? "Désarchiver" : "Archiver"}
          aria-label={conv.archived_by.includes(user?.id || "") ? "Désarchiver" : "Archiver"}
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  };

  const renderGroup = (key: string, title: string, convs: Conversation[], unreadCount: number, icon: React.ReactNode) => (
    <div key={key}>
      <div className="bg-muted/50 px-4 py-2 sticky top-0 z-10 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-foreground truncate flex-1">{title}</span>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold shrink-0">
            {unreadCount}
          </span>
        )}
      </div>
      {convs.map(renderConvItem)}
    </div>
  );

  // Group conversations by sit
  const groups = new Map<string, { title: string; convs: Conversation[]; unreadCount: number }>();
  const noSitGroup: Conversation[] = [];
  displayConversations.forEach(conv => {
    if (conv.sit_id && conv.sit?.title) {
      const existing = groups.get(conv.sit_id);
      if (existing) {
        existing.convs.push(conv);
        existing.unreadCount += conv.unread_count;
      } else {
        groups.set(conv.sit_id, { title: conv.sit.title, convs: [conv], unreadCount: conv.unread_count });
      }
    } else {
      noSitGroup.push(conv);
    }
  });

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      {/* ═══ CONVERSATION LIST ═══ */}
      {showList && (
        <div className={`${isMobile && activeConv ? "hidden" : ""} ${isMobile ? "w-full" : "w-80 border-r border-border"} flex flex-col bg-card`}>
          <div className="p-4 border-b border-border space-y-3">
            <h1 className="font-heading text-xl font-bold">Messagerie</h1>

            {/* MOD 2 — Single pill row */}
            <div className="flex gap-2">
              {pills.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPill(p.value)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    pill === p.value
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Conversations en tant que {effectiveRole === "owner" ? "Propriétaire" : "Gardien"}
            </p>
          </div>

          {/* Search filter */}
          <div className="px-3 py-2 border-b border-border">
            <Input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filtrer par annonce ou prénom..."
              className="h-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayConversations.length === 0 ? (
              <div className="p-4">
                {pill === "archived" ? (
                  <EmptyState illustration="sleepingCat" title="Aucune conversation archivée" description="Vos conversations archivées apparaîtront ici." />
                ) : (
                  <EmptyState illustration="emptyMailbox" title="Aucun message" description="Vos conversations avec les gardiens et propriétaires apparaîtront ici." actionLabel="Découvrir les annonces" actionTo="/search" />
                )}
              </div>
            ) : (
              <>
                {Array.from(groups.entries()).map(([sitId, g]) =>
                  renderGroup(sitId, g.title, g.convs, g.unreadCount, <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />)
                )}
                {noSitGroup.length > 0 &&
                  renderGroup("no-sit", "Échanges & Missions", noSitGroup, noSitGroup.reduce((s, c) => s + c.unread_count, 0), <HeartHandshake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />)
                }
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ MESSAGE THREAD ═══ */}
      {showThread ? (
        <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col bg-background`}>
          <ConversationHeader
            conv={activeConv}
            userId={user?.id}
            userRole={effectiveRole}
            isMobile={isMobile}
            onBack={() => setActiveConv(null)}
            onArchive={() => activeConv && handleArchive(activeConv)}
            onActionDone={() => { loadConversations(); if (activeConv) loadMessages(activeConv.id); }}
            otherUserRating={activeConv.other_user_rating}
            isFounder={activeConv.other_user?.is_founder || false}
            isEmergencySitter={activeConv.other_user_is_emergency}
            onBlock={() => {
              setActiveConv(null);
              loadConversations();
            }}
          />

          {/* Presence + Context card */}
          {activeConv.other_user?.last_seen_at && (
            <div className="px-4 py-1 border-b border-border/50 bg-card/50">
              <PresenceBadge lastSeenAt={activeConv.other_user.last_seen_at} />
            </div>
          )}
          <ContextHeaderCard
            contextType={activeConv.context_type}
            isOwner={activeConv.owner_id === user?.id}
            sit={activeConv.sit ? { ...activeConv.sit, id: activeConv.sit_id || undefined } : null}
            otherFirstName={activeConv.other_user?.first_name}
            otherCity={activeConv.other_user?.city}
          />

          {/* Messages with day separators */}
          <div className="flex-1 overflow-y-auto space-y-0 pb-20 md:pb-4" style={{ background: "hsl(var(--background))" }}>
            {(activeConv.sit?.status === "confirmed" || activeConv.sit?.status === "in_progress") && activeConv.sit?.property_id && (
              <HouseGuideBlock propertyId={activeConv.sit.property_id} />
            )}

            <div className="p-4 space-y-1">
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDaySep = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));
                const isMe = msg.sender_id === user?.id;

                return (
                  <div key={msg.id}>
                    {showDaySep && <DaySeparator date={msg.created_at} />}
                    <div className="py-1">
                      <MessageBubble msg={msg} isMe={isMe} readerRole={activeConv.owner_id === user?.id ? "proprio" : "gardien"} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggested messages */}
          <SuggestedMessages
            messages={messages}
            userId={user?.id}
            activeConv={activeConv}
            onSelect={(text) => setNewMessage(text)}
            isEntraideContact={isEntraideContact}
          />

          {/* Input or Paywall — only gate sit conversations for non-subscribed sitters */}
          {effectiveRole === "sitter" && !hasAccess && !activeConv.small_mission_id ? (
            <div className="border-t border-border bg-muted/50 p-4 mb-16 md:mb-0">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Abonnez-vous pour répondre à cette conversation.{" "}
                    <Link to="/mon-abonnement" className="text-primary hover:underline">S'abonner →</Link>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-border bg-card p-3 flex items-center gap-2 mb-16 md:mb-0">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" aria-label="Joindre une photo">
                <ImageIcon className="h-5 w-5" />
              </button>
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                className="flex-1 rounded-full"
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()} className="rounded-full shrink-0" aria-label="Envoyer">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : !isMobile ? (
        /* MOD 1 — Empty state */
        <div className="flex-1 flex flex-col items-center justify-center h-full gap-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Vos échanges</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Sélectionnez une conversation ou lancez une recherche.
          </p>
          {pill !== "archived" && (
            <Link
              to={pill === "mission" ? "/petites-missions" : "/search"}
              className="border border-border rounded-full px-4 py-2 text-sm hover:border-primary transition-colors"
            >
              {pill === "mission" ? "Rechercher une mission →" : "Rechercher une annonce →"}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Messages;
