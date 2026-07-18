import { useTranslation } from "react-i18next";

export function ComparatifSection() {
  const { t } = useTranslation();

  return (
    <section id="comparatif" className="py-10 md:py-16 bg-accent/30 border-b border-border/40 scroll-mt-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-heading text-2xl md:text-4xl font-semibold text-foreground mb-3 scroll-mt-24">
          {t("landing.compare.title")}
        </h2>
        <p className="font-body text-sm md:text-base text-foreground/70 leading-relaxed mb-6 max-w-2xl">
          {t("landing.compare.intro")}
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm font-body min-w-[640px]">
            <caption className="sr-only">{t("landing.compare.caption")}</caption>
            <thead className="bg-muted/60 text-foreground">
              <tr>
                <th scope="col" className="text-left px-4 py-3 font-semibold">{t("landing.compare.columns.solution")}</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">{t("landing.compare.columns.pet_home")}</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">{t("landing.compare.columns.house_lived")}</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">{t("landing.compare.columns.cost")}</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">{t("landing.compare.columns.human")}</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              <tr className="border-t border-border">
                <th scope="row" className="text-left px-4 py-3 font-semibold text-foreground">{t("landing.compare.rows.guardiens.label")}</th>
                <td className="px-4 py-3">{t("landing.compare.rows.guardiens.pet_home")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.guardiens.house_lived")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.guardiens.cost")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.guardiens.human")}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="text-left px-4 py-3 font-semibold text-foreground">{t("landing.compare.rows.pension.label")}</th>
                <td className="px-4 py-3">{t("landing.compare.rows.pension.pet_home")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.pension.house_lived")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.pension.cost")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.pension.human")}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="text-left px-4 py-3 font-semibold text-foreground">{t("landing.compare.rows.petsitter.label")}</th>
                <td className="px-4 py-3">{t("landing.compare.rows.petsitter.pet_home")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.petsitter.house_lived")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.petsitter.cost")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.petsitter.human")}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="text-left px-4 py-3 font-semibold text-foreground">{t("landing.compare.rows.relative.label")}</th>
                <td className="px-4 py-3">{t("landing.compare.rows.relative.pet_home")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.relative.house_lived")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.relative.cost")}</td>
                <td className="px-4 py-3">{t("landing.compare.rows.relative.human")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
