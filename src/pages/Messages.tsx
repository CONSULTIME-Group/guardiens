import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Archive, Home, HeartHandshake, Lock, Loader2, MessageCircle, ChevronDown, Info } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import HouseGuideBlock from "@/components/messages/HouseGuideBlock";
import ConversationHeader from "@/components/messages/ConversationHeader";
import DaySeparator from "@/components/messages/DaySeparator";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageComposer from "@/components/messages/MessageComposer";
import MessagesListSkeleton from "@/components/messages/MessagesListSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { trackFirstAction } from "@/lib/analytics";
import { moderateContent } from "@/lib/moderation";
import { appStatusBadge as appStatusLabels } from "@/lib/messageStatus";
import { useAutoOpenConversation } from "@/hooks/useAutoOpenConversation";
import AlmaMessageOpener from "@/components/ai/alma/AlmaMessageOpener";
import { AlmaStagnantConversationWhisper } from "@/components/ai/alma/wiring/AlmaStagnantConversationWhisper";


const MESSAGES_PAGE_SIZE = 50;

interface Conversation {
  id: string;
  sit_id: string | null;
  small_mission_id: string | null;
  owner_id: string;
  sitter_id: string;
  updated_at: string;
  archived_by: string[];
  context_type: string | null;
  sit?: { title: string; status: string; property_id: string; start_date?: string | null; end_date?: string | null; city?: string | null } | null;
  small_mission?: { id: string; title?: string | null; city?: string | null; date_needed?: string | null } | null;
  other_user?: { id: string; first_name: string; avatar_url: string | null; identity_verified: boolean; city?: string | null; is_founder?: boolean; last_seen_at?: string | null; show_last_seen?: boolean } | null;
  last_message?: { content: string; created_at: string; sender_id: string; is_system?: boolean } | null;
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
  const convListRef = useRef<HTMLDivElement | null>(null);
  const savedScrollRef = useRef<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pill, setPill] = useState<ConvPill>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  // Pagination des messages
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const isInitialMessagesLoad = useRef(true);

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

    const [profilesRes, allLastMsgsRes, allUnreadRes, ratingsRes, emergencyRes, sitsRes, applicationsRes, missionsRes, prefsRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, avatar_url, identity_verified, city, is_founder, last_seen_at").in("id", otherIds),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id, is_system").in("conversation_id", convIds).order("created_at", { ascending: false }),
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
      otherIds.length > 0
        ? supabase.from("notification_preferences").select("user_id, show_last_seen").in("user_id", otherIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Map RGPD: respect show_last_seen pref (default true if no row)
    const showLastSeenMap = new Map<string, boolean>();
    (prefsRes.data || []).forEach((p: any) => {
      showLastSeenMap.set(p.user_id, p.show_last_seen !== false);
    });

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    // Résoudre la ville du propriétaire pour chaque sit (lieu de la garde)
    //, distinct de other_user.city qui peut être la ville du gardien.
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
        other_user: (() => {
          const p = profilesMap.get(otherId);
          if (!p) return null;
          return { ...p, show_last_seen: showLastSeenMap.get(otherId) ?? true };
        })(),
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

  // ── Auto-open : extrait dans un hook dédié (?gardien=, ?c=, fallback unread desktop) ──
  useAutoOpenConversation<Conversation>({
    user: user ? { id: user.id } : null,
    conversations,
    setConversations,
    activeConv,
    setActiveConv,
    loading,
    isMobile,
    enrichConv: (raw, otherProfile) => ({
      ...(raw as any),
      archived_by: raw.archived_by || [],
      sit: null,
      small_mission: null,
      other_user: otherProfile || null,
      last_message: null,
      unread_count: 0,
      application_status: null,
      other_user_rating: 0,
      other_user_is_emergency: false,
    }) as Conversation,
  });

  // ── Pré-remplissage du brouillon via `?draft=` ──
  // Permet à un appelant externe (ex: carrousel « Coup de main » du dashboard
  // gardien) d'amorcer le 1er message avec un contexte précis. Appliqué UNE
  // SEULE FOIS, quand la conversation cible est ouverte, et seulement si
  // l'utilisateur n'a pas déjà commencé à taper. Param retiré de l'URL ensuite.
  useEffect(() => {
    const draft = searchParams.get("draft");
    if (!draft || !activeConv) return;
    if (newMessage.trim().length > 0) return;
    setNewMessage(draft);
    const next = new URLSearchParams(searchParams);
    next.delete("draft");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id, searchParams]);

  // ── Realtime sur la liste : tout INSERT sur une conversation de l'utilisateur ──
  // déclenche un rechargement debouncé de la liste pour rafraîchir badges et tri.
  useEffect(() => {
    if (!user) return;
    let timer: number | undefined;
    const debouncedReload = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => loadConversations(), 400);
    };
    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          // Ne déclenche que si le message concerne une de nos conversations connues
          if (conversations.some((c) => c.id === msg.conversation_id)) {
            debouncedReload();
          }
        }
      )
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, conversations, loadConversations]);

  // ── Chargement messages avec pagination (50 derniers d'abord) ──
  const loadMessages = useCallback(async (convId: string) => {
    isInitialMessagesLoad.current = true;
    const { data, count } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);
    const ordered = ((data as Message[]) || []).slice().reverse();
    setMessages(ordered);
    setHasMoreMessages((count || 0) > ordered.length);

    if (user) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }
  }, [user]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConv || loadingMoreMessages || messages.length === 0) return;
    setLoadingMoreMessages(true);
    const oldest = messages[0];
    const scrollEl = messagesScrollRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConv.id)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);
    const older = ((data as Message[]) || []).slice().reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMoreMessages(older.length === MESSAGES_PAGE_SIZE);
    setLoadingMoreMessages(false);

    // Préserve la position visuelle après prepend
    requestAnimationFrame(() => {
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
      }
    });
  }, [activeConv, loadingMoreMessages, messages]);

  useEffect(() => {
    setNewMessage("");
    if (!activeConv) return;
    loadMessages(activeConv.id);
  }, [activeConv?.id, loadMessages]);

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
    // Premier rendu d'une conversation : scroll instantané au bas (pas d'animation longue).
    // Nouveaux messages ensuite : scroll fluide.
    const behavior: ScrollBehavior = isInitialMessagesLoad.current ? "auto" : "smooth";
    messagesEndRef.current?.scrollIntoView({ behavior });
    if (isInitialMessagesLoad.current) isInitialMessagesLoad.current = false;
  }, [messages]);

  const handleSend = async () => {
    if (!user || !activeConv || !newMessage.trim()) return;
    setSending(true);
    const trimmed = newMessage.trim();
    // Modération pré-envoi : seulement pour messages > 30 car. pour limiter le coût.
    if (trimmed.length >= 30) {
      const verdict = await moderateContent("message", trimmed);
      if (verdict.status === "block") {
        toast({
          variant: "destructive",
          title: "Message bloqué",
          description: verdict.reasons.join(" · ") || "Retirez les coordonnées ou contenus contraires aux CGS.",
        });
        setSending(false);
        return;
      }
      if (verdict.status === "warning" && verdict.suggestion) {
        toast({ title: "Conseil", description: verdict.suggestion });
      }
    }
    await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_id: user.id, content: trimmed });
    // last_message_at + first_message_sent gérés automatiquement par trigger DB
    try { await trackFirstAction("message_sent", { conversation_id: activeConv.id }); } catch {}
    setNewMessage("");
    setSending(false);
    loadConversations();
  };

  // (handleKeyDown et handlePhotoUpload sont désormais portés par MessageComposer)

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
    loadConversations();
  }, [activeRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filtering ───
  const filteredConversations = conversations.filter(conv => {
    // Une conversation est archivée si l'utilisateur l'a archivée manuellement
    // OU si la garde associée est terminée/annulée (auto-archive cohérent avec Sits.tsx).
    const isManuallyArchived = conv.archived_by.includes(user?.id || "");
    const sitStatus = conv.sit?.status;
    const isAutoArchived = sitStatus === "completed" || sitStatus === "cancelled";
    const isArchived = isManuallyArchived || isAutoArchived;
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

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <div className={`${isMobile ? "w-full" : "w-80 border-r border-border"} flex flex-col bg-card`}>
          <MessagesListSkeleton />
        </div>
        {!isMobile && <div className="flex-1 bg-background" aria-hidden="true" />}
      </div>
    );
  }

  const pills: { value: ConvPill; label: string }[] = [
    { value: "all", label: "Tout" },
    { value: "garde", label: "Gardes" },
    { value: "mission", label: "Entraide" },
    { value: "archived", label: "Archivées" },
  ];

  const renderConvItem = (conv: Conversation) => {
    const hasUnread = conv.unread_count > 0;
    const appInfo = conv.application_status ? appStatusLabels[conv.application_status] : null;
    const isOwner = conv.owner_id === user?.id;
    const isMission = !!conv.small_mission_id;
    const hasSitContext = !!conv.sit_id;
    // Affiche le titre réel de l'annonce/mission (plus utile que « Votre annonce »).
    // Pour un échange privé (ni sit ni mission), pas de subtitle trompeur.
    const contextTitle = isMission
      ? (conv.small_mission?.title || "Coup de main")
      : hasSitContext
        ? (conv.sit?.title || (isOwner ? "Votre annonce" : "Vous avez postulé"))
        : null;
    const roleLabel = contextTitle;

    return (
      <div key={conv.id} className="group relative border-b border-border/50">
        <button
          type="button"
          onClick={() => {
            // Memorize scroll position before opening the conversation
            if (convListRef.current) {
              savedScrollRef.current = convListRef.current.scrollTop;
            }
            setActiveConv(conv);
          }}
          className={`w-full flex items-start gap-3 p-3.5 pl-6 pr-10 text-left hover:bg-accent/50 transition-colors ${activeConv?.id === conv.id ? "bg-accent/50" : ""}`}
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
                <span className={`text-base truncate capitalize ${hasUnread ? "font-bold text-foreground" : "font-medium"}`}>
                  {capitalize(conv.other_user?.first_name) || "Utilisateur"}
                </span>
                {appInfo && !isMission && (
                  <span className={`${appInfo.className} rounded-full px-2 py-0.5 text-xs shrink-0`}>
                    {appInfo.label}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {conv.last_message ? formatListDate(conv.last_message.created_at) : ""}
              </span>
            </div>
            {roleLabel && (
              <p className="text-sm text-muted-foreground truncate">{roleLabel}</p>
            )}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {conv.last_message?.is_system ? (
                <p className={`text-sm truncate italic flex items-center gap-1 ${hasUnread ? "text-foreground/80" : "text-muted-foreground"}`}>
                  <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{conv.last_message?.content || ""}</span>
                </p>
              ) : (
                <p className={`text-sm truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {conv.last_message?.sender_id === user?.id ? "Vous : " : ""}
                  {conv.last_message?.content || "Photo"}
                </p>
              )}
              {hasUnread && (
                <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0 font-bold">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleArchive(conv); }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
          title={conv.archived_by.includes(user?.id || "") ? "Désarchiver" : "Archiver"}
          aria-label={conv.archived_by.includes(user?.id || "") ? "Désarchiver cette conversation" : "Archiver cette conversation"}
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    );
  };

  const renderGroup = (key: string, title: string, convs: Conversation[], unreadCount: number, icon: React.ReactNode) => (
    <section key={key} aria-label={title}>
      <h2 className="bg-muted/50 px-4 py-2 flex items-center gap-2 text-sm font-medium text-foreground m-0">
        <span aria-hidden="true">{icon}</span>
        <span className="truncate flex-1">{title}</span>
        {unreadCount > 0 && (
          <span
            className="bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold shrink-0"
            aria-label={`${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`}
          >
            {unreadCount}
          </span>
        )}
      </h2>
      {convs.map(renderConvItem)}
    </section>
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
          <div className="sticky top-12 md:top-0 z-10 bg-card border-b border-border px-3 pt-3 pb-2 space-y-2">
            {/* Row 1, title alone (lisible mobile) + role à droite */}
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-heading text-base font-bold truncate">Messages</h1>
              <span className="text-xs text-muted-foreground truncate shrink-0">
                {effectiveRole === "owner" ? "Propriétaire" : "Gardien"}
              </span>
            </div>

            {/* Row 2, search filter (uniquement si >=5 conversations) */}
            {conversations.length >= 5 && (
              <Input
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filtrer par annonce ou prénom…"
                aria-label="Filtrer les conversations par annonce ou prénom"
                className="h-8 text-xs rounded-lg w-full"
              />
            )}

            {/* Row 3, pills compactes */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex gap-1 shrink-0" role="tablist" aria-label="Filtrer les conversations">
                {pills.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    role="tab"
                    aria-selected={pill === p.value}
                    onClick={() => setPill(p.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      pill === p.value
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={(el) => {
              convListRef.current = el;
              // Restore scroll position when list is re-shown (mobile back navigation)
              if (el && savedScrollRef.current > 0) {
                el.scrollTop = savedScrollRef.current;
              }
            }}
            className="flex-1 overflow-y-auto pb-24 md:pb-0"
            role="region"
            aria-label="Liste des conversations"
          >
            {displayConversations.length === 0 ? (
              <div className="p-4">
                {pill === "archived" ? (
                  <EmptyState illustration="sleepingCat" title="Aucune conversation archivée" description="Vos conversations archivées apparaîtront ici." />
                ) : (
                  <EmptyState illustration="emptyMailbox" title="Aucun message" description="Vos conversations avec les gardiens et propriétaires apparaîtront ici." actionLabel="Découvrir les annonces" actionTo="/search" />
                )}
              </div>
            ) : effectiveRole === "sitter" ? (
              <>{displayConversations.map(renderConvItem)}</>
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
        <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col bg-background relative`}>
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

          {/* Messages with day separators */}
          <div
            ref={messagesScrollRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto space-y-0 pb-4 bg-background"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Historique des messages"
          >
            {(activeConv.sit?.status === "confirmed" || activeConv.sit?.status === "in_progress") && activeConv.sit?.property_id && (
              <HouseGuideBlock propertyId={activeConv.sit.property_id} />
            )}

            <div className="p-4 space-y-1" data-alma-safe-area>
              {messages.length === 0 && !hasMoreMessages && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                    <MessageCircle className="h-6 w-6 text-primary/50" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Démarrez la conversation</p>
                  <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                    Présentez-vous et dites en quelques mots ce qui vous a amené à contacter {capitalize(activeConv.other_user?.first_name) || "cette personne"}.
                  </p>
                </div>
              )}
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadOlderMessages}
                    disabled={loadingMoreMessages}
                    className="text-xs text-muted-foreground gap-2"
                  >
                    {loadingMoreMessages && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                    {loadingMoreMessages ? "Chargement…" : "Voir messages plus anciens"}
                  </Button>
                </div>
              )}
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDaySep = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));
                const isMe = msg.sender_id === user?.id;

                const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                // Dernière bulle du groupe : expéditeur différent ou dernier message ou day sep suivant
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || !isSameDay(new Date(msg.created_at), new Date(nextMsg.created_at));

                return (
                  <div key={msg.id}>
                    {showDaySep && <DaySeparator date={msg.created_at} />}
                    <div className={isLastInGroup ? "pb-2" : "pb-0.5"}>
                      <MessageBubble msg={msg} isMe={isMe} isLastInGroup={isLastInGroup} readerRole={activeConv.owner_id === user?.id ? "proprio" : "gardien"} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="Défiler jusqu'aux derniers messages"
              className="absolute bottom-24 right-4 z-20 bg-card border border-border shadow-md rounded-full w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-accent transition-all"
            >
              <ChevronDown className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}

          {/* Input or Paywall, only gate sit conversations for non-subscribed sitters */}
          {effectiveRole === "sitter" && !hasAccess && !activeConv.small_mission_id ? (
            <div className="border-t border-border bg-muted/50 p-4 mb-16 md:mb-0">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Abonnez-vous pour répondre à cette conversation.{" "}
                    <Link to="/mon-abonnement" className="text-primary hover:underline">S'abonner →</Link>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 && user && activeConv.other_user?.id && (activeConv.sit_id || activeConv.small_mission_id) && (
                <AlmaMessageOpener
                  audience={activeConv.owner_id === user.id ? "owner" : "sitter"}
                  otherFirstName={activeConv.other_user?.first_name}
                  sitId={activeConv.sit_id}
                  missionId={activeConv.small_mission_id}
                  otherUserId={activeConv.other_user.id}
                  onDraftReady={(text) => setNewMessage(text)}
                />
              )}
              {user && activeConv.owner_id === user.id && messages.length > 0 && (
                <AlmaStagnantConversationWhisper
                  conversationId={activeConv.id}
                  audience="owner"
                  otherFirstName={activeConv.other_user?.first_name ?? null}
                  messages={messages}
                  applicationStatus={activeConv.application_status ?? null}
                  sitStartDate={activeConv.sit?.start_date ?? null}
                  onProposeMeeting={(tpl) => {
                    setNewMessage(tpl);
                    setTimeout(() => {
                      const ta = document.querySelector<HTMLTextAreaElement>(
                        'textarea[placeholder], textarea',
                      );
                      ta?.focus();
                    }, 0);
                  }}
                />
              )}
              <MessageComposer
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSend}

              onPickPhoto={async (file) => {
                if (!user || !activeConv) return;
                const ext = file.name.split(".").pop();
                const path = `messages/${activeConv.id}/${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from("property-photos").upload(path, file);
                if (error) return;
                const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
                await supabase.from("messages").insert({
                  conversation_id: activeConv.id, sender_id: user.id, content: "", photo_url: urlData.publicUrl,
                });
                await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
                loadConversations();
              }}
              sending={sending}
            />
            </>
          )}

        </div>
      ) : !isMobile ? (
        /* Empty state desktop, gouache emptyMailbox conforme à la charte */
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-background">
          <EmptyState
            illustration="emptyMailbox"
            title="Vos échanges"
            description="Sélectionnez une conversation ou lancez une recherche pour démarrer un échange."
            actionLabel={pill === "mission" ? "Rechercher une mission" : "Rechercher une annonce"}
            actionTo={pill === "archived" ? undefined : (pill === "mission" ? "/petites-missions" : "/search")}
          />
        </div>
      ) : null}
    </div>
  );
};

export default Messages;
