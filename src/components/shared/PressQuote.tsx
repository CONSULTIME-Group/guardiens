import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PressQuoteProps {
  quote?: string;
  source?: string;
  date?: string;
  logoPath?: string;
  eyebrow?: string;
  citeUrl?: string;
  className?: string;
}

const DEFAULT_QUOTE = "Un service contre un service, pour aussi favoriser le lien social.";
const DEFAULT_SOURCE = "Le Progrès";
const DEFAULT_DATE = "6 septembre 2026";
const DEFAULT_LOGO = "/presse/le-progres.png";
const DEFAULT_EYEBROW = "Dans la presse";

/**
 * Citation presse, traitée comme un témoignage éditorial.
 *
 * - Jamais en haut de page, jamais promotionnelle.
 * - Fallback texte propre si le logo est absent.
 * - Balisage sémantique blockquote + figcaption.
 * - Animation de fondu de 360 ms, désactivée sous prefers-reduced-motion.
 */
export function PressQuote({
  quote = DEFAULT_QUOTE,
  source = DEFAULT_SOURCE,
  date = DEFAULT_DATE,
  logoPath = DEFAULT_LOGO,
  eyebrow = DEFAULT_EYEBROW,
  citeUrl,
  className,
}: PressQuoteProps) {
  const [logoExists, setLogoExists] = useState(false);
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const t = window.setTimeout(() => setVisible(true), 50);
    return () => {
      window.clearTimeout(t);
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(logoPath, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setLogoExists(res.ok);
      })
      .catch(() => {
        if (!cancelled) setLogoExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logoPath]);

  return (
    <figure
      className={cn(
        "py-[52px] transition-opacity duration-[360ms] ease-out",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div
          className={cn(
            "bg-card border border-border rounded-2xl p-8 md:p-10",
            "shadow-sm"
          )}
        >
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

          <blockquote
            cite={citeUrl}
            className="border-0 m-0 p-0 bg-transparent"
          >
            <p
              className={cn(
                "font-heading italic text-foreground leading-snug",
                "text-xl md:text-2xl lg:text-[1.65rem]"
              )}
            >
              « {quote} »
            </p>
          </blockquote>

          <figcaption className="mt-6 flex items-center gap-3">
            {logoExists && (
              <img
                src={logoPath}
                alt={`Logo ${source}`}
                width={120}
                height={24}
                className="h-[18px] w-auto object-contain opacity-80"
                loading="lazy"
                decoding="async"
              />
            )}
            <span className="font-body text-xs md:text-[13px] text-muted-foreground">
              {source}, {date}
            </span>
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
