import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Lettrage décoratif dans les marges latérales de la fiche gardien.
 *
 * Deux conditions cumulatives, mesurées et jamais supposées :
 *  1. largeur de fenêtre au moins égale à MIN_VIEWPORT_WIDTH
 *  2. marge libre réelle de chaque côté du conteneur de contenu au moins
 *     égale à MIN_FREE_MARGIN, calculée à partir de la largeur mesurée du
 *     conteneur `[data-profile-content]`
 *
 * Rendu par portail dans `document.body` : un ancêtre porteur d'une
 * transformation rendrait `position: fixed` relatif à cet ancêtre, ce qui
 * faisait défiler le lettrage avec la page.
 */

const MIN_VIEWPORT_WIDTH = 1440;
const MIN_FREE_MARGIN = 150;
const SIDE_INSET = 16;

const measure = () => {
  if (typeof window === "undefined") return { visible: false, margin: 0 };
  const el = document.querySelector("[data-profile-content]") as HTMLElement | null;
  const containerWidth = el ? el.getBoundingClientRect().width : window.innerWidth;
  const margin = Math.max(0, (window.innerWidth - containerWidth) / 2);
  return {
    visible: window.innerWidth >= MIN_VIEWPORT_WIDTH && margin >= MIN_FREE_MARGIN,
    margin,
  };
};

const MarginLettering = () => {
  const [{ visible, margin }, setState] = useState({ visible: false, margin: 0 });
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const update = () => setState(measure());
    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    // Le conteneur de contenu est remonté à chaque changement d'onglet :
    // on observe aussi le corps du document pour rester juste après bascule.
    const ro = new ResizeObserver(update);
    const el = document.querySelector("[data-profile-content]");
    if (el) ro.observe(el);
    ro.observe(document.body);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  // Le lettrage reste confiné à la zone de contenu : il s'efface dès que le
  // pied de page entre dans la fenêtre.
  useEffect(() => {
    const footer = document.querySelector("footer.public-footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      (entries) => setFooterVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);


  if (!visible || footerVisible || typeof document === "undefined") return null;

  const bandWidth = Math.max(0, margin - SIDE_INSET * 2);
  const common: React.CSSProperties = {
    position: "fixed",
    top: "18vh",
    bottom: "18vh",
    width: `${bandWidth}px`,
    zIndex: 0,
    pointerEvents: "none",
    fontSize: "30px",
    maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
    WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
  };

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="font-heading flex flex-col items-center justify-around [writing-mode:vertical-rl] [transform:rotate(180deg)]"
        style={{ ...common, left: `${SIDE_INSET}px`, color: "rgba(154,106,68,0.4)" }}
      >
        <span>L'entraide</span>
        <span style={{ color: "rgba(44,109,80,0.4)" }}>La proximité</span>
        <span className="italic">La rencontre</span>
      </div>
      <div
        aria-hidden="true"
        className="font-heading flex items-center justify-center italic [writing-mode:vertical-rl]"
        style={{
          ...common,
          right: `${SIDE_INSET}px`,
          color: "rgba(44,109,80,0.4)",
          paddingTop: "30px",
        }}
      >
        Un service rendu, un service reçu
      </div>
    </>,
    document.body,
  );
};

export default MarginLettering;
