import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, MinusCircle } from "lucide-react";
import { useAffinityDemo } from "@/hooks/useAffinityDemo";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { trackEvent } from "@/lib/analytics";

/**
 * Vitrine du score d'affinité 7 critères. Preuve produit : matching pondéré,
 * transparent, visible sur chaque candidature.
 */
export default function AffinityScoreShowcase() {
  const { t } = useTranslation();
  const demo = useAffinityDemo();
  const ref = useRef<HTMLDivElement>(null);
  useImpressionOnce(ref, "affinity_showcase", () => {
    void trackEvent("affinity_showcase_seen");
  });

  const bullets = [
    t("landing.affinity.bullet1"),
    t("landing.affinity.bullet2"),
    t("landing.affinity.bullet3"),
  ];

  return (
    <section
      id="matching"
      ref={ref}
      className="py-10 md:py-20 bg-muted/30 scroll-mt-24"
      aria-labelledby="affinity-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h2 id="affinity-heading" className="font-heading text-3xl md:text-5xl font-semibold text-foreground leading-tight">
              {t("landing.affinity.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.affinity.subtitle")}</p>
            <ul className="mt-6 space-y-3">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-foreground/85">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                to="/a-propos#affinite"
                onClick={() =>
                  void trackEvent("affinity_showcase_cta_clicked", {
                    metadata: { destination: "/a-propos#affinite" },
                  })
                }
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-body text-sm"
              >
                {t("landing.affinity.cta")}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="font-body text-xs uppercase tracking-widest text-foreground/55">
                {t("landing.affinity.demo_label")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 font-body text-sm font-semibold tabular-nums">
                {demo.score}&nbsp;% · {demo.matchedCount}/{demo.totalCount}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-6 text-sm text-foreground/70">
              <span className="font-semibold text-foreground">{demo.ownerName}</span>
              <span aria-hidden="true">↔</span>
              <span className="font-semibold text-foreground">{demo.sitterName}</span>
            </div>
            <ul className="space-y-2.5">
              {demo.breakdown.map((b) => (
                <li key={b.criterion} className="flex items-start gap-3 text-sm">
                  {b.matched ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                  ) : (
                    <MinusCircle className="w-4 h-4 mt-0.5 text-foreground/30 shrink-0" aria-hidden="true" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={b.matched ? "text-foreground" : "text-foreground/55"}>{b.criterion}</span>
                      <span className="text-xs text-foreground/45 tabular-nums shrink-0">{b.weight}&nbsp;%</span>
                    </div>
                    <div className="text-xs text-foreground/55">{b.note}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
