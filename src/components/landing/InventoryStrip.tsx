import { useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Dog, Trees, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { trackEvent } from "@/lib/analytics";

/**
 * Bandeau chiffres du réseau. Preuve produit sourcée depuis
 * `get_inventaire_counts` (villes, races, lieux dog-friendly, pros).
 * Cards masquées si valeur nulle. Impression trackée une fois par session.
 */
export default function InventoryStrip() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useInventaireCounts();
  const ref = useRef<HTMLDivElement>(null);
  useImpressionOnce(ref, "inventory_strip", () => {
    void trackEvent("inventory_strip_seen");
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat(i18n.language || "fr-FR").format(n).replace(/\u0020/g, "\u202F");

  const cards = [
    { key: "cities", value: data?.cities_total ?? 0, Icon: MapPin, label: t("landing.inventory.cities_label") },
    { key: "breeds", value: data?.breeds_total ?? 0, Icon: Dog, label: t("landing.inventory.breeds_label") },
    { key: "places", value: data?.places_total ?? 0, Icon: Trees, label: t("landing.inventory.places_label") },
    { key: "pros", value: data?.pros_total ?? 0, Icon: ShieldCheck, label: t("landing.inventory.pros_label") },
  ].filter((c) => c.value > 0);

  return (
    <section
      id="chiffres"
      ref={ref}
      className="py-10 md:py-20 bg-background scroll-mt-24"
      aria-labelledby="inventory-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 text-center">
        <h2 id="inventory-heading" className="font-heading text-3xl md:text-5xl font-semibold text-foreground">
          {t("landing.inventory.title")}
        </h2>
        <p className="mt-3 italic text-muted-foreground">{t("landing.inventory.subtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mt-10">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} data-testid="inventory-skeleton" className="h-32 rounded-2xl bg-muted animate-pulse" />
              ))
            : cards.map(({ key, value, Icon, label }) => (
                <div
                  key={key}
                  data-testid={`inventory-card-${key}`}
                  className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-2"
                >
                  <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  <div className="font-heading text-3xl md:text-4xl font-bold text-foreground tabular-nums">
                    {fmt(value)}
                  </div>
                  <div className="text-sm text-foreground/70">{label}</div>
                </div>
              ))}
        </div>

        <div className="mt-8">
          <Link
            to="/observatoire-garde-animaux#datapoints"
            onClick={() =>
              void trackEvent("inventory_strip_cta_clicked", {
                metadata: { destination: "/observatoire-garde-animaux#datapoints" },
              })
            }
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-body text-sm"
          >
            {t("landing.inventory.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
