import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Archive, Filter, X } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import HouseGuideBlock from "@/components/messages/HouseGuideBlock";
import ConversationHeader from "@/components/messages/ConversationHeader";
import DaySeparator from "@/components/messages/DaySeparator";
import MessageBubble from "@/components/messages/MessageBubble";
import { useToast } from "@/hooks/use-toast";
import { getBadgeDef } from "@/components/badges/badgeDefinitions";
import StatusShield from "@/components/badges/StatusShield";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  sit_id: string | null;
  long_stay_id: string | null;
  owner_id: string;
  sitter_id: string;
  updated_at: string;
  archived_by: string[];
  sit?: { title: string; status: string; property_id: string } | null;
  other_user?: { id: string; first_name: string; avatar_url: string | null; identity_verified: boolean; city?: string | null; is_founder?: boolean } | null;
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
  application_status?: string | null;
  top_badge?: { badge_key: string; count: number } | null;
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
}

const appStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-orange-100 text-orange-700" },
  viewed: { label: "Consultée", className: "bg-orange-100 text-orange-700" },
  discussing: { label: "En discussion", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Acceptée", className: "bg-green-100 text-green-700" },
  rejected: { label: "Refusée", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground" },
};

const formatListDate = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier";
  return format(date, "d MMM", { locale: fr });
};

type ConvFilter = "active" | "archived";
type ConvType = "all" | "garde" | "entraide";

const ownerSuggestions = [
  "Voulez-vous qu'on se rencontre ?",
  "Avez-vous de l'expérience avec ce type d'animaux ?",
  "Êtes-vous disponible pour un appel vidéo ?",
];

const sitterSuggestions = [
  "Serait-il possible de se rencontrer avant ?",
  "Y a-t-il des consignes particulières ?",
  "Est-ce que je peux voir le guide de la maison ?",
];

const SuggestedMessages = ({
  messages: msgs, userId, activeConv, onSelect,
}: {
  messages: Message[]; userId?: string; activeConv: Conversation;
  onSelect: (text: string) => void;
}) => {
  const [dismissed, setDismissed] = useState(false);
  const userHasSent = msgs.some(m => m.sender_id === userId && !m.is_system);
  if (userHasSent || dismissed) return null;

  const isOwner = activeConv.owner_id === userId;
  const suggestions = isOwner ? ownerSuggestions : sitterSuggestions;

  return (
    <div className="px-3 py-2 border-t border-border/50 bg-accent/30">
      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Suggestions</p>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => { onSelect(s); setDismissed(true); }}
            className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors whitespace-nowrap shrink-0"
          >
            {s}
          </button>
        ))}
      </div>
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
  const [filter, setFilter] = useState<ConvFilter>("active");
  const [typeFilter, setTypeFilter] = useState<ConvType>("all");
  const [sitFilter, setSitFilter] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("*, sit:sits(title, status, property_id)")
      .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    const otherIds = convs.map((conv: any) => conv.owner_id === user.id ? conv.sitter_id : conv.owner_id);
    const convIds = convs.map((conv: any) => conv.id);
    const sitIds = convs.map((conv: any) => conv.sit_id).filter(Boolean);

    const [profilesRes, allLastMsgsRes, allUnreadRes, applicationsRes, badgesRes, ratingsRes, emergencyRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, avatar_url, identity_verified, city, is_founder").in("id", otherIds),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id").in("conversation_id", convIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id, id").in("conversation_id", convIds).neq("sender_id", user.id).is("read_at", null),
      sitIds.length > 0
        ? supabase.from("applications").select("sit_id, sitter_id, status").in("sit_id", sitIds)
        : Promise.resolve({ data: [] }),
      supabase.from("badge_attributions").select("receiver_id, badge_key").in("receiver_id", otherIds),
      supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", otherIds).eq("published", true),
      supabase.from("emergency_sitter_profiles").select("user_id, is_active").in("user_id", otherIds).eq("is_active", true),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

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

    const topBadgeMap = new Map<string, { badge_key: string; count: number }>();
    const badgeCounts = new Map<string, Map<string, number>>();
    (badgesRes.data || []).forEach((b: any) => {
      if (!badgeCounts.has(b.receiver_id)) badgeCounts.set(b.receiver_id, new Map());
      const m = badgeCounts.get(b.receiver_id)!;
      m.set(b.badge_key, (m.get(b.badge_key) || 0) + 1);
    });
    badgeCounts.forEach((counts, uid) => {
      let top = { badge_key: "", count: 0 };
      counts.forEach((c, k) => { if (c > top.count) top = { badge_key: k, count: c }; });
      if (top.badge_key) topBadgeMap.set(uid, top);
    });

    // Rating map
    const ratingMap = new Map<string, { sum: number; count: number }>();
    (ratingsRes.data || []).forEach((r: any) => {
      const cur = ratingMap.get(r.reviewee_id) || { sum: 0, count: 0 };
      ratingMap.set(r.reviewee_id, { sum: cur.sum + r.overall_rating, count: cur.count + 1 });
    });

    // Emergency set
    const emergencySet = new Set((emergencyRes.data || []).map((e: any) => e.user_id));

    const enriched = convs.map((conv: any) => {
      const otherId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;
      const sitterId = conv.sitter_id;
      const appStatus = conv.sit_id ? appMap.get(`${conv.sit_id}-${sitterId}`) : null;
      const rating = ratingMap.get(otherId);
      return {
        ...conv,
        archived_by: conv.archived_by || [],
        other_user: profilesMap.get(otherId) || null,
        last_message: lastMsgMap.get(conv.id) || null,
        unread_count: unreadMap.get(conv.id) || 0,
        application_status: appStatus || null,
        top_badge: topBadgeMap.get(otherId) || null,
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

  useEffect(() => {
    const convId = searchParams.get("conv");
    if (convId && conversations.length > 0 && !activeConv) {
      const target = conversations.find(c => c.id === convId);
      if (target) {
        setActiveConv(target);
        searchParams.delete("conv");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [conversations, searchParams, activeConv, setSearchParams]);

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
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
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

  const filteredConversations = conversations.filter(conv => {
    const isArchived = conv.archived_by.includes(user?.id || "");
    if (filter === "active" && isArchived) return false;
    if (filter === "archived" && !isArchived) return false;
    if (typeFilter === "garde" && !(conv.sit_id || conv.long_stay_id)) return false;
    if (typeFilter === "entraide" && !((conv as any).small_mission_id)) return false;
    if (sitFilter && conv.sit_id !== sitFilter) return false;
    return true;
  });

  const sitOptions = Array.from(
    new Map(conversations.filter(c => c.sit?.title).map(c => [c.sit_id, c.sit!.title])).entries()
  );

  const showList = !activeConv || !isMobile;
  const showThread = !!activeConv;

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden">
      {/* ═══ CONVERSATION LIST ═══ */}
      {showList && (
        <div className={`${isMobile && activeConv ? "hidden" : ""} ${isMobile ? "w-full" : "w-80 border-r border-border"} flex flex-col bg-card`}>
          <div className="p-4 border-b border-border space-y-3">
            <h1 className="font-heading text-xl font-bold">Messagerie</h1>

            <div className="flex gap-1 bg-accent rounded-lg p-0.5">
              {([
                { value: "active" as ConvFilter, label: "Actives" },
                { value: "archived" as ConvFilter, label: "Archivées" },
              ]).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === tab.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.value === "archived" && conversations.filter(c => c.archived_by.includes(user?.id || "")).length > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">
                      ({conversations.filter(c => c.archived_by.includes(user?.id || "")).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-accent rounded-lg p-0.5">
              {([
                { value: "all" as ConvType, label: "Toutes" },
                { value: "garde" as ConvType, label: "🐾 Gardes" },
                { value: "entraide" as ConvType, label: "🤝 Entraide" },
              ]).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setTypeFilter(tab.value)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === tab.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {sitOptions.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={sitFilter || ""}
                  onChange={e => setSitFilter(e.target.value || null)}
                  className="text-xs bg-transparent border-0 text-muted-foreground focus:ring-0 cursor-pointer w-full truncate"
                >
                  <option value="">Toutes les annonces</option>
                  {sitOptions.map(([id, title]) => (
                    <option key={id} value={id || ""}>{title}</option>
                  ))}
                </select>
                {sitFilter && (
                  <button onClick={() => setSitFilter(null)} className="p-0.5 hover:bg-accent rounded">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {filter === "archived" ? "Aucune conversation archivée." : "Aucune conversation pour le moment."}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const hasUnread = conv.unread_count > 0;
                const appInfo = conv.application_status ? appStatusLabels[conv.application_status] : null;
                const topBadgeDef = conv.top_badge ? getBadgeDef(conv.top_badge.badge_key) : null;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-start gap-3 p-3.5 text-left hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer ${activeConv?.id === conv.id ? "bg-accent/50" : ""}`}
                    onClick={() => setActiveConv(conv)}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.other_user?.avatar_url ? (
                        <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold">
                          {conv.other_user?.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                      {/* Mini badge shield */}
                      {topBadgeDef && (
                        <span className="absolute -bottom-0.5 -right-0.5">
                          <StatusShield type="verified" size="xs" />
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-medium"}`}>
                          {conv.other_user?.first_name || "Utilisateur"}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {conv.last_message ? formatListDate(conv.last_message.created_at) : ""}
                        </span>
                      </div>

                      {/* Sit title */}
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {conv.sit?.title || "Garde"}
                        {appInfo && (
                          <span className={`ml-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${appInfo.className}`}>
                            {appInfo.label}
                          </span>
                        )}
                      </p>

                      {/* Last message preview */}
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

                    {/* Archive on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(conv); }}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      title={conv.archived_by.includes(user?.id || "") ? "Désarchiver" : "Archiver"}
                    >
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })
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
            isMobile={isMobile}
            onBack={() => setActiveConv(null)}
            onArchive={() => activeConv && handleArchive(activeConv)}
            onActionDone={() => { loadConversations(); if (activeConv) loadMessages(activeConv.id); }}
            otherUserRating={activeConv.other_user_rating}
            isFounder={activeConv.other_user?.is_founder || false}
            isEmergencySitter={activeConv.other_user_is_emergency}
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
                      <MessageBubble msg={msg} isMe={isMe} />
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
          />

          {/* Input */}
          <div className="border-t border-border bg-card p-3 flex items-center gap-2 mb-16 md:mb-0">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </button>
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              className="flex-1 rounded-full"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()} className="rounded-full shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : !isMobile ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Sélectionnez une conversation</p>
        </div>
      ) : null}
    </div>
  );
};

export default Messages;
