import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Bell, Shield, Trash2, Download, Sun, Moon, Monitor, ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle, History, MapPin, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { compressImageFile } from "@/lib/compressImage";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTheme } from "@/contexts/ThemeContext";

interface NotifPrefs {
  email_new_application: boolean;
  email_messages: boolean;
  email_reminders: boolean;
  email_sitter_suggestions: boolean;
  email_review_prompts: boolean;
  message_email_delay: string;
  profile_visibility: string;
  show_last_seen: boolean;
}

const defaultPrefs: NotifPrefs = {
  email_new_application: true,
  email_messages: true,
  email_reminders: true,
  email_sitter_suggestions: true,
  email_review_prompts: true,
  message_email_delay: "30min",
  profile_visibility: "all",
  show_last_seen: true,
};

const Settings = () => {
  const { user, activeRole } = useAuth();
  const profileHref = (user?.role === "both" ? activeRole : user?.role) === "owner" ? "/owner-profile" : "/profile";
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Account
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Deletion
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          email_new_application: data.email_new_application,
          email_messages: data.email_messages,
          email_reminders: data.email_reminders,
          email_sitter_suggestions: data.email_sitter_suggestions,
          email_review_prompts: data.email_review_prompts,
          message_email_delay: data.message_email_delay,
          profile_visibility: data.profile_visibility,
          show_last_seen: data.show_last_seen,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const savePrefs = async (updated: Partial<NotifPrefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updated };
    setPrefs(newPrefs);
    setSavingPrefs(true);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    setSavingPrefs(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
  };

  const handleEmailChange = async () => {
    if (!newEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else {
      toast.success("Un email de confirmation a été envoyé à votre nouvelle adresse.");
      setNewEmail("");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, sitterProfile, ownerProfile, properties, sits, applications, reviews] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("properties").select("*").eq("user_id", user.id),
        supabase.from("sits").select("*").eq("user_id", user.id),
        supabase.from("applications").select("*").eq("sitter_id", user.id),
        supabase.from("reviews").select("*").or(`reviewer_id.eq.${user.id},reviewee_id.eq.${user.id}`),
      ]);

      // Fetch pets from user's properties
      const propIds = properties.data?.map(p => p.id) || [];
      const pets = propIds.length > 0
        ? await supabase.from("pets").select("*").in("property_id", propIds)
        : { data: [] };

      // Fetch conversations and messages
      const conversations = await supabase.from("conversations").select("*").or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      const convIds = conversations.data?.map(c => c.id) || [];
      const messages = convIds.length > 0
        ? await supabase.from("messages").select("*").in("conversation_id", convIds)
        : { data: [] };

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile.data,
        sitter_profile: sitterProfile.data,
        owner_profile: ownerProfile.data,
        properties: properties.data,
        pets: pets.data,
        sits: sits.data,
        applications: applications.data,
        conversations: conversations.data,
        messages: messages.data,
        reviews: reviews.data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guardiens-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export terminé !");
    } catch {
      toast.error("Erreur lors de l'export.");
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== "SUPPRIMER") return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .upsert(
          { user_id: user.id, status: "pending" },
          { onConflict: "user_id" }
        );
      if (error) throw error;

      // Mark profile as inactive
      await supabase
        .from("profiles")
        .update({ bio: "[Compte en cours de suppression]" })
        .eq("id", user.id);

      toast.success("Votre demande de suppression a été enregistrée. Vous avez 30 jours pour l'annuler.");
      setDeleteOpen(false);
      setDeleteConfirm("");
    } catch {
      toast.error("Erreur lors de la demande de suppression.");
    }
    setDeleting(false);
  };

  if (loading) {
    return <div className="p-6 md:p-10 text-center text-muted-foreground py-20">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Paramètres</h1>

      {/* Mon compte */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Mon compte</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modifier l'email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={user?.email || "nouveau@email.com"}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button onClick={handleEmailChange} disabled={!newEmail} size="sm">
                Modifier
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modifier le mot de passe</Label>
            <Input
              type="password"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword}
              size="sm"
            >
              Changer le mot de passe
            </Button>
          </div>

          <div>
            <Button variant="outline" size="sm" asChild>
              <a href={profileHref}>Modifier ma photo de profil →</a>
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Vérification d'identité */}
      <IdentityVerificationSection user={user} />

      <Separator />

      {/* Apparence */}
      <ThemeSection />

      <Separator />

      {/* Notifications */}
      <section className="my-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Notifications email</h2>
        </div>

        <div className="space-y-4">
          {([
            { key: "email_new_application", label: "Nouvelles candidatures" },
            { key: "email_messages", label: "Messages" },
            { key: "email_reminders", label: "Rappels de garde" },
            { key: "email_sitter_suggestions", label: "Suggestions de gardiens" },
            { key: "email_review_prompts", label: "Avis à laisser" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(v) => savePrefs({ [key]: v })}
              />
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Label className="text-sm">Délai avant email (messages non-lus)</Label>
            <Select
              value={prefs.message_email_delay}
              onValueChange={(v) => savePrefs({ message_email_delay: v })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30min">30 min</SelectItem>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="3h">3 heures</SelectItem>
                <SelectItem value="never">Jamais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      {/* Mes alertes */}
      <AlertsSection user={user} />

      <Separator />

      {/* Confidentialité */}
      <section className="my-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Confidentialité</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Qui peut voir mon profil</Label>
            <Select
              value={prefs.profile_visibility}
              onValueChange={(v) => savePrefs({ profile_visibility: v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                <SelectItem value="verified">Utilisateurs vérifiés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Afficher ma dernière connexion</Label>
            <Switch
              checked={prefs.show_last_seen}
              onCheckedChange={(v) => savePrefs({ show_last_seen: v })}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Section pitches spontanés — owners uniquement */}
      <OwnerPitchSettings user={user} />

      <Separator />

      {/* Export données */}
      <section className="my-8">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Mes données</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Conformément au RGPD, vous pouvez exporter l'ensemble de vos données personnelles.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "Export en cours..." : "Exporter mes données (JSON)"}
        </Button>
      </section>

      <Separator />

      {/* Présentation de Guardiens */}
      <section className="my-8">
        <h3 className="text-sm font-semibold">Présentation de Guardiens</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Revoyez la présentation complète de la plateforme — parcours gardien et propriétaire.
        </p>
        <Button
          variant="outline"
          className="w-full text-sm"
          onClick={() => {
            window.location.href = "/dashboard?tour=true";
          }}
        >
          Revoir la présentation →
        </Button>
      </section>

      <Separator />

      {/* Suppression compte */}
      <section className="my-8">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="font-heading text-lg font-semibold text-destructive">Supprimer mon compte</h2>
        </div>
        <DeletionSection user={user} onRequestDelete={() => setDeleteOpen(true)} />
      </section>

      {/* Modal suppression */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer mon compte</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              En supprimant votre compte, toutes vos données personnelles seront effacées sous 30 jours.
              Vos avis resteront visibles de manière anonyme. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">
              Tapez <span className="font-bold">SUPPRIMER</span> pour confirmer
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Revenir
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "SUPPRIMER" || deleting}
            >
              {deleting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DeletionSection = ({ user, onRequestDelete }: { user: any; onRequestDelete: () => void }) => {
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => setPendingRequest(data));
  }, [user]);

  const handleCancelDeletion = async () => {
    if (!pendingRequest) return;
    setCancelling(true);
    const { error } = await supabase
      .from("account_deletion_requests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", pendingRequest.id);
    if (error) {
      toast.error("Erreur lors de l'annulation.");
    } else {
      toast.success("Demande de suppression annulée.");
      setPendingRequest(null);
      // Restore bio
      await supabase.from("profiles").update({ bio: "" }).eq("id", user.id);
    }
    setCancelling(false);
  };

  if (pendingRequest) {
    const scheduledDate = new Date(pendingRequest.scheduled_deletion_at).toLocaleDateString("fr-FR");
    return (
      <div className="space-y-3">
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-sm font-medium text-destructive">Suppression programmée le {scheduledDate}</p>
          <p className="text-xs text-muted-foreground mt-1">Vous pouvez annuler cette demande avant cette date.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelDeletion}
          disabled={cancelling}
        >
          {cancelling ? "Annulation..." : "Annuler la suppression"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={onRequestDelete}
    >
      Supprimer mon compte
    </Button>
  );
};

const ThemeSection = () => {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Système", icon: Monitor },
  ];

  return (
    <section className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Apparence</h2>
      </div>
      <div className="flex gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              theme === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
};

const OwnerPitchSettings = ({ user }: { user: any }) => {
  const [loaded, setLoaded] = useState(false);
  const [accept, setAccept] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const ownerRole = profile?.role === "owner" || profile?.role === "both";
      setIsOwner(ownerRole);
      if (ownerRole) {
        const { data } = await supabase
          .from("owner_profiles")
          .select("accept_unsolicited_pitches")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setAccept(data.accept_unsolicited_pitches ?? true);
      }
      setLoaded(true);
    })();
  }, [user]);

  if (!loaded || !isOwner) return null;

  const handleToggle = async (v: boolean) => {
    setAccept(v);
    const { error } = await supabase
      .from("owner_profiles")
      .update({ accept_unsolicited_pitches: v })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setAccept(!v);
    } else {
      toast.success(v ? "Vous recevrez les contacts spontanés." : "Vous ne recevrez plus de contacts spontanés.");
    }
  };

  return (
    <section className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Contacts spontanés des gardiens</h2>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">Autoriser les gardiens à me contacter sans annonce</Label>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Les gardiens peuvent vous contacter même si vous n'avez pas d'annonce active. Désactivez si vous préférez ne recevoir que des candidatures sur vos annonces publiées.
          </p>
        </div>
        <Switch checked={accept} onCheckedChange={handleToggle} />
      </div>
    </section>
  );
};

const IdentityVerificationSection = ({ user }: { user: any }) => {
  const [status, setStatus] = useState<string>("not_submitted");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

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
        if (data.identity_verified) {
          setStatus("verified");
        } else {
          setStatus((data as any).identity_verification_status || "not_submitted");
        }
        setDocumentUrl((data as any).identity_document_url || null);
      }
      setLogs((logsRes.data as any[]) || []);
      setLoaded(true);
    });
  }, [user]);

  // Count today's attempts
  const todayAttempts = logs.filter((log: any) => {
    const logDate = new Date(log.created_at);
    return Date.now() - logDate.getTime() < 24 * 60 * 60 * 1000;
  }).length;
  const rateLimited = todayAttempts >= 5;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  // Also load selfie URL
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("identity_selfie_url").eq("id", user.id).single()
      .then(({ data }) => { if (data) setSelfieUrl((data as any).identity_selfie_url || null); });
  }, [user]);

  const validateFile = (file: File, maxMb: number = 10): string | null => {
    if (file.size > maxMb * 1024 * 1024) {
      return `Le fichier ne doit pas dépasser ${maxMb} Mo.`;
    }
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
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      // Compress image if over 5MB
      const compressed = await compressImageFile(file, 5, 2048);
      setUploadProgress(20);

      const ext = compressed.name.split(".").pop();
      const path = `${user.id}/identity-document.${ext}`;

      setUploadProgress(30);
      await supabase.storage.from("identity-documents").remove([path]);

      setUploadProgress(50);
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(path, compressed, { upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      await supabase
        .from("profiles")
        .update({
          identity_document_url: path,
          identity_verification_status: "pending",
        } as any)
        .eq("id", user.id);

      setUploadProgress(90);
      setStatus("pending");
      setDocumentUrl(path);
      toast.info("Document envoyé ! Vérification en cours...");

      try {
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("verify-identity");
        if (verifyError) throw verifyError;
        if (verifyResult?.verified) {
          setStatus("verified");
          toast.success("Identité vérifiée avec succès ! 🎉");
        } else {
          setStatus("rejected");
          toast.error(verifyResult?.rejection_reason || "Document refusé. Veuillez soumettre un document valide et lisible.");
        }
      } catch {
        toast.warning("Vérification automatique indisponible. Votre document sera examiné manuellement.");
      }
      setUploadProgress(100);
    } catch (err) {
      logger.error("Settings upload error", { err: String(err) });
      toast.error("Votre fichier n'a pas pu être envoyé. Vérifiez le format (JPG, PNG, PDF, HEIC) et la taille (max 10 Mo).");
      setPreviewUrl(null);
    }
    setTimeout(() => setUploadProgress(0), 1000);
    setUploading(false);
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validationError = validateFile(file, 5);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploadingSelfie(true);
    try {
      const compressed = await compressImageFile(file, 5, 2048);
      const ext = compressed.name.split(".").pop();
      const path = `${user.id}/identity-selfie.${ext}`;
      await supabase.storage.from("identity-documents").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      await supabase.from("profiles").update({ identity_selfie_url: path } as any).eq("id", user.id);
      setSelfieUrl(path);
      toast.success("Selfie envoyé !");
    } catch {
      toast.error("Votre fichier n'a pas pu être envoyé. Vérifiez le format (JPG, PNG) et la taille (max 5 Mo).");
      setSelfiePreview(null);
    }
    setUploadingSelfie(false);
  };

  if (!loaded) return null;

  const statusConfig: Record<string, { icon: React.ElementType; label: string; desc: string; color: string }> = {
    not_submitted: {
      icon: Upload,
      label: "Non vérifiée",
      desc: "Envoyez une pièce d'identité pour débloquer les fonctionnalités avancées (badge vérifié).",
      color: "text-muted-foreground",
    },
    pending: {
      icon: Clock,
      label: "Vérification en cours",
      desc: "Votre document est en cours de vérification automatique par IA.",
      color: "text-amber-600",
    },
    rejected: {
      icon: AlertCircle,
      label: "Document refusé",
      desc: "Votre document n'a pas pu être validé. Veuillez soumettre un nouveau document lisible.",
      color: "text-destructive",
    },
    verified: {
      icon: CheckCircle2,
      label: "Identité vérifiée ✓",
      desc: "Votre identité a été vérifiée avec succès. Vous avez accès à toutes les fonctionnalités.",
      color: "text-green-600",
    },
  };

  const cfg = statusConfig[status] || statusConfig.not_submitted;
  const StatusIcon = cfg.icon;

  return (
    <section className="my-8" id="verification">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Vérification d'identité</h2>
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            status === "verified" ? "bg-green-100 dark:bg-green-900/30" :
            status === "pending" ? "bg-amber-100 dark:bg-amber-900/30" :
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
              <p className="font-medium text-foreground text-sm">Documents acceptés :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Carte d'identité (recto)</li>
                <li>Passeport (page photo)</li>
                <li>Permis de conduire</li>
                <li>Titre de séjour</li>
              </ul>
              <p className="mt-2">Formats : JPG, PNG, PDF, HEIC · Max 10 Mo</p>
            </div>

            {/* Upload progress */}
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

            {/* Document preview */}
            {previewUrl && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Aperçu du document :</p>
                <img src={previewUrl} alt="Aperçu" className="max-h-40 rounded-lg border border-border object-contain" />
              </div>
            )}

            {/* Document upload */}
            <label className="block">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,.heic,.heif"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                variant={status === "rejected" ? "default" : "outline"}
                size="sm"
                className="gap-2 cursor-pointer"
                disabled={uploading || rateLimited}
                asChild
              >
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

            {/* Selfie section */}
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-sm font-medium text-foreground">Selfie de vérification</p>
              <p className="text-xs text-muted-foreground">Prenez un selfie pour confirmer que le document vous appartient. Formats : JPG, PNG · Max 5 Mo</p>

              {selfiePreview && (
                <img src={selfiePreview} alt="Aperçu selfie" className="max-h-32 rounded-lg border border-border object-contain" />
              )}

              <label className="block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  onChange={handleSelfieUpload}
                  disabled={uploadingSelfie}
                  className="hidden"
                />
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={uploadingSelfie} asChild>
                  <span>
                    <Upload className="h-4 w-4" />
                    {uploadingSelfie ? "Envoi en cours..." : selfieUrl ? "Changer le selfie" : "Prendre / envoyer un selfie"}
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

      {/* Verification history */}
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
                passport: "Passeport",
                national_id: "Carte d'identité",
                drivers_license: "Permis de conduire",
                residence_permit: "Titre de séjour",
                other: "Autre document",
                not_a_document: "Non reconnu",
              };
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    isVerified ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  }`}
                >
                  {isVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${isVerified ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                        {isVerified ? "Validé" : "Refusé"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(log.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {log.document_type && (
                      <p className="text-xs text-muted-foreground">
                        {docTypeLabels[log.document_type] || log.document_type}
                      </p>
                    )}
                    {!isVerified && log.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.rejection_reason}
                      </p>
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


interface AlertPref {
  id: string;
  label: string;
  zone_type: string;
  city: string | null;
  postal_code: string | null;
  radius_km: number | null;
  departement: string | null;
  region_code: string | null;
  alert_types: string[];
  heure_envoi: string;
  frequence: string;
  active: boolean;
  created_at: string;
}

const AlertsSection = ({ user }: { user: any }) => {
  const [alertes, setAlertes] = useState<AlertPref[]>([]);
  const [loadingAlertes, setLoadingAlertes] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AlertPref | null>(null);

  // Autour de vous toggle
  const [autourDeVous, setAutourDeVous] = useState(false);
  const [loadingAutour, setLoadingAutour] = useState(true);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formZoneType, setFormZoneType] = useState<"rayon" | "departement" | "region">("rayon");
  const [formCity, setFormCity] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formRadiusKm, setFormRadiusKm] = useState(15);
  const [formDepartement, setFormDepartement] = useState("");
  const [formAlertTypes, setFormAlertTypes] = useState<string[]>(["gardes", "missions"]);
  const [formHeure, setFormHeure] = useState("08:00");
  const [formFrequence, setFormFrequence] = useState<"quotidien" | "hebdo">("quotidien");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setAlertes((data as AlertPref[]) || []);
      setLoadingAlertes(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("email_preferences")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const prefs = (data as any)?.email_preferences as any;
        setAutourDeVous(prefs?.autour_de_vous ?? false);
        setLoadingAutour(false);
      });
  }, [user]);

  const activeCount = alertes.filter((a) => a.active).length;

  const handleToggleActive = async (alerte: AlertPref) => {
    const newValue = !alerte.active;
    if (newValue && activeCount >= 3) {
      toast.error("Vous avez atteint le maximum de 3 zones actives.");
      return;
    }
    setAlertes((prev) => prev.map((a) => (a.id === alerte.id ? { ...a, active: newValue } : a)));
    await supabase
      .from("alert_preferences")
      .update({ active: newValue })
      .eq("id", alerte.id)
      .eq("user_id", user.id);
  };

  const handleLabelBlur = async (alerte: AlertPref) => {
    setEditingLabelId(null);
    const trimmed = editingLabelValue.trim();
    if (!trimmed || trimmed === alerte.label) return;
    setAlertes((prev) => prev.map((a) => (a.id === alerte.id ? { ...a, label: trimmed } : a)));
    await supabase
      .from("alert_preferences")
      .update({ label: trimmed })
      .eq("id", alerte.id)
      .eq("user_id", user.id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
    await supabase
      .from("alert_preferences")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    toast.success("Alerte supprimée.");
  };

  const resetForm = () => {
    setFormLabel("");
    setFormZoneType("rayon");
    setFormCity("");
    setFormPostalCode("");
    setFormRadiusKm(15);
    setFormDepartement("");
    setFormAlertTypes(["gardes", "missions"]);
    setFormHeure("08:00");
    setFormFrequence("quotidien");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formLabel.trim()) {
      toast.error("Veuillez saisir un nom pour la zone.");
      return;
    }
    if (formAlertTypes.length === 0) {
      toast.error("Sélectionnez au moins un type d'annonce.");
      return;
    }
    if (formZoneType === "rayon" && !formCity) {
      toast.error("Veuillez saisir une ville.");
      return;
    }
    if (formZoneType === "departement" && !/^\d{2,3}$/.test(formDepartement)) {
      toast.error("Veuillez saisir un code département valide (2 ou 3 chiffres).");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("create_alert_preference", {
      p_label: formLabel.trim(),
      p_zone_type: formZoneType,
      p_city: formZoneType === "rayon" ? formCity : null,
      p_postal_code: formZoneType === "rayon" ? formPostalCode : null,
      p_radius_km: formZoneType === "rayon" ? formRadiusKm : null,
      p_departement: formZoneType === "departement" ? formDepartement : null,
      p_region_code: formZoneType === "region" ? "ARA" : null,
      p_alert_types: formAlertTypes,
      p_heure_envoi: formHeure,
      p_frequence: formFrequence,
    });

    setSaving(false);

    if (error) {
      if (error.message?.includes("Maximum 3 zones")) {
        toast.error("Vous avez atteint le maximum de 3 zones actives.");
      } else {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      }
      return;
    }

    const newAlerte: AlertPref = {
      id: data as string,
      label: formLabel.trim(),
      zone_type: formZoneType,
      city: formZoneType === "rayon" ? formCity : null,
      postal_code: formZoneType === "rayon" ? formPostalCode : null,
      radius_km: formZoneType === "rayon" ? formRadiusKm : null,
      departement: formZoneType === "departement" ? formDepartement : null,
      region_code: formZoneType === "region" ? "ARA" : null,
      alert_types: formAlertTypes,
      heure_envoi: formHeure,
      frequence: formFrequence,
      active: true,
      created_at: new Date().toISOString(),
    };

    setAlertes((prev) => [...prev, newAlerte]);
    toast.success("Alerte créée avec succès.");
    resetForm();
  };

  const handleAutourToggle = async (newValue: boolean) => {
    setAutourDeVous(newValue);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email_preferences")
      .eq("id", user.id)
      .single();
    const currentPrefs = ((profileData as any)?.email_preferences as any) || {};
    await supabase
      .from("profiles")
      .update({ email_preferences: { ...currentPrefs, autour_de_vous: newValue } } as any)
      .eq("id", user.id);
  };

  const zoneDescription = (a: AlertPref) => {
    if (a.zone_type === "rayon") return `${a.city} · ${a.radius_km} km`;
    if (a.zone_type === "departement") return `Département ${a.departement}`;
    return "France entière";
  };

  const firstActiveAlert = alertes.find((a) => a.active);

  const radiusOptions = [5, 15, 30, 50, 100];

  return (
    <>
      <section className="my-8">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Alertes annonces et missions</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Recevez un email quand de nouvelles annonces apparaissent dans vos zones configurées.
        </p>

        {loadingAlertes ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : alertes.length === 0 && !showForm ? (
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Vous n'avez pas encore configuré d'alerte.</p>
            <Button onClick={() => setShowForm(true)}>Créer votre première alerte</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {alertes.map((alerte) => (
                <div key={alerte.id} className="bg-card border rounded-lg p-4 flex items-start gap-4">
                  <Switch
                    checked={alerte.active}
                    onCheckedChange={() => handleToggleActive(alerte)}
                  />
                  <div className="flex-1 min-w-0">
                    {editingLabelId === alerte.id ? (
                      <Input
                        autoFocus
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onBlur={() => handleLabelBlur(alerte)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="h-7 text-sm font-medium px-1 py-0"
                      />
                    ) : (
                      <span
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingLabelId(alerte.id);
                          setEditingLabelValue(alerte.label);
                        }}
                      >
                        {alerte.label}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground">{zoneDescription(alerte)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {alerte.alert_types.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t === "gardes" ? "Gardes" : "Petites missions"}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alerte.heure_envoi} · {alerte.frequence === "quotidien" ? "Tous les jours" : "Chaque lundi"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto shrink-0"
                    onClick={() => setDeleteTarget(alerte)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {activeCount < 3 ? (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => setShowForm(true)}
                disabled={showForm}
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter une zone
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center mt-3">
                Vous avez atteint le maximum de 3 zones actives.
              </p>
            )}
          </>
        )}

        {/* Formulaire de création */}
        {showForm && (
          <div className="mt-4 border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Nom de la zone</Label>
              <Input
                placeholder="Ex : Autour de Lyon"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Type de zone</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "rayon", label: "Par rayon" },
                  { value: "departement", label: "Par département" },
                  { value: "region", label: "France entière" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormZoneType(opt.value)}
                    className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formZoneType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {formZoneType === "rayon" && (
              <>
                <PostalCodeCityFields
                  city={formCity}
                  postalCode={formPostalCode}
                  onChange={(partial) => {
                    if (partial.city !== undefined) setFormCity(partial.city);
                    if (partial.postal_code !== undefined) setFormPostalCode(partial.postal_code);
                  }}
                  required
                />
                <div className="space-y-2">
                  <Label>Rayon</Label>
                  <div className="flex gap-2 flex-wrap">
                    {radiusOptions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormRadiusKm(r)}
                        className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          formRadiusKm === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {formZoneType === "departement" && (
              <div className="space-y-2">
                <Label>Code département (ex : 69, 38, 01)</Label>
                <Input
                  value={formDepartement}
                  onChange={(e) => setFormDepartement(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="69"
                  className="w-24"
                />
              </div>
            )}

            {formZoneType === "region" && (
              <p className="text-sm text-muted-foreground">
                Vous recevrez les annonces publiées dans toute la région Auvergne-Rhône-Alpes.
              </p>
            )}

            <div className="space-y-2">
              <Label>Je veux être alerté(e) pour</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert-gardes"
                    checked={formAlertTypes.includes("gardes")}
                    onCheckedChange={(checked) =>
                      setFormAlertTypes((prev) =>
                        checked ? [...prev, "gardes"] : prev.filter((t) => t !== "gardes")
                      )
                    }
                  />
                  <Label htmlFor="alert-gardes" className="text-sm font-normal">Gardes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert-missions"
                    checked={formAlertTypes.includes("missions")}
                    onCheckedChange={(checked) =>
                      setFormAlertTypes((prev) =>
                        checked ? [...prev, "missions"] : prev.filter((t) => t !== "missions")
                      )
                    }
                  />
                  <Label htmlFor="alert-missions" className="text-sm font-normal">Petites missions</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Heure de réception</Label>
              <Select value={formHeure} onValueChange={setFormHeure}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8h00</SelectItem>
                  <SelectItem value="12:00">12h00</SelectItem>
                  <SelectItem value="18:00">18h00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fréquence</Label>
              <div className="flex gap-2">
                {([
                  { value: "quotidien", label: "Quotidien" },
                  { value: "hebdo", label: "Hebdomadaire (chaque lundi)" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormFrequence(opt.value)}
                    className={`border rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formFrequence === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer cette alerte"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <Separator className="my-6" />

      {/* Bloc 2 — Autour de vous */}
      <section className="my-8">
        <h3 className="font-heading text-lg font-semibold mb-2">Autour de vous</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">Membres disponibles pour aider</p>
            <p className="text-sm text-muted-foreground">
              Chaque lundi matin, découvrez les membres disponibles près de chez vous et leurs compétences.
            </p>
          </div>
          <Switch
            checked={autourDeVous}
            onCheckedChange={handleAutourToggle}
            disabled={loadingAutour}
          />
        </div>
        {autourDeVous && (
          <p className="text-xs text-muted-foreground mt-2">
            {firstActiveAlert
              ? `Dans un rayon de ${firstActiveAlert.radius_km || 15} km autour de ${firstActiveAlert.city || "votre ville"}`
              : "Dans un rayon de 15 km autour de votre ville"}
          </p>
        )}
      </section>

      {/* Dialog suppression alerte */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette alerte ?</DialogTitle>
            <DialogDescription>
              Vous ne recevrez plus d'emails pour la zone « {deleteTarget?.label} ».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;
