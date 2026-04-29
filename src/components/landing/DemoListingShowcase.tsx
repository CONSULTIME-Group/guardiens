import React from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

// Libellé unique réutilisé par toutes les cartes (UI + accessibilité)
const DEMO_CARD_CTA_LABEL = "Voir l'annonce de démonstration";
const DEMO_CARD_CTA_CLASSNAME =
  "w-full mt-3 py-2.5 rounded-xl bg-primary/10 text-primary font-body font-medium text-sm text-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors block";

// Préchargement du chunk de la page DemoSitDetail (idempotent : Vite met l'import en cache)
let demoDetailPrefetched = false;
const prefetchDemoDetail = () => {
  if (demoDetailPrefetched) return;
  demoDetailPrefetched = true;
  // Même chemin d'import que dans src/App.tsx → réutilise le même chunk lazy
  import("@/pages/DemoSitDetail").catch(() => {
    demoDetailPrefetched = false;
  });
  // Précharge aussi la donnée demo (petit module synchrone, mais évite un round-trip parse)
  import("@/data/demoListings").catch(() => {});
};

// Photo hero (1ère photo) par slug — alignée sur src/data/demoListings.ts
// Évite le 1er paint vide sur mobile en chargeant l'image avant la navigation.
const DEMO_HERO_BY_SLUG: Record<string, string> = {
  "lyon-laika-jardin":
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
  "annecy-lac-basse-cour":
    "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80",
  "grenoble-deux-chats-appart":
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
};

const prefetchedHeroes = new Set<string>();
const prefetchDemoHero = (slug: string) => {
  const url = DEMO_HERO_BY_SLUG[slug];
  if (!url || prefetchedHeroes.has(slug) || typeof document === "undefined") return;
  prefetchedHeroes.add(slug);
  // Utilise <link rel="preload" as="image"> : haute priorité, supporté largement (mobile inclus)
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

const prefetchDemoRoute = (slug: string) => {
  prefetchDemoDetail();
  prefetchDemoHero(slug);
};

// Slugs alignés sur src/data/demoListings.ts → page /annonces/demo/:slug
const DEMO_LISTINGS = [
  {
    id: "demo-1",
    slug: "lyon-laika-jardin",
    photo: "/images/landing/annonce-maison-jardin.webp",
    city: "Lyon 6e",
    animals: ["1 chien", "2 chats"],
    dates: "14 → 28 juil.",
    title: "Maison avec jardin, Laïka et ses deux compères",
    description: "Belle maison en briques avec terrasse ensoleillée. Laïka (labrador 4 ans) adore les balades au parc de la Tête d'Or. Les deux chats sont indépendants.",
    ownerName: "Nadia",
    ownerPhoto: "/images/landing/avatar-nadia.webp",
    badges: ["ID vérifiée", "Fondatrice"],
  },
  {
    id: "demo-2",
    slug: "annecy-lac-basse-cour",
    photo: "/images/landing/annonce-maison-lac.webp",
    city: "Annecy",
    animals: ["3 poules", "1 chat"],
    dates: "2 → 16 août",
    title: "Maison en bois face au lac, potager et basse-cour",
    description: "Vue imprenable sur le lac d'Annecy. Trois poules pondeuses (les œufs sont pour vous), un chat discret, un potager à arroser.",
    ownerName: "Rania",
    ownerPhoto: "/images/landing/avatar-rania.webp",
    badges: ["ID vérifiée", "3 gardes"],
  },
  {
    id: "demo-3",
    slug: "grenoble-deux-chats-appart",
    photo: "/images/landing/annonce-appartement-chats.webp",
    city: "Grenoble",
    animals: ["2 chats"],
    dates: "20 sept. → 4 oct.",
    title: "Appartement calme, deux chats aux habitudes bien rodées",
    description: "Appartement lumineux au pied du Vercors. Milo et Louane sont habitués aux gardiens — une semaine et ils vous ont adopté. Quartier animé, tout à pied.",
    ownerName: "Giulia",
    ownerPhoto: "/images/landing/avatar-giulia.webp",
    badges: ["ID vérifiée", "Fondatrice"],
  },
];

const DemoListingCard = React.forwardRef<HTMLAnchorElement, typeof DEMO_LISTINGS[0]>(({
  id, slug, photo, city, animals, dates, title, description, ownerName, ownerPhoto, badges,
}, ref) => {
  const internalRef = React.useRef<HTMLAnchorElement | null>(null);

  // Précharge chunk JS + image hero dès qu'une carte entre dans le viewport
  React.useEffect(() => {
    const node = internalRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // Fallback : préchargement immédiat si l'API n'est pas disponible
      prefetchDemoRoute(slug);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          prefetchDemoRoute(slug);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [slug]);

  const setRefs = React.useCallback(
    (node: HTMLAnchorElement | null) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
    },
    [ref],
  );

  const handlePrefetch = React.useCallback(() => prefetchDemoRoute(slug), [slug]);

  return (
  <Link
    ref={setRefs}
    to={`/annonces/demo/${slug}`}
    onMouseEnter={handlePrefetch}
    onFocus={handlePrefetch}
    onTouchStart={handlePrefetch}
    onClick={() =>
      trackEvent("sit_view", {
        source: "landing_demo_card",
        metadata: { demo_id: id, slug, city, location: "landing_showcase" },
      })
    }
    aria-label={`${DEMO_CARD_CTA_LABEL} : ${title} — ${city}`}
    className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm flex flex-col hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  >
    <div className="relative">
      <img src={photo} alt={title} className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" width={700} height={467} />
      <span className="absolute top-3 left-3 bg-white/90 text-foreground/50 text-xs font-body font-medium px-3 py-1 rounded-full border border-border/60">
        Bientôt disponible
      </span>
      <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
        {animals.map((a) => (
          <span key={a} className="bg-black/50 text-white text-xs font-body px-2 py-0.5 rounded-full backdrop-blur-sm">
            {a}
          </span>
        ))}
      </div>
    </div>

    <div className="p-5 flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-body font-medium text-foreground/80">{city}</span>
        <span className="text-xs font-body text-foreground/50">{dates}</span>
      </div>

      <h3 className="text-xl font-heading font-semibold leading-snug group-hover:text-primary transition-colors">{title}</h3>

      <p className="text-sm font-body text-foreground/70 line-clamp-2">{description}</p>

      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border">
        <img src={ownerPhoto} alt={ownerName} className="w-9 h-9 rounded-full object-cover" loading="lazy" width={80} height={80} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body font-medium text-foreground/90 truncate">{ownerName}</p>
          <div className="flex gap-1 flex-wrap">
            {badges.map((b) => (
              <span key={b} className="text-xs font-body text-primary/70">{b}</span>
            ))}
          </div>
        </div>
      </div>

      <span aria-hidden="true" className={DEMO_CARD_CTA_CLASSNAME}>
        {DEMO_CARD_CTA_LABEL} →
      </span>
    </div>
  </Link>
  );
});
DemoListingCard.displayName = "DemoListingCard";

const DemoListingShowcase = React.forwardRef<HTMLElement>((_props, ref) => (
  <section ref={ref} className="py-24 md:py-32 bg-muted/30">
    <div className="max-w-6xl mx-auto px-4">
      <p className="text-xs tracking-widest uppercase text-primary/60 font-body text-center mb-4">
        Ce qui vous attend
      </p>

      <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-center mb-4">
        Des maisons. Des animaux. Des gens du coin.
      </h2>

      <p className="text-lg md:text-xl font-body font-normal text-foreground/70 text-center mb-16 max-w-2xl mx-auto">
        Voici à quoi ressemblent les gardes sur Guardiens.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {DEMO_LISTINGS.map((card) => (
          <DemoListingCard key={card.id} {...card} />
        ))}
      </div>

      <div className="text-center">
        <Link
          to="/inscription?role=owner"
          onClick={() =>
            trackEvent("cta_proprio_clicked", {
              source: "landing_demo_showcase",
              metadata: { location: "demo_showcase_main_cta" },
            })
          }
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-body font-medium text-base hover:bg-primary/90 transition-colors"
        >
          J'ouvre un compte — 0 € pour les propriétaires
        </Link>
      </div>
    </div>
  </section>
));
DemoListingShowcase.displayName = "DemoListingShowcase";

export default DemoListingShowcase;
