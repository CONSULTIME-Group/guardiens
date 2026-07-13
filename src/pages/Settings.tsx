import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import {
  User, Bell, Shield, Trash2, Download, Sun, Moon, Monitor, ArrowRight,
  CreditCard, HelpCircle, Eye, EyeOff, AlertTriangle, LogOut, Layers,
  Loader2, CheckCircle2, MessageCircle,
} from "lucide-react";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import ActiveRolesSection from "@/components/settings/ActiveRolesSection";
import IdentityVerificationSection from "@/components/settings/IdentityVerificationSection";
import ProVerificationSection from "@/components/settings/ProVerificationSection";
import AlertsSection from "@/components/settings/AlertsSection";
import OwnerPitchSection from "@/components/settings/OwnerPitchSection";
import { useTheme } from "@/contexts/ThemeContext";
import { getPasswordStrength, validateStrongPassword } from "@/lib/passwordStrength";
import { Link } from "react-router-dom";
import { useAlmaFrequency, type AlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAlmaHidden } from "@/hooks/useAlmaHidden";


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

type SectionId =
  | "account" | "security" | "spaces" | "notifications" | "alerts"
  | "privacy" | "owner-pitch" | "appearance" | "alma" | "billing" | "data" | "help" | "danger";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  group: "Compte" | "Préférences" | "Mes espaces" | "Aide & données" | "Zone dangereuse";
}

const SECTIONS: SectionDef[] = [
  { id: "account", label: "Mon compte", icon: User, group: "Compte" },
  { id: "security", label: "Sécurité & identité", icon: Shield, group: "Compte" },
  { id: "spaces", label: "Mes espaces", icon: Layers, group: "Mes espaces" },
  { id: "owner-pitch", label: "Contacts spontanés", icon: Shield, group: "Mes espaces" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Préférences" },
  { id: "alerts", label: "Alertes annonces", icon: Bell, group: "Préférences" },
  { id: "privacy", label: "Confidentialité", icon: EyeOff, group: "Préférences" },
  { id: "appearance", label: "Apparence", icon: Sun, group: "Préférences" },
  { id: "alma", label: "Fréquence d'Alma", icon: MessageCircle, group: "Préférences" },
  { id: "billing", label: "Abonnement", icon: CreditCard, group: "Mes espaces" },
  { id: "data", label: "Mes données", icon: Download, group: "Aide & données" },
  { id: "help", label: "Aide & liens utiles", icon: HelpCircle, group: "Aide & données" },
  { id: "danger", label: "Zone dangereuse", icon: AlertTriangle, group: "Zone dangereuse" },
];

const Settings = () => {
  const { user, activeRole } = useAuth();
  const profileHref = (user?.role === "both" ? activeRole : user?.role) === "owner" ? "/owner-profile" : "/profile";
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const [searchParams] = useSearchParams();
  const proSectionRef = useRef<HTMLDivElement | null>(null);

  // Deep-link via ?section=xxx ou ?tab=xxx (aliases). Toutes les sections déclarées sont valides.
  useEffect(() => {
    const param = (searchParams.get("section") || searchParams.get("tab")) as SectionId | null;
    const valid: SectionId[] = SECTIONS.map((s) => s.id);
    if (param && valid.includes(param)) {
      setActiveSection(param);
      if (searchParams.get("focus") === "pro") {
        setTimeout(() => proSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Account
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Master notif toggle (UI only, derives from individual toggles)
  const allNotifsOn = useMemo(
    () =>
      prefs.email_new_application && prefs.email_messages && prefs.email_reminders &&
      prefs.email_sitter_suggestions && prefs.email_review_prompts,
    [prefs],
  );

  // Deletion
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeCommitmentsCount, setActiveCommitmentsCount] = useState<number | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // Logout other sessions
  const [signingOutOthers, setSigningOutOthers] = useState(false);

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

  // Active commitments check (sits & applications), for the deletion safeguard
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ownerSits, sitterApps] = await Promise.all([
        supabase
          .from("sits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["confirmed", "in_progress"]),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("sitter_id", user.id)
          .in("status", ["pending", "accepted"]),
      ]);
      setActiveCommitmentsCount((ownerSits.count || 0) + (sitterApps.count || 0));
    })();
  }, [user]);

  const savePrefs = async (updated: Partial<NotifPrefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updated };
    setPrefs(newPrefs);
    const key = Object.keys(updated)[0];
    setSavingKey(key);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSavingKey(null);
    if (error) toast.error("Erreur lors de la sauvegarde");
  };

  const handleMasterToggle = async (v: boolean) => {
    await savePrefs({
      email_new_application: v,
      email_messages: v,
      email_reminders: v,
      email_sitter_suggestions: v,
      email_review_prompts: v,
    });
  };

  const handleEmailChange = async () => {
    if (!newEmail || !currentPasswordForEmail || !user?.email) {
      toast.error("Veuillez renseigner votre mot de passe actuel.");
      return;
    }
    // Reauth
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPasswordForEmail,
    });
    if (reauthErr) {
      toast.error("Mot de passe actuel incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Un email de confirmation a été envoyé à votre nouvelle adresse.");
      setNewEmail("");
      setCurrentPasswordForEmail("");
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.email) return;
    if (!currentPassword) {
      toast.error("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    const validationErr = validateStrongPassword(newPassword);
    if (validationErr) { toast.error(validationErr); return; }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthErr) {
      toast.error("Mot de passe actuel incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOutOtherDevices = async () => {
    setSigningOutOthers(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Vous êtes déconnecté de tous vos autres appareils.");
    } catch {
      toast.error("Erreur lors de la déconnexion.");
    }
    setSigningOutOthers(false);
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
      const propIds = properties.data?.map(p => p.id) || [];
      const pets = propIds.length > 0
        ? await supabase.from("pets").select("*").in("property_id", propIds)
        : { data: [] };
      const conversations = await supabase.from("conversations").select("*").or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      const convIds = conversations.data?.map(c => c.id) || [];
      const messages = convIds.length > 0
        ? await supabase.from("messages").select("*").in("conversation_id", convIds)
        : { data: [] };
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile.data, sitter_profile: sitterProfile.data, owner_profile: ownerProfile.data,
        properties: properties.data, pets: pets.data, sits: sits.data,
        applications: applications.data, conversations: conversations.data,
        messages: messages.data, reviews: reviews.data,
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
    setDeleteStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke("self-delete-account", { body: {} });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Suppression impossible");
      }
      const successMsg = "Compte supprimé. Vous allez être déconnecté.";
      setDeleteStatus({ type: "success", message: successMsg });
      toast.success(successMsg);
      setDeleteConfirm("");
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 1500);
    } catch (e: any) {
      const errorMsg = e?.message
        ? `Échec de la suppression : ${e.message}`
        : "Échec de la suppression. Veuillez réessayer dans un instant.";
      setDeleteStatus({ type: "error", message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return <div className="p-6 md:p-10 text-center text-muted-foreground py-20">Chargement...</div>;
  }

  // Group sections for sidebar
  const groupedSections = SECTIONS.reduce<Record<string, SectionDef[]>>((acc, s) => {
    (acc[s.group] ||= []).push(s);
    return acc;
  }, {});

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "account": return <AccountSection
        user={user}
        profileHref={profileHref}
        newEmail={newEmail} setNewEmail={setNewEmail}
        currentPasswordForEmail={currentPasswordForEmail} setCurrentPasswordForEmail={setCurrentPasswordForEmail}
        onSubmitEmail={handleEmailChange}
      />;
      case "security": return <SecuritySection
        user={user}
        currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
        newPassword={newPassword} setNewPassword={setNewPassword}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
        showCurrent={showCurrent} setShowCurrent={setShowCurrent}
        showNew={showNew} setShowNew={setShowNew}
        onSubmit={handlePasswordChange}
        onSignOutOthers={handleSignOutOtherDevices}
        signingOutOthers={signingOutOthers}
      />;
      case "spaces": return <ActiveRolesSection />;
      case "owner-pitch": return <OwnerPitchSection user={user} />;
      case "notifications": return <NotificationsSection
        prefs={prefs} savingKey={savingKey} allNotifsOn={allNotifsOn}
        onMasterToggle={handleMasterToggle} onSave={savePrefs}
      />;
      case "alerts": return <AlertsSection user={user} />;
      case "privacy": return <PrivacySection prefs={prefs} onSave={savePrefs} />;
      case "appearance": return <ThemeSection />;
      case "alma": return <AlmaFrequencySection />;
      case "billing": return <BillingSection user={user} />;
      case "data": return <DataSection onExport={handleExport} exporting={exporting} />;
      case "help": return <HelpSection />;
      case "danger": return <DangerSection
        user={user}
        activeCommitmentsCount={activeCommitmentsCount}
        onRequestDelete={() => setDeleteOpen(true)}
      />;
    }
  };

  // Identity verification is part of "security" section
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Paramètres, Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10">
        <PageBreadcrumb items={[{ label: "Paramètres" }]} />
        <h1 className="font-heading text-2xl md:text-3xl font-bold mt-4 mb-6">Paramètres</h1>

        <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8">
          {/* Sidebar, desktop */}
          <aside className="hidden md:block">
            <nav aria-label="Navigation des paramètres" className="sticky top-6 space-y-6">
              {Object.entries(groupedSections).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">{group}</p>
                  <ul className="space-y-0.5">
                    {items.map((s) => {
                      const Icon = s.icon;
                      const isActive = activeSection === s.id;
                      const isDanger = s.id === "danger";
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => setActiveSection(s.id)}
                            aria-current={isActive ? "page" : undefined}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? isDanger
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-primary/10 text-primary"
                                : isDanger
                                  ? "text-destructive/80 hover:bg-destructive/5"
                                  : "text-foreground hover:bg-accent"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-left">{s.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Tabs, mobile */}
          <div className="md:hidden mb-4 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-1 pb-2 w-max">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                const isDanger = s.id === "danger";
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? isDanger
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <main className="min-w-0">
            <div className="rounded-xl border border-border bg-card p-5 md:p-7" aria-live="polite">
              {renderSection(activeSection)}
              {activeSection === "security" && (
                <>
                  <Separator className="my-8" />
                  <IdentityVerificationSection user={user} />
                  <Separator className="my-8" />
                  <div ref={proSectionRef} id="pro-verification">
                    <ProVerificationSection user={user} />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modal suppression */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) setDeleteStatus(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer mon compte</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              En confirmant, vous supprimez <strong>immédiatement et définitivement</strong> votre compte, votre profil et toutes vos données personnelles associées. Vos avis publics resteront visibles de manière anonyme. Cette action est <strong>irréversible</strong>.
            </DialogDescription>
          </DialogHeader>
          {activeCommitmentsCount !== null && activeCommitmentsCount > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <p className="font-medium text-warning">Engagement(s) en cours</p>
              <p className="text-xs text-foreground/80 mt-1">
                Vous avez {activeCommitmentsCount} engagement{activeCommitmentsCount > 1 ? "s" : ""} actif{activeCommitmentsCount > 1 ? "s" : ""} (gardes confirmées ou candidatures en attente). Veuillez les finaliser ou annuler avant de demander la suppression.
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Label className="text-sm">
              Tapez <span className="font-bold">SUPPRIMER</span> pour confirmer
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              disabled={deleting || deleteStatus?.type === "success"}
            />
          </div>
          {deleting && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground/80"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enregistrement de votre demande en cours…
            </div>
          )}
          {deleteStatus && (
            <div
              role={deleteStatus.type === "error" ? "alert" : "status"}
              aria-live="polite"
              className={
                deleteStatus.type === "success"
                  ? "flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground"
                  : "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground"
              }
            >
              {deleteStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-success" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" aria-hidden="true" />
              )}
              <span>{deleteStatus.message}</span>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteStatus(null);
              }}
              disabled={deleting}
            >
              {deleteStatus?.type === "success" ? "Fermer" : "Revenir"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleteConfirm !== "SUPPRIMER" ||
                deleting ||
                deleteStatus?.type === "success" ||
                (activeCommitmentsCount ?? 0) > 0
              }
              aria-busy={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Suppression…
                </>
              ) : deleteStatus?.type === "success" ? (
                "Demande envoyée"
              ) : (
                "Demander la suppression"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───────── Sub-sections ───────── */

const SectionHeader = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
    </div>
    {description && <p className="text-sm text-muted-foreground">{description}</p>}
  </div>
);

const AccountSection = ({ user, profileHref, newEmail, setNewEmail, currentPasswordForEmail, setCurrentPasswordForEmail, onSubmitEmail }: any) => (
  <section>
    <SectionHeader icon={User} title="Mon compte" description="Email, photo de profil et identifiants de connexion." />
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm">Email actuel</Label>
        <p className="text-sm font-medium text-foreground">{user?.email}</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="new-email">Modifier l'email</Label>
        <Input id="new-email" type="email" placeholder="nouvelle@adresse.com"
          value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <Input id="current-pw-email" type="password" placeholder="Mot de passe actuel"
          value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)} autoComplete="current-password" />
        <Button onClick={onSubmitEmail} disabled={!newEmail || !currentPasswordForEmail} size="sm">
          Envoyer le lien de confirmation
        </Button>
        <p className="text-xs text-muted-foreground">
          Un email de confirmation sera envoyé à votre nouvelle adresse pour valider le changement.
        </p>
      </div>

      <div>
        <Button variant="outline" size="sm" asChild>
          <a href={profileHref} className="gap-2">
            Modifier ma photo de profil
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  </section>
);

const SecuritySection = ({
  currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  showCurrent, setShowCurrent, showNew, setShowNew, onSubmit, onSignOutOthers, signingOutOthers,
}: any) => {
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  return (
    <section>
      <SectionHeader icon={Shield} title="Sécurité" description="Mot de passe, sessions actives, vérification d'identité." />

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="current-pw">Mot de passe actuel</Label>
          <div className="relative">
            <Input id="current-pw" type={showCurrent ? "text" : "password"}
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? "Masquer" : "Afficher"}>
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Label htmlFor="new-pw">Nouveau mot de passe</Label>
          <div className="relative">
            <Input id="new-pw" type={showNew ? "text" : "password"}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNew ? "Masquer" : "Afficher"}>
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : "bg-muted"}`} />
                ))}
              </div>
              {strength.label && (
                <p className="text-xs text-muted-foreground">Force : {strength.label}</p>
              )}
            </div>
          )}

          <Input type={showNew ? "text" : "password"} placeholder="Confirmer le nouveau mot de passe"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password" />

          <Button onClick={onSubmit}
            disabled={!currentPassword || !newPassword || !confirmPassword}
            size="sm">
            Mettre à jour le mot de passe
          </Button>
          <p className="text-xs text-muted-foreground">
            Minimum 8 caractères, avec majuscules, minuscules et chiffres ou symboles.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm">Sessions actives</Label>
          <p className="text-xs text-muted-foreground">
            Déconnecter tous vos autres appareils si vous pensez que votre compte est compromis.
          </p>
          <Button variant="outline" size="sm" onClick={onSignOutOthers} disabled={signingOutOthers} className="gap-2">
            <LogOut className="h-4 w-4" />
            {signingOutOthers ? "Déconnexion..." : "Déconnecter tous les autres appareils"}
          </Button>
        </div>
      </div>
    </section>
  );
};

const NotificationsSection = ({ prefs, savingKey, allNotifsOn, onMasterToggle, onSave }: any) => (
  <section>
    <SectionHeader icon={Bell} title="Notifications email" description="Choisissez les emails que vous souhaitez recevoir." />

    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
        <div>
          <Label className="text-sm font-medium">Tout activer / désactiver</Label>
          <p className="text-xs text-muted-foreground">Bascule rapide pour tous les emails ci-dessous.</p>
        </div>
        <Switch checked={allNotifsOn} onCheckedChange={onMasterToggle} />
      </div>

      {([
        { key: "email_new_application", label: "Nouvelles candidatures" },
        { key: "email_messages", label: "Messages" },
        { key: "email_reminders", label: "Rappels de garde" },
        { key: "email_sitter_suggestions", label: "Suggestions de gardiens" },
        { key: "email_review_prompts", label: "Avis à laisser" },
      ] as const).map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label className="text-sm">
            {label}
            {savingKey === key && <span className="ml-2 text-xs text-muted-foreground">Enregistrement…</span>}
          </Label>
          <Switch checked={prefs[key]} onCheckedChange={(v) => onSave({ [key]: v })} />
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm shrink-0">Délai avant email (messages non-lus)</Label>
        <Select value={prefs.message_email_delay} onValueChange={(v) => onSave({ message_email_delay: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30min">30 min</SelectItem>
            <SelectItem value="1h">1 heure</SelectItem>
            <SelectItem value="3h">3 heures</SelectItem>
            <SelectItem value="never">Jamais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-3 border-t border-border">
        <Button variant="link" size="sm" className="px-0 gap-1" asChild>
          <Link to="/email-preferences">
            Voir tous les types d'emails
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

const PrivacySection = ({ prefs, onSave }: any) => (
  <section>
    <SectionHeader icon={EyeOff} title="Confidentialité" description="Qui peut voir votre profil et vos informations." />
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Label className="text-sm">Qui peut voir mon profil</Label>
        <Select value={prefs.profile_visibility} onValueChange={(v) => onSave({ profile_visibility: v })}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            <SelectItem value="verified">Utilisateurs vérifiés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Afficher ma dernière connexion</Label>
        <Switch checked={prefs.show_last_seen} onCheckedChange={(v) => onSave({ show_last_seen: v })} />
      </div>

    </div>
  </section>
);

const ThemeSection = () => {
  const { theme, setTheme } = useTheme();
  return (
    <section>
      <SectionHeader icon={Sun} title="Apparence" description="Le mode sombre n'est pas disponible sur certaines pages stratégiques." />
      <ToggleGroup type="single" value={theme} onValueChange={(v) => v && setTheme(v as any)}>
        <ToggleGroupItem value="light" aria-label="Mode clair" className="gap-2">
          <Sun className="h-4 w-4" /> Clair
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Mode sombre" className="gap-2">
          <Moon className="h-4 w-4" /> Sombre
        </ToggleGroupItem>
        <ToggleGroupItem value="system" aria-label="Système" className="gap-2">
          <Monitor className="h-4 w-4" /> Système
        </ToggleGroupItem>
      </ToggleGroup>
    </section>
  );
};

const ALMA_OPTIONS: { value: AlmaFrequency; label: string; description: string }[] = [
  {
    value: "silent",
    label: "Silencieuse",
    description: "Alma n'intervient jamais spontanément. Vous restez maître du tempo.",
  },
  {
    value: "low",
    label: "Peu bavarde",
    description: "Seulement l'essentiel. Uniquement des conseils utiles et contextuels, jamais d'anecdote ni d'humour.",
  },
  {
    value: "balanced",
    label: "Modérée (recommandée)",
    description: "Un conseil au maximum toutes les 3 minutes, conseils utiles et petites touches d'ambiance.",
  },
  {
    value: "talkative",
    label: "Bavarde",
    description: "Un conseil possible toutes les minutes, toutes les familles de contenu.",
  },
];

interface AlmaCategoryGroup {
  label: string;
  types: { id: string; label: string }[];
}

const ALMA_CATEGORY_GROUPS: AlmaCategoryGroup[] = [
  {
    label: "Animaux",
    types: [
      { id: "dog_behavior_tip", label: "Comportement du chien" },
      { id: "cat_behavior_tip", label: "Comportement du chat" },
      { id: "pet_care_tip", label: "Soins et bien-être" },
      { id: "breed_did_you_know", label: "Le saviez-vous, races" },
    ],
  },
  {
    label: "Maison & saison",
    types: [
      { id: "home_care_tip", label: "Entretien de la maison" },
      { id: "seasonal_advice", label: "Conseils de saison" },
    ],
  },
  {
    label: "Entraide & communauté",
    types: [
      { id: "mutual_aid_tip", label: "Petites missions" },
      { id: "city_did_you_know", label: "Le saviez-vous, ville" },
    ],
  },
  {
    label: "Ton & ambiance",
    types: [
      { id: "animal_humor", label: "Humour animalier" },
      { id: "social_stat", label: "Statistiques communautaires" },
    ],
  },
];

const AlmaFrequencySection = () => {
  const { user } = useAuth();
  const { frequency, loading, setFrequency } = useAlmaFrequency();
  const { hidden, setHidden } = useAlmaHidden();
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [mutedLoaded, setMutedLoaded] = useState(false);


  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("alma_muted_categories" as any)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const arr = (data as any)?.alma_muted_categories;
      if (Array.isArray(arr)) setMuted(new Set(arr as string[]));
      setMutedLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const persistMuted = async (next: Set<string>) => {
    if (!user?.id) return;
    setMuted(next);
    await supabase
      .from("profiles")
      .update({ alma_muted_categories: Array.from(next) } as any)
      .eq("id", user.id);
  };

  const toggleCategory = (id: string, enabled: boolean) => {
    const next = new Set(muted);
    if (enabled) next.delete(id); else next.add(id);
    void persistMuted(next);
  };

  const nudgeEnabled = !muted.has("usage_nudge");

  return (
    <section className="space-y-8">
      <div>
        <SectionHeader
          icon={MessageCircle}
          title="Afficher Alma"
          description="Le dock d'Alma peut être complètement masqué. Vous pouvez le réafficher à tout moment ici."
        />
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!hidden}
            onChange={(e) => setHidden(!e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
          />
          <span>
            <span className="text-sm font-semibold">Afficher Alma dans l'application</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Décochez pour masquer complètement le dock. La fréquence ci-dessous reste conservée si vous réactivez l'affichage.
            </span>
          </span>
        </label>
      </div>

      <div>

        <SectionHeader
          icon={MessageCircle}
          title="Fréquence d'Alma"
          description="Réglez à quel point la narratrice Guardiens prend la parole dans votre parcours."
        />
        <div className="space-y-3" aria-busy={loading}>
          {ALMA_OPTIONS.map((opt) => {
            const active = frequency === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                aria-pressed={active}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {active && (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader
          icon={MessageCircle}
          title="Types de conseils"
          description="Choisissez les catégories qu'Alma peut vous partager. Une catégorie décochée n'apparaîtra plus, ni spontanément, ni à la demande."
        />
        <div className="space-y-5" aria-busy={!mutedLoaded}>
          {ALMA_CATEGORY_GROUPS.map((group) => (
            <div key={group.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">{group.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.types.map((t) => {
                  const enabled = !muted.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => toggleCategory(t.id, e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                      />
                      <span>{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-border bg-card p-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={nudgeEnabled}
                onChange={(e) => toggleCategory("usage_nudge", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
              />
              <span>
                <span className="text-sm font-semibold">Rappels d'utilisation</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Petites incitations d'Alma pour vous rappeler une action utile (compléter votre profil, publier une annonce…).
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

const BillingSection = ({ user }: { user: any }) => {
  const isSitter = user?.role === "sitter" || user?.role === "both";
  return (
    <section>
      <SectionHeader icon={CreditCard} title="Abonnement & facturation" description="Gérez votre formule et vos factures." />
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Espace propriétaire</p>
          <p className="text-xs text-muted-foreground mt-1">L'espace propriétaire est gratuit.</p>
        </div>

        {isSitter && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Espace gardien</p>
            <p className="text-xs text-muted-foreground mt-1">
              L'espace gardien est gratuit aujourd'hui, sans engagement. Vous serez prévenu à l'avance en cas d'évolution tarifaire.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Petites missions d'entraide</p>
          <p className="text-xs text-muted-foreground mt-1">L'entraide est gratuite, sans frais ni commission.</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/tarifs">
              Voir les formules
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const DataSection = ({ onExport, exporting }: any) => (
  <section>
    <SectionHeader icon={Download} title="Mes données" description="Exportez l'ensemble de vos données personnelles (RGPD)." />
    <Button variant="outline" onClick={onExport} disabled={exporting} className="gap-2">
      <Download className="h-4 w-4" />
      {exporting ? "Export en cours..." : "Exporter mes données (JSON)"}
    </Button>
    <p className="text-xs text-muted-foreground mt-3">
      Inclut votre profil, propriétés, gardes, candidatures, conversations et avis.
    </p>
  </section>
);

const HelpSection = () => (
  <section>
    <SectionHeader icon={HelpCircle} title="Aide & liens utiles" description="Documentation, conditions et présentation de la plateforme." />
    <ul className="space-y-1">
      {[
        { to: "/dashboard?tour=true", label: "Revoir la présentation de Guardiens" },
        { to: "/faq", label: "Foire aux questions" },
        { to: "/cgu", label: "Conditions générales d'utilisation" },
        { to: "/mentions-legales", label: "Mentions légales" },
        { to: "/confidentialite", label: "Politique de confidentialité" },
        { to: "/contact", label: "Nous contacter" },
      ].map(({ to, label }) => (
        <li key={to}>
          <Link
            to={to}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors"
          >
            <span>{label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

const DangerSection = ({ user, activeCommitmentsCount, onRequestDelete }: any) => {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 -m-1 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="font-heading text-lg font-semibold text-destructive">Zone dangereuse</h2>
      </div>
      <p className="text-sm text-foreground/80 mb-4">
        La suppression de votre compte est <strong>immédiate et irréversible</strong>. Vos données personnelles sont effacées sur-le-champ.
      </p>

      {activeCommitmentsCount !== null && activeCommitmentsCount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm mb-3">
          <p className="font-medium text-warning">
            {activeCommitmentsCount} engagement{activeCommitmentsCount > 1 ? "s" : ""} actif{activeCommitmentsCount > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-foreground/80 mt-1">
            Vous devez d'abord finaliser ou annuler vos gardes confirmées et candidatures en attente.
          </p>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
        onClick={onRequestDelete}
        disabled={(activeCommitmentsCount ?? 0) > 0}
      >
        <Trash2 className="h-4 w-4" />
        Supprimer mon compte
      </Button>
    </section>
  );
};

export default Settings;
