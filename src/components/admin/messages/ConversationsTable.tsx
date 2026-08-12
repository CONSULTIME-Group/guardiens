/**
 * Onglet Conversations de /admin/messages.
 *
 * Toute la lecture passe par `admin_list_conversations`, fonction SECURITY
 * DEFINER avec contrôle du rôle admin, parce que les policies de
 * `conversations` et `messages` n'autorisent que les participants. Aucune
 * policy n'est modifiée, aucune écriture n'est faite depuis cet écran.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import ConversationThreadPanel from "./ConversationThreadPanel";
import {
  CONVERSATION_CONTEXT_LABEL,
  REPLY_STATE_LABEL,
  contextLabel,
  linkedTitle,
  periodSince,
  replyState,
  unreadAgeDays,
  type AdminConversationRow,
  type ConversationPeriod,
  type ConversationSort,
} from "./conversationFilters";

const PAGE_SIZE = 25;

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const fmt = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : shortDate.format(d);
};

interface MemberHit {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  conv_count: number;
}

export const ConversationsTable = ({
  focusUserId,
  onClearFocusUser,
}: {
  focusUserId?: string | null;
  onClearFocusUser?: () => void;
}) => {
  const [period, setPeriod] = useState<ConversationPeriod>("all");
  const [context, setContext] = useState<string>("all");
  const [sort, setSort] = useState<ConversationSort>("last_message");
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [unreadDays, setUnreadDays] = useState<string>("none");
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<MemberHit | null>(null);

  const [rows, setRows] = useState<AdminConversationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openRow, setOpenRow] = useState<AdminConversationRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeUserId = focusUserId || selectedUser?.user_id || null;

  useEffect(() => {
    setPage(0);
  }, [period, context, sort, onlyUnanswered, unreadDays, activeUserId]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_conversations", {
      p_since: periodSince(period),
      p_context: context === "all" ? null : context,
      p_user_id: activeUserId,
      p_only_unanswered: onlyUnanswered,
      p_unread_days: unreadDays === "none" ? null : Number(unreadDays),
      p_sort: sort,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (error) logger.error("admin_list_conversations failed", { error: String(error.message) });
    const list = (data as unknown as AdminConversationRow[]) || [];
    setRows(list);
    setTotal(list.length > 0 ? Number(list[0].total_count) : 0);
    setLoading(false);
  }, [period, context, activeUserId, onlyUnanswered, unreadDays, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Recherche de membre, débounce court, purement indicative.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_conversation_search", { p_query: q });
      if (error) logger.error("admin_conversation_search failed", { error: String(error.message) });
      setHits((data as unknown as MemberHit[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const openThread = (row: AdminConversationRow) => {
    setOpenRow(row);
    setPanelOpen(true);
  };

  const clearMember = () => {
    setSelectedUser(null);
    setSearch("");
    setHits([]);
    onClearFocusUser?.();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as ConversationPeriod)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">3 derniers mois</SelectItem>
                <SelectItem value="all">Depuis le début</SelectItem>
              </SelectContent>
            </Select>

            <Select value={context} onValueChange={setContext}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Contexte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contextes</SelectItem>
                {Object.entries(CONVERSATION_CONTEXT_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as ConversationSort)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last_message">Tri par dernier message</SelectItem>
                <SelectItem value="unread_age">Tri par ancienneté du non lu</SelectItem>
                <SelectItem value="volume">Tri par volume</SelectItem>
              </SelectContent>
            </Select>

            <Select value={unreadDays} onValueChange={setUnreadDays}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non lus : sans filtre</SelectItem>
                <SelectItem value="1">Non lus depuis plus de 1 jour</SelectItem>
                <SelectItem value="3">Non lus depuis plus de 3 jours</SelectItem>
                <SelectItem value="7">Non lus depuis plus de 7 jours</SelectItem>
                <SelectItem value="30">Non lus depuis plus de 30 jours</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={onlyUnanswered ? "default" : "outline"}
              onClick={() => setOnlyUnanswered((v) => !v)}
            >
              Sans réponse
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre (nom ou email)"
                aria-label="Rechercher un membre"
              />
              {hits.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
                  {hits.map((h) => (
                    <button
                      key={h.user_id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onClearFocusUser?.();
                        setSelectedUser(h);
                        setHits([]);
                        setSearch("");
                      }}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={h.avatar_url || ""} />
                        <AvatarFallback className="text-[10px]">{(h.full_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{h.full_name || "Membre"}</span>
                      <span className="text-xs text-muted-foreground">{h.conv_count} conv.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeUserId && (
              <Badge variant="secondary" className="gap-2">
                Filtré sur {selectedUser?.full_name || "ce membre"}
                <button type="button" className="underline" onClick={clearMember}>
                  retirer
                </button>
              </Badge>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {loading ? "Chargement" : `${total} conversation(s)`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucune conversation ne correspond à ces filtres.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participants</TableHead>
                  <TableHead>Contexte</TableHead>
                  <TableHead>Objet lié</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead>Dernier message</TableHead>
                  <TableHead className="text-right">Non lus</TableHead>
                  <TableHead>Réponse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const state = replyState(r);
                  const age = unreadAgeDays(r.oldest_unread_at);
                  const objet = linkedTitle(r);
                  return (
                    <TableRow
                      key={r.conversation_id}
                      className="cursor-pointer"
                      onClick={() => openThread(r)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={r.owner_avatar || ""} />
                            <AvatarFallback className="text-[10px]">{(r.owner_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={r.sitter_avatar || ""} />
                            <AvatarFallback className="text-[10px]">{(r.sitter_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[220px]">
                            {r.owner_name || "Propriétaire"} et {r.sitter_name || "Gardien"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{contextLabel(r.context_type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {objet ? (
                          r.sit_id ? (
                            <Link
                              to={`/annonces/${r.sit_id}`}
                              className="text-sm underline truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {objet}
                            </Link>
                          ) : (
                            <Link
                              to={`/petites-missions/${r.small_mission_id}`}
                              className="text-sm underline truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {objet}
                            </Link>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.message_count}</TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="text-sm truncate">{r.last_message_excerpt || "-"}</p>
                        <p className="text-[11px] text-muted-foreground">{fmt(r.last_message_at)}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.unread_count > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {r.unread_count}{age !== null ? `, ${age} j` : ""}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={state === "exchanged" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {REPLY_STATE_LABEL[state]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Précédent
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} sur {pageCount}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      <ConversationThreadPanel conversation={openRow} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
};

export default ConversationsTable;
