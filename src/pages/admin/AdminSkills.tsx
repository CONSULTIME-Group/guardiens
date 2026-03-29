import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SkillRow {
  id: string;
  label: string;
  normalized_label: string;
  category: string | null;
  status: string;
  usage_count: number;
  created_at: string;
  first_submitted_by: string | null;
  merged_into: string | null;
}

type FilterStatus = "pending" | "approved" | "rejected" | "all";

const CATEGORY_LABELS: Record<string, string> = {
  jardin: "Jardin",
  animaux: "Animaux",
  competences: "Compétences",
  coups_de_main: "Coups de main",
};

const AdminSkills = () => {
  const { toast } = useToast();
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, members: 0 });
  const [staleCount, setStaleCount] = useState(0);

  const fetchSkills = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("skills_library")
      .select("*")
      .order("usage_count", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setSkills((data as any as SkillRow[]) || []);

    // Fetch counts
    const [pendingRes, approvedRes, rejectedRes, staleRes] = await Promise.all([
      supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("skills_library").select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
    ]);

    // Count unique members with custom skills
    const { data: memberData } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("custom_skills", "[]");

    setCounts({
      pending: pendingRes.count || 0,
      approved: approvedRes.count || 0,
      rejected: rejectedRes.count || 0,
      members: memberData ? (memberData as any) : 0,
    });
    setStaleCount(staleRes.count || 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const handleApprove = async (skill: SkillRow, newLabel?: string) => {
    const updates: any = { status: "approved" };
    if (newLabel) {
      updates.label = newLabel;
      updates.normalized_label = newLabel
        .toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
    }

    await supabase.from("skills_library").update(updates).eq("id", skill.id);

    // Update all profiles with this skill_id
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, custom_skills")
      .filter("custom_skills", "cs", `[{"skill_id":"${skill.id}"}]`);

    if (profiles) {
      for (const p of profiles) {
        const skills = (p.custom_skills as any[]) || [];
        const updated = skills.map((s: any) =>
          s.skill_id === skill.id
            ? { ...s, status: "approved", ...(newLabel ? { label: newLabel } : {}) }
            : s
        );
        await supabase.from("profiles").update({ custom_skills: updated } as any).eq("id", p.id);
      }
    }

    setEditingId(null);
    toast({ description: `Compétence "${newLabel || skill.label}" approuvée.` });
    fetchSkills();
    window.dispatchEvent(new Event("admin-badges-refresh"));
  };

  const handleReject = async (skill: SkillRow) => {
    await supabase.from("skills_library").update({ status: "rejected" } as any).eq("id", skill.id);

    // Remove from all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, custom_skills")
      .filter("custom_skills", "cs", `[{"skill_id":"${skill.id}"}]`);

    if (profiles) {
      for (const p of profiles) {
        const skills = (p.custom_skills as any[]) || [];
        const filtered = skills.filter((s: any) => s.skill_id !== skill.id);
        await supabase.from("profiles").update({ custom_skills: filtered } as any).eq("id", p.id);
      }
    }

    toast({ description: `Compétence "${skill.label}" refusée.` });
    fetchSkills();
    window.dispatchEvent(new Event("admin-badges-refresh"));
  };

  const isStale = (createdAt: string) => {
    return new Date(createdAt) < new Date(Date.now() - 48 * 60 * 60 * 1000);
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <h1 className="font-heading text-2xl font-bold">Compétences membres</h1>

      <p className="text-sm text-muted-foreground">
        {counts.pending} en attente · {counts.approved} approuvées · {counts.members || 0} membres concernés
      </p>

      {staleCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 font-medium">
            {staleCount} compétence(s) en attente depuis plus de 48h.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {s === "pending" && `En attente (${counts.pending})`}
            {s === "approved" && "Approuvées"}
            {s === "rejected" && "Refusées"}
            {s === "all" && "Toutes"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Chargement...</p>
      ) : skills.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Aucune compétence dans ce filtre.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Label soumis</th>
                <th className="text-left px-4 py-3 font-medium">Normalisé</th>
                <th className="text-left px-4 py-3 font-medium">Catégorie</th>
                <th className="text-center px-4 py-3 font-medium">Utilisations</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {skills.map(skill => (
                <tr
                  key={skill.id}
                  className={skill.status === "pending" && isStale(skill.created_at) ? "bg-amber-50/60" : ""}
                >
                  <td className="px-4 py-3">{skill.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{skill.normalized_label}</td>
                  <td className="px-4 py-3">
                    {skill.category ? (
                      <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {CATEGORY_LABELS[skill.category] || skill.category}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{skill.usage_count}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(skill.created_at), "dd MMM yyyy", { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    {skill.status === "pending" ? (
                      <div className="flex items-center gap-1 justify-end">
                        {editingId === skill.id ? (
                          <>
                            <Input
                              value={editLabel}
                              onChange={e => setEditLabel(e.target.value)}
                              className="h-8 w-40 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-primary"
                              onClick={() => handleApprove(skill, editLabel)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-primary"
                              onClick={() => handleApprove(skill)}
                              title="Approuver"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => {
                                setEditingId(skill.id);
                                setEditLabel(skill.label);
                              }}
                              title="Modifier + Approuver"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive"
                              onClick={() => handleReject(skill)}
                              title="Refuser"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className={`text-xs font-medium ${
                        skill.status === "approved" ? "text-green-600" : "text-destructive"
                      }`}>
                        {skill.status === "approved" ? "Approuvée" : "Refusée"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSkills;
