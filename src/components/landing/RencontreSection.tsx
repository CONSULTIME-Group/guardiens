import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";

export function RencontreSection() {
  const { t } = useTranslation();

  return (
    <section id="rencontre" className="py-10 md:py-20 bg-accent/40 border-y border-accent scroll-mt-24">
      <div className="max-w-3xl mx-auto px-6">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary/70 font-body mb-6 block text-center">
            {t("landing.meeting.eyebrow")}
          </span>
          <h2 id="le-vrai-pretexte" className="font-heading text-2xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] text-foreground text-center mb-10 scroll-mt-24">
            {t("landing.meeting.title_a")}<br className="hidden md:inline" /> {t("landing.meeting.title_b")}
          </h2>

          <div className="border-l-4 border-primary pl-6 md:pl-8 max-w-2xl mx-auto">
            <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
              {t("landing.meeting.p1")}
            </p>
            <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
              {t("landing.meeting.p2")}
            </p>
            <p className="font-heading text-xl md:text-2xl italic text-foreground leading-snug">
              {t("landing.meeting.p3")}
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
