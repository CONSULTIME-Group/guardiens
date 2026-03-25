import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Image as ImageIcon, Check, CheckCheck, ExternalLink, CheckCircle2, AlertTriangle, Phone, Home, PawPrint } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface Conversation {
  id: string;
  sit_id: string;
  owner_id: string;
  sitter_id: string;
  updated_at: string;
  sit?: { title: string; status: string; property_id: string };
  other_user?: { id: string; first_name: string; avatar_url: string | null };
  last_message?: { content: string; created_at: string; sender_id: string };
  unread_count: number;
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

const Messages = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

    const enriched = await Promise.all(
      convs.map(async (conv: any) => {
        const otherId = conv.owner_id === user.id ? conv.sitter_id : conv.owner_id;
        const [profileRes, lastMsgRes, unreadRes] = await Promise.all([
          supabase.from("profiles").select("id, first_name, avatar_url").eq("id", otherId).single(),
          supabase.from("messages").select("content, created_at, sender_id").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", user.id).is("read_at", null),
        ]);
        return {
          ...conv,
          other_user: profileRes.data,
          last_message: lastMsgRes.data,
          unread_count: unreadRes.count || 0,
        } as Conversation;
      })
    );

    // Sort: unread first, then by last message date
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

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);

    // Mark unread messages as read
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
        // Auto-mark as read if not from us
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
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

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Photo upload
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

  const selectConversation = (conv: Conversation) => {
    setActiveConv(conv);
  };

  const showList = !activeConv || !isMobile;
  const showThread = !!activeConv;

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-screen overflow-hidden">
      {/* Conversation list */}
      {showList && (
        <div className={`${isMobile && activeConv ? "hidden" : ""} ${isMobile ? "w-full" : "w-80 border-r border-border"} flex flex-col bg-card`}>
          <div className="p-4 border-b border-border">
            <h1 className="font-heading text-xl font-bold">Messagerie</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aucune conversation pour le moment.
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-start gap-3 p-4 text-left hover:bg-accent/50 transition-colors border-b border-border/50 ${activeConv?.id === conv.id ? "bg-accent/50" : ""}`}
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
                </button>
              ))
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
            {activeConv.other_user?.avatar_url ? (
              <img src={activeConv.other_user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold">
                {activeConv.other_user?.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activeConv.other_user?.first_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link to={`/sits/${activeConv.sit_id}`} className="hover:text-primary flex items-center gap-1 truncate">
                  {activeConv.sit?.title} <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                  activeConv.sit?.status === "confirmed" ? "bg-green-100 text-green-700" :
                  activeConv.sit?.status === "completed" ? "bg-accent text-accent-foreground" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {statusLabels[activeConv.sit?.status || "published"] || "En discussion"}
                </span>
              </div>
            </div>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4" style={{ background: "hsl(var(--background))" }}>
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
                    isMe
                      ? "rounded-br-md"
                      : "rounded-bl-md"
                  }`} style={{
                    background: isMe ? "#D8F3DC" : "hsl(var(--muted))",
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
