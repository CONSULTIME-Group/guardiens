import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil, X, Check } from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "Questions générales" },
  { value: "owner", label: "Pour les propriétaires" },
  { value: "sitter", label: "Pour les gardiens" },
  { value: "security", label: "Sécurité & confiance" },
  { value: "pricing", label: "Tarifs & abonnements" },
];

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  published: boolean;
}

const AdminFAQ = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "general", sort_order: 0 });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_entries" as any)
        .select("*")
        .order("category")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as FaqEntry[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await (supabase.from("faq_entries" as any) as any).update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("faq_entries" as any) as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
      toast.success(editId ? "Question mise à jour" : "Question ajoutée");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("faq_entries" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
      toast.success("Question supprimée");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase.from("faq_entries" as any) as any).update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-faq"] }),
  });

  const resetForm = () => {
    setForm({ question: "", answer: "", category: "general", sort_order: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (entry: FaqEntry) => {
    setForm({ question: entry.question, answer: entry.answer, category: entry.category, sort_order: entry.sort_order });
    setEditId(entry.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FAQ</h1>
          <p className="text-muted-foreground text-sm">{entries.length} questions • Rich snippets Schema.org</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editId ? "Modifier" : "Nouvelle question"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
            <Textarea
              placeholder="Réponse"
              rows={4}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
            />
            <div className="flex gap-4">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Ordre"
                className="w-24"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => upsertMutation.mutate()} disabled={!form.question || !form.answer} className="gap-2">
                <Check className="h-4 w-4" /> {editId ? "Mettre à jour" : "Ajouter"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{entry.question}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === entry.category)?.label} • Ordre: {entry.sort_order}
                </p>
              </div>
              <Switch
                checked={entry.published}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: entry.id, published: checked })}
              />
              <Button size="icon" variant="ghost" onClick={() => startEdit(entry)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(entry.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFAQ;
