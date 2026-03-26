import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const AdminExperienceVerification = () => {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("external_experiences").select("*, profile:profiles!external_experiences_user_id_fkey(first_name, last_name, avatar_url)")
      .eq("verification_status", "pending").order("created_at", { ascending: true })
      .then(({ data }) => { setExperiences(data || []); setLoading(false); });
  }, []);

  const handleVerify = async (id: string) => {
    const { error } = await supabase.from("external_experiences").update({ verification_status: "verified" }).eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    setExperiences(prev => prev.filter(e => e.id !== id));
    toast.success("Expérience validée !");
  };

  const handleReject = async (id: string) => {
    const note = rejectNote[id] || "Screenshot illisible ou contenu incohérent";
    const { error } = await supabase.from("external_experiences").update({ verification_status: "rejected", admin_note: note }).eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    setExperiences(prev => prev.filter(e => e.id !== id));
    toast.success("Expérience rejetée.");
  };

  if (loading) return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold">Expériences à vérifier ({experiences.length})</h2>
      {experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune expérience en attente.</p>
      ) : (
        experiences.map(exp => (
          <div key={exp.id} className="p-5 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center gap-3">
              {exp.profile?.avatar_url ? (
                <img src={exp.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">{exp.profile?.first_name?.charAt(0) || "?"}</div>
              )}
              <div>
                <p className="font-medium text-sm">{exp.profile?.first_name} {exp.profile?.last_name}</p>
                <p className="text-xs text-muted-foreground">{exp.platform_name} · {exp.duration} · {exp.experience_date}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Clock className="h-3 w-3" /> En attente
              </span>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Résumé</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{exp.summary}</p>
            </div>

            <div className="text-xs text-muted-foreground">
              <span>Animaux : {exp.animal_types}</span>
              {exp.city && <span> · {exp.city}{exp.country ? `, ${exp.country}` : ""}</span>}
            </div>

            {exp.screenshot_urls?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Screenshots ({exp.screenshot_urls.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {exp.screenshot_urls.map((path: string, i: number) => {
                    const { data } = supabase.storage.from("experience-screenshots").getPublicUrl(path);
                    return (
                      <img key={i} src={data.publicUrl} alt={`Screenshot ${i + 1}`} className="h-40 rounded-lg border border-border object-contain bg-muted" />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button size="sm" className="gap-1.5" onClick={() => handleVerify(exp.id)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Valider
              </Button>
              <div className="flex-1">
                <Textarea value={rejectNote[exp.id] || ""} onChange={e => setRejectNote(prev => ({ ...prev, [exp.id]: e.target.value }))} placeholder="Motif de rejet (optionnel)" rows={1} className="text-xs" />
              </div>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleReject(exp.id)}>
                <XCircle className="h-3.5 w-3.5" /> Rejeter
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminExperienceVerification;
