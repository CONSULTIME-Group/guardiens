import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, FileText, AlertCircle, Clock, Trash2 } from "lucide-react";

type ProStatus = "none" | "pending" | "verified" | "rejected";

const SPECIALTY_OPTIONS = [
  { value: "educator", label: "Éducateur / comportementaliste canin" },
  { value: "vet", label: "Vétérinaire ou ASV" },
  { value: "groomer", label: "Toiletteur" },
  { value: "boarding", label: "Pension / refuge agréé" },
  { value: "petsitter_pro", label: "Pet-sitter professionnel déclaré" },
  { value: "trainer_equine", label: "Équin / NAC spécialisé" },
  { value: "other", label: "Autre professionnel animalier" },
];

const DOC_TYPE_OPTIONS = [
  { value: "diploma_acaced", label: "ACACED" },
  { value: "diploma_other", label: "Diplôme / certification" },
  { value: "siret_kbis", label: "Extrait Kbis / attestation SIRET" },
  { value: "insurance_rc_pro", label: "Attestation RC professionnelle" },
  { value: "certification", label: "Certification professionnelle" },
  { value: "other", label: "Autre document" },
];

const STATUS_META: Record<string, { label: string; tone: "neutral" | "warning" | "success" | "destructive" }> = {
  pending: { label: "En analyse", tone: "warning" },
  auto_approved: { label: "Validé", tone: "success" },
  approved: { label: "Validé", tone: "success" },
  needs_review: { label: "Examen humain", tone: "warning" },
  auto_rejected: { label: "Refusé", tone: "destructive" },
  rejected: { label: "Refusé", tone: "destructive" },
};

interface ProVerification {
  id: string;
  doc_type: string;
  file_name: string | null;
  status: string;
  ai_confidence: number | null;
  ai_status: string | null;
  created_at: string;
  ai_analysis: any;
}

const ProVerificationSection = ({ user }: { user: any }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatus>("none");
  const [specialty, setSpecialty] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [siret, setSiret] = useState("");
  const [tagline, setTagline] = useState("");
  const [pricingNote, setPricingNote] = useState("");
  const [docType, setDocType] = useState<string>("diploma_acaced");
  const [file, setFile] = useState<File | null>(null);
  const [verifications, setVerifications] = useState<ProVerification[]>([]);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("pro_status, pro_specialty, pro_business_name, pro_siret, pro_tagline, pro_pricing_note")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      setProStatus(((profile as any).pro_status as ProStatus) ?? "none");
      setSpecialty((profile as any).pro_specialty ?? "");
      setBusinessName((profile as any).pro_business_name ?? "");
      setSiret((profile as any).pro_siret ?? "");
      setTagline((profile as any).pro_tagline ?? "");
      setPricingNote((profile as any).pro_pricing_note ?? "");
    }
    const { data: verifs } = await supabase
      .from("pro_verifications")
      .select("id, doc_type, file_name, file_path, status, ai_confidence, ai_status, created_at, ai_analysis")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setVerifications((verifs ?? []) as ProVerification[]);
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, [user?.id]);

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        pro_specialty: specialty || null,
        pro_business_name: businessName.trim() || null,
        pro_siret: siret.trim() || null,
        pro_tagline: tagline.trim() || null,
        pro_pricing_note: pricingNote.trim() || null,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Informations enregistrées" });
  };

  const handleUpload = async () => {
    if (!user?.id || !file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 8 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}_${docType}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("pro-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: inserted, error: insErr } = await supabase
        .from("pro_verifications")
        .insert({
          user_id: user.id,
          doc_type: docType as any,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          declared_business_name: businessName.trim() || null,
          declared_siret: siret.trim() || null,
          declared_specialty: specialty || null,
        } as any)
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Lance l'analyse IA en arrière-plan
      const { error: fnErr } = await supabase.functions.invoke("analyze-pro-document", {
        body: { verification_id: inserted.id },
      });
      if (fnErr) {
        toast({
          title: "Document envoyé",
          description: "Analyse IA en attente. Notre équipe l'examinera manuellement.",
        });
      } else {
        toast({ title: "Document analysé", description: "Consultez le résultat ci-dessous." });
      }
      setFile(null);
      await loadAll();
    } catch (e: any) {
      toast({ title: "Erreur d'envoi", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteVerification = async (id: string, filePath: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    await supabase.storage.from("pro-documents").remove([filePath]).catch(() => {});
    const { error } = await supabase.from("pro_verifications").delete().eq("id", id);
    if (error) {
      toast({ title: "Impossible de supprimer", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Document supprimé" });
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'espace Pro…
      </div>
    );
  }

  return (
    <section id="pro" className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground">Espace Pro vérifié</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vous êtes éducateur, vétérinaire, toiletteur, comportementaliste ou pension agréée ? Justifiez votre statut professionnel et obtenez la pastille « Pro vérifié » sur votre profil public. Libre à vous ensuite de proposer vos services rémunérés en toute transparence.
          </p>
        </div>
        {proStatus === "verified" && (
          <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">Pro vérifié</Badge>
        )}
        {proStatus === "pending" && (
          <Badge variant="outline" className="border-warning/40 text-warning">En cours</Badge>
        )}
        {proStatus === "rejected" && (
          <Badge variant="destructive">Refusé</Badge>
        )}
      </header>

      {/* Informations professionnelles déclarées */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Vos informations professionnelles</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Spécialité</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {SPECIALTY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nom commercial / entreprise</Label>
            <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ex : Cabinet vétérinaire des Lilas" />
          </div>
          <div className="space-y-1.5">
            <Label>SIRET (si applicable)</Label>
            <Input value={siret} onChange={e => setSiret(e.target.value.replace(/[^0-9 ]/g, ""))} placeholder="14 chiffres" maxLength={17} />
          </div>
          <div className="space-y-1.5">
            <Label>Tarif indicatif (libre)</Label>
            <Input value={pricingNote} onChange={e => setPricingNote(e.target.value)} placeholder="Ex : 25 €/h, 80 €/jour, sur devis…" maxLength={120} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Accroche affichée sur votre profil</Label>
            <Textarea
              value={tagline}
              onChange={e => setTagline(e.target.value.slice(0, 240))}
              placeholder="Ex : Éducatrice canine ACACED, spécialisée en chiots et chiens réactifs."
              className="min-h-[80px]"
              maxLength={240}
            />
            <p className="text-[11px] text-muted-foreground text-right">{tagline.length}/240</p>
          </div>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Enregistrement…" : "Enregistrer mes informations"}
        </Button>
      </div>

      {/* Upload document */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Justifier votre statut Pro</h3>
        <p className="text-sm text-muted-foreground">
          Envoyez un diplôme reconnu (ACACED, école vétérinaire, certification éducateur…) OU un Kbis cohérent avec une activité animalière. Une analyse IA est faite immédiatement, puis un humain valide en cas de doute. Vos documents restent strictement confidentiels.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type de document</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fichier (image ou PDF, max 8 Mo)</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full sm:w-auto">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyse en cours…</> : "Envoyer pour vérification"}
        </Button>
      </div>

      {/* Historique */}
      {verifications.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Vos documents envoyés</h3>
          <ul className="space-y-2">
            {verifications.map(v => {
              const meta = STATUS_META[v.status] ?? { label: v.status, tone: "neutral" as const };
              return (
                <li key={v.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{v.file_name || v.doc_type}</span>
                      <Badge
                        variant="outline"
                        className={
                          meta.tone === "success" ? "border-success/40 text-success bg-success/10"
                          : meta.tone === "warning" ? "border-warning/40 text-warning bg-warning/10"
                          : meta.tone === "destructive" ? "border-destructive/40 text-destructive bg-destructive/10"
                          : ""
                        }
                      >
                        {meta.tone === "warning" && <Clock className="h-3 w-3 mr-1" />}
                        {meta.tone === "destructive" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {meta.label}
                      </Badge>
                    </div>
                    {v.ai_analysis?.human_summary && (
                      <p className="text-xs text-muted-foreground mt-1">{v.ai_analysis.human_summary}</p>
                    )}
                    {typeof v.ai_confidence === "number" && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Confiance IA : {(v.ai_confidence * 100).toFixed(0)} %</p>
                    )}
                  </div>
                  {(v.status === "needs_review" || v.status === "pending" || v.status === "rejected" || v.status === "auto_rejected") && (
                    <Button variant="ghost" size="icon" onClick={() => deleteVerification(v.id, (v as any).file_path ?? "")} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ProVerificationSection;
