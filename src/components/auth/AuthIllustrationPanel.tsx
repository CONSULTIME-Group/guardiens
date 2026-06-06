import { forwardRef, useEffect, useRef, useState } from "react";
import authIllustration from "@/assets/auth-illustration.webp";
import authIllustrationMp4 from "@/assets/auth-illustration.mp4?url";
import authIllustrationWebm from "@/assets/auth-illustration.webm?url";
import { isCinemagraphInSync } from "@/assets/auth-illustration.manifest";

// Alias de compatibilité Fast Refresh/HMR : l'ancien JSX référençait
// `authIllustrationVideo` avant l'ajout du couple WebM/MP4.
const authIllustrationVideo = authIllustrationMp4;

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
    // de son bord. Le crossfade ping-pong garde TOUJOURS la somme des opacités = 1.
    //
    // Optimisations CPU/GPU :
    //  - Une seule sonde (vidéo cachée) supprimée → on s'appuie sur le crossfade
    //    pour absorber les imperfections de loop (le test analytique 50 cycles
    //    dans auth-illustration-loop-stability.test.ts garantit la stabilité).
    //  - Mise à jour des opacités via writes directs sur ref.style (pas de
    //    re-render React 60×/s).
    //  - Tick throttlé à 30Hz (un fade de 0.9s reste totalement fluide).
    //  - will-change: opacity + translateZ(0) → composition GPU dédiée, pas de
    //    repaint du reste de la page.
    //  - Pause auto quand l'onglet est caché (visibilitychange).
    const panelRef = useRef<HTMLDivElement>(null);
    const videoARef = useRef<HTMLVideoElement>(null);
    const videoBRef = useRef<HTMLVideoElement>(null);
    const [animate, setAnimate] = useState(false);
    const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
    // Mount des <video> différé : aucun octet vidéo ne part avant que la
    // page soit interactive, que le panneau soit réellement visible à l'écran,
    // ET que le navigateur ait du temps libre.
    const [mountVideos, setMountVideos] = useState(false);
    // Compatibilité Fast Refresh/HMR : des versions intermédiaires du JSX ont
    // référencé `aOpacity` / `bOpacity` au rendu. Les conserver explicitement
    // évite tout ReferenceError si Vite applique une mise à jour partielle.
    const aOpacity = 1;
    const bOpacity = 0;

    useEffect(() => {
      if (typeof window === "undefined") return;
      // Garde-fou de synchronisation : si la vidéo n'a pas été régénérée
      // après une mise à jour de la PNG, on reste sur l'image fixe pour
      // éviter d'afficher une scène obsolète. Réactivation automatique dès
      // que `videoVersion === pngVersion` dans le manifeste.
      if (!isCinemagraphInSync) {
        setAnimate(false);
        return;
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      // Respect Save-Data + connexions lentes (2g/slow-2g/3g) : poster-only.
      const conn = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      const slow =
        !!conn?.saveData ||
        (conn?.effectiveType ? /^(slow-2g|2g|3g)$/.test(conn.effectiveType) : false);
      setAnimate(!mq.matches && !slow);
      const onChange = (e: MediaQueryListEvent) => setAnimate(!e.matches && !slow);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    // Chargement réellement paresseux : sur desktop seulement, les vidéos ne se
    // montent qu'une fois le panneau illustration visible à l'écran.
    useEffect(() => {
      const node = panelRef.current;
      if (!node || typeof window === "undefined") return;
      if (!("IntersectionObserver" in window)) {
        setHasEnteredViewport(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            setHasEnteredViewport(true);
            observer.disconnect();
          }
        },
        {
          root: null,
          threshold: 0.2,
          rootMargin: "160px 0px",
        }
      );

      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    // Différer le mount des <video> jusqu'à idle (max 1.5s) pour ne pas
    // concurrencer les scripts critiques d'auth (form, OAuth, Supabase).
    useEffect(() => {
      if (!animate || !hasEnteredViewport || mountVideos) return;
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      let idleId: number | undefined;
      let timeoutId: number | undefined;
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(() => setMountVideos(true), { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(() => setMountVideos(true), 1500);
      }
      return () => {
        if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
    }, [animate, hasEnteredViewport, mountVideos]);

    // Préchargement léger : injecte des <link rel="preload" as="video"> en
    // priorité basse uniquement si le manifeste confirme que mp4/webm sont
    // synchronisés avec la PNG. Permet au navigateur de récupérer les
    // premiers octets pendant l'idle, sans bloquer les ressources critiques.
    // Aucun preload si reduced-motion, save-data, connexion lente, ou
    // cinemagraph désynchronisé, dans ces cas on reste sur la PNG.
    useEffect(() => {
      if (typeof document === "undefined") return;
      if (!isCinemagraphInSync || !animate || !hasEnteredViewport) return;

      const supportsWebm = document
        .createElement("video")
        .canPlayType('video/webm; codecs="vp9"');
      const href = supportsWebm ? authIllustrationWebm : authIllustrationMp4;
      const type = supportsWebm ? "video/webm" : "video/mp4";

      const existing = document.head.querySelector(
        `link[rel="preload"][href="${href}"]`
      );
      if (existing) return;

      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = href;
      link.type = type;
      // Priorité basse : ne concurrence pas le bundle JS / CSS critique.
      (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "low";
      document.head.appendChild(link);

      return () => {
        link.parentNode?.removeChild(link);
      };
    }, [animate, hasEnteredViewport]);

    useEffect(() => {
      if (!animate || !mountVideos) return;
      const a = videoARef.current;
      const b = videoBRef.current;
      if (!a || !b) return;

      // Garde-fou poster-only : si la vidéo n'atteint pas `canplay` dans les 4s
      // (codec non supporté, réseau coupé, decode KO sans émettre d'`error`,
      // tous les <source> épuisés…), on bascule sur l'image fixe. La PNG sous
      // les deux vidéos reste TOUJOURS visible, donc l'utilisateur ne voit
      // jamais d'écran vide, au pire l'illustration statique.
      const fallbackTimer = window.setTimeout(() => {
        if (a.readyState < 3 /* HAVE_FUTURE_DATA */) {
          setAnimate(false);
        }
      }, 4000);
      const onCanPlay = () => window.clearTimeout(fallbackTimer);
      a.addEventListener("canplay", onCanPlay, { once: true });

      // Si tous les <source> ont été essayés sans succès, video.networkState
      // vaut NETWORK_NO_SOURCE (3). Vérifié au prochain tick (laisse au
      // navigateur le temps de tenter chaque source).
      const checkNoSource = () => {
        if (a.networkState === 3 || b.networkState === 3) setAnimate(false);
      };
      const noSourceTimer = window.setTimeout(checkNoSource, 1500);

      let raf = 0;
      let lastTickAt = 0;
      const TICK_INTERVAL = 1000 / 30; // 30Hz : largement assez pour un fade de 1.2s
      const FADE = 1.2; // élargi : +33% de tolérance aux jitters réseau

      const init = () => {
        const dur = a.duration;
        if (!dur || !isFinite(dur) || dur < 2 * FADE + 0.1) {
          raf = requestAnimationFrame(init);
          return;
        }
        b.currentTime = dur / 2;
        b.play().catch(() => {});

        const resync = () => {
          const d = a.duration;
          if (!d || !isFinite(d)) return;
          const expected = (a.currentTime + d / 2) % d;
          const drift = Math.abs(b.currentTime - expected);
          if (drift > 0.08 && a.currentTime > FADE && a.currentTime < d - FADE) {
            b.currentTime = expected;
          }
        };
        const resyncId = window.setInterval(resync, 1500);

        // Robustesse aux variations de débit : on suit l'état "ready" de
        // chaque vidéo. Si l'une stall (waiting/seeking, readyState < 3)
        // pendant qu'on essaie de fader VERS elle, on gèle la transition
        // sur la vidéo encore prête → aucun calque transparent visible.
        const tick = (now: number) => {
          if (now - lastTickAt >= TICK_INTERVAL) {
            lastTickAt = now;
            const d = a.duration;
            if (d && isFinite(d)) {
              const t = a.currentTime;
              const distA = Math.min(t, d - t);
              const x = Math.min(1, Math.max(0, distA / FADE));
              // smoothstep cubique
              let smoothA = x * x * (3 - 2 * x);
              let smoothB = 1 - smoothA;

              const aReady = a.readyState >= 3 && !a.seeking;
              const bReady = b.readyState >= 3 && !b.seeking;

              // Garde-fou : la SOMME des opacités visibles doit toujours
              // rester ~1. Si une vidéo n'est pas prête, l'autre prend tout.
              if (!bReady && aReady) {
                smoothA = 1;
                smoothB = 0;
              } else if (!aReady && bReady) {
                smoothA = 0;
                smoothB = 1;
              } else if (!aReady && !bReady) {
                // Pire cas (très rare) : on laisse la PNG poster en dessous
                // assurer la continuité visuelle. Opacités forcées à 0.
                smoothA = 0;
                smoothB = 0;
              }

              a.style.opacity = String(smoothA);
              b.style.opacity = String(smoothB);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        // Reprise immédiate dès qu'une vidéo a re-buffé : force un tick
        // pour mettre à jour l'opacité avant le prochain frame paint.
        const onPlayable = () => {
          lastTickAt = 0;
        };
        a.addEventListener("playing", onPlayable);
        b.addEventListener("playing", onPlayable);
        a.addEventListener("canplaythrough", onPlayable);
        b.addEventListener("canplaythrough", onPlayable);

        // Pause/reprise selon la visibilité de l'onglet (gros gain CPU/batterie).
        const onVisibility = () => {
          if (document.hidden) {
            a.pause();
            b.pause();
            cancelAnimationFrame(raf);
          } else {
            a.play().catch(() => {});
            b.play().catch(() => {});
            raf = requestAnimationFrame(tick);
          }
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
          window.clearInterval(resyncId);
          document.removeEventListener("visibilitychange", onVisibility);
          a.removeEventListener("playing", onPlayable);
          b.removeEventListener("playing", onPlayable);
          a.removeEventListener("canplaythrough", onPlayable);
          b.removeEventListener("canplaythrough", onPlayable);
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
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(noSourceTimer);
        a.removeEventListener("canplay", onCanPlay);
        cleanup?.();
      };
    }, [animate, mountVideos]);

    return (
      <div
        ref={(node) => {
          panelRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className="hidden lg:block lg:w-1/2 relative bg-background"
      >
        {/*
          Calque image + voile : strictement décoratif, en arrière-plan (z-0),
          non-interactif (pointer-events-none sur le wrapper ET le voile).
          Toute la moitié gauche est non-cliquable par design, aucune action
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
              // droite) se confondent visuellement avec la peinture, aucune
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
            Ne se monte que si l'utilisateur n'a pas demandé reduced-motion,
            que le cinemagraph est synchronisé, et que le panneau est visible.
          */}
          {animate && mountVideos && (
            <>
              <video
                ref={videoARef}
                poster={authIllustration}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                onError={() => setAnimate(false)}
                className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
                style={{
                  // Opacités pilotées par le rAF tick directement sur ref.style
                  // (zéro re-render React). État initial : A pleine, B transparente.
                  opacity: aOpacity,
                  willChange: "opacity",
                  transform: "translateZ(0)",
                  objectPosition: "50% 100%",
                  WebkitMaskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                }}
              >
                <source src={authIllustrationWebm} type="video/webm" />
                <source src={authIllustrationVideo} type="video/mp4" />
              </video>
              <video
                ref={videoBRef}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                onError={() => setAnimate(false)}
                className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
                style={{
                  opacity: bOpacity,
                  willChange: "opacity",
                  transform: "translateZ(0)",
                  objectPosition: "50% 100%",
                  WebkitMaskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                }}
              >
                <source src={authIllustrationWebm} type="video/webm" />
                <source src={authIllustrationVideo} type="video/mp4" />
              </video>
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
