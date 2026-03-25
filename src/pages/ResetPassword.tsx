import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Mot de passe mis à jour !",
        description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold mb-2">
            <span className="text-primary">g</span>uardiens
          </h1>
          <p className="text-muted-foreground">Choisissez un nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
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
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Retapez votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-lg h-12"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
