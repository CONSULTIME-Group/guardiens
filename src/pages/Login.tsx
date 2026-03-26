import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Eye, EyeOff } from "lucide-react";
import loginIllustration from "@/assets/login-illustration.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      const msg = error.message;
      if (msg === "Invalid login credentials") {
        toast({
          variant: "destructive",
          title: "Compte introuvable",
          description: "Aucun compte existant avec cette adresse.",
          action: (
            <ToastAction altText="Créer un compte" onClick={() => navigate("/register")} className="border-white text-white hover:bg-white/20">
              Créer un compte
            </ToastAction>
          ),
        });
      } else if (msg === "Email not confirmed") {
        toast({
          variant: "destructive",
          title: "Email non confirmé",
          description: "Vérifiez votre boîte mail et cliquez sur le lien de confirmation pour activer votre compte.",
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
      {/* Left panel - illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-accent items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <img
            src={loginIllustration}
            alt="Chien et chat heureux"
            width={400}
            height={400}
            className="mb-8 drop-shadow-lg"
          />
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">
            Vos animaux entre de bonnes mains
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Rejoignez une communauté de passionnés qui prennent soin des animaux comme des leurs, dans le confort de leur foyer.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">Content de vous revoir</p>
          </div>

          {/* Illustration mobile only */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img
              src={loginIllustration}
              alt="Chien et chat heureux"
              width={200}
              height={200}
              className="drop-shadow-md"
            />
          </div>

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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Tu es nouveau ?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
