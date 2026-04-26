import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil, AlertTriangle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface CompetenceRow {
  id: string;
  label: string;
  categorie: string;
  usage_count: number;
  created_at: string;
}

type FilterStatus = "pending" | "approved" | "rejected" | "all";

const CATEGORY_LABELS: Record<string, string> = {
  jardin: "🌿 Jardin",
  animaux: "🐾 Animaux",
  competences: "Compétences",
  competences_savoirs: "📚 Compétences & Savoirs",
  coups_de_main: "🤝 Coups de main",
};

const AdminSkills = () => {
  const { toast } = useToast();
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [competences, setCompetences] = useState<CompetenceRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, members: 0 });
  const [staleCount, setStaleCount] = useState(0);
  const [newCompLabel, setNewCompLabel] = useState("");
  const [newCompCategorie, setNewCompCategorie] = useState("jardin");
  const [pendingCompetences, setPendingCompetences] = useState<{ label: string; count: number; sources: string[] }[]>([]);

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

  const fetchCompetences = useCallback(async () => {
    const { data } = await supabase
      .from("competences_validees")
      .select("*")
      .order("usage_count", { ascending: false });
    setCompetences((data as any as CompetenceRow[]) || []);
  }, []);

  const fetchPendingCompetences = useCallback(async () => {
    // Find competences in sitter_profiles and owner_profiles that are NOT in competences_validees
    const { data: validatedData } = await supabase.from("competences_validees").select("label");
    const validatedSet = new Set((validatedData || []).map((d: any) => d.label));

    const [sitterRes, ownerRes] = await Promise.all([
      supabase.from("sitter_profiles").select("competences").not("competences", "is", null),
      supabase.from("owner_profiles").select("competences").not("competences", "is", null),
    ]);

    const countMap = new Map<string, number>();
    [...(sitterRes.data || []), ...(ownerRes.data || [])].forEach((p: any) => {
      (p.competences || []).forEach((c: string) => {
        if (!validatedSet.has(c)) {
          countMap.set(c, (countMap.get(c) || 0) + 1);
        }
      });
    });

    setPendingCompetences(
      Array.from(countMap.entries())
        .map(([label, count]) => ({ label, count, sources: [] }))
        .sort((a, b) => b.count - a.count)
    );
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);
  useEffect(() => { fetchCompetences(); fetchPendingCompetences(); }, [fetchCompetences, fetchPendingCompetences]);

  const handleApprove = async (skill: SkillRow, newLabel?: string) => {
    const updates: any = { status: "approved" };
    if (newLabel) {
      updates.label = newLabel;
      // normalisation cohérente + collapse des espaces internes
      updates.normalized_label = normalize(newLabel).replace(/\s+/g, " ");
    }

    await supabase.from("skills_library").update(updates).eq("id", skill.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, custom_skills")
      .filter("custom_skills", "cs", `[{"skill_id":"${skill.id}"}]`);

    if (profiles) {
      for (const p of profiles) {
        const pSkills = (p.custom_skills as unknown as any[]) || [];
        const updated = pSkills.map((s: any) =>
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

  const handleValidateCompetence = async (label: string) => {
    // Add to competences_validees
    await supabase.from("competences_validees").insert({
      label,
      categorie: "competences_savoirs",
    } as any);
    toast({ description: `"${label}" ajoutée au référentiel.` });
    fetchCompetences();
    fetchPendingCompetences();
  };

  const handleRejectCompetence = async (label: string) => {
    // Remove from all sitter and owner profiles that contain this competence
    const [sitterRes, ownerRes] = await Promise.all([
      supabase.from("sitter_profiles").select("id, competences").contains("competences", [label]),
      supabase.from("owner_profiles").select("id, competences").contains("competences", [label]),
    ]);

    let updatedCount = 0;

    for (const p of (sitterRes.data || [])) {
      const comps = ((p as any).competences || []).filter((c: string) => c !== label);
      const { error } = await supabase.from("sitter_profiles").update({ competences: comps } as any).eq("id", p.id);
      if (error) {
        console.error("Error updating sitter_profile:", p.id, error);
      } else {
        updatedCount++;
      }
    }
    for (const p of (ownerRes.data || [])) {
      const comps = ((p as any).competences || []).filter((c: string) => c !== label);
      const { error } = await supabase.from("owner_profiles").update({ competences: comps } as any).eq("id", p.id);
      if (error) {
        console.error("Error updating owner_profile:", p.id, error);
      } else {
        updatedCount++;
      }
    }

    toast({ description: `"${label}" refusée et retirée de ${updatedCount} profil(s).` });
    fetchPendingCompetences();
  };

  const handleAddCompetence = async () => {
    if (!newCompLabel.trim()) return;
    await supabase.from("competences_validees").insert({
      label: newCompLabel.trim(),
      categorie: newCompCategorie,
    } as any);
    setNewCompLabel("");
    toast({ description: `"${newCompLabel.trim()}" ajoutée.` });
    fetchCompetences();
  };

  const isStale = (createdAt: string) => {
    return new Date(createdAt) < new Date(Date.now() - 48 * 60 * 60 * 1000);
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <h1 className="font-heading text-2xl font-bold">Compétences membres</h1>

      <Tabs defaultValue="competences">
        <TabsList>
          <TabsTrigger value="competences">Référentiel ({competences.length})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({pendingCompetences.length})</TabsTrigger>
          <TabsTrigger value="legacy">Compétences libres ({counts.pending})</TabsTrigger>
        </TabsList>

        {/* Tab: Référentiel competences_validees */}
        <TabsContent value="competences" className="space-y-4 mt-4">
          {/* Add new */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nouvelle compétence</label>
              <Input value={newCompLabel} onChange={e => setNewCompLabel(e.target.value)} placeholder="Ex : Toilettage canin" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Catégorie</label>
              <select
                value={newCompCategorie}
                onChange={e => setNewCompCategorie(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="jardin">Jardin</option>
                <option value="animaux">Animaux</option>
                <option value="competences_savoirs">Compétences & Savoirs</option>
                <option value="coups_de_main">Coups de main</option>
              </select>
            </div>
            <Button onClick={handleAddCompetence} disabled={!newCompLabel.trim()} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Label</th>
                  <th className="text-left px-4 py-3 font-medium">Catégorie</th>
                  <th className="text-center px-4 py-3 font-medium">Utilisations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {competences.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">{c.label}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {CATEGORY_LABELS[c.categorie] || c.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{c.usage_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab: Pending competences from profiles */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingCompetences.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Aucune compétence en attente de validation.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Label soumis</th>
                    <th className="text-center px-4 py-3 font-medium">Soumissions</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingCompetences.map(pc => (
                    <tr key={pc.label}>
                      <td className="px-4 py-3 font-medium">{pc.label}</td>
                      <td className="px-4 py-3 text-center">{pc.count}×</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-primary"
                            onClick={() => handleValidateCompetence(pc.label)}
                            title="Valider et ajouter au référentiel"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive"
                            onClick={() => handleRejectCompetence(pc.label)}
                            title="Refuser et retirer des profils"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab: Legacy skills_library */}
        <TabsContent value="legacy" className="space-y-4 mt-4">
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
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary" onClick={() => handleApprove(skill, editLabel)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary" onClick={() => handleApprove(skill)} title="Approuver">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditingId(skill.id); setEditLabel(skill.label); }} title="Modifier + Approuver">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => handleReject(skill)} title="Refuser">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSkills;
