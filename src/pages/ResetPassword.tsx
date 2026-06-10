import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { Helmet } from "react-helmet-async";
import authIllustration from "@/assets/auth-illustration.webp";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsRecovery(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
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
        title: t("auth_common.error_title"),
        description: t("reset_password.mismatch"),
      });
      return;
    }
    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: t("auth_common.error_title"),
        description: t("reset_password.too_short"),
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: t("reset_password.updated_title"),
        description: t("reset_password.updated_body"),
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("auth_common.error_title"),
        description: t("reset_password.update_failed"),
      });
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
          <img
            src={authIllustration}
            alt={t("reset_password.illustration_alt")}
            width={400}
            height={400}
            className="mb-8 drop-shadow-lg"
          />
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">
            {t("reset_password.panel_title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("reset_password.panel_description")}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">{t("reset_password.subtitle")}</p>
          </div>

          <div className="flex justify-center mb-8 lg:hidden">
            <img
              src={authIllustration}
              alt={t("reset_password.illustration_alt")}
              width={200}
              height={200}
              className="drop-shadow-md"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">{t("reset_password.new_password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("reset_password.new_placeholder")}
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
                  aria-label={showPassword ? t("auth_common.hide_password") : t("auth_common.show_password")}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("reset_password.confirm_password")}</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("reset_password.confirm_placeholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-lg h-12"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? t("reset_password.submitting") : t("reset_password.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("auth_common.back_to_login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
