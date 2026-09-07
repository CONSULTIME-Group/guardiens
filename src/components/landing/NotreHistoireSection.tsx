import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import cle720 from "@/assets/landing/cle-ancienne-720.webp";
import cle360 from "@/assets/landing/cle-ancienne-360.webp";
import notreHistoirePanoramaAvif from "@/assets/story-photo-1104.avif";
import notreHistoirePanorama from "@/assets/story-photo.webp";
import notreHistoireSmallAvif from "@/assets/story-photo-368.avif";
import notreHistoireSmallWebp from "@/assets/story-photo-368.webp";
import notreHistoireMobileAvif from "@/assets/story-photo-736.avif";
import notreHistoireMobileWebp from "@/assets/story-photo-736.webp";


export function NotreHistoireSection() {
  const { t } = useTranslation();

  return (
    <section id="notre-histoire" className="bg-muted/30 scroll-mt-24">
      <div className="lp-read py-[52px] md:py-20">
        <RevealSection>
          {/* Clé sortie du flux du titre : bloc autonome aligné à gauche,
              sur la même verticale que l'eyebrow et le h2, sans influence
              sur leur ligne de base. */}
          <img
            src={cle720}
            srcSet={`${cle360} 360w, ${cle720} 720w`}
            sizes="(max-width: 767px) 96px, 128px"
            alt="Illustration à la gouache d'une clé ancienne en bronze patiné, posée légèrement de biais."
            width={720}
            height={580}
            loading="lazy"
            decoding="async"
            className="mb-[22px] block w-24 md:w-32 h-auto"
          />
          <span className="text-xs tracking-widest uppercase text-primary font-body mb-3 block">
            {t("landing.story.eyebrow")}
          </span>
          <h2 id="commence-avec-un-visa" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground scroll-mt-24 mb-8">
            {t("landing.story.title")}
          </h2>
        </RevealSection>

        <RevealSection delay={0.1}>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.p1")}
          </p>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.quote_lead")}
          </p>
          <div className="border-l-4 border-primary pl-5 my-6">
            <p className="text-xl md:text-2xl font-heading font-semibold italic text-foreground leading-snug">
              {t("landing.story.quote")}
            </p>
          </div>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.p2")}
          </p>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.p3")}
          </p>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.p4")}
          </p>
          <p className="text-base md:text-lg font-body leading-relaxed text-foreground/85 mb-5">
            {t("landing.story.p5")}
          </p>
          <span className="text-sm font-body italic text-foreground/70 mt-6 block">
            {t("landing.story.signature")}
          </span>
        </RevealSection>

        <div className="w-full mt-10 rounded-2xl overflow-hidden">
          <picture>
            <source media="(max-width: 399px)" type="image/avif" srcSet={notreHistoireSmallAvif} />
            <source media="(max-width: 399px)" type="image/webp" srcSet={notreHistoireSmallWebp} />
            <source media="(max-width: 767px)" type="image/avif" srcSet={notreHistoireMobileAvif} />
            <source media="(max-width: 767px)" type="image/webp" srcSet={notreHistoireMobileWebp} />
            <source type="image/avif" srcSet={notreHistoirePanoramaAvif} />
            <img
              src={notreHistoirePanorama}
              alt="Photographie panoramique d'une maison de campagne aux volets bleus, illustrant l'esprit du house-sitting Guardiens : on confie ses clés, on est invité dans une vie."
              className="w-full h-48 md:h-64 object-cover object-center"
              loading="lazy"
              width={1104}
              height={735}
              decoding="async"
            />
          </picture>
        </div>

      </div>
    </section>
  );
}
