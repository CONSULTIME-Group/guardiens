import { forwardRef, useEffect, useRef, useState } from "react";
import authIllustration from "@/assets/auth-illustration.webp";
import authIllustrationMp4 from "@/assets/auth-illustration.mp4?url";
import { isCinemagraphInSync } from "@/assets/auth-illustration.manifest";

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
 * v3 — Optimisations performance majeures :
 *  - WebM supprimé (encodage VP9 inefficace sur gouache détaillée : 5MB vs MP4 1.9MB).
 *    MP4 H.264 unique, supporté partout (Chrome/FF/Safari/Edge desktop+mobile).
 *  - Lecture UNIQUE (loop={false}) puis freeze sur la dernière frame.
 *    Économie ~80% CPU/batterie sur la durée de session (login = 10-30s en moyenne).
 *  - <video> unique (le crossfade A/B ping-pong devient inutile sans loop).
 *  - Préchargement <link rel="preload"> supprimé (redondant avec preload="metadata"
 *    natif, et arrivait trop tard puisqu'injecté post-hydration).
 *
 * Lazy multi-niveaux conservé :
 *  - prefers-reduced-motion → poster only
 *  - Save-Data + 2g/slow-2g → poster only
 *  - IntersectionObserver (panneau hors viewport → pas de mount)
 *  - requestIdleCallback (1.5s) → pas de concurrence avec OAuth/Supabase
 *  - Fallback PNG si vidéo KO à 2.5s (raccourci depuis 4s)
 *  - Pause sur visibilitychange
 *
 * Exposé via forwardRef pour compatibilité Helmet/HOC.
 */
export const AuthIllustrationPanel = forwardRef<HTMLDivElement, AuthIllustrationPanelProps>(
  ({ title, tagline, description, footerSlot }, ref) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [animate, setAnimate] = useState(false);
    const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
    const [mountVideo, setMountVideo] = useState(false);

    useEffect(() => {
      if (typeof window === "undefined") return;
      // Garde-fou de synchronisation : si la vidéo n'a pas été régénérée
      // après une mise à jour de la PNG, on reste sur l'image fixe.
      if (!isCinemagraphInSync) {
        setAnimate(false);
        return;
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      // Save-Data + connexions très lentes uniquement (2g/slow-2g).
      // La 3G en 2026 peut encaisser 1.9MB sans problème.
      const conn = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      const slow =
        !!conn?.saveData ||
        (conn?.effectiveType ? /^(slow-2g|2g)$/.test(conn.effectiveType) : false);
      setAnimate(!mq.matches && !slow);
      const onChange = (e: MediaQueryListEvent) => setAnimate(!e.matches && !slow);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    // Chargement réellement paresseux : la vidéo ne se monte qu'une fois
    // le panneau illustration visible à l'écran.
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

    // Différer le mount du <video> jusqu'à idle (max 1.5s) pour ne pas
    // concurrencer les scripts critiques d'auth (form, OAuth, Supabase).
    useEffect(() => {
      if (!animate || !hasEnteredViewport || mountVideo) return;
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      let idleId: number | undefined;
      let timeoutId: number | undefined;
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(() => setMountVideo(true), { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(() => setMountVideo(true), 1500);
      }
      return () => {
        if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
    }, [animate, hasEnteredViewport, mountVideo]);

    // Pilotage du <video> : lecture unique, freeze sur la dernière frame,
    // fallback PNG si la vidéo n'est pas prête en 2.5s, pause sur tab hidden.
    useEffect(() => {
      if (!animate || !mountVideo) return;
      const v = videoRef.current;
      if (!v) return;

      // Fallback rapide : si pas prête en 2.5s, on bascule sur la PNG.
      // La PNG sous la vidéo reste TOUJOURS visible, donc transition invisible.
      const fallbackTimer = window.setTimeout(() => {
        if (v.readyState < 3 /* HAVE_FUTURE_DATA */) {
          setAnimate(false);
        }
      }, 2500);
      const onCanPlay = () => window.clearTimeout(fallbackTimer);
      v.addEventListener("canplay", onCanPlay, { once: true });

      // Vérif "aucune source jouable" (codec unsupported, réseau coupé).
      const noSourceTimer = window.setTimeout(() => {
        if (v.networkState === 3) setAnimate(false);
      }, 1500);

      // Pause/reprise selon la visibilité de l'onglet.
      // (Avant la fin de lecture seulement, après freeze c'est inutile.)
      const onVisibility = () => {
        if (v.ended) return;
        if (document.hidden) {
          v.pause();
        } else {
          v.play().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(noSourceTimer);
        v.removeEventListener("canplay", onCanPlay);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [animate, mountVideo]);

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
          Calque image + vidéo : strictement décoratif, en arrière-plan (z-0),
          non-interactif. Toute la moitié gauche est non-cliquable par design.
        */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* Couche 1 : image fixe, toujours présente (poster + fallback) */}
          <img
            src={authIllustration}
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
            style={{
              objectPosition: "50% 100%",
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
            Couche 2 : cinemagraph MP4 unique, lecture UNIQUE puis freeze sur
            la dernière frame (loop supprimé). Après ~10s de lecture, le décodage
            s'arrête et la vidéo reste figée : 0% CPU sur le reste de la session.
            La perception visuelle est identique à un loop infini sur une page
            où l'utilisateur reste 10-30s en moyenne.
          */}
          {animate && mountVideo && (
            <video
              ref={videoRef}
              poster={authIllustration}
              autoPlay
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              onError={() => setAnimate(false)}
              className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
              style={{
                willChange: "opacity",
                transform: "translateZ(0)",
                objectPosition: "50% 100%",
                WebkitMaskImage:
                  "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
              }}
            >
              <source src={authIllustrationMp4} type="video/mp4" />
            </video>
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
