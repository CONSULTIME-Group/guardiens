import { Link } from "react-router-dom";
import { RevealSection } from "@/components/ui/RevealSection";
import { useTranslation } from "@/i18n/react";
import { trackEvent } from "@/lib/analytics";
import elisa from "@/assets/auteur-elisa-224.webp";
import jeremie from "@/assets/auteur-jeremie-224.webp";

/**
 * Lot HOME8 (13 novembre 2026) : version courte du manifeste sur la home.
 * Décision de Jérémie : la phrase forte, les quatre lignes de fin, les deux
 * portraits et un lien vers l'histoire complète (/a-propos). Les phrases
 * viennent mot pour mot du manifeste figé (skill guardiens,
 * editorial/manifeste.md) : toute retouche passe par Jérémie.
 */
const CLOSING = ["l1", "l2", "l3", "l4"] as const;

export function ManifesteSection() {
  const { t } = useTranslation();
  return (
    <section id="notre-histoire" className="bg-terra-soft/40 py-[52px] scroll-mt-24 md:py-24" aria-labelledby="manifeste-heading">
      <div className="lp-wide">
        <RevealSection className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <img src={elisa} alt={t("landing.manifesto.alt_elisa")} width={224} height={224} loading="lazy" decoding="async" className="h-20 w-20 rounded-full border-4 border-background object-cover md:h-28 md:w-28" />
            <img src={jeremie} alt={t("landing.manifesto.alt_jeremie")} width={224} height={224} loading="lazy" decoding="async" className="-ml-4 h-20 w-20 rounded-full border-4 border-background object-cover md:h-28 md:w-28" />
          </div>
          <p className="mt-6 font-body text-base text-muted-foreground md:text-lg">{t("landing.manifesto.lead")}</p>
          <h2 id="manifeste-heading" className="mt-3 font-heading text-2xl font-semibold leading-snug text-foreground md:text-5xl">
            <span className="block">{t("landing.manifesto.title_1")}</span>{" "}
            <span className="block">{t("landing.manifesto.title_2")}</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl font-heading text-[17px] leading-relaxed text-foreground md:text-2xl">
            {CLOSING.map((key) => (
              <span key={key} className="block">{t(`landing.manifesto.${key}`)}{" "}</span>
            ))}
          </p>
          <p className="mt-6 font-body text-base font-semibold text-foreground">{t("landing.manifesto.signature")}</p>
          <Link
            to="/a-propos"
            onClick={() => { void trackEvent("home_manifesto_clicked", { metadata: { location: "home" } }); }}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/25 bg-background px-7 py-3 font-body text-sm font-semibold text-foreground transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("landing.manifesto.link")}
          </Link>
        </RevealSection>
      </div>
    </section>
  );
}
