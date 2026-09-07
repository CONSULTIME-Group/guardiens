import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { safeLocale } from "@/lib/lang";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

/**
 * Ligne compacte de l'inventaire, intégrée aux guides et villes.
 */
export default function InventoryStrip() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useInventaireCounts();
  const ref = useRef<HTMLDivElement>(null);
  useImpressionOnce(ref, "inventory_strip", () => undefined);

  const fmt = (n: number) =>
    new Intl.NumberFormat(safeLocale(i18n.language)).format(n).replace(/\u0020/g, "\u202F");

  const cards = [
    { key: "cities", value: data?.cities_total ?? 0, label: t("landing.inventory.cities_label") },
    { key: "breeds", value: data?.breeds_total ?? 0, label: t("landing.inventory.breeds_label") },
    { key: "places", value: data?.places_total ?? 0, label: t("landing.inventory.places_label") },
  ].filter((c) => c.value > 0);

  return (
    <div
      id="chiffres"
      ref={ref}
      className="scroll-mt-24 border-y border-border py-[22px]"
      aria-label={t("landing.inventory.title")}
    >
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-[22px]">
        <div>
          <p className="font-heading text-xl font-semibold text-foreground">{t("landing.inventory.title")}</p>
          <p className="mt-2 text-xs text-foreground/70">
            {t("landing.inventory.updated_on", {
              date: new Date().toLocaleDateString(safeLocale(i18n.language), { day: "numeric", month: "long", year: "numeric" }),
            })}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] sm:gap-[34px] lg:text-right">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} data-testid="inventory-skeleton" className="h-14 w-36 rounded bg-muted animate-pulse" />
              ))
            : cards.map(({ key, value, label }) => (
                <div
                  key={key}
                  data-testid={`inventory-card-${key}`}
                  className="min-w-0"
                >
                  <div className="font-heading text-2xl md:text-3xl font-bold text-foreground tabular-nums">
                    {fmt(value)}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-foreground/70">{label}</div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
