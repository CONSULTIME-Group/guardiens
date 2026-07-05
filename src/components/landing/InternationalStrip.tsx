import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plane, Globe } from "lucide-react";
import { useInternationalSitsCount } from "@/hooks/useInternationalSitsCount";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { trackEvent } from "@/lib/analytics";

/**
 * Vitrine international : ouverture réciproque France ↔ étranger.
 * Affichée même si le compteur est à 0 (message "bientôt disponible").
 */
export default function InternationalStrip() {
  const { t } = useTranslation();
  const { count, recent } = useInternationalSitsCount();
  const ref = useRef<HTMLDivElement>(null);
  useImpressionOnce(ref, "international_strip", () => {
    void trackEvent("international_strip_seen");
  });

  const cards = [
    {
      id: "owner_fr",
      Icon: Home,
      title: t("landing.international.card1.title"),
      cta: t("landing.international.card1.cta"),
      to: "/inscription?role=owner&intent=fr",
    },
    {
      id: "sitter_intl",
      Icon: Plane,
      title: t("landing.international.card2.title"),
      cta: t("landing.international.card2.cta"),
      to: "/annonces/international",
    },
    {
      id: "community",
      Icon: Globe,
      title: t("landing.international.card3.title"),
      cta: t("landing.international.card3.cta"),
      to: "/annonces/international?view=map",
    },
  ];

  const subtitle =
    count > 0
      ? t("landing.international.subtitle_active", { count })
      : t("landing.international.subtitle_soon");

  return (
    <section
      id="international"
      ref={ref}
      className="py-10 md:py-20 bg-background scroll-mt-24"
      aria-labelledby="international-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 id="international-heading" className="font-heading text-3xl md:text-5xl font-semibold text-foreground leading-tight">
            {t("landing.international.title")}
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map(({ id, Icon, title, cta, to }, idx) => {
            const showRecentInThirdCard = id === "community" && recent.length > 0;
            return (
              <div key={id} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3">
                <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                <div className="font-body text-base text-foreground">{title}</div>
                {showRecentInThirdCard && (
                  <ul className="text-xs text-foreground/60 space-y-1 mt-1">
                    {recent.slice(0, 3).map((s) => (
                      <li key={s.id}>
                        {[s.city, s.country].filter(Boolean).join(", ") || s.title || "—"}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-2">
                  <Link
                    to={to}
                    data-testid={`intl-card-${id}`}
                    onClick={() =>
                      void trackEvent("international_strip_card_clicked", { metadata: { card_id: id } })
                    }
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                  >
                    {cta} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
