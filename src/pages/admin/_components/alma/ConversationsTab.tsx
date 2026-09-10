/**
 * Onglet Conversations de /admin/alma (lot 2).
 *
 * Lit `alma_conversations`. Le corpus des questions est la matière la plus
 * précieuse du produit : il est affiché en texte intégral, horodaté, avec
 * la surface et le rôle actif.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import {
  aggregateThemes,
  aggregateRefusals,
  averageAnswerLength,
  openingRepetition,
  inputSplit,
  conversationsFollowedByAction,
  type RawConversation,
} from "@/lib/admin/alma-conversations";
import { toCsv } from "@/lib/admin/alma-analytics";

const ROW_LIMIT = 5000;

function pct(v: number) {
  return `${Math.round(v * 100)} %`;
}

export function ConversationsTab({ since }: { since: string }) {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-alma-conversations", since],
    queryFn: async (): Promise<RawConversation[]> => {
      const { data, error } = await supabase
        .from("alma_conversations" as any)
        .select(
          "id, created_at, surface, active_role, question, answer, register, refusal_reason, input_mode, user_id",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return (data ?? []) as unknown as RawConversation[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: actionEvents = [] } = useQuery({
    queryKey: ["admin-alma-conversation-actions", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("user_id, created_at")
        .gte("created_at", since)
        .limit(20000);
      return (data ?? []) as Array<{ user_id: string | null; created_at: string }>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const themes = useMemo(() => aggregateThemes(rows), [rows]);
  const refusals = useMemo(() => aggregateRefusals(rows), [rows]);
  const avgLength = useMemo(() => averageAnswerLength(rows), [rows]);
  const openings = useMemo(() => openingRepetition(rows), [rows]);
  const split = useMemo(() => inputSplit(rows), [rows]);
  const followed = useMemo(
    () => conversationsFollowedByAction(rows, actionEvents),
    [rows, actionEvents],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.question.toLowerCase().includes(q) ||
        (r.answer ?? "").toLowerCase().includes(q) ||
        r.surface.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const exportCsv = () => {
    const csv = toCsv(filtered as unknown as Record<string, unknown>[], [
      "created_at",
      "surface",
      "active_role",
      "register",
      "refusal_reason",
      "input_mode",
      "question",
      "answer",
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "alma-conversations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Échanges</p>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Longueur moyenne des réponses</p>
            <p className="text-2xl font-semibold">{avgLength} car.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Suivies d'une action sous dix minutes</p>
            <p className="text-2xl font-semibold">{pct(followed.rate)}</p>
            <p className="text-xs text-muted-foreground">{followed.count} échanges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Part de la dictée</p>
            <p className="text-2xl font-semibold">{pct(split.voiceShare)}</p>
            <p className="text-xs text-muted-foreground">
              {split.voice} voix, {split.keyboard} clavier
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Thèmes</p>
            {themes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun échange sur la période.</p>
            ) : (
              themes.map((t) => (
                <div key={t.theme} className="flex items-center justify-between text-xs">
                  <span>{t.label}</span>
                  <span className="text-muted-foreground">
                    {t.count} ({pct(t.share)})
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Refus par motif</p>
            {refusals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun refus sur la période.</p>
            ) : (
              refusals.map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-xs">
                  <span>{r.label}</span>
                  <span className="text-muted-foreground">
                    {r.count} ({pct(r.rate)})
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Répétition des ouvertures</p>
            <p className="text-xs text-muted-foreground">
              Part des réponses partageant leurs cinq premiers mots : {pct(openings.repetitionRate)}
            </p>
            {openings.groups.slice(0, 6).map((g) => (
              <div key={g.opening} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{g.opening}</span>
                <span className="text-muted-foreground shrink-0">{g.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans le corpus"
          className="w-64"
        />
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" /> Exporter
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} échanges affichés</span>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement du corpus.</p>}
        {filtered.slice(0, 300).map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {format(new Date(r.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                </span>
                <Badge variant="outline">{r.surface}</Badge>
                <Badge variant="outline">
                  {r.active_role === "owner" ? "propriétaire" : "gardien"}
                </Badge>
                {r.register && <Badge variant="secondary">{r.register}</Badge>}
                {r.input_mode && <Badge variant="outline">{r.input_mode === "voice" ? "voix" : "clavier"}</Badge>}
                {r.refusal_reason && <Badge variant="destructive">{r.refusal_reason}</Badge>}
              </div>
              <p className="text-sm font-medium whitespace-pre-wrap">{r.question}</p>
              {r.answer && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.answer}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ConversationsTab;
