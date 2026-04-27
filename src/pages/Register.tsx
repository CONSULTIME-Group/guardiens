import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, trackEventWithUserId, mapSignupError } from "@/lib/analytics";
import { mapAuthError } from "@/lib/authErrorMessages";
import { Eye, EyeOff, MailCheck, Info } from "lucide-react";
import { InAppBrowserBanner } from "@/components/auth/InAppBrowserBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import authIllustration from "@/assets/auth-illustration-gouache.png";

type Role = "owner" | "sitter" | "both";

const roles: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "Propriétaire", description: "Je cherche un gardien pour ma maison et mes animaux" },
  { value: "sitter", label: "Gardien", description: "Je souhaite garder des maisons et m'occuper d'animaux" },
  { value: "both", label: "Les deux", description: "Je veux pouvoir garder et faire garder" },
];

/* ── Password strength helper ── */
const getPasswordStrength = (pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } => {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: "", color: "" },
    1: { label: "Faible", color: "bg-destructive" },
    2: { label: "Moyen", color: "bg-orange-400" },
    3: { label: "Bon", color: "bg-yellow-400" },
    4: { label: "Fort", color: "bg-green-500" },
  };
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
};

/* Common compromised passwords / patterns blocked by Supabase HIBP — we pre-check
   to avoid the very confusing "weak_password" error that costs us many signups. */
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
  // all same character
  if (/^(.)\1+$/.test(pw)) return true;
  // sequential digits like 12345678 / 87654321
  if (/^(?:0123456789|1234567890|9876543210|0987654321)$/.test(pw)) return true;
  return false;
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get("role") as Role | null;

  const [step, setStep] = useState<1 | 2 | "confirmation">(presetRole ? 2 : 1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(presetRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingAccountOpen, setExistingAccountOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [totalInscrits, setTotalInscrits] = useState<number | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Capture referral code from URL + track signup_started
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("guardiens_ref", ref);
    }
    // Fire-and-forget — fonctionne aussi en anonyme via insertion locale temp
    trackEvent("signup_started", {
      source: "/inscription",
      metadata: { has_ref: !!ref, preset_role: presetRole || null },
    });
    // Si le rôle est pré-sélectionné via ?role= (CTA, Facebook, etc.),
    // l'utilisateur saute l'étape 1 → on émet l'event manuellement pour
    // éviter le sous-comptage de "Rôle choisi" dans le funnel.
    if (presetRole) {
      trackEvent("signup_role_selected", {
        source: "/inscription",
        metadata: { role: presetRole, preset: true },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge le nombre d'inscrits pour preuve sociale
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_stats")
        .select("total_inscrits")
        .single();
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
      setFormError("Votre mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (isObviouslyWeak(password)) {
      setFormError("Ce mot de passe est trop courant. Mélangez plusieurs mots, chiffres ou symboles (par exemple une phrase de passe).");
      try {
        trackEvent("signup_failed", {
          source: "/inscription",
          metadata: { stage: "auth", error_code: "weak_password", error_message: "weak_password_local", role: selectedRole },
        });
      } catch {}
      return;
    }

    if (pwStrength.score < 2) {
      setFormError("Mot de passe trop faible. Ajoutez des majuscules, des chiffres ou un caractère spécial.");
      return;
    }

    if (!acceptedTerms) {
      setFormError("Veuillez accepter les conditions d'utilisation.");
      return;
    }

    // ── signup_form_submitted (après validation client, avant appel Supabase) ──
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
        register(cleanEmail, password, selectedRole),
        timeoutPromise,
      ]) as any;

      // Pas de vérification client du profil ici : l'utilisateur n'a pas encore
      // confirmé son email, donc aucune session active → toute requête
      // SELECT profiles ou INSERT analytics_events avec user_id renvoie 401
      // (RLS rôle anon). Le trigger handle_new_user crée le profil côté serveur.
      // Le filet de sécurité "profil manquant" est posé sur le Dashboard,
      // au premier login (session active, plus de 401).
      const newUserId = result?.user?.id ?? null;

      // Flag pour émettre user_activated lors du premier dashboard
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("first_dashboard_seen", "pending");
          if (newUserId) localStorage.setItem("first_dashboard_role", selectedRole);
        }
      } catch {}

      // Process referral code after successful signup
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

      // If auto-confirm enabled (session already created), go straight to dashboard
      if (result?.session) {
        // Session active → on peut émettre signup_completed sans 401
        try {
          trackEventWithUserId(newUserId, "signup_completed", {
            source: "/inscription",
            metadata: { role: selectedRole, user_id: newUserId, auto_confirmed: true },
          });
        } catch {}
        navigate("/dashboard");
        return;
      }

      setStep("confirmation");
      // NOTE : pas de signup_completed ici. Sans confirmation email, aucune session
      // → INSERT analytics_events avec user_id = 401 (RLS rôle anon). Option A retenue :
      // on s'appuie sur `user_activated` (émis depuis le Dashboard au premier login,
      // session active) comme proxy de l'inscription complétée. Émission best-effort
      // côté serveur reportée à un futur webhook Supabase.
    } catch (error: any) {
      // Track échec signup (normalisé)
      const rawMessage = error?.message || "unknown";
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
        setFormError(
          "L'inscription prend plus de temps que prévu. Si vous n'avez pas reçu d'email de confirmation dans 2 minutes, réessayez."
        );
      } else {
        const info = mapAuthError(error);
        if (info.code === "user_already_exists") {
          // Dialog dédié : permet de rebondir vers /login pré-rempli
          setExistingAccountOpen(true);
        } else if (
          info.code === "weak_password" ||
          info.code === "invalid_email" ||
          info.code === "rate_limited"
        ) {
          // Erreur liée à la saisie → inline sous le formulaire (plus visible qu'un toast)
          setFormError(`${info.title}. ${info.description ?? ""}`.trim());
        } else {
          toast({
            variant: "destructive",
            title: info.title,
            description: info.description,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
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
      toast({
        title: "Email renvoyé !",
        description: "Un nouvel email de confirmation vient d'être envoyé.",
      });
    }
    setIsResending(false);
  };

  const goToLoginWithEmail = () => {
    navigate(`/login?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* /inscription est une page de conversion clé : indexable (cohérent avec robots.txt + sitemap.xml). */}
      <Helmet><meta name="robots" content="index, follow" /></Helmet>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={authIllustration}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
        <div className="relative z-10 mt-auto p-12 max-w-lg">
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">Rejoignez la communauté</h2>
          <p className="text-foreground/80 leading-relaxed">
            Des milliers de passionnés prennent soin des animaux comme des leurs, dans le confort de leur foyer.
          </p>
          {totalInscrits !== null && totalInscrits > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-4 py-2 border border-border">
              <span className="text-2xl font-heading font-bold text-primary">{totalInscrits}</span>
              <span className="text-sm text-muted-foreground">membres déjà inscrits</span>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — pb-32 pour éviter masquage par cookie banner sur mobile */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-6 pt-4 pb-24 md:pt-12 md:pb-12">
        <div className="w-full max-w-md">
          {/* Lien retour : compact sur mobile pour libérer de l'espace */}
          <Link
            to="/"
            className="inline-flex items-center text-xs lg:text-sm text-muted-foreground hover:text-foreground mb-2 lg:mb-6 gap-1"
          >
            ← Retour au site
          </Link>
          <div className="text-center mb-4 lg:mb-8">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-xl lg:text-3xl font-bold mb-1 lg:mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            {step !== "confirmation" && (
              <>
                {/* Indicateur de progression mobile-first */}
                <div className="mt-2 lg:mt-3 mb-1 lg:mb-2 flex flex-col items-center gap-1 lg:gap-1.5" aria-label={`Inscription, étape ${step} sur 2`}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 lg:py-1">
                    <span className="tabular-nums">Étape {step}/2</span>
                  </span>
                  <div className="w-32 h-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={step === 1 ? 50 : 100} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: step === 1 ? "50%" : "100%" }}
                    />
                  </div>
                </div>
                <p className="text-foreground font-medium text-sm lg:text-base mt-2 lg:mt-3">
                  {step === 1 ? "Bienvenue 👋" : "Plus qu'une étape ✨"}
                </p>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 lg:mt-1">
                  {step === 1
                    ? "On commence par votre profil — 30 secondes."
                    : "Vos identifiants et c'est terminé. Promis."}
                </p>
              </>
            )}
          </div>

          {/* Preuve sociale mobile : visible UNIQUEMENT à l'étape 2 (à l'étape 1, le panel desktop la montre déjà et on gagne de l'espace mobile) */}
          {step === 2 && totalInscrits !== null && totalInscrits > 0 && (
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {totalInscrits}
              </span>
              <span>membres déjà inscrits sur Guardiens</span>
            </div>
          )}

          {/* Bandeau WebView in-app (FB/IG/TikTok) — masqué dans navigateur standard */}
          <InAppBrowserBanner className="mb-4 lg:mb-6" />

          {/* Illustration retirée du flux mobile : déjà visible dans le panel desktop gauche, et coûte ~200px précieux sur mobile (la priorité = champs + CTA visibles sans scroller). */}

          {/* ── Confirmation screen ── */}
          {step === "confirmation" && (
            <div className="flex flex-col items-center text-center space-y-5 py-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <MailCheck className="h-12 w-12 text-primary" />
              <h2 className="font-heading text-xl font-semibold text-foreground">Vérifiez votre boîte mail</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                On vous a envoyé un lien de confirmation à{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Cliquez dessus pour activer votre compte.
              </p>
              <div className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 max-w-sm text-left space-y-1.5">
                <p className="text-xs font-semibold text-foreground">⚠️ Important — sur mobile</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Quand vous cliquerez sur le lien, ouvrez-le <strong>dans le même navigateur</strong> (Chrome ou Safari) — pas dans l'application Facebook ou Instagram. Sinon votre session sera perdue et vous devrez recommencer.
                </p>
              </div>
              <p className="text-muted-foreground/70 text-xs leading-relaxed max-w-sm">
                💡 Pensez à vérifier vos <strong>spams</strong> ou l'onglet <strong>Promotions</strong> si vous ne trouvez pas l'email.
              </p>
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {isResending ? "Envoi en cours…" : "Vous n'avez rien reçu ? Renvoyer l'email →"}
              </button>
              <button
                onClick={goToLoginWithEmail}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Retour à la connexion
              </button>
            </div>
          )}

          {/* ── Step 1: role selection ── */}
          {step === 1 && (
            <div className="space-y-3 lg:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
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
                    "w-full text-left p-3.5 lg:p-5 rounded-lg border-2 transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    selectedRole === role.value ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="font-semibold text-sm lg:text-base mb-0.5 lg:mb-1">{role.label}</div>
                  <div className="text-xs lg:text-sm text-muted-foreground leading-snug">{role.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: form ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-1.5 rounded-pill bg-primary/10 text-primary text-sm font-medium">
                  {roles.find((r) => r.value === selectedRole)?.label}
                </span>
                <button type="button" onClick={() => setStep(1)} className="block mx-auto mt-2 text-sm text-muted-foreground hover:text-foreground">
                  Changer de rôle
                </button>
                {/* Message de réassurance contextualisé selon le rôle */}
                {selectedRole && (
                  <p className="mt-3 text-xs text-muted-foreground/90 leading-relaxed max-w-xs mx-auto">
                    {selectedRole === "owner" && (
                      <>✨ Vous pourrez <strong className="text-foreground/80">publier vos premières annonces</strong> juste après.</>
                    )}
                    {selectedRole === "sitter" && (
                      <>✨ Vous pourrez <strong className="text-foreground/80">compléter votre profil et candidater</strong> juste après.</>
                    )}
                    {selectedRole === "both" && (
                      <>✨ Vous pourrez <strong className="text-foreground/80">publier vos annonces ET candidater</strong> juste après.</>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-lg h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ex : MonChat!adore2dormir"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="rounded-lg h-12 pr-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  8 caractères min. · mélangez majuscules, chiffres et symboles · évitez les mots de passe courants (ex : « Password1 »)
                </p>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1.5 animate-in fade-in-0 duration-200">
                    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted">
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
                    <p className="text-xs text-muted-foreground">
                      Force : <span className="font-medium">{pwStrength.label}</span>
                    </p>
                  </div>
                )}

                {formError && <p className="text-sm text-destructive">{formError}</p>}
              </div>


              {/* CGU checkbox */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  J'accepte les{" "}
                  <Link to="/cgu" target="_blank" className="text-primary hover:underline">conditions d'utilisation</Link>
                  {" "}et la{" "}
                  <Link to="/confidentialite" target="_blank" className="text-primary hover:underline">politique de confidentialité</Link>.
                </label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading || !acceptedTerms}>
                {isLoading ? "Création..." : "Créer mon compte — gratuit"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                🔒 Pas de spam · Désinscription en 1 clic · Vos données restent en France
              </p>
            </form>
          )}

          {step !== "confirmation" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
            </p>
          )}
        </div>
      </div>

      {/* ── Dialog: existing account ── */}
      <Dialog open={existingAccountOpen} onOpenChange={setExistingAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ce compte existe déjà</DialogTitle>
            <DialogDescription>
              Un compte Guardiens existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => { setExistingAccountOpen(false); goToLoginWithEmail(); }}>
              Se connecter
            </Button>
            <Button variant="ghost" onClick={() => { setExistingAccountOpen(false); navigate("/forgot-password"); }}>
              Mot de passe oublié ?
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
