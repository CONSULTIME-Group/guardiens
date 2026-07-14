import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Stethoscope, Scissors, Truck } from "lucide-react";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { trackEvent } from "@/lib/analytics";

/**
 * Vitrine annuaire pros animaliers. Masquée si aucun pro référencé.
 */
export default function ProsShowcase() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useInventaireCounts();
  const ref = useRef<HTMLDivElement>(null);
  useImpressionOnce(ref, "pros_showcase", () => {
    void trackEvent("pros_showcase_seen");
  });

  if (isLoading || !data?.pros_total) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat(i18n.language || "fr-FR").format(n).replace(/\u0020/g, "\u202F");

  const cards = [
    {
      id: "veterinaires",
      Icon: Stethoscope,
      title: t("landing.pros.card1.title"),
      cta: t("landing.pros.card1.cta"),
      to: "/pros/categorie/veterinaires",
    },
    {
      id: "toiletteurs",
      Icon: Scissors,
      title: t("landing.pros.card2.title"),
      cta: t("landing.pros.card2.cta"),
      to: "/pros/categorie/toiletteurs",
    },
    {
      id: "transporteurs",
      Icon: Truck,
      title: t("landing.pros.card3.title"),
      cta: t("landing.pros.card3.cta"),
      to: "/pros/categorie/transporteurs",
    },
  ];

  return (
    <section
      id="pros"
      ref={ref}
      className="py-10 md:py-20 bg-muted/30 scroll-mt-24"
      aria-labelledby="pros-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 text-center">
        <h2 id="pros-heading" className="font-heading text-3xl md:text-5xl font-semibold text-foreground leading-tight">
          {t("landing.pros.title")}
        </h2>
        <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("landing.pros.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-10">
          {cards.map(({ id, Icon, title, cta, to }) => (
            <div key={id} data-testid={`pros-card-${id}`} className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-3">
              <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
              <div className="font-body text-base text-foreground">{title}</div>
              <Link
                to={to}
                onClick={() =>
                  void trackEvent("pros_showcase_card_clicked", { metadata: { card_id: id } })
                }
                className="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                {cta} →
              </Link>
            </div>
          ))}
        </div>

        {(data.pros_verified ?? 0) > 0 && (
          <p className="mt-8 text-sm text-foreground/60 tabular-nums">
            {t("landing.pros.counter", {
              total: fmt(data.pros_total),
              verified: fmt(data.pros_verified ?? 0),
            })}
          </p>
        )}
        <div className="mt-6">
          <Link
            to="/pros"
            onClick={() =>
              void trackEvent("pros_showcase_card_clicked", { metadata: { card_id: "all" } })
            }
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-body text-sm"
          >
            {t("landing.pros.cta_all")}
          </Link>
        </div>
      </div>
    </section>
  );
}
