import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, CheckCircle2, Clock, AlertCircle, ShieldCheck, History } from "lucide-react";
import { compressImageFile } from "@/lib/compressImage";
import { convertHeicToJpeg, isHeicFile } from "@/lib/heicToJpeg";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { trackEvent } from "@/lib/analytics";

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
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("profiles")
        .select("identity_verified, identity_verification_status, identity_document_url, identity_selfie_url")
        .eq("id", user.id)
        .single(),
      supabase
        .from("identity_verification_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(async ([profileRes, logsRes]) => {
      if (profileRes.data) {
        const data = profileRes.data as any;
        const docUrl = data.identity_document_url || null;
        const selfie = data.identity_selfie_url || null;
        let currentStatus: string = data.identity_verified
          ? "verified"
          : data.identity_verification_status || "not_submitted";

        // Self-heal : document présent mais statut « non soumis » (dossier orphelin).
        // On propose une reprise silencieuse en un aller-retour pour que l'admin
        // voie le dossier immédiatement.
        if (!data.identity_verified && currentStatus === "not_submitted" && docUrl) {
          const { error: healErr } = await supabase
            .from("profiles")
            .update({ identity_verification_status: "pending" } as any)
            .eq("id", user.id);
          if (!healErr) {
            currentStatus = "pending";
            toast.info("Votre document précédent a bien été enregistré, il est en cours de vérification.");
          }
        }

        setStatus(currentStatus);
        setDocumentUrl(docUrl);
        setSelfieUrl(selfie);
        const ctaSource = new URLSearchParams(window.location.search).get("src");
        if (ctaSource) {
          void trackEvent("identity_cta_clicked", {
            source: ctaSource,
            metadata: { status: currentStatus, has_document: !!docUrl },
          });
        }
        void trackEvent("identity_section_viewed", {
          source: "settings",
          metadata: { status: currentStatus, has_document: !!docUrl, has_selfie: !!selfie },
        });
      }
      setLogs((logsRes.data as any[]) || []);
      setLoaded(true);
    });
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
      return `Votre fichier n'a pas pu être envoyé. Vérifiez le format (JPG, PNG, PDF, HEIC converti automatiquement) et la taille (max ${maxMb} Mo).`;
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
    void trackEvent("identity_file_picked", {
      source: "settings",
      metadata: { kind: "document", mime: file.type || "unknown", size_kb: Math.round(file.size / 1024) },
    });
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      void trackEvent("identity_upload_failed", {
        source: "settings",
        metadata: { kind: "document", stage: "validation", reason: validationError.slice(0, 160) },
      });
      return;
    }

    // Le bucket refuse le HEIC : conversion en JPEG avant tout, sinon on
    // n'envoie rien plutôt que d'échouer à l'upload.
    let source = file;
    if (isHeicFile(file)) {
      setConverting(true);
      try {
        source = await convertHeicToJpeg(file);
      } catch (err) {
        setConverting(false);
        logger.error("HEIC conversion failed", { err: err instanceof Error ? err.message : String(err) });
        toast.error("Cette photo est au format HEIC et n'a pas pu être convertie. Prenez la photo en JPEG (réglage Appareil photo, Format, Plus compatible) ou enregistrez l'image en JPG, puis réessayez.");
        void trackEvent("identity_upload_failed", {
          source: "settings",
          metadata: { kind: "document", stage: "heic_conversion", reason: err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160) },
        });
        return;
      }
      setConverting(false);
    }

    if (source.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(source);
    } else setPreviewUrl(null);

    setUploading(true);
    setUploadProgress(10);
    try {
      const toUpload = source.type === "application/pdf" ? source : await compressImageFile(source, 5, 2048);
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
      const { error: profileErr } = await supabase.from("profiles").update({
        identity_document_url: path,
        identity_verification_status: "pending",
      } as any).eq("id", user.id);
      if (profileErr) {
        // On remonte l'erreur explicitement plutôt que de la masquer : l'utilisateur
        // pourra réessayer, et le document déjà uploadé sera raccroché au prochain
        // chargement grâce au self-heal ci-dessus.
        throw new Error(`Enregistrement du dossier impossible : ${profileErr.message}`);
      }
      setUploadProgress(90);
      setStatus("pending");
      setDocumentUrl(path);
      toast.info("Document envoyé ! Vérification en cours...");
      void trackEvent("identity_document_submitted", {
        source: "settings",
        metadata: { step: 1, has_selfie: !!selfieUrl },
      });
      if (selfieUrl) {
        void trackEvent("identity_dossier_completed", { source: "settings", metadata: { status: "pending" } });
      }


      try {
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("verify-identity");
        if (verifyError) throw verifyError;
        const newStatus = verifyResult?.status || (verifyResult?.verified ? "verified" : "rejected");
        setStatus(newStatus);
        if (newStatus === "verified") {
          toast.success("Identité vérifiée avec succès !");
          void trackEvent("identity_verified", { source: "settings", metadata: { channel: "auto" } });
        } else if (newStatus === "needs_review") {
          toast.info("Document reçu. Analyse approfondie en cours, réponse sous 24h.");
          void trackEvent("identity_auto_check_failed", {
            source: "settings",
            metadata: { status: newStatus, reason_kind: "needs_review" },
          });
        } else {
          toast.error(verifyResult?.rejection_reason || "Document refusé. Veuillez soumettre un document valide et lisible.");
          void trackEvent("identity_rejected", {
            source: "settings",
            metadata: { channel: "auto", reason: String(verifyResult?.rejection_reason || "unspecified").slice(0, 200) },
          });
          void trackEvent("identity_auto_check_failed", {
            source: "settings",
            metadata: { status: newStatus, reason_kind: "rejected" },
          });
        }
      } catch {
        toast.warning("Vérification automatique indisponible. Votre document sera examiné manuellement.");
        void trackEvent("identity_auto_check_failed", {
          source: "settings",
          metadata: { status: "pending", reason_kind: "unavailable" },
        });
      }

      setUploadProgress(100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Settings upload error", { err: msg });
      void trackEvent("identity_upload_failed", {
        source: "settings",
        metadata: { kind: "document", stage: "upload", reason: msg.slice(0, 200) },
      });
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
    void trackEvent("identity_file_picked", {
      source: "settings",
      metadata: { kind: "selfie", mime: file.type || "unknown", size_kb: Math.round(file.size / 1024) },
    });
    const validationError = validateFile(file, 5);
    if (validationError) {
      toast.error(validationError);
      void trackEvent("identity_upload_failed", {
        source: "settings",
        metadata: { kind: "selfie", stage: "validation", reason: validationError.slice(0, 160) },
      });
      return;
    }
    let source = file;
    if (isHeicFile(file)) {
      setConverting(true);
      try {
        source = await convertHeicToJpeg(file);
      } catch (err) {
        setConverting(false);
        logger.error("HEIC conversion failed", { err: err instanceof Error ? err.message : String(err) });
        toast.error("Cette photo est au format HEIC et n'a pas pu être convertie. Prenez la photo en JPEG (réglage Appareil photo, Format, Plus compatible) ou enregistrez l'image en JPG, puis réessayez.");
        return;
      }
      setConverting(false);
    }
    if (source.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
      reader.readAsDataURL(source);
    }
    setUploadingSelfie(true);
    try {
      const toUpload = await compressImageFile(source, 5, 2048);
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
      void trackEvent("identity_selfie_submitted", {
        source: "settings",
        metadata: { step: 2, status },
      });
      if (documentUrl) {
        void trackEvent("identity_dossier_completed", { source: "settings", metadata: { status } });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Envoi impossible : ${msg.slice(0, 160)}`);
      void trackEvent("identity_upload_failed", {
        source: "settings",
        metadata: { kind: "selfie", stage: "upload", reason: msg.slice(0, 200) },
      });
      setSelfiePreview(null);
    }
    setUploadingSelfie(false);
  };

  if (!loaded) return null;

  const statusConfig: Record<string, { icon: React.ElementType; label: string; desc: string; color: string }> = {
    not_submitted: { icon: Upload, label: "Vérification facultative", desc: "Rien n'est bloqué sans elle : vous pouvez déjà candidater, apparaître dans les recherches et être contacté. Envoyer une pièce d'identité reste utile, cela rassure les membres et vous vaut le badge vérifié.", color: "text-muted-foreground" },
    pending: { icon: Clock, label: "Vérification en cours", desc: "Votre document est en cours de vérification automatique par IA.", color: "text-warning" },
    needs_review: { icon: Clock, label: "Analyse approfondie en cours", desc: "Votre document est en cours d'analyse par notre équipe. Réponse sous 24h. Vous pouvez renvoyer un document plus net si besoin.", color: "text-warning" },
    rejected: { icon: AlertCircle, label: "Document refusé", desc: "Votre document n'a pas pu être validé. Veuillez soumettre un nouveau document lisible.", color: "text-destructive" },
    verified: { icon: CheckCircle2, label: "Identité vérifiée", desc: "Votre identité a été vérifiée avec succès. Vous avez accès à toutes les fonctionnalités.", color: "text-success" },
  };


  const baseCfg = statusConfig[status] || statusConfig.not_submitted;
  // Statut vérifié mais dossier incomplet : on reconnaît l'acquis et on invite à finir.
  const cfg = status === "verified" && !selfieUrl
    ? { ...baseCfg, label: "Pièce d'identité validée", desc: "Votre pièce d'identité est validée. Il reste un selfie pour compléter votre dossier et rassurer davantage les membres." }
    : baseCfg;
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
            (status === "pending" || status === "needs_review") ? "bg-warning/15" :
            status === "rejected" ? "bg-destructive/15" :
            "bg-muted"
          }`}>
            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />

          </div>
          <div>
            <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">
              Ce que couvre la mention « identité vérifiée » : une pièce d'identité officielle a été fournie et contrôlée automatiquement. C'est un signal de confiance, pas une garantie absolue.
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">
              Votre document est stocké dans un espace sécurisé et privé, et supprimé automatiquement de nos serveurs 30 jours après la vérification. Seule l'équipe Guardiens peut le consulter pendant l'examen.
            </p>
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
              <p className="mt-2">Formats : JPG, PNG, WebP, PDF · Max 10 Mo</p>
              <p className="text-[11px] text-muted-foreground/80">Les photos HEIC d'iPhone sont converties automatiquement en JPG avant l'envoi.</p>
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
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,.heic,.heif" onChange={handleUpload} disabled={uploading || converting} className="hidden" />
              <Button variant={status === "rejected" ? "default" : "outline"} size="sm" className="gap-2 cursor-pointer" disabled={uploading || converting || rateLimited} asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {rateLimited ? "Limite atteinte (5/jour)" :
                   converting ? "Conversion de la photo..." :
                   uploading ? "Envoi en cours..." :
                   status === "pending" ? "Renvoyer un document" :
                   status === "needs_review" ? "Retirer et renvoyer un document" :
                   status === "rejected" ? "Soumettre un nouveau document" :
                   "Envoyer ma pièce d'identité"}
                </span>

              </Button>
            </label>

            {rateLimited && (
              <p className="text-xs text-destructive">Vous avez atteint la limite de 5 vérifications par jour. Réessayez demain.</p>
            )}
          </div>
        )}

        {(status !== "verified" || (documentUrl && !selfieUrl)) && (
          <div className={`space-y-2 ${status !== "verified" ? "pt-3 mt-4 border-t border-border" : ""}`}>
            <p className="text-sm font-medium text-foreground">Pour aller plus loin, optionnel : selfie de vérification</p>
            <p className="text-xs text-muted-foreground">
              Le selfie n'est pas nécessaire pour valider votre identité. Il ajoute un signal de confiance supplémentaire, visible par les membres.
            </p>
            <p className="text-xs text-muted-foreground">
              {documentUrl
                ? "Prenez un selfie pour confirmer que la pièce vous appartient. Formats : JPG, PNG, WebP (HEIC converti automatiquement) · Max 5 Mo"
                : "Envoyez d'abord votre pièce d'identité (étape 1) pour débloquer le selfie."}
            </p>
            {selfiePreview && (
              <img src={selfiePreview} alt="Aperçu selfie" className="max-h-32 rounded-lg border border-border object-contain" />
            )}
            <label className="block">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" capture="user" onChange={handleSelfieUpload} disabled={uploadingSelfie || !documentUrl} className="hidden" />
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={uploadingSelfie || !documentUrl} asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  {!documentUrl ? "Pièce d'identité requise" :
                   converting ? "Conversion de la photo..." :
                   uploadingSelfie ? "Envoi en cours..." :
                   selfieUrl ? "Changer le selfie" : "Prendre / envoyer un selfie"}
                </span>
              </Button>
            </label>
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
