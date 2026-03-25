import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
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
          <p className="text-muted-foreground">
            {sent ? "Email envoyé !" : "Réinitialiser votre mot de passe"}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-foreground">
              Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
            </p>
            <p className="text-sm text-muted-foreground">
              Pensez à vérifier vos spams.
            </p>
          </div>
        ) : (
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
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
