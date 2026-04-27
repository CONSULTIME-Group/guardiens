import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { Eye, EyeOff } from "lucide-react";
import { getAuthFieldAttrs } from "@/lib/inAppBrowser";
import { mapAuthError } from "@/lib/authErrorMessages";
import { InAppBrowserBanner } from "@/components/auth/InAppBrowserBanner";
import authIllustration from "@/assets/auth-illustration-gouache.png";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const info = mapAuthError(error);

      if (info.code === "invalid_credentials") {
        // Erreur inline sur le champ mot de passe (UX la plus claire)
        setPasswordError(`${info.title}. ${info.description ?? ""}`.trim());
        setFailedAttempts((n) => n + 1);
      } else if (info.code === "email_not_confirmed") {
        const handleResend = async () => {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: getSignupRedirectUrl() },
          });
          if (resendError) {
            const resendInfo = mapAuthError(resendError);
            toast({
              variant: "destructive",
              title: resendInfo.title,
              description: resendInfo.description,
            });
          } else {
            toast({
              title: "Email renvoyé !",
              description: "Un nouvel email de confirmation vient d'être envoyé.",
            });
          }
        };
        toast({
          variant: "destructive",
          title: info.title,
          description: info.description,
          action: (
            <ToastAction altText="Renvoyer" onClick={handleResend} className="border-white text-white hover:bg-white/20">
              Renvoyer l'email
            </ToastAction>
          ),
        });
      } else if (info.code === "rate_limited") {
        // Inline aussi : c'est lié à la saisie du formulaire
        setPasswordError(`${info.title}. ${info.description ?? ""}`.trim());
      } else {
        toast({
          variant: "destructive",
          title: info.title,
          description: info.description,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background">
        <img
          src={authIllustration}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-100"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
            maskImage:
              "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
            filter: "saturate(0.75) hue-rotate(-8deg) blur(1.2px)",
          }}
        />
        {/* Filtre de teinte aligné sur la palette (vert sapin primaire) */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color opacity-25"
          style={{
            backgroundColor: "hsl(var(--primary))",
            WebkitMaskImage:
              "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
            maskImage:
              "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
          }}
        />
        {/* Fondu latéral vers le formulaire (droite) */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background pointer-events-none" />
        {/* Voile derrière le texte pour garantir la lisibilité */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />
        <div className="relative z-10 mt-auto p-12 max-w-lg">
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">Vos animaux entre de bonnes mains</h2>
          <p className="text-foreground/80 leading-relaxed">
            Rejoignez une communauté de passionnés qui prennent soin des animaux comme des leurs, dans le confort de leur foyer.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 gap-1">
            ← Retour au site
          </Link>
          <div className="text-center mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">Content de vous revoir</p>
          </div>

          <InAppBrowserBanner className="mb-6" />


          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg h-12"
                {...getAuthFieldAttrs("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  required
                  className="rounded-lg h-12 pr-12"
                  {...getAuthFieldAttrs("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{passwordError}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      Mot de passe oublié ?
                    </Link>
                    {failedAttempts >= 2 && (
                      <Link to={`/inscription${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-primary hover:underline">
                        Pas encore de compte ? Inscrivez-vous
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!passwordError && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link to="/inscription" className="text-primary font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
