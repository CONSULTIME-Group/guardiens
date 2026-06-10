import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRecoveryRedirectUrl } from "@/lib/authRedirect";
import { mapAuthError } from "@/lib/authErrorMessages";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getRecoveryRedirectUrl(),
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      const info = mapAuthError(error);
      toast({
        variant: "destructive",
        title: info.title,
        description: info.description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <AuthIllustrationPanel
        title={t("forgot_password.panel_title")}
        description={t("forgot_password.panel_description")}
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 gap-1">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("auth_common.back_to_site")}
          </Link>
          <div className="text-center mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">
              {sent ? t("forgot_password.sent_title") : t("forgot_password.subtitle")}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-foreground">
                <Trans i18nKey="forgot_password.sent_body" values={{ email }} components={[<strong />]} />
              </p>
              <p className="text-sm text-muted-foreground">
                {t("forgot_password.sent_spam")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth_common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth_common.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-lg h-12"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? t("forgot_password.submitting") : t("forgot_password.submit")}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("auth_common.back_to_login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
