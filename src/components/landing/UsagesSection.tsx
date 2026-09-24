import { useTranslation } from "react-i18next";
import { ComparatifSection } from "@/components/landing/ComparatifSection";

export function UsagesSection() {
  const { t } = useTranslation();

  return (
    <section id="usages" className="py-[52px] md:py-20 bg-background scroll-mt-24">
      <div className="lp-read">
        <div id="definition" className="scroll-mt-24">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-primary">Le réseau</p>
          <h2 className="mb-6 text-center font-heading text-3xl font-semibold text-foreground md:text-5xl">
            {t("landing.what_is.title")}
          </h2>
          {[1, 3].map((n) => (
            <p
              key={n}
              className={`font-body text-base text-foreground/80 leading-relaxed${n < 7 ? " mb-[14px]" : ""}`}
            >
              {t(`landing.what_is.body_${n}`)}
            </p>
          ))}
        </div>
      </div>
      <ComparatifSection />
    </section>
  );
}
