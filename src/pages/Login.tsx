import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

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
      const isInvalidCredentials = error.message === "Invalid login credentials";
      toast({
        variant: "destructive",
        title: isInvalidCredentials ? "Compte introuvable" : "Erreur de connexion",
        description: isInvalidCredentials
          ? "Aucun compte existant avec cette adresse. Créez-vous un compte !"
          : "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
              <span className="text-primary">g</span>uardiens
            </h1>
          </Link>
          <p className="text-muted-foreground">Content de vous revoir</p>
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
  );
};

export default Login;
