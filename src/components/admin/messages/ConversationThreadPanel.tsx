/**
 * Panneau latéral d'un fil de conversation, côté admin.
 *
 * Lecture stricte : le fil est lu via `admin_get_conversation_messages`, une
 * fonction SECURITY DEFINER en lecture seule. Aucun `read_at` n'est écrit,
 * aucune notification n'est déclenchée. Chaque ouverture est tracée dans
 * `admin_action_logs`, parce que consulter le contenu privé de deux membres
 * est une capacité sensible qui doit rester auditable.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { contextLabel, linkedTitle, type AdminConversationRow } from "./conversationFilters";

interface ThreadMessage {
  message_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string | null;
  photo_url: string | null;
  is_system: boolean | null;
  created_at: string;
  read_at: string | null;
}

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatAt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTime.format(d);
};

export const ConversationThreadPanel = ({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: AdminConversationRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !conversation) return;
    let cancelled = false;
    const convId = conversation.conversation_id;

    (async () => {
      setLoading(true);
      const [{ data, error }, { data: hidden }] = await Promise.all([
        supabase.rpc("admin_get_conversation_messages", { p_conversation_id: convId }),
        supabase.rpc("admin_conversation_hidden_messages", { p_conversation_id: convId }),
      ]);
      if (cancelled) return;
      if (error) logger.error("admin_get_conversation_messages failed", { error: String(error.message) });
      setMessages(((data as unknown as ThreadMessage[]) || []));
      setHiddenIds(new Set(((hidden as unknown as { message_id: string }[]) || []).map((h) => h.message_id)));
      setLoading(false);
    })();

    // Traçabilité RGPD : une ligne par ouverture de fil, une seule fois par fil.
    if (user?.id && loggedRef.current !== convId) {
      loggedRef.current = convId;
      supabase
        .from("admin_action_logs")
        .insert({
          admin_id: user.id,
          action: "view_conversation_thread",
          target_type: "conversation",
          target_id: convId,
          note: "Consultation du contenu privé d'une conversation, lecture seule",
          metadata: {
            owner_id: conversation.owner_id,
            sitter_id: conversation.sitter_id,
            context_type: conversation.context_type,
          },
        })
        .then(({ error }) => {
          if (error) logger.error("admin_action_logs insert failed", { error: String(error.message) });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, conversation, user?.id]);

  const title = conversation ? linkedTitle(conversation) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border space-y-2 text-left">
          <SheetTitle className="text-base">
            {conversation ? `${conversation.owner_name || "Propriétaire"} et ${conversation.sitter_name || "Gardien"}` : "Conversation"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Lecture seule. Rien n'est marqué comme lu côté membre, aucune notification n'est envoyée.
          </SheetDescription>
          {conversation && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{contextLabel(conversation.context_type)}</Badge>
              {conversation.owner_id && (
                <Link className="underline text-muted-foreground" to={`/admin/users?id=${conversation.owner_id}`}>
                  Fiche propriétaire
                </Link>
              )}
              {conversation.sitter_id && (
                <Link className="underline text-muted-foreground" to={`/admin/users?id=${conversation.sitter_id}`}>
                  Fiche gardien
                </Link>
              )}
              {conversation.sit_id && (
                <Link className="underline text-muted-foreground" to={`/annonces/${conversation.sit_id}`}>
                  {title || "Annonce liée"}
                </Link>
              )}
              {!conversation.sit_id && conversation.small_mission_id && (
                <Link className="underline text-muted-foreground" to={`/entraide/${conversation.small_mission_id}`}>
                  {title || "Coup de main lié"}
                </Link>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun message dans ce fil.</p>
          ) : (
            messages.map((m) => {
              const hidden = hiddenIds.has(m.message_id);
              return (
                <div
                  key={m.message_id}
                  className={
                    m.is_system
                      ? "rounded-lg border border-dashed border-border bg-muted/40 p-3"
                      : "rounded-lg border border-border bg-card p-3"
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {!m.is_system && (
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={m.sender_avatar || ""} />
                          <AvatarFallback className="text-[10px]">{(m.sender_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-xs font-medium truncate">
                        {m.is_system ? "Message système" : m.sender_name || "Membre"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatAt(m.created_at)}</span>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap ${hidden ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {m.content || ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {!m.is_system && (
                      <Badge variant="outline" className="text-[10px]">
                        {m.read_at ? `Lu le ${formatAt(m.read_at)}` : "Non lu"}
                      </Badge>
                    )}
                    {hidden && (
                      <Badge variant="destructive" className="text-[10px]">
                        Masqué par la modération
                      </Badge>
                    )}
                    {m.photo_url && (
                      <Badge variant="secondary" className="text-[10px]">Photo jointe</Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationThreadPanel;
