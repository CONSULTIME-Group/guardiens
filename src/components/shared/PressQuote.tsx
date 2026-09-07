import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LE_PROGRES_LOGO } from "@/assets/pressLogos";

interface PressQuoteProps {
  quote?: string;
  source?: string;
  date?: string;
  eyebrow?: string;
  citeUrl?: string;
  className?: string;
}

const DEFAULT_QUOTE = "« Un service contre un service, pour aussi favoriser le lien social. »";
const DEFAULT_SOURCE = "Le Progrès";
const DEFAULT_DATE = "6 septembre 2026";
const DEFAULT_EYEBROW = "Dans la presse";
const DEFAULT_CITE_URL =
  "https://c.leprogres.fr/economie/2026/09/06/apres-avoir-garde-234-animaux-et-37-maisons-ils-lancent-leur-plateforme-de-home-sitting";

/**
 * Date jusqu'à laquelle la mention presse est visible dans le hero de la
 * page d'accueil (ligne discrète « Vu dans »). Passée cette date, seule
 * cette carte sobre subsiste, affichée en permanence après UsagesSection.
 */
export const PRESS_HIGHLIGHT_UNTIL = new Date("2026-10-06T00:00:00");

/** URL de l'article, partagée avec la ligne « Vu dans » du hero. */
export const PRESS_ARTICLE_URL = DEFAULT_CITE_URL;

/**
 * Citation presse, traitée comme un témoignage éditorial.
 *
 * - Variante unique et discrète : eyebrow, citation Playfair, logo 18 px
 *   en signature à côté de l'attribution.
 * - Le logo source est un lettrage blanc détouré : `invert(1)` le rend
 *   sombre pour cette carte claire.
 * - Fallback texte propre si le logo ne se charge pas (onError).
 * - Balisage sémantique figure + blockquote + figcaption.
 * - Animation de fondu de 360 ms, désactivée sous prefers-reduced-motion.
 */
export function PressQuote({
  quote = DEFAULT_QUOTE,
  source = DEFAULT_SOURCE,
  date = DEFAULT_DATE,
  eyebrow = DEFAULT_EYEBROW,
  citeUrl = DEFAULT_CITE_URL,
  className,
}: PressQuoteProps) {
  const [logoError, setLogoError] = useState(false);
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);
  const logoVisible = !logoError;

  useEffect(() => {
    mounted.current = true;
    const t = window.setTimeout(() => setVisible(true), 50);
    return () => {
      window.clearTimeout(t);
      mounted.current = false;
    };
  }, []);

  const signatureLogo = logoVisible && (
    <img
      src={LE_PROGRES_LOGO}
      alt={`Logo ${source}`}
      width={300}
      height={40}
      className="h-[18px] w-auto object-contain"
      style={{ filter: "invert(1)", opacity: 0.72 }}
      loading="lazy"
      decoding="async"
      onError={() => setLogoError(true)}
    />
  );

  const attributionText = `${source}, ${date}`;

  return (
    <figure
      data-testid="press-quote"
      className={cn(
        "py-[52px] transition-opacity duration-[360ms] ease-out not-prose",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm">
          <p
            className={cn(
              "flex items-center gap-2 mb-6",
              "font-body text-[11px] uppercase tracking-[0.16em] text-terra"
            )}
          >
            <span
              className="inline-block w-5 h-[2px] bg-terra"
              aria-hidden="true"
            />
            {eyebrow}
          </p>

          <blockquote cite={citeUrl} className="border-0 m-0 p-0 bg-transparent">
            <p
              className={cn(
                "font-heading italic text-foreground leading-snug",
                "text-xl md:text-2xl lg:text-[1.65rem]"
              )}
            >
              {quote}
            </p>
          </blockquote>

          <figcaption className="mt-6 flex items-center justify-center">
            {citeUrl ? (
              <a
                href={citeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 font-body text-xs md:text-[13px] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                {signatureLogo}
                <span>{attributionText}</span>
              </a>
            ) : (
              <span className="inline-flex items-center justify-center gap-3 font-body text-xs md:text-[13px] text-muted-foreground">
                {signatureLogo}
                <span>{attributionText}</span>
              </span>
            )}
          </figcaption>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .duration-\\[360ms\\] {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </figure>
  );
}

export default PressQuote;
