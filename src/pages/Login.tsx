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
const authIllustration = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/auth-illustration.webp";

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
      const msg = error.message;
      if (msg === "Invalid login credentials") {
        setPasswordError("Email ou mot de passe incorrect.");
        setFailedAttempts((n) => n + 1);
      } else if (msg === "Email not confirmed") {
        const handleResend = async () => {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: getSignupRedirectUrl() },
          });
          toast({
            title: resendError ? "Erreur" : "Email envoyé !",
            description: resendError
              ? "Impossible de renvoyer l'email. Réessayez plus tard."
              : "Un nouvel email de confirmation vient d'être envoyé.",
            variant: resendError ? "destructive" : "default",
          });
        };
        toast({
          variant: "destructive",
          title: "Email non confirmé",
          description: "Vérifiez votre boîte mail et cliquez sur le lien de confirmation.",
          action: (
            <ToastAction altText="Renvoyer" onClick={handleResend} className="border-white text-white hover:bg-white/20">
              Renvoyer
            </ToastAction>
          ),
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: "Une erreur est survenue. Veuillez réessayer.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="hidden lg:flex lg:w-1/2 bg-accent items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <img src={authIllustration} alt="Chien et chat heureux" width={400} height={400} className="mb-8 drop-shadow-lg" />
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Vos animaux entre de bonnes mains</h2>
          <p className="text-muted-foreground leading-relaxed">
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

          <div className="flex justify-center mb-8 lg:hidden">
            <img src={authIllustration} alt="Chien et chat heureux" width={200} height={200} className="drop-shadow-md" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-lg h-12" />
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
