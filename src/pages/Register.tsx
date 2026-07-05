import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { sanitizeRedirect, buildRedirectQuery } from "@/lib/safeRedirect";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, trackEventWithUserId, mapSignupError } from "@/lib/analytics";
import { mapAuthError } from "@/lib/authErrorMessages";
import { Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";
import { InAppBrowserBanner } from "@/components/auth/InAppBrowserBanner";
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { lovable } from "@/integrations/lovable";
import { startOAuthFlow, logOAuthStage, endOAuthFlow } from "@/lib/oauthLogger";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";

type Role = "owner" | "sitter" | "both" | "pro";

const STRENGTH_KEYS = ["", "weak", "medium", "good", "strong"] as const;

/* ── Password strength helper ── */
const getPasswordStrength = (pw: string): { score: 0 | 1 | 2 | 3 | 4; key: typeof STRENGTH_KEYS[number]; color: string } => {
 if (!pw) return { score: 0, key: "", color: "" };
 let score = 0;
 if (pw.length >= 8) score++;
 if (pw.length >= 12) score++;
 if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
 if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;

 const colors: Record<number, string> = {
  0: "",
  1: "bg-strength-weak",
  2: "bg-strength-medium",
  3: "bg-strength-good",
  4: "bg-strength-strong",
 };
 return { score: score as 0 | 1 | 2 | 3 | 4, key: STRENGTH_KEYS[score], color: colors[score] };
};

const COMMON_WEAK_PASSWORDS = new Set([
 "12345678", "123456789", "1234567890", "azertyui", "azerty123",
 "password", "password1", "password123", "motdepasse", "motdepasse1",
 "qwertyui", "qwerty123", "iloveyou", "iloveyou1", "guardiens",
 "guardiens1", "guardiens123", "bonjour1", "bonjour12", "soleil123",
 "abcdefgh", "abc12345", "111111111", "00000000",
]);

const isObviouslyWeak = (pw: string): boolean => {
 const lower = pw.toLowerCase();
 if (COMMON_WEAK_PASSWORDS.has(lower)) return true;
 if (/^(.)\1+$/.test(pw)) return true;
 if (/^(?:0123456789|1234567890|9876543210|0987654321)$/.test(pw)) return true;
 return false;
};

const PW_ADJ = ["Joyeux", "Calme", "Sauvage", "Doux", "Brave", "Curieux", "Vif", "Tendre"];
const PW_NOUN = ["Chat", "Chien", "Lapin", "Renard", "Loup", "Cheval", "Hibou", "Ours"];
const PW_VERB = ["adore", "croque", "grimpe", "danse", "veille", "murmure", "explore"];
const PW_SYM = ["!", "?", "#", "$", "*"];
const generateSuggestedPassword = (): string => {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const num = String(Math.floor(Math.random() * 90) + 10);
  return `${pick(PW_ADJ)}${pick(PW_NOUN)}${pick(PW_SYM)}${pick(PW_VERB)}${num}`;
};

const Register = () => {
 const { t } = useTranslation();
 const [searchParams] = useSearchParams();
 const asPro = searchParams.get("as") === "pro";
 const presetRoleRaw = searchParams.get("role") as Role | null;
 // Si on arrive avec ?as=pro, on force le rôle "pro" même si role=owner est dans l'URL (héritage des anciens liens).
 const presetRole: Role | null = asPro ? "pro" : presetRoleRaw;
 const presetEmail = (searchParams.get("email") || "").trim().toLowerCase();

 const [step, setStep] = useState<1 | 2 | "confirmation">(presetRole ? 2 : 1);
 const [selectedRole, setSelectedRole] = useState<Role | null>(presetRole);
 const [email, setEmail] = useState<string>(() => {
  if (presetEmail) return presetEmail;
  try { return sessionStorage.getItem("guardiens_signup_email") || ""; } catch { return ""; }
 });
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [isResending, setIsResending] = useState(false);
 const [resendCooldown, setResendCooldown] = useState(0);
 const [resendCount, setResendCount] = useState(0);
 const [formError, setFormError] = useState<string | null>(null);
 const [existingAccountOpen, setExistingAccountOpen] = useState(false);
 const [acceptedTerms, setAcceptedTerms] = useState(false);
 const [termsHighlighted, setTermsHighlighted] = useState(false);
 
 const [totalInscrits, setTotalInscrits] = useState<number | null>(null);
 const [isGoogleLoading, setIsGoogleLoading] = useState(false);

 const { register } = useAuth();
 const navigate = useNavigate();
 const { toast } = useToast();
 const redirectTarget = sanitizeRedirect(searchParams.get("redirect"));
 // Si l'utilisateur sélectionne le rôle « pro », on l'envoie systématiquement vers le formulaire fiche pro.
 const postAuthTarget = selectedRole === "pro" ? "/pros/inscription" : (redirectTarget ?? "/dashboard");

 const pwStrength = useMemo(() => getPasswordStrength(password), [password]);

 const roles = useMemo<{ value: Role; label: string; description: string }[]>(() => [
  { value: "owner", label: t("register_page.roles.owner_label"), description: t("register_page.roles.owner_desc") },
  { value: "sitter", label: t("register_page.roles.sitter_label"), description: t("register_page.roles.sitter_desc") },
  { value: "both", label: t("register_page.roles.both_label"), description: t("register_page.roles.both_desc") },
  { value: "pro", label: t("register_page.roles.pro_label"), description: t("register_page.roles.pro_desc") },
 ], [t]);

 useEffect(() => {
 const ref = searchParams.get("ref");
 if (ref) {
 sessionStorage.setItem("guardiens_ref", ref);
 }
 trackEvent("signup_started", {
 source: "/inscription",
 metadata: { has_ref: !!ref, preset_role: presetRole || null },
 });
 if (presetRole) {
 trackEvent("signup_role_selected", {
 source: "/inscription",
 metadata: { role: presetRole, preset: true },
 });
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useEffect(() => {
 if (resendCooldown <= 0) return;
 const tm = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
 return () => clearInterval(tm);
 }, [resendCooldown]);

 useEffect(() => {
  try {
   if (email) sessionStorage.setItem("guardiens_signup_email", email);
   else sessionStorage.removeItem("guardiens_signup_email");
  } catch {}
 }, [email]);


 useEffect(() => {
 let cancelled = false;
 (async () => {
        const { data: rows } = await supabase.rpc('get_public_stats');
        const data = Array.isArray(rows) ? rows[0] : rows;
        if (!cancelled && data?.total_inscrits && typeof data.total_inscrits === "number") {
          setTotalInscrits(data.total_inscrits);
        }
 })();
 return () => { cancelled = true; };
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedRole) return;
 setFormError(null);

 if (password.length < 8) {
 setFormError(t("register_page.error_min_length"));
 try { trackEvent("signup_form_blocked", { source: "/inscription", metadata: { reason: "min_length", role: selectedRole } }); } catch {}
 return;
 }

 if (isObviouslyWeak(password)) {
 setFormError(t("register_page.error_too_common"));
 try {
 trackEvent("signup_form_blocked", { source: "/inscription", metadata: { reason: "too_common", role: selectedRole } });
 } catch {}
 return;
 }

 if (pwStrength.score < 2) {
 setFormError(t("register_page.error_too_weak"));
 try { trackEvent("signup_form_blocked", { source: "/inscription", metadata: { reason: "too_weak", role: selectedRole } }); } catch {}
 return;
 }

  // NB: CGU acceptance is validated at step 1 before reaching step 2 — no re-check here.

 try {
 trackEvent("signup_form_submitted", {
 source: "/inscription",
 metadata: { role: selectedRole },
 });
 } catch {}

 setIsLoading(true);
 const cleanEmail = email.trim().toLowerCase();
 const timeoutPromise = new Promise((_, reject) =>
 setTimeout(() => reject(new Error("timeout")), 15000)
 );

 try {
 const result = await Promise.race([
 register(cleanEmail, password, selectedRole === "pro" ? "owner" : selectedRole),
 timeoutPromise,
 ]) as any;

 const newUserId = result?.user?.id ?? null;

  try {
  if (typeof window !== "undefined") {
  localStorage.setItem("first_dashboard_seen", "pending");
  if (newUserId) localStorage.setItem("first_dashboard_role", selectedRole);
  if (selectedRole === "pro") localStorage.setItem("pending_pro_onboarding", "1");
  }
  } catch {}


 const storedRef = sessionStorage.getItem("guardiens_ref");
 if (storedRef && result?.user?.id) {
 try {
 const { data: referrer } = await supabase
.from("profiles")
.select("id")
.eq("referral_code", storedRef)
.maybeSingle();

 if (referrer && referrer.id !== result.user.id) {
 await supabase
.from("profiles")
.update({ referred_by: referrer.id } as any)
.eq("id", result.user.id);

 await supabase
.from("referrals")
.insert({
 referrer_id: referrer.id,
 referred_id: result.user.id,
 status: "pending",
 } as any);
 }
 } catch (refErr) {
 logger.error("Referral linking error", { err: String(refErr) });
 } finally {
 sessionStorage.removeItem("guardiens_ref");
 }
 }

 if (result?.session) {
 try {
 trackEventWithUserId(newUserId, "signup_completed", {
 source: "/inscription",
 metadata: { role: selectedRole, user_id: newUserId, auto_confirmed: true },
 });
 } catch {}
 navigate(postAuthTarget);
 return;
 }

 setStep("confirmation");
 } catch (error: any) {
 const rawMessage = error?.message || "unknown";
 // Toujours logger le brut pour diagnostiquer les catch-all silencieux
 // eslint-disable-next-line no-console
 console.error("signup_failed_raw", { message: rawMessage, code: error?.code, status: error?.status, name: error?.name });
 try { logger.error("signup_failed_raw", { message: rawMessage, code: error?.code, status: error?.status }); } catch {}
 try {
 trackEvent("signup_failed", {
 source: "/inscription",
 metadata: {
 stage: "auth",
 error_code: mapSignupError(rawMessage),
 error_message: rawMessage.slice(0, 200),
 role: selectedRole,
 },
 });
 } catch {}
 if (error.message === "timeout") {
 setFormError(t("register_page.error_timeout"));
 } else {
 const info = mapAuthError(error);
 if (info.code === "user_already_exists") {
 setExistingAccountOpen(true);
 } else {
 // Toujours persistant, jamais toast éphémère : l'utilisateur doit pouvoir relire.
 setFormError(`${info.title}. ${info.description ?? ""}`.trim());
 }
 }
 } finally {
 setIsLoading(false);
 }
 };

 const handleResendEmail = async () => {
 if (resendCooldown > 0 || isResending) return;
 setIsResending(true);
 const { error } = await supabase.auth.resend({
 type: "signup",
 email,
 options: {
 emailRedirectTo: getSignupRedirectUrl(),
 },
 });
 if (error) {
 const info = mapAuthError(error);
 toast({
 variant: "destructive",
 title: info.title,
 description: info.description,
 });
 } else {
 setResendCount((n) => n + 1);
 setResendCooldown(45);
 toast({
 title: t("register_page.confirmation.resend_toast_title"),
 description: t("register_page.confirmation.resend_toast_body", { email }),
 });
 }
 setIsResending(false);
 };

 const goToLoginWithEmail = () => {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (redirectTarget) params.set("redirect", redirectTarget);
  const qs = params.toString();
  navigate(`/login${qs ? `?${qs}` : ""}`);
 };

  const handleGoogleSignUp = async () => {
    if (!acceptedTerms) {
      logOAuthStage("blocked_terms", "/inscription");
      setFormError(t("register_page.error_terms_google"));
      setTermsHighlighted(true);
      setTimeout(() => {
        document.getElementById("accept-terms")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
 setIsGoogleLoading(true);
 startOAuthFlow("/inscription");
 try {
 trackEvent("signup_form_submitted", {
 source: "/inscription",
 metadata: { role: selectedRole, method: "google" },
 });
 } catch {}
  try {
    if (typeof window !== "undefined" && selectedRole === "pro") {
      localStorage.setItem("pending_pro_onboarding", "1");
    }
  } catch {}
  const googleRedirectUrl = `${window.location.origin}${postAuthTarget}`;

  logOAuthStage("sdk_called", "/inscription", {
 role: selectedRole,
 redirect_uri: googleRedirectUrl,
 });
 const result = await lovable.auth.signInWithOAuth("google", {
 redirect_uri: googleRedirectUrl,
 extraParams: {
 prompt: "select_account",
 ...(email.trim() ? { login_hint: email.trim().toLowerCase() } : {}),
 },
 });
 if (result.error) {
 const info = mapAuthError(result.error as any);
 logOAuthStage("error", "/inscription", { code: info.code, title: info.title });
 endOAuthFlow("error");
 toast({ variant: "destructive", title: info.title, description: info.description });
 setIsGoogleLoading(false);
 return;
 }
 if (result.redirected) {
 logOAuthStage("redirecting", "/inscription");
 return;
 }
 logOAuthStage("tokens_received", "/inscription");
 navigate(postAuthTarget, { replace: true });
 };

 return (
 <div className="min-h-screen flex bg-background">
 <Helmet><meta name="robots" content="noindex, follow" /></Helmet>

 <AuthIllustrationPanel
 title={t("register_page.panel_title")}
 description={t("register_page.panel_desc")}
 footerSlot={
 totalInscrits !== null && totalInscrits > 0 ? (
 <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-card/85 backdrop-blur-md pl-3 pr-5 py-2 border border-border/60 shadow-sm">
 <span className="inline-flex items-center justify-center min-w-[2.5rem] h-9 px-2 rounded-full bg-primary/10 text-primary font-heading text-lg font-bold tabular-nums">
 {totalInscrits}
 </span>
 <span className="text-sm text-foreground/80">{t("register_page.members_badge_suffix")}</span>
 </div>
 ) : null
 }
 />

 <Link
 to="/"
 className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 inline-flex items-center gap-1.5 rounded-full bg-card/85 backdrop-blur-md border border-border/60 px-3 py-1.5 text-xs lg:text-sm text-foreground/80 hover:text-foreground hover:bg-card transition-colors shadow-sm"
 >
 <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
 {t("register_page.retour_site")}
 </Link>

 <div className="flex-1 flex items-center justify-center px-6 pt-16 pb-24 md:pt-12 md:pb-12">
 <div className="w-full max-w-md">
 <div className="text-center mb-4 lg:mb-8">
 <Link to="/" className="inline-block">
 <h1 className="font-heading text-2xl lg:text-4xl font-bold mb-1 lg:mb-3 hover:opacity-80 transition-opacity">
 <span className="text-primary">g</span>uardiens
 </h1>
 </Link>
 {step !== "confirmation" && (
 <>
 <div className="mt-2 lg:mt-3 mb-1 lg:mb-2 flex flex-col items-center gap-1 lg:gap-1.5" aria-label={t("register_page.step_aria", { step })}>
 <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 lg:py-1">
 <span className="tabular-nums">{t("register_page.step_label", { step })}</span>
 </span>
 <div className="w-32 h-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={step === 1 ? 50 : 100} aria-valuemin={0} aria-valuemax={100}>
 <div
 className="h-full bg-primary transition-all duration-500 ease-out"
 style={{ width: step === 1 ? "50%" : "100%" }}
 />
 </div>
 </div>
 <p className="text-foreground font-medium text-sm lg:text-base mt-2 lg:mt-3">
 {step === 1 ? t("register_page.welcome") : t("register_page.almost_done")}
 </p>
 <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 lg:mt-1">
 {step === 1 ? t("register_page.step_1_sub") : t("register_page.step_2_sub")}
 </p>
 </>
 )}
 </div>

 {step === 2 && totalInscrits !== null && totalInscrits > 0 && (
 <div className="lg:hidden flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
 <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
 {totalInscrits}
 </span>
 <span>{t("register_page.members_count")}</span>
 </div>
 )}

 <InAppBrowserBanner className="mb-4 lg:mb-6" />

 {step === "confirmation" && (
 <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
 <div className="rounded-full bg-primary/10 p-4">
 <MailCheck className="h-10 w-10 text-primary" />
 </div>
 <div className="space-y-2">
 <h2 className="font-heading text-xl font-semibold text-foreground">
 {t("register_page.confirmation.title")}
 </h2>
 <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
 <Trans
   i18nKey="register_page.confirmation.body"
   values={{ email }}
   components={{
     1: <span className="font-medium text-foreground break-all" />,
     2: <strong className="text-foreground" />,
     3: <strong className="text-foreground" />,
   }}
 />
 </p>
 </div>

 <div className="w-full max-w-sm rounded-lg bg-warning-soft border border-warning-border px-4 py-3 text-left space-y-2">
 <p className="text-sm font-semibold text-warning-foreground">
 {t("register_page.confirmation.spam_title")}
 </p>
 <ul className="text-xs text-warning-foreground/85 leading-relaxed space-y-1 list-disc pl-4">
  <li>
   <Trans i18nKey="register_page.confirmation.spam_check" components={{ 1: <strong />, 2: <strong /> }} />
  </li>
  <li>
   <Trans i18nKey="register_page.confirmation.spam_hotmail" components={{ 1: <strong /> }} />
  </li>
  <li>
   <Trans i18nKey="register_page.confirmation.spam_sender" components={{ 1: <span className="font-mono text-[11px]" /> }} />
  </li>
  <li>{t("register_page.confirmation.spam_delay")}</li>
 </ul>
 </div>

 <Button
 type="button"
 variant="outline"
 size="lg"
 onClick={handleResendEmail}
 disabled={isResending || resendCooldown > 0}
 className="w-full max-w-sm"
 >
 {isResending
 ? t("register_page.confirmation.resend_sending")
 : resendCooldown > 0
 ? t("register_page.confirmation.resend_cooldown", { s: resendCooldown })
 : resendCount > 0
 ? t("register_page.confirmation.resend_again")
 : t("register_page.confirmation.resend_first")}
 </Button>

 <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-sm">
 <Trans i18nKey="register_page.confirmation.mobile_tip" components={{ 1: <strong /> }} />
 </p>

 <div className="flex flex-col items-center gap-2 pt-2">
 <button
 type="button"
 onClick={() => { setStep(presetRole ? 2 : 1); setResendCount(0); setResendCooldown(0); }}
 className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
 >
 {t("register_page.confirmation.wrong_email")}
 </button>
 <button
 type="button"
 onClick={goToLoginWithEmail}
 className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
 >
 <ArrowLeft className="h-4 w-4" aria-hidden="true" />
 {t("register_page.confirmation.back_login")}
 </button>
 <Link
 to="/contact"
 className="text-xs text-muted-foreground/70 hover:text-foreground mt-2"
 >
 {t("register_page.confirmation.contact")}
 </Link>
 </div>
 </div>
 )}

  {step === 1 && (
  <>
  <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
  {roles.map((role) => (
  <button
  key={role.value}
  onClick={() => {
  setSelectedRole(role.value);
  setStep(2);
  trackEvent("signup_role_selected", {
  source: "/inscription",
  metadata: { role: role.value },
  });
  }}
  className={cn(
  "group relative w-full text-left p-3.5 lg:p-4 rounded-lg border-2 transition-all duration-200",
  "hover:border-primary hover:bg-primary/5",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  selectedRole === role.value ? "border-primary bg-primary/5" : "border-border"
  )}
  >
  {role.value === "pro" && (
  <span className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground shadow-sm">
  Pro
  </span>
  )}
  <div className="font-semibold text-sm lg:text-base mb-0.5">{role.label}</div>
  <div className="text-xs lg:text-sm text-muted-foreground leading-snug">{role.description}</div>
  </button>
   ))}
  </div>

   <p className="mt-4 text-center text-[11px] lg:text-xs text-muted-foreground/80">
     {t("register_page.role_change_hint")}
   </p>
  </>
  )}

  {step === 2 && (
  <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
  <div className="text-center mb-4">
  <span className="inline-block px-4 py-1.5 rounded-pill bg-primary/10 text-primary text-sm font-medium">
  {roles.find((r) => r.value === selectedRole)?.label}
  </span>
  <button type="button" onClick={() => setStep(1)} className="block mx-auto mt-2 text-xs text-muted-foreground hover:text-foreground">
  {t("register_page.change_role")}
  </button>
  </div>

  <Button
  type="button"
  variant="outline"
  size="lg"
  className="w-full"
  onClick={handleGoogleSignUp}
  disabled={isGoogleLoading || isLoading}
  >
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  {isGoogleLoading ? t("register_page.google_loading") : t("register_page.google_cta")}
  </Button>

  <div className="relative" role="separator">
  <div className="absolute inset-0 flex items-center">
  <span className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
  <span className="bg-background px-2 text-muted-foreground">{t("register_page.or_email")}</span>
  </div>
  </div>

  <div className="space-y-2">
   <Label htmlFor="email">{t("register_page.email_label")}</Label>
   <Input
    id="email"
    type="email"
    placeholder={t("register_page.email_placeholder")}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    onFocus={() => { try { trackEvent("signup_form_focused" as any, { source: "/inscription", metadata: { field: "email" } }); } catch {} }}
    required
    autoComplete="email"
    className="rounded-lg h-12"
   />
  </div>
  <div className="space-y-2">
   <div className="flex items-center justify-between">
    <Label htmlFor="password">{t("register_page.password_label")}</Label>
    <button
     type="button"
     onClick={() => { const pw = generateSuggestedPassword(); setPassword(pw); setShowPassword(true); setFormError(null); }}
     className="text-xs text-primary hover:underline"
    >
     {t("register_page.suggest_password")}
    </button>
   </div>
   <div className="relative">
    <Input
     id="password"
     type={showPassword ? "text" : "password"}
     placeholder={t("register_page.password_placeholder")}
     value={password}
     onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
     onFocus={() => { try { trackEvent("signup_form_focused" as any, { source: "/inscription", metadata: { field: "password" } }); } catch {} }}
     required
     minLength={8}
     autoComplete="new-password"
     className="rounded-lg h-12 pr-12"
    />
    <button
     type="button"
     onClick={() => setShowPassword(!showPassword)}
     aria-label={showPassword ? t("register_page.hide_password") : t("register_page.show_password")}
     aria-pressed={showPassword}
     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
     {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </button>
   </div>

   {password.length >= 6 && isObviouslyWeak(password) && (
    <p className="text-xs text-warning-foreground bg-warning-soft border border-warning-border rounded px-2 py-1.5 animate-in fade-in-0">
     {t("register_page.password_weak_live")}
    </p>
   )}

  {password.length > 0 && (
  <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted animate-in fade-in-0 duration-200">
  {[1, 2, 3, 4].map((i) => (
  <div
  key={i}
  className={cn(
  "flex-1 rounded-full transition-all duration-300",
  i <= pwStrength.score ? pwStrength.color : "bg-transparent"
  )}
  />
  ))}
  </div>
  )}

  {formError && <p className="text-sm text-destructive">{formError}</p>}
  </div>


           <div
             className={cn(
               "flex items-start gap-3 rounded-lg border p-3 transition-colors",
               termsHighlighted && !acceptedTerms
                 ? "border-destructive bg-destructive/5 animate-in fade-in-0"
                 : "border-border bg-muted/30"
             )}
           >
             <Checkbox
               id="accept-terms"
               checked={acceptedTerms}
               onCheckedChange={(v) => {
                 const checked = v === true;
                 setAcceptedTerms(checked);
                 if (checked) {
                   setTermsHighlighted(false);
                   setFormError(null);
                   try { trackEvent("signup_terms_checked" as any, { source: "/inscription" }); } catch {}
                 }
               }}
               className="mt-0.5"
             />
             <label htmlFor="accept-terms" className="text-sm text-foreground/80 leading-snug cursor-pointer">
               <Trans
                 i18nKey="register_page.accept_label"
                 components={{
                   1: <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                   2: <Link to="/cgs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                   3: <Link to="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                 }}
               />
             </label>
           </div>

           <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
             {isLoading ? t("register_page.submitting") : t("register_page.submit")}
           </Button>
  </form>
  )}

   {step !== "confirmation" && (
   <div className="mt-6 text-center text-sm text-muted-foreground">
    <p>
    {t("register_page.have_account")}{" "}
    <Link to={`/login${buildRedirectQuery(redirectTarget)}`} className="text-primary font-medium hover:underline">{t("register_page.sign_in")}</Link>
    </p>
   </div>
   )}
 </div>
 </div>

 <Dialog open={existingAccountOpen} onOpenChange={setExistingAccountOpen}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("register_page.existing.title")}</DialogTitle>
 <DialogDescription>
 {t("register_page.existing.body")}
 </DialogDescription>
 </DialogHeader>
 <div className="flex flex-col gap-3 pt-2">
 <Button onClick={() => { setExistingAccountOpen(false); goToLoginWithEmail(); }}>
 {t("register_page.existing.sign_in")}
 </Button>
 <Button variant="ghost" onClick={() => { setExistingAccountOpen(false); navigate("/forgot-password"); }}>
 {t("register_page.existing.forgot")}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
};

export default Register;
