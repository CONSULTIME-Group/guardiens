import { forwardRef, useEffect, useRef, useState } from "react";
import authIllustration from "@/assets/auth-illustration.png";
import authIllustrationVideo from "@/assets/auth-illustration.mp4.asset.json";


interface AuthIllustrationPanelProps {
  title: string;
  /** Micro-slogan court (5–7 mots) affiché entre le titre et la description, en italique discret. */
  tagline?: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 *
 * L'image v20 est une gouache aux bords réellement peints (taches, drips,
 * papier nu autour) : elle se confond naturellement avec le fond crème par sa
 * propre matière, sans masque CSS ni voile dégradé. L'illustration reste
 * strictement contenue dans la moitié gauche (overflow-hidden + w-1/2).
 *
 * Lisibilité du texte : un petit cartouche papier translucide (bg-background)
 * avec flou léger est posé derrière le titre/description, dans la zone haute
 * où l'image laisse déjà respirer le crème. C'est sobre, ça n'écrase pas
 * l'illustration et ça garantit le contraste WCAG.
 *
 * Exposé via forwardRef pour être compatible avec les wrappers parents
 * (Helmet, HOC, animations) qui peuvent transmettre un ref sans warning.
 */
export const AuthIllustrationPanel = forwardRef<HTMLDivElement, AuthIllustrationPanelProps>(
  ({ title, tagline, description, footerSlot }, ref) => {
    // Micro-animation : cinemagraph par-dessus l'image fixe.
    // - Désactivée si prefers-reduced-motion (accessibilité)
    // - Désactivée si la vidéo échoue à charger (fallback transparent → image visible)
    // - L'image PNG reste TOUJOURS rendue dessous comme fallback / poster initial,
    //   garantissant qu'on voit la même chose que le screenshot statique pendant le chargement.
    // Boucle infinie sans saut visible : deux vidéos identiques jouent en parallèle,
    // décalées d'une demi-durée. À tout moment, au moins l'une des deux est loin
    // de son bord (donc loin du "saut" du loop). On crossfade entre les deux en
    // gardant TOUJOURS la somme des opacités = 1 (vrai crossfade additif), pour
    // qu'aucune image fixe sous-jacente ne transparaisse pendant la transition.
    const videoARef = useRef<HTMLVideoElement>(null);
    const videoBRef = useRef<HTMLVideoElement>(null);
    const [animate, setAnimate] = useState(false);
    // Opacité de A. B = 1 - aOpacity. Donc somme constante = 1.
    const [aOpacity, setAOpacity] = useState(1);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setAnimate(!mq.matches);
      const onChange = (e: MediaQueryListEvent) => setAnimate(!e.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
      if (!animate) return;
      const a = videoARef.current;
      const b = videoBRef.current;
      if (!a || !b) return;

      let raf = 0;
      // Largeur du crossfade autour de chaque bord (sec). Plus c'est long,
      // plus la transition est invisible mais plus on voit "deux scènes en même temps".
      const FADE = 0.9;

      const init = () => {
        const dur = a.duration;
        if (!dur || !isFinite(dur) || dur < 2 * FADE + 0.1) {
          raf = requestAnimationFrame(init);
          return;
        }
        const half = dur / 2;
        // B démarre pile au milieu de A → quand A est près d'un bord,
        // B est au centre de son propre clip (zone "safe", aucune coupure).
        b.currentTime = half;
        b.play().catch(() => {});

        // Resync périodique pour éviter la dérive des deux vidéos sur le long terme.
        const resync = () => {
          const d = a.duration;
          if (!d || !isFinite(d)) return;
          const expected = (a.currentTime + d / 2) % d;
          const drift = Math.abs(b.currentTime - expected);
          // Si la dérive dépasse 80ms, on resync silencieusement (toujours pendant
          // que A est dominant, jamais pendant que B est visible).
          if (drift > 0.08 && a.currentTime > FADE && a.currentTime < d - FADE) {
            b.currentTime = expected;
          }
        };
        const resyncId = window.setInterval(resync, 1500);

        const tick = () => {
          const d = a.duration;
          if (d && isFinite(d)) {
            const t = a.currentTime;
            // Distance de A à son bord le plus proche (0 ou d).
            const distA = Math.min(t, d - t);
            // Quand distA >= FADE → A pleinement visible (opa=1).
            // Quand distA = 0 → A invisible (opa=0), B prend tout (opa=1).
            // Courbe smoothstep pour un fondu doux et imperceptible.
            const x = Math.min(1, Math.max(0, distA / FADE));
            const smooth = x * x * (3 - 2 * x);
            setAOpacity(smooth);
          }
          raf = requestAnimationFrame(tick);
        };
        tick();

        return () => {
          window.clearInterval(resyncId);
        };
      };

      let cleanup: (() => void) | undefined;
      if (a.readyState >= 1) {
        cleanup = init() as undefined | (() => void);
      } else {
        const onMeta = () => {
          cleanup = init() as undefined | (() => void);
        };
        a.addEventListener("loadedmetadata", onMeta, { once: true });
      }

      return () => {
        cancelAnimationFrame(raf);
        cleanup?.();
      };
    }, [animate]);

    return (
      <div ref={ref} className="hidden lg:block lg:w-1/2 relative bg-background">
        {/*
          Calque image + voile : strictement décoratif, en arrière-plan (z-0),
          non-interactif (pointer-events-none sur le wrapper ET le voile).
          Toute la moitié gauche est non-cliquable par design — aucune action
          utilisateur ne vit ici, le contenu interactif est dans la moitié droite.
        */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* Couche 1 : image fixe, toujours présente (poster + fallback) */}
          <img
            src={authIllustration}
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
            style={{
              // object-contain garantit qu'AUCUNE scène n'est rognée :
              // chat lecteur (haut-droit), chèvre+brouette (bas-droit),
              // potager (bas-gauche), promeneur emmêlé (centre) restent tous visibles
              // quelle que soit la hauteur/largeur du panneau (desktop large, écran 4:3, etc.).
              //
              // UNIFICATION DU FOND : le papier de la gouache a été pré-aligné
              // au pixel près sur bg-background (hsl 40 33% 97% ≈ #FAF8F5),
              // donc les bandes laissées libres par object-contain (haut, gauche,
              // droite) se confondent visuellement avec la peinture — aucune
              // démarcation visible, même en plein écran 4K.
              objectPosition: "50% 100%",
              // Léger fade uniquement sur le bord droit pour fondre vers le formulaire.
              WebkitMaskImage:
                "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
            }}
            draggable={false}
            loading="eager"
            decoding="async"
            width={1024}
            height={1366}
          />

          {/*
            Couche 2 : cinemagraph mp4 superposé exactement comme l'image
            (mêmes dimensions, même object-fit, même position, même masque).
            Animation très subtile : hirondelles, canard, fontaine, drapeaux.
            Ne se monte que si l'utilisateur n'a pas demandé reduced-motion.
          */}
          {animate && (
            <>
              <video
                ref={videoARef}
                src={authIllustrationVideo.url}
                poster={authIllustration}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                tabIndex={-1}
                onError={() => setAnimate(false)}
                className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
                style={{
                  opacity: aOpacity,
                  objectPosition: "50% 100%",
                  WebkitMaskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                }}
              />
              <video
                ref={videoBRef}
                src={authIllustrationVideo.url}
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                tabIndex={-1}
                className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
                style={{
                  opacity: 1 - aOpacity,
                  objectPosition: "50% 100%",
                  WebkitMaskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                }}
              />
            </>
          )}
        </div>

        {/*
          Contenu (titre + cartouche). z-10 garantit qu'il passe au-dessus du
          voile décoratif quel que soit l'ordre du DOM.
        */}
        <div className="relative z-10 h-full flex flex-col justify-start p-12">
          <div className="max-w-md rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm px-6 py-5">
            <h2 className="font-heading text-3xl font-semibold text-foreground mb-2 leading-tight">{title}</h2>
            {tagline && (
              <p className="font-heading italic text-primary/90 text-sm tracking-wide mb-3">
                {tagline}
              </p>
            )}
            <p className="text-foreground leading-relaxed">{description}</p>
          </div>
          {footerSlot && <div className="mt-4 max-w-md">{footerSlot}</div>}
        </div>
      </div>
    );
  }
);

AuthIllustrationPanel.displayName = "AuthIllustrationPanel";
