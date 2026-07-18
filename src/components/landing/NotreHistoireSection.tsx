import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import notreHistoirePanorama from "@/assets/story-photo.webp";

export function NotreHistoireSection() {
  const { t } = useTranslation();

  return (
    <section id="notre-histoire" className="bg-muted/30 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-20">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
            {t("landing.story.eyebrow")}
          </span>
          <h2 id="commence-avec-un-visa" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground mb-12 scroll-mt-24">
            {t("landing.story.title")}
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
          <RevealSection delay={0.1}>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p1")}
            </p>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p2")}
            </p>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p3")}
            </p>
            <div className="border-l-4 border-primary pl-6 my-8">
              <p className="text-2xl md:text-3xl font-heading font-semibold italic text-foreground leading-snug">
                {t("landing.story.quote")}
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.2}>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p4")}
            </p>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p5")}
            </p>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p6")}
            </p>
            <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
              {t("landing.story.p7")}
            </p>
            <span className="text-sm font-body italic text-foreground/50 mt-10 block">
              {t("landing.story.signature")}
            </span>
          </RevealSection>
        </div>

        <div className="w-full mt-16 rounded-2xl overflow-hidden">
          <img
            src={notreHistoirePanorama}
            alt="Photographie panoramique d'une maison de campagne aux volets bleus, illustrant l'esprit du house-sitting Guardiens : on confie ses clés, on est invité dans une vie."
            className="w-full h-64 md:h-96 object-cover object-center"
            loading="lazy"
            width={1920}
            height={600}
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
