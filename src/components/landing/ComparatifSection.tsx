import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ComparatifSection() {
  const { t } = useTranslation();

  return (
    <div id="comparatif" className="pt-10 scroll-mt-24">
      <div className="lp-wide">
        <Accordion type="single" collapsible>
          <AccordionItem value="comparison" className="rounded-lg border border-border bg-card px-5">
            <AccordionTrigger className="text-left font-heading text-xl font-semibold text-foreground hover:no-underline md:text-2xl">
              {t("landing.compare.title")}
            </AccordionTrigger>
            <AccordionContent forceMount className="data-[state=closed]:hidden">
              <p className="mb-6 max-w-2xl font-body text-sm leading-relaxed text-foreground/70 md:text-base">{t("landing.compare.intro")}</p>
              <div className="overflow-x-auto rounded-lg border border-border">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
