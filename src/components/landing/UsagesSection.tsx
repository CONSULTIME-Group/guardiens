import { useTranslation } from "react-i18next";

export function UsagesSection() {
  const { t } = useTranslation();

  return (
    <section id="usages" className="py-[52px] md:py-20 bg-background scroll-mt-24">
      <div className="lp-read">
        <div id="definition" className="scroll-mt-24">
          <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
            {t("landing.what_is.title")}
          </h2>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <p
              key={n}
              className={`font-body text-base text-foreground/80 leading-relaxed${n < 6 ? " mb-[14px]" : ""}`}
            >
              {t(`landing.what_is.body_${n}`)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
