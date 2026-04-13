import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, MessageSquare, Image, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type StatusFilter = "pending" | "verified" | "rejected";

const AdminExperienceVerification = () => {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusFilter>("pending");
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; reason: string; customReason: string }>({
    open: false, id: "", reason: "", customReason: ""
  });
  const [complementModal, setComplementModal] = useState<{ open: boolean; id: string; userId: string; message: string }>({
    open: false, id: "", userId: "", message: ""
  });
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getSignedUrl = async (path: string): Promise<string> => {
    if (signedUrls[path]) return signedUrls[path];
    const { data } = await supabase.storage.from("experience-screenshots").createSignedUrl(path, 3600);
    const url = data?.signedUrl || "";
    if (url) setSignedUrls(prev => ({ ...prev, [path]: url }));
    return url;
  };

  const fetchCounts = useCallback(async () => {
    const [p, v, r] = await Promise.all([
      supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
      supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "rejected"),
    ]);
    setCounts({ pending: p.count || 0, verified: v.count || 0, rejected: r.count || 0 });
  }, []);

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("external_experiences")
      .select("*, profile:profiles!external_experiences_user_id_fkey(first_name, last_name, avatar_url, role)")
      .eq("verification_status", activeTab)
      .order("created_at", { ascending: activeTab === "pending" });
    const exps = data || [];
    for (const exp of exps) {
      for (const path of (exp.screenshot_urls || [])) {
        getSignedUrl(path);
      }
    }
    setExperiences(exps);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchExperiences(); fetchCounts(); }, [fetchExperiences, fetchCounts]);

  const handleVerify = async (id: string, userId: string) => {
    const { error } = await supabase.from("external_experiences").update({ verification_status: "verified" }).eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    await supabase.from("notifications").insert({
      user_id: userId, type: "experience_verified",
      title: "Expérience vérifiée ✓",
      body: "Votre expérience externe a été validée et apparaît maintenant sur votre profil.",
      link: "/profile",
    });
    setExperiences(prev => prev.filter(e => e.id !== id));
    setCounts(prev => ({ ...prev, pending: prev.pending - 1, verified: prev.verified + 1 }));
    toast.success("Expérience validée !");
  };

  const handleReject = async () => {
    const reason = rejectModal.reason === "Autre" ? rejectModal.customReason : rejectModal.reason;
    if (!reason) { toast.error("Veuillez préciser un motif"); return; }
    const exp = experiences.find(e => e.id === rejectModal.id);
    const { error } = await supabase.from("external_experiences").update({ verification_status: "rejected", admin_note: reason }).eq("id", rejectModal.id);
    if (error) { toast.error("Erreur"); return; }
    if (exp) {
      await supabase.from("notifications").insert({
        user_id: exp.user_id, type: "experience_rejected",
        title: "Expérience non validée",
        body: `Votre expérience n'a pas pu être validée. Motif : ${reason}.`,
        link: "/profile",
      });
    }
    setExperiences(prev => prev.filter(e => e.id !== rejectModal.id));
    setCounts(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
    setRejectModal({ open: false, id: "", reason: "", customReason: "" });
    toast.success("Expérience rejetée.");
  };

  const handleComplement = async () => {
    if (!complementModal.message.trim()) { toast.error("Veuillez écrire un message"); return; }
    await supabase.from("notifications").insert({
      user_id: complementModal.userId, type: "experience_complement",
      title: "Complément demandé",
      body: complementModal.message,
      link: "/profile",
    });
    toast.success("Demande de complément envoyée");
    setComplementModal({ open: false, id: "", userId: "", message: "" });
  };

  const rejectionReasons = ["Screenshot illisible", "Contenu incohérent", "Autre"];

  const renderExperienceCard = (exp: any, idx: number) => (
    <Card key={exp.id} className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {exp.profile?.avatar_url ? (
              <img src={exp.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                {exp.profile?.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <p className="font-medium text-sm">{exp.profile?.first_name} {exp.profile?.last_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{exp.profile?.role || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={activeTab === "verified" ? "default" : activeTab === "rejected" ? "destructive" : "secondary"} className="text-xs">
              {activeTab === "verified" && <><CheckCircle2 className="h-3 w-3 mr-1" /> Validée</>}
              {activeTab === "rejected" && <><XCircle className="h-3 w-3 mr-1" /> Refusée</>}
              {activeTab === "pending" && <><Clock className="h-3 w-3 mr-1" /> #{idx + 1}</>}
            </Badge>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plateforme</p>
            <p className="font-medium">{exp.platform_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Durée</p>
            <p className="font-medium">{exp.duration || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
            <p className="font-medium">{exp.experience_date || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Lieu</p>
            <p className="font-medium">{[exp.city, exp.country].filter(Boolean).join(", ") || "—"}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Animaux</p>
          <p className="text-sm">{exp.animal_types || "—"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Résumé</p>
          <p className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-lg">{exp.summary}</p>
        </div>

        {/* Admin note for rejected */}
        {exp.admin_note && activeTab === "rejected" && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Motif de refus</p>
            <p className="text-sm text-destructive">{exp.admin_note}</p>
          </div>
        )}

        {/* Submitted date */}
        <p className="text-xs text-muted-foreground">
          Soumise le {format(new Date(exp.created_at), "dd MMMM yyyy", { locale: fr })}
        </p>

        {/* Screenshots */}
        {exp.screenshot_urls?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Image className="h-3 w-3" /> Screenshots ({exp.screenshot_urls.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {exp.screenshot_urls.map((path: string, i: number) => {
                const url = signedUrls[path];
                if (!url) return <div key={i} className="h-52 w-40 bg-muted rounded-lg animate-pulse" />;
                return (
                  <img
                    key={i}
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-52 rounded-lg border border-border object-contain bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setZoomedImg(url)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Actions — only for pending */}
        {activeTab === "pending" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button size="sm" className="gap-1.5" onClick={() => handleVerify(exp.id, exp.user_id)}>
              <CheckCircle2 className="h-4 w-4" /> Valider
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setRejectModal({ open: true, id: exp.id, reason: "", customReason: "" })}>
              <XCircle className="h-4 w-4" /> Refuser
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setComplementModal({ open: true, id: exp.id, userId: exp.user_id, message: "" })}>
              <MessageSquare className="h-4 w-4" /> Demander un complément
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-body text-2xl font-bold">Expériences externes</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> En attente
            {counts.pending > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="verified" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validées ({counts.verified})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Refusées ({counts.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">Chargement…</div>
          ) : experiences.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {activeTab === "pending" && "Aucune expérience en attente 🎉"}
                {activeTab === "verified" && "Aucune expérience validée pour le moment"}
                {activeTab === "rejected" && "Aucune expérience refusée"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {experiences.map((exp, idx) => renderExperienceCard(exp, idx))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Zoomed image modal */}
      <Dialog open={!!zoomedImg} onOpenChange={(o) => !o && setZoomedImg(null)}>
        <DialogContent className="max-w-3xl">
          {zoomedImg && <img src={zoomedImg} alt="Screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => !o && setRejectModal({ open: false, id: "", reason: "", customReason: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser l'expérience</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sélectionnez le motif de refus :</p>
            <div className="flex flex-wrap gap-2">
              {rejectionReasons.map((r) => (
                <Button key={r} variant={rejectModal.reason === r ? "default" : "outline"} size="sm"
                  onClick={() => setRejectModal((s) => ({ ...s, reason: r }))}>
                  {r}
                </Button>
              ))}
            </div>
            {rejectModal.reason === "Autre" && (
              <Textarea value={rejectModal.customReason} onChange={(e) => setRejectModal((s) => ({ ...s, customReason: e.target.value }))} placeholder="Précisez…" rows={2} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, id: "", reason: "", customReason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectModal.reason || (rejectModal.reason === "Autre" && !rejectModal.customReason)}>Refuser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complement modal */}
      <Dialog open={complementModal.open} onOpenChange={(o) => !o && setComplementModal({ open: false, id: "", userId: "", message: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demander un complément</DialogTitle></DialogHeader>
          <Textarea value={complementModal.message} onChange={(e) => setComplementModal((s) => ({ ...s, message: e.target.value }))} placeholder="Que manque-t-il ? Ex : Screenshot plus lisible, dates précises…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplementModal({ open: false, id: "", userId: "", message: "" })}>Annuler</Button>
            <Button onClick={handleComplement} disabled={!complementModal.message.trim()}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExperienceVerification;