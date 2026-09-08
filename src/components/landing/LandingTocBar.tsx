import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sommaire de page (maillage interne). En mobile le contenu dépasse la
 * fenêtre (697 px de rail pour 375 px de large) : un fondu discret sur le
 * bord droit signale qu'il reste des ancres, et disparaît dès qu'on atteint
 * la fin. Un fondu symétrique apparaît à gauche une fois qu'on a défilé.
 * Le rail utilise scroll-snap pour s'arrêter proprement sur une ancre.
 */
export function LandingTocBar() {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(max <= 1 || el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const items = [
    { href: "#usages", label: t("landing.toc.care_aid") },
    { href: "#comment-ca-marche", label: t("landing.toc.how") },
    { href: "#confiance", label: t("landing.toc.trust") },
    { href: "#notre-histoire", label: t("landing.toc.story") },
    { href: "#faq", label: t("landing.toc.faq") },
  ];

  return (
    <nav
      aria-label={t("landing.toc.aria")}
      className="relative border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      {/* Indices de défilement, dans la teinte du fond, purement décoratifs. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 ${
          atStart ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${
          atEnd ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        ref={railRef}
        onScroll={measure}
        className="overflow-x-auto px-4 md:px-0 snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="mx-auto flex w-max items-center justify-center gap-1 py-2.5 md:w-auto">
          {items.map((item) => (
            <li key={item.href} className="shrink-0 snap-start">
              <a
                href={item.href}
                className="inline-flex items-center min-h-[44px] px-3 py-1.5 rounded-full text-[11px] tracking-[0.14em] uppercase font-body text-foreground/75 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default LandingTocBar;
