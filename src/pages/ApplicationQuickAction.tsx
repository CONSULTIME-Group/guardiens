import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import PageMeta from "@/components/PageMeta";

type Action = "decline" | "thinking";

const DECLINE_REASONS = [
  "other_chosen",
  "dates_changed",
  "not_right_time",
  "different_profile",
] as const;


interface PeekResult {
  valid: boolean;
  reason?: string;
  action?: Action;
  sit_title?: string;
  sitter_first_name?: string;
}

/**
 * Page de confirmation des reponses en un clic depuis un email.
 * Rien n'est execute au chargement : la lecture du jeton est une simple
 * description, l'action n'a lieu qu'apres validation explicite.
 */
export default function ApplicationQuickAction() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("t") || "";

  const [loading, setLoading] = useState(true);
  const [peek, setPeek] = useState<PeekResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { ok: boolean; reason?: string; action?: Action }>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setPeek({ valid: false, reason: "invalid" });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("application-quick-action", {
        body: { token, mode: "peek" },
      });
      if (cancelled) return;
      setPeek(error ? { valid: false, reason: "invalid" } : (data as PeekResult));
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    if (!peek?.valid || !peek.action) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("application-quick-action", {
      body: { token, mode: "confirm" },
    });
    setSubmitting(false);
    const result = (error ? { ok: false, reason: "error" } : data) as {
      ok: boolean;
      reason?: string;
    };
    setDone({ ok: !!result?.ok, reason: result?.reason, action: peek.action });
    trackEvent(
      peek.action === "decline"
        ? "application_quick_decline"
        : "application_quick_thinking",
      {
        source: "email",
        metadata: {
          source_template: params.get("src") || "email",
          result: result?.ok ? "success" : result?.reason || "error",
        },
      },
    );
  };

  const title = t("application_quick_action.page_title");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <PageMeta title={title} description={t("application_quick_action.page_description")} noindex />
      <Card className="w-full max-w-md">
        {loading ? (
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </CardContent>
        ) : done ? (
          <>
            <CardHeader>
              <CardTitle>
                {done.ok
                  ? t(`application_quick_action.done_title_${done.action}`)
                  : t("application_quick_action.error_title")}
              </CardTitle>
              <CardDescription>
                {done.ok
                  ? t(`application_quick_action.done_body_${done.action}`)
                  : t(`application_quick_action.reason_${done.reason || "error"}`, {
                      defaultValue: t("application_quick_action.reason_error"),
                    })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/dashboard">{t("application_quick_action.go_dashboard")}</Link>
              </Button>
            </CardContent>
          </>
        ) : peek?.valid ? (
          <>
            <CardHeader>
              <CardTitle>
                {t(`application_quick_action.confirm_title_${peek.action}`)}
              </CardTitle>
              <CardDescription>
                {t(`application_quick_action.confirm_body_${peek.action}`, {
                  sitter: peek.sitter_first_name || t("application_quick_action.the_sitter"),
                  listing: peek.sit_title || t("application_quick_action.your_listing"),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={confirm} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  t(`application_quick_action.confirm_cta_${peek.action}`)
                )}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">{t("application_quick_action.open_application")}</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("application_quick_action.accept_notice")}
              </p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{t("application_quick_action.error_title")}</CardTitle>
              <CardDescription>
                {t(`application_quick_action.reason_${peek?.reason || "invalid"}`, {
                  defaultValue: t("application_quick_action.reason_invalid"),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/dashboard">{t("application_quick_action.go_dashboard")}</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
