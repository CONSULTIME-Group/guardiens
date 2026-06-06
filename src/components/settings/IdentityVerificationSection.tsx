import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, CheckCircle2, Clock, AlertCircle, ShieldCheck, History } from "lucide-react";
import { compressImageFile } from "@/lib/compressImage";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const IdentityVerificationSection = ({ user }: { user: any }) => {
  const [status, setStatus] = useState<string>("not_submitted");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("profiles")
        .select("identity_verified, identity_verification_status, identity_document_url")
        .eq("id", user.id)
        .single(),
      supabase
        .from("identity_verification_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(([profileRes, logsRes]) => {
      if (profileRes.data) {
        const data = profileRes.data;
        if (data.identity_verified) setStatus("verified");
        else setStatus((data as any).identity_verification_status || "not_submitted");
        setDocumentUrl((data as any).identity_document_url || null);
      }
      setLogs((logsRes.data as any[]) || []);
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("identity_selfie_url").eq("id", user.id).single()
      .then(({ data }) => { if (data) setSelfieUrl((data as any).identity_selfie_url || null); });
  }, [user]);

  const todayAttempts = logs.filter((log: any) => {
    const logDate = new Date(log.created_at);
    return Date.now() - logDate.getTime() < 24 * 60 * 60 * 1000;
  }).length;
  const rateLimited = todayAttempts >= 5;

  const validateFile = (file: File, maxMb: number = 10): string | null => {
    if (file.size > maxMb * 1024 * 1024) return `Le fichier ne doit pas dépasser ${maxMb} Mo.`;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "image/heic", "image/heif"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedTypes.includes(file.type) && !["heic", "heif"].includes(ext)) {
      return "Votre fichier n'a pas pu être envoyé. Vérifiez le format (JPG, PNG, PDF, HEIC) et la taille (max 10 Mo).";
    }
    return null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (rateLimited) {
      toast.error("Vous avez atteint la limite de 5 vérifications par jour. Réessayez demain.");
      return;
    }
    const validationError = validateFile(file);
    if (validationError) { toast.error(validationError); return; }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else setPreviewUrl(null);

    setUploading(true);
    setUploadProgress(10);
    try {
      // HEIC/HEIF (photos iPhone) ne sont pas décodables par <canvas> hors Safari iOS
      // → on uploade le fichier brut au lieu de tenter une compression qui échouerait
      // avec un message trompeur "vérifiez le format".
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isHeic = ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
      const toUpload = isHeic ? file : await compressImageFile(file, 5, 2048);
      setUploadProgress(30);
      const finalExt = toUpload.name.split(".").pop();
      const path = `${user.id}/identity-document.${finalExt}`;
      setUploadProgress(50);
      await supabase.storage.from("identity-documents").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(path, toUpload, { upsert: true, contentType: toUpload.type || undefined });
      if (uploadError) throw uploadError;
      setUploadProgress(80);
      await supabase.from("profiles").update({
        identity_document_url: path,
        identity_verification_status: "pending",
      } as any).eq("id", user.id);
      setUploadProgress(90);
      setStatus("pending");
      setDocumentUrl(path);
      toast.info("Document envoyé ! Vérification en cours...");

      try {
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("verify-identity");
        if (verifyError) throw verifyError;
        if (verifyResult?.verified) {
          setStatus("verified");
          toast.success("Identité vérifiée avec succès !");
        } else {
          setStatus("rejected");
          toast.error(verifyResult?.rejection_reason || "Document refusé. Veuillez soumettre un document valide et lisible.");
        }
      } catch {
        toast.warning("Vérification automatique indisponible. Votre document sera examiné manuellement.");
      }
      setUploadProgress(100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Settings upload error", { err: msg });
      // Vrai message d'erreur (au lieu du générique trompeur qui faisait croire
      // à Sophie & co que leur fichier était dans un mauvais format).
      toast.error(`Envoi impossible : ${msg.slice(0, 160)}`);
      setPreviewUrl(null);
    }
    setTimeout(() => setUploadProgress(0), 1000);
    setUploading(false);
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validationError = validateFile(file, 5);
    if (validationError) { toast.error(validationError); return; }
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
    setUploadingSelfie(true);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isHeic = ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
      const toUpload = isHeic ? file : await compressImageFile(file, 5, 2048);
      const finalExt = toUpload.name.split(".").pop();
      const path = `${user.id}/identity-selfie.${finalExt}`;
      await supabase.storage.from("identity-documents").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(path, toUpload, { upsert: true, contentType: toUpload.type || undefined });
      if (uploadError) throw uploadError;
      await supabase.from("profiles").update({ identity_selfie_url: path } as any).eq("id", user.id);
      setSelfieUrl(path);
      toast.success("Selfie envoyé !");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Envoi impossible : ${msg.slice(0, 160)}`);
      setSelfiePreview(null);
    }
    setUploadingSelfie(false);
  };

  if (!loaded) return null;

  const statusConfig: Record<string, { icon: React.ElementType; label: string; desc: string; color: string }> = {
    not_submitted: { icon: Upload, label: "Non vérifiée", desc: "Envoyez une pièce d'identité pour débloquer les fonctionnalités avancées (badge vérifié).", color: "text-muted-foreground" },
    pending: { icon: Clock, label: "Vérification en cours", desc: "Votre document est en cours de vérification automatique par IA.", color: "text-warning" },
    rejected: { icon: AlertCircle, label: "Document refusé", desc: "Votre document n'a pas pu être validé. Veuillez soumettre un nouveau document lisible.", color: "text-destructive" },
    verified: { icon: CheckCircle2, label: "Identité vérifiée", desc: "Votre identité a été vérifiée avec succès. Vous avez accès à toutes les fonctionnalités.", color: "text-success" },
  };

  const cfg = statusConfig[status] || statusConfig.not_submitted;
  const StatusIcon = cfg.icon;

  return (
    <section id="verification">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Vérification d'identité</h2>
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            status === "verified" ? "bg-success/15" :
            status === "pending" ? "bg-warning/15" :
            "bg-muted"
          }`}>
            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
          </div>
        </div>

        {status !== "verified" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Étape 1, Pièce d'identité</p>
              <p className="text-xs">Documents acceptés :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Carte d'identité (recto)</li>
                <li>Passeport (page photo)</li>
                <li>Permis de conduire</li>
                <li>Titre de séjour</li>
              </ul>
              <p className="mt-2">Formats : JPG, PNG, PDF, HEIC · Max 10 Mo</p>
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Envoi en cours...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {previewUrl && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Aperçu du document :</p>
                <img src={previewUrl} alt="Aperçu" className="max-h-40 rounded-lg border border-border object-contain" />
              </div>
            )}

            <label className="block">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,.heic,.heif" onChange={handleUpload} disabled={uploading} className="hidden" />
              <Button variant={status === "rejected" ? "default" : "outline"} size="sm" className="gap-2 cursor-pointer" disabled={uploading || rateLimited} asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {rateLimited ? "Limite atteinte (5/jour)" :
                   uploading ? "Envoi en cours..." :
                   status === "pending" ? "Renvoyer un document" :
                   status === "rejected" ? "Soumettre un nouveau document" :
                   "Envoyer ma pièce d'identité"}
                </span>
              </Button>
            </label>

            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-sm font-medium text-foreground">Étape 2, Selfie de vérification</p>
              <p className="text-xs text-muted-foreground">
                {documentUrl
                  ? "Prenez un selfie pour confirmer que la pièce vous appartient. Formats : JPG, PNG · Max 5 Mo"
                  : "Envoyez d'abord votre pièce d'identité (étape 1) pour débloquer le selfie."}
              </p>
              {selfiePreview && (
                <img src={selfiePreview} alt="Aperçu selfie" className="max-h-32 rounded-lg border border-border object-contain" />
              )}
              <label className="block">
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleSelfieUpload} disabled={uploadingSelfie || !documentUrl} className="hidden" />
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={uploadingSelfie || !documentUrl} asChild>
                  <span>
                    <Upload className="h-4 w-4" />
                    {!documentUrl ? "Pièce d'identité requise" :
                     uploadingSelfie ? "Envoi en cours..." :
                     selfieUrl ? "Changer le selfie" : "Prendre / envoyer un selfie"}
                  </span>
                </Button>
              </label>
            </div>

            {rateLimited && (
              <p className="text-xs text-destructive">Vous avez atteint la limite de 5 vérifications par jour. Réessayez demain.</p>
            )}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="mt-5 rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Historique des vérifications</h3>
          </div>
          <div className="space-y-2">
            {logs.map((log: any) => {
              const isVerified = log.result === "verified";
              const docTypeLabels: Record<string, string> = {
                passport: "Passeport", national_id: "Carte d'identité",
                drivers_license: "Permis de conduire", residence_permit: "Titre de séjour",
                other: "Autre document", not_a_document: "Non reconnu",
              };
              return (
                <div key={log.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  isVerified ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                }`}>
                  {isVerified ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${isVerified ? "text-success" : "text-destructive"}`}>
                        {isVerified ? "Validé" : "Refusé"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(log.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {log.document_type && (
                      <p className="text-xs text-muted-foreground">{docTypeLabels[log.document_type] || log.document_type}</p>
                    )}
                    {!isVerified && log.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.rejection_reason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default IdentityVerificationSection;
