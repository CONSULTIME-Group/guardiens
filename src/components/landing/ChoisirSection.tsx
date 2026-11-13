import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { HOME_BTN_PRIMARY } from "@/components/landing/homeCta";
import { RevealSection } from "@/components/ui/RevealSection";
import { useTranslation } from "@/i18n/react";
import AffinityDemoCard from "@/components/landing/AffinityDemoCard";
import familyGardes from "@/assets/aquarelles/univers-gardes-320.webp";
import arriveeBanc from "@/assets/aquarelles/arrivee-banc-360.webp";
import arriveeRythme from "@/assets/aquarelles/arrivee-rythme-360.webp";

/**
 * Lot HOME8 (13 novembre 2026) : « Vous choisissez ». Demande de Jérémie :
 * la home parlait de confiance sans dire assez que chacun décrit ce qu'il
 * veut (son gardien idéal, sa maison idéale, son moment) et que le score
 * d'affinité en découle. La section réunit les trois choix puis la carte de
 * démonstration du score (AffinityDemoCard, ancre #matching), restée sans
 * écran depuis le 06/09/2026.
 */
const CHOICES = [
  { key: "sitter", image: arriveeRythme, w: 360, h: 395 },
  { key: "home", image: familyGardes, w: 320, h: 318 },
  { key: "moment", image: arriveeBanc, w: 360, h: 373 },
] as const;

export function ChoisirSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  return (
    <section id="vous-choisissez" className="bg-muted/30 py-[52px] md:py-20 scroll-mt-24" aria-labelledby="choisir-heading">
      <div className="lp-wide">
        <RevealSection className="mx-auto mb-8 max-w-3xl text-center md:mb-12">
          <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-primary md:text-[13px]">{t("landing.choose.eyebrow")}</p>
          <h2 id="choisir-heading" className="mt-4 font-heading text-3xl font-semibold leading-tight text-foreground text-balance md:text-5xl">
            {t("landing.choose.title")}
          </h2>
          <p className="mt-4 font-body text-base leading-relaxed text-muted-foreground md:text-lg">{t("landing.choose.lede")}</p>
        </RevealSection>

        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {CHOICES.map((choice, index) => (
            <RevealSection key={choice.key} delay={0.1 + index * 0.1}>
              <article className="flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 md:flex-col md:p-7">
                <img src={choice.image} alt="" aria-hidden="true" width={choice.w} height={choice.h} loading="lazy" decoding="async" className="h-20 w-20 flex-none object-contain md:h-32 md:w-32" />
                <div>
                  <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t(`landing.choose.${choice.key}_who`)}</p>
                  <h3 className="mt-1 font-heading text-xl font-semibold text-foreground md:text-2xl">{t(`landing.choose.${choice.key}_title`)}</h3>
                  <p className="mt-2 font-body text-[15px] leading-relaxed text-muted-foreground">{t(`landing.choose.${choice.key}_text`)}</p>
                </div>
              </article>
            </RevealSection>
          ))}
        </div>

        <RevealSection delay={0.3}>
          <AffinityDemoCard />
        </RevealSection>

        {!isAuthenticated && (
          <div className="mt-8 flex justify-center">
            <Link
              to="/inscription"
              onClick={() => { void trackEvent("cta_signup_clicked", { metadata: { location: "vous-choisissez" } }); }}
              className={HOME_BTN_PRIMARY}
            >
              {t("landing.choose.cta")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
