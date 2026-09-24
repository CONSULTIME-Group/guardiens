import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { RevealSection } from "@/components/ui/RevealSection";
import maison900 from "@/assets/landing/maison-seule-900.webp";
import maison450 from "@/assets/landing/maison-seule-450.webp";

export function FinalCtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div id="commencer" className="bg-muted/30 py-[52px] scroll-mt-24 md:py-20">
      <RevealSection className="lp-read text-center">
        {/* Chips "Programme Fondateur" retirés (signal de deadline implicite). */}
        {/* Maison peinte au-dessus du titre : le foyer confié. */}
        <img
          src={maison900}
          srcSet={`${maison450} 450w, ${maison900} 900w`}
          sizes="(max-width: 767px) 110px, 140px"
          alt="Illustration à la gouache d'une maison de village aux volets clairs, une fenêtre allumée et un buisson près de la porte."
          width={900}
          height={773}
          loading="lazy"
          decoding="async"
          className="mx-auto mb-5 md:mb-6 block w-[110px] md:w-[140px] h-auto opacity-85 [mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)]"
        />
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">À vous de commencer</p>
        <h2 className="mb-6 font-heading text-3xl font-semibold leading-tight text-foreground md:text-5xl">
          {t("landing.final.title")}
        </h2>
        <p className="mx-auto mb-10 max-w-lg font-body text-lg leading-relaxed text-muted-foreground">
          {t("landing.final.lede")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => {
              trackEvent("cta_proprio_clicked", { metadata: { location: "final_cta" } });
              navigate("/sits/create");
            }}
            className="rounded-full bg-primary px-10 py-4 font-body text-sm font-bold tracking-wide text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:brightness-95"
          >
            {t("landing.final.cta_owner")}
          </button>
          <button
            onClick={() => {
              trackEvent("cta_aid_clicked", { metadata: { location: "final_cta" } });
              navigate("/petites-missions/creer");
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-primary/40 bg-transparent px-6 py-2.5 font-body text-xs font-medium tracking-wide text-primary transition-all duration-200 hover:bg-primary/10"
          >
            {t("landing.final.cta_sitter")}
          </button>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          {t("landing.final.footnote")}
        </p>
      </RevealSection>
    </div>
  );
}
