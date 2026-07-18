import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { RevealSection } from "@/components/ui/RevealSection";
import { getSeasonalBannerKeys } from "@/lib/seasonalBanner";
import howtoStep1 from "@/assets/illustrations/howto-step-1-annonce.png";
import howtoStep2 from "@/assets/illustrations/howto-step-2-rencontre.png";
import howtoStep3 from "@/assets/illustrations/howto-step-3-depart.png";

export function HowItWorksSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const seasonal = getSeasonalBannerKeys();

  return (
    <section id="comment-ca-marche" className="py-10 md:py-20 bg-muted/30 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
            {t("landing.how.eyebrow")}
          </span>
          <h2 id="how-it-works" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-4 scroll-mt-24">
            {t("landing.how.title")}
          </h2>
          <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-8 md:mb-16">
            {t(seasonal.descriptionKey)}
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RevealSection delay={0.1}>
            <div className="text-center">
              <div className="relative mx-auto mb-4 w-56 h-56">
                <img
                  src={howtoStep1}
                  alt="Illustration gouache d'un cottage en pierre avec un chat à la fenêtre et un chien à la porte."
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                  1
                </div>
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step1_title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70">
                {t("landing.how.step1_text")}
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.2}>
            <div className="text-center">
              <div className="relative mx-auto mb-4 w-56 h-56">
                <img
                  src={howtoStep2}
                  alt="Illustration gouache de deux personnes qui se serrent la main autour d'une table, un chat et un chien à leurs côtés."
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                  2
                </div>
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step2_title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70">
                {t("landing.how.step2_text")}
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.3}>
            <div className="text-center">
              <div className="relative mx-auto mb-4 w-56 h-56">
                <img
                  src={howtoStep3}
                  alt="Illustration gouache d'une valise vintage prête au départ avec un chat et un chien à côté."
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                  3
                </div>
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step3_title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70">
                {t("landing.how.step3_text")}
              </p>
            </div>
          </RevealSection>
        </div>

        <RevealSection delay={0.4} className="text-center mt-14">
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => {
                trackEvent("cta_proprio_clicked", { metadata: { location: "how_it_works" } });
                navigate("/inscription?role=owner");
              }}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              {t("landing.how.cta_owner")}
            </button>
            <a
              href="#entraide"
              className="font-body text-sm font-medium tracking-wide rounded-full px-8 py-3.5 bg-transparent text-foreground border border-border hover:border-primary/40 hover:text-primary transition-all duration-200"
            >
              {t("landing.how.cta_secondary")}
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground font-body">
            {t("landing.how.footnote")}
          </p>
        </RevealSection>
      </div>
    </section>
  );
}
