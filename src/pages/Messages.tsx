import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image as ImageIcon, Check, CheckCheck, ExternalLink, CheckCircle2, AlertTriangle, Phone, Home, PawPrint, Star, User, Archive, Filter, X } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import HouseGuideBlock from "@/components/messages/HouseGuideBlock";
import { useToast } from "@/hooks/use-toast";
import { getBadgeDef } from "@/components/badges/badgeDefinitions";

interface Conversation {
  id: string;
  sit_id: string | null;
  long_stay_id: string | null;
  owner_id: string;
  sitter_id: string;
  updated_at: string;
  archived_by: string[];
  sit?: { title: string; status: string; property_id: string } | null;
  other_user?: { id: string; first_name: string; avatar_url: string | null; identity_verified: boolean } | null;
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
  application_status?: string | null;
  top_badge?: { badge_key: string; count: number } | null;
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

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  published: "En discussion",
  confirmed: "Confirmée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const appStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Candidature en attente", className: "bg-orange-100 text-orange-700" },
  viewed: { label: "Candidature consultée", className: "bg-orange-100 text-orange-700" },
  discussing: { label: "En discussion", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Candidature acceptée", className: "bg-green-100 text-green-700" },
  rejected: { label: "Candidature refusée", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Candidature annulée", className: "bg-muted text-muted-foreground" },
};

const formatMsgDate = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier " + format(date, "HH:mm");
  return format(date, "d MMM HH:mm", { locale: fr });
};

const formatListDate = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier";
  return format(date, "d MMM", { locale: fr });
};

type ConvFilter = "all" | "active" | "archived";
type ConvType = "all" | "garde" | "entraide";

const Messages = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<string | null>(null);

  // Load conversations
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

    const [profilesRes, allLastMsgsRes, allUnreadRes, applicationsRes, badgesRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, avatar_url, identity_verified").in("id", otherIds),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id").in("conversation_id", convIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id, id").in("conversation_id", convIds).neq("sender_id", user.id).is("read_at", null),
      sitIds.length > 0
        ? supabase.from("applications").select("sit_id, sitter_id, status").in("sit_id", sitIds)
        : Promise.resolve({ data: [] }),
      supabase.from("badge_attributions").select("receiver_id, badge_key").in("receiver_id", otherIds),
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

    // Build application status map: key = `${sit_id}-${sitter_id}`
    const appMap = new Map<string, string>();
    (applicationsRes.data || []).forEach((a: any) => {
      appMap.set(`${a.sit_id}-${a.sitter_id}`, a.status);
    });

    // Build badge map: receiver_id → top badge
    const badgeCounts = new Map<string, Map<string, number>>();
    (badgesRes.data || []).forEach((b: any) => {
      if (!badgeCounts.has(b.receiver_id)) badgeCounts.set(b.receiver_id, new Map());
      const m = badgeCounts.get(b.receiver_id)!;
      m.set(b.badge_key, (m.get(b.badge_key) || 0) + 1);
    });
    const topBadgeMap = new Map<string, { badge_key: string; count: number }>();
    badgeCounts.forEach((counts, userId) => {
      let top = { badge_key: "", count: 0 };
      counts.forEach((c, k) => { if (c > top.count) top = { badge_key: k, count: c }; });
      if (top.badge_key) topBadgeMap.set(userId, top);
    });

    const enriched = convs.map((conv: any) => {
      const otherId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;
      const sitterId = conv.sitter_id;
      const appStatus = conv.sit_id ? appMap.get(`${conv.sit_id}-${sitterId}`) : null;
      return {
        ...conv,
        archived_by: conv.archived_by || [],
        other_user: profilesMap.get(otherId) || null,
        last_message: lastMsgMap.get(conv.id) || null,
        unread_count: unreadMap.get(conv.id) || 0,
        application_status: appStatus || null,
        top_badge: topBadgeMap.get(otherId) || null,
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

  // Auto-select conversation from URL query param
  useEffect(() => {
    const convId = searchParams.get("conv");
    if (convId && conversations.length > 0 && !activeConv) {
      const target = conversations.find(c => c.id === convId);
      if (target) {
        setActiveConv(target);
        // Clear the param
        searchParams.delete("conv");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [conversations, searchParams, activeConv, setSearchParams]);

  // Load messages for active conversation
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

  // Realtime subscription
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (user && newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", newMsg.id);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
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
    if (!user || !activeConv || (!newMessage.trim())) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    setNewMessage("");
    setSending(false);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConv) return;
    const ext = file.name.split(".").pop();
    const path = `messages/${activeConv.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file);
    if (error) return;
    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
    await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: "",
      photo_url: urlData.publicUrl,
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    loadConversations();
  };

  const handleArchive = async (conv: Conversation) => {
    if (!user) return;
    const newArchived = conv.archived_by.includes(user.id)
      ? conv.archived_by.filter(id => id !== user.id)
      : [...conv.archived_by, user.id];

    await supabase
      .from("conversations")
      .update({ archived_by: newArchived } as any)
      .eq("id", conv.id);

    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, archived_by: newArchived } : c
    ));

    if (activeConv?.id === conv.id && !conv.archived_by.includes(user.id)) {
      setActiveConv(null);
    }

    toast({
      title: conv.archived_by.includes(user.id) ? "Conversation désarchivée" : "Conversation archivée",
    });
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConv(conv);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const isArchived = conv.archived_by.includes(user?.id || "");
    if (filter === "active" && isArchived) return false;
    if (filter === "archived" && !isArchived) return false;
    if (typeFilter === "garde" && !(conv.sit_id || conv.long_stay_id)) return false;
    if (typeFilter === "entraide" && !((conv as any).small_mission_id)) return false;
    if (sitFilter && conv.sit_id !== sitFilter) return false;
    return true;
  });

  // Unique sit titles for filter
  const sitOptions = Array.from(
    new Map(
      conversations
        .filter(c => c.sit?.title)
        .map(c => [c.sit_id, c.sit!.title])
    ).entries()
  );

  const showList = !activeConv || !isMobile;
  const showThread = !!activeConv;

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden">
      {/* Conversation list */}
      {showList && (
        <div className={`${isMobile && activeConv ? "hidden" : ""} ${isMobile ? "w-full" : "w-80 border-r border-border"} flex flex-col bg-card`}>
          <div className="p-4 border-b border-border space-y-3">
            <h1 className="font-heading text-xl font-bold">Messagerie</h1>

            {/* Tabs: Actives / Archivées */}
            <div className="flex gap-1 bg-accent rounded-lg p-0.5">
              {([
                { value: "active" as ConvFilter, label: "Actives" },
                { value: "archived" as ConvFilter, label: "Archivées" },
              ]).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === tab.value
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
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

            {/* Type filter: Toutes / Gardes / Entraide */}
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
                    typeFilter === tab.value
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter by sit */}
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
                const appInfo = conv.application_status ? appStatusLabels[conv.application_status] : null;
                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-start gap-3 p-4 text-left hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer ${activeConv?.id === conv.id ? "bg-accent/50" : ""}`}
                    onClick={() => selectConversation(conv)}
                  >
                    {conv.other_user?.avatar_url ? (
                      <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold shrink-0">
                        {conv.other_user?.first_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${conv.unread_count > 0 ? "font-bold" : ""}`}>
                          {conv.other_user?.first_name || "Utilisateur"}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {conv.last_message ? formatListDate(conv.last_message.created_at) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.sit?.title || "Garde"}
                      </p>
                      {appInfo && (
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${appInfo.className}`}>
                          {appInfo.label}
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {conv.last_message?.content || "Pas de message"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Archive button on hover */}
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

      {/* Message thread */}
      {showThread ? (
        <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col bg-background`}>
          {/* Thread header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
            {isMobile && (
              <button onClick={() => setActiveConv(null)} className="p-1 hover:bg-accent rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Link to={`/profil/${activeConv.other_user?.id}`} className="shrink-0">
              {activeConv.other_user?.avatar_url ? (
                <img src={activeConv.other_user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-primary/50 transition-all" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold hover:ring-2 hover:ring-primary/50 transition-all">
                  {activeConv.other_user?.first_name?.charAt(0) || "?"}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={`/profil/${activeConv.other_user?.id}`}
                  className="font-medium text-sm hover:text-primary transition-colors"
                >
                  {activeConv.other_user?.first_name}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {activeConv.sit_id && (
                  <Link to={`/sits/${activeConv.sit_id}`} className="hover:text-primary flex items-center gap-1 truncate">
                    {activeConv.sit?.title || "Annonce"} <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                )}
                {activeConv.sit?.status && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                    activeConv.sit.status === "confirmed" ? "bg-green-100 text-green-700" :
                    activeConv.sit.status === "completed" ? "bg-accent text-accent-foreground" :
                    activeConv.sit.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {statusLabels[activeConv.sit.status] || "En discussion"}
                  </span>
                )}
                {activeConv.application_status && appStatusLabels[activeConv.application_status] && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${appStatusLabels[activeConv.application_status].className}`}>
                    {appStatusLabels[activeConv.application_status].label}
                  </span>
                )}
              </div>
            </div>
            {/* Archive from thread header */}
            <button
              onClick={() => activeConv && handleArchive(activeConv)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
              title="Archiver"
            >
              <Archive className="h-4 w-4" />
            </button>
          </div>

          {/* Confirmed banner + help button */}
          {activeConv.sit?.status === "confirmed" && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Garde confirmée ✓
              </div>
              <button
                onClick={() => { setHelpOpen(!helpOpen); setHelpCategory(null); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Besoin d'aide
              </button>
            </div>
          )}

          {/* Completed banner with review link */}
          {activeConv.sit?.status === "completed" && (
            <div className="bg-accent border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Garde terminée
              </div>
              <Link
                to={`/review/${activeConv.sit_id}`}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Star className="h-3.5 w-3.5" />
                Laisser un avis
              </Link>
            </div>
          )}

          {/* Help panel */}
          {helpOpen && activeConv.sit?.status === "confirmed" && (
            <div className="bg-card border-b border-border px-4 py-3">
              {!helpCategory ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quel type de problème ?</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setHelpCategory("animal")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-xs font-medium transition-colors">
                      <PawPrint className="h-3.5 w-3.5" /> Animal
                    </button>
                    <button onClick={() => setHelpCategory("housing")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-xs font-medium transition-colors">
                      <Home className="h-3.5 w-3.5" /> Logement
                    </button>
                    <button onClick={() => setHelpCategory("emergency")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-colors">
                      <Phone className="h-3.5 w-3.5" /> Urgence
                    </button>
                  </div>
                </div>
              ) : helpCategory === "animal" ? (
                <div className="space-y-2">
                  <button onClick={() => setHelpCategory(null)} className="text-xs text-muted-foreground hover:text-foreground">← Retour</button>
                  <p className="text-sm font-medium">🐾 Problème avec un animal</p>
                  <div className="text-xs text-muted-foreground space-y-1.5">
                    <p>• Consultez le <strong>guide de la maison</strong> pour les coordonnées du vétérinaire</p>
                    <p>• Contactez le propriétaire via cette messagerie</p>
                    <p>• En cas d'urgence vitale : <strong>appelez le vétérinaire de garde</strong></p>
                  </div>
                </div>
              ) : helpCategory === "housing" ? (
                <div className="space-y-2">
                  <button onClick={() => setHelpCategory(null)} className="text-xs text-muted-foreground hover:text-foreground">← Retour</button>
                  <p className="text-sm font-medium">🏠 Problème de logement</p>
                  <div className="text-xs text-muted-foreground space-y-1.5">
                    <p>• Consultez le <strong>guide de la maison</strong> pour les contacts utiles</p>
                    <p>• Contactez le propriétaire via cette messagerie</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => setHelpCategory(null)} className="text-xs text-muted-foreground hover:text-foreground">← Retour</button>
                  <p className="text-sm font-medium text-destructive">🚨 Urgence</p>
                  <div className="text-xs space-y-1.5">
                    <p><strong>SAMU :</strong> <a href="tel:15" className="text-primary underline">15</a></p>
                    <p><strong>Police :</strong> <a href="tel:17" className="text-primary underline">17</a></p>
                    <p><strong>Pompiers :</strong> <a href="tel:18" className="text-primary underline">18</a></p>
                    <p className="text-muted-foreground mt-1">Contactez également le propriétaire via cette messagerie.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-20 md:pb-4" style={{ background: "hsl(var(--background))" }}>
            {activeConv.sit?.status === "confirmed" && activeConv.sit?.property_id && (
              <HouseGuideBlock propertyId={activeConv.sit.property_id} />
            )}

            <div className="p-4 space-y-3">
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id;
                const isSystem = msg.is_system;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-accent/80 text-accent-foreground text-xs px-4 py-2 rounded-full max-w-xs text-center">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe ? "rounded-br-md" : "rounded-bl-md"
                    }`} style={{
                      background: isMe ? "hsl(var(--message-sent))" : "hsl(var(--muted))",
                      color: "hsl(var(--foreground))",
                    }}>
                      {msg.photo_url && (
                        <a href={msg.photo_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                          <img src={msg.photo_url} alt="" className="max-w-full max-h-48 rounded-lg object-cover" />
                        </a>
                      )}
                      {msg.content && <p className="text-sm whitespace-pre-line break-words">{msg.content}</p>}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] opacity-60">{format(new Date(msg.created_at), "HH:mm")}</span>
                        {isMe && (
                          msg.read_at
                            ? <CheckCheck className="h-3 w-3 text-blue-500" />
                            : <Check className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-3 flex items-center gap-2 mb-16 md:mb-0">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="rounded-full shrink-0"
            >
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