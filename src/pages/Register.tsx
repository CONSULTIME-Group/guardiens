import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

type Role = "owner" | "sitter" | "both";

const roles: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "Propriétaire", description: "Je cherche un gardien pour ma maison et mes animaux" },
  { value: "sitter", label: "Gardien", description: "Je souhaite garder des maisons et m'occuper d'animaux" },
  { value: "both", label: "Les deux", description: "Je veux pouvoir garder et faire garder" },
];

const Register = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsLoading(true);
    try {
      await register(email, password, selectedRole);
      toast({
        title: "Compte créé !",
        description: "Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail (et vos spams) pour activer votre compte.",
      });
      setStep(1);
      setEmail("");
      setPassword("");
      setSelectedRole(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message?.includes("already registered")
          ? "Cet email est déjà utilisé."
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
          <p className="text-muted-foreground">
            {step === 1 ? "Quel est votre profil ?" : "Créez votre compte"}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => {
                  setSelectedRole(role.value);
                  setStep(2);
                }}
                className={cn(
                  "w-full text-left p-5 rounded-lg border-2 transition-all",
                  "hover:border-primary hover:bg-primary/5",
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                )}
              >
                <div className="font-semibold mb-1">{role.label}</div>
                <div className="text-sm text-muted-foreground">{role.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-1.5 rounded-pill bg-primary/10 text-primary text-sm font-medium">
                {roles.find((r) => r.value === selectedRole)?.label}
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="block mx-auto mt-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Changer de rôle
              </button>
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
                className="rounded-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
