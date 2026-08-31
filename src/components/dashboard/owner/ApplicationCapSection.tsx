/**
 * ApplicationCapSection, plafond de candidatures atteint, côté propriétaire.
 *
 * Action prioritaire, ton de service : on constate, et on ouvre deux issues,
 * traiter les candidatures en attente, ou relever le plafond par paliers.
 * Aucun champ libre, aucune sanction, aucun délai.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  countOpenApplications,
  isCapReached,
  nextCapSteps,
} from "@/lib/applicationCap";

interface Props {
  sits: any[];
  onUpdated?: () => void;
}

const ApplicationCapSection = ({ sits, onUpdated }: Props) => {
  const { t } = useTranslation();
  const [savingId, setSavingId] = useState<string | null>(null);

  const capped = (sits || []).filter((s) => {
    if (!["published", "draft"].includes(s.status)) return false;
    if (s.status === "draft") return false;
    return isCapReached(s.max_applications, countOpenApplications(s.applications));
  });

  if (capped.length === 0) return null;

  const raise = async (sit: any, value: number) => {
    setSavingId(sit.id);
    const { error } = await supabase
      .from("sits")
      .update({ max_applications: value, accepting_applications: true } as any)
      .eq("id", sit.id);
    setSavingId(null);
    if (error) {
      toast({ variant: "destructive", title: t("application_cap.owner_raise_error") });
      return;
    }
    toast({ title: t("application_cap.owner_raise_success", { max: value }) });
    onUpdated?.();
  };

  return (
    <section className="px-4 sm:px-5 md:px-8 space-y-4">
      {capped.map((sit) => {
        const steps = nextCapSteps(sit.max_applications);
        return (
          <div
            key={sit.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_24px_rgba(29,27,22,0.05)]"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-primary/80">
              {t("application_cap.owner_eyebrow")}
            </p>
            <h3 className="mt-1.5 font-heading text-lg font-semibold text-foreground">
              {t("application_cap.owner_title", { max: sit.max_applications })}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("application_cap.owner_description")}
            </p>
            {sit.title && (
              <p className="mt-2 text-xs text-muted-foreground truncate">{sit.title}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button asChild className="rounded-full h-10 px-5">
                <Link to={`/sits/${sit.id}`}>{t("application_cap.owner_review_cta")}</Link>
              </Button>
            </div>

            {steps.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-foreground">
                  {t("application_cap.owner_raise_label")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {steps.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      className="rounded-full h-9 px-4 text-sm"
                      disabled={savingId === sit.id}
                      onClick={() => raise(sit, value)}
                    >
                      {t("application_cap.owner_raise_option", { value })}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default ApplicationCapSection;
