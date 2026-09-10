/**
 * Onglet Humeurs de /admin/alma (lot 2).
 * Même modèle que l'onglet des faits culturels : liste par humeur, vues sur
 * 30 jours, activation ligne par ligne.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trackEvent } from "@/lib/analytics";
import { ALMA_MOOD_KEYS, MOOD_STATUS_LABEL, type AlmaMoodKey } from "@/lib/alma/mood";

interface MoodRow {
  id: string;
  mood: AlmaMoodKey;
  content: string;
  weather_condition: string | null;
  season: string | null;
  time_of_day: string | null;
  weight: number;
  active: boolean;
}

export function MoodsTab() {
  const qc = useQueryClient();
  const [moodFilter, setMoodFilter] = useState<string>("all");

  const { data: moods = [], isLoading } = useQuery({
    queryKey: ["admin-alma-moods"],
    queryFn: async (): Promise<MoodRow[]> => {
      const { data, error } = await supabase
        .from("alma_moods" as any)
        .select("*")
        .order("mood", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as MoodRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: views = [] } = useQuery({
    queryKey: ["admin-alma-mood-views"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("alma_mood_views" as any)
        .select("mood_id")
        .gte("created_at", since)
        .limit(20000);
      return (data ?? []) as Array<{ mood_id: string }>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const viewsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of views) m.set(v.mood_id, (m.get(v.mood_id) ?? 0) + 1);
    return m;
  }, [views]);

  const filtered = useMemo(
    () => (moodFilter === "all" ? moods : moods.filter((m) => m.mood === moodFilter)),
    [moods, moodFilter],
  );

  const toggleActive = async (row: MoodRow) => {
    const next = !row.active;
    const { error } = await supabase
      .from("alma_moods" as any)
      .update({ active: next } as any)
      .eq("id", row.id);
    if (error) {
      toast.error("Impossible de modifier cette ligne, réessayez.");
      return;
    }
    toast.success(next ? "Ligne réactivée" : "Ligne désactivée");
    void trackEvent("admin_alma_mood_toggled" as any, {
      metadata: { mood_id: row.id, active: next },
    });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id ?? null;
      if (adminId) {
        await supabase.from("admin_action_logs").insert({
          admin_id: adminId,
          action: "alma_mood_toggled",
          target_type: "alma_mood",
          target_id: row.id,
          metadata: { active: next },
        });
      }
    } catch {
      /* la trace d'audit ne bloque jamais l'action */
    }
    void qc.invalidateQueries({ queryKey: ["admin-alma-moods"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={moodFilter} onValueChange={setMoodFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les humeurs</SelectItem>
            {ALMA_MOOD_KEYS.map((m) => (
              <SelectItem key={m} value={m}>
                {MOOD_STATUS_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} lignes</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Humeur</TableHead>
                <TableHead>Phrase</TableHead>
                <TableHead>Contexte</TableHead>
                <TableHead className="text-right">Poids</TableHead>
                <TableHead className="text-right">Vues 30 j</TableHead>
                <TableHead className="text-right">État</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Chargement du carnet.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant="outline">{MOOD_STATUS_LABEL[row.mood] ?? row.mood}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md text-sm">{row.content}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[row.weather_condition, row.season, row.time_of_day]
                      .filter(Boolean)
                      .join(", ") || "tous contextes"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{row.weight}</TableCell>
                  <TableCell className="text-right text-sm">
                    {viewsById.get(row.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={row.active ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => toggleActive(row)}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default MoodsTab;
