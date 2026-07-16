import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

type Tab = "applications" | "conversations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sitId: string | null;
  sitTitle?: string | null;
  initialTab?: Tab;
}

interface Application {
  application_id: string;
  sitter_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface Conversation {
  conversation_id: string;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
  sitter_id: string;
  sitter_name: string;
  sitter_avatar: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

interface Message {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  photo_url: string | null;
  is_system: boolean;
  created_at: string;
  read_at: string | null;
}

const initials = (name: string | null | undefined) =>
  (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "En attente", tone: "outline" },
  accepted: { label: "Acceptée", tone: "default" },
  rejected: { label: "Refusée", tone: "destructive" },
  cancelled: { label: "Annulée", tone: "secondary" },
};

export const ListingDrilldownDialog = ({ open, onOpenChange, sitId, sitTitle, initialTab = "applications" }: Props) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [apps, setApps] = useState<Application[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const loadApps = useCallback(async () => {
    if (!sitId) return;
    setLoadingApps(true);
    const { data, error } = await supabase.rpc("admin_get_listing_applications" as any, { p_sit_id: sitId });
    if (error) console.error("admin_get_listing_applications:", error);
    setApps(((data as Application[]) ?? []));
    setLoadingApps(false);
  }, [sitId]);

  const loadConvs = useCallback(async () => {
    if (!sitId) return;
    setLoadingConvs(true);
    const { data, error } = await supabase.rpc("admin_get_listing_conversations" as any, { p_sit_id: sitId });
    if (error) console.error("admin_get_listing_conversations:", error);
    setConvs(((data as Conversation[]) ?? []));
    setLoadingConvs(false);
  }, [sitId]);

  useEffect(() => {
    if (!open || !sitId) return;
    setActiveConv(null);
    setMessages([]);
    loadApps();
    loadConvs();
  }, [open, sitId, loadApps, loadConvs]);

  const openConversation = async (c: Conversation) => {
    setActiveConv(c);
    setLoadingMsgs(true);
    const { data, error } = await supabase.rpc("admin_get_conversation_messages" as any, {
      p_conversation_id: c.conversation_id,
    });
    if (error) console.error("admin_get_conversation_messages:", error);
    setMessages(((data as Message[]) ?? []));
    setLoadingMsgs(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{`Détails de l'annonce : ${sitTitle || "sans titre"}`}</DialogTitle>
          <DialogDescription>
            Consultation administrateur des candidatures et conversations rattachées à cette annonce.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">
              Candidatures{apps.length ? ` · ${apps.length}` : ""}
            </TabsTrigger>
            <TabsTrigger value="conversations">
              Conversations{convs.length ? ` · ${convs.length}` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Applications */}
          <TabsContent value="applications" className="space-y-3 mt-4">
            {loadingApps ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : apps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune candidature sur cette annonce.
              </p>
            ) : (
              apps.map((a) => {
                const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || "Gardien";
                const st = STATUS_LABEL[a.status] ?? { label: a.status, tone: "outline" as const };
                return (
                  <div key={a.application_id} className="rounded-lg border p-3 bg-card">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={a.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Link to={`/gardiens/${a.sitter_id}`} className="font-medium hover:underline">
                            {name}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant={st.tone}>{st.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </div>
                        {a.message && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {a.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Conversations */}
          <TabsContent value="conversations" className="space-y-3 mt-4">
            {activeConv ? (
              <div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveConv(null); setMessages([]); }} className="mb-3">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Retour aux conversations
                </Button>
                <div className="rounded-lg border bg-card p-3 mb-3 text-sm">
                  <div className="font-medium">{activeConv.owner_name} ↔ {activeConv.sitter_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {activeConv.message_count} message{activeConv.message_count > 1 ? "s" : ""}
                  </div>
                </div>
                {loadingMsgs ? (
                  [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aucun message.</p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {messages.map((m) => (
                      <div key={m.message_id} className={`rounded-lg border p-2.5 ${m.is_system ? "bg-muted/40 italic" : "bg-card"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={m.sender_avatar || undefined} />
                            <AvatarFallback className="text-[10px]">{initials(m.sender_name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{m.sender_name}</span>
                          <span
                            className="text-[10px] text-muted-foreground ml-auto"
                            title={format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          >
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                        {m.photo_url && (
                          <img src={m.photo_url} alt="" className="mt-2 max-h-40 rounded border" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : loadingConvs ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : convs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune conversation rattachée à cette annonce.
              </p>
            ) : (
              convs.map((c) => (
                <button
                  key={c.conversation_id}
                  onClick={() => openConversation(c)}
                  className="w-full text-left rounded-lg border p-3 bg-card hover:bg-accent/40 transition"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={c.sitter_avatar || undefined} />
                        <AvatarFallback className="text-[10px]">{initials(c.sitter_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.owner_name} ↔ {c.sitter_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.message_count} message{c.message_count > 1 ? "s" : ""}
                          {c.last_message_at && (
                            <> · dernier {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: fr })}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Lire</Badge>
                  </div>
                </button>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ListingDrilldownDialog;
