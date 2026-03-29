import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import heroImg from "@/assets/hero-missions.jpg";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Apple, Sprout, Egg, PawPrint, Hammer, ChefHat } from "lucide-react";

/* ── scroll reveal ── */
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/* ── data ── */
const examples = [
  { Icon: Apple, title: "Verger à ramasser", text: "Venir ramasser les fruits avant qu'ils tombent contre un énorme panier de fruits frais à emporter.", badge: "Fruits · Écully" },
  { Icon: Sprout, title: "Potager à planter", text: "Donner un coup de main pour planter les légumes au printemps — et venir se servir librement à la récolte.", badge: "Légumes · Lyon 3e" },
  { Icon: Egg, title: "Poules à garder", text: "Nourrir les poules et ramasser les œufs pendant 10 jours contre des œufs frais à volonté au retour.", badge: "Œufs · Caluire" },
  { Icon: PawPrint, title: "Chien à promener", text: "Deux semaines de balades contre son chien promené la prochaine fois qu'on part.", badge: "Réciprocité · Grenoble" },
  { Icon: Hammer, title: "Meubles à monter", text: "Une après-midi de montage IKEA contre un vrai repas fait maison et une bouteille.", badge: "Repas · Annecy" },
  { Icon: ChefHat, title: "Cours de cuisine", text: "2h à apprendre à faire la pâte fraîche contre une aide pour la déclaration d'impôts.", badge: "Échange · Chambéry" },
];

/* ── page ── */
const SmallMissionsPublic = () => {
  return (
    <>
      <PageMeta
        title="Petites missions — Échanges sans argent entre gens du coin | Guardiens"
        description="Un coup de main contre un repas. Un jardin contre des légumes. L'entraide de proximité sans argent. Rejoignez Guardiens gratuitement."
      />

      <div className="min-h-screen bg-background font-body">
        {/* ═══ SECTION 1 — HERO WITH PHOTO ═══ */}
        <section className="relative h-[40vh] md:h-[50vh] flex items-end justify-center overflow-hidden">
          <img
            src={heroImg}
            alt="Silhouettes s'entraidant au sommet d'un rocher face au soleil couchant"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/50" />
          <div className="relative z-10 max-w-2xl mx-auto px-6 pb-12 md:pb-16 text-center">
            <Reveal>
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-white/60 mb-6">
                Petites missions · Entraide
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="font-heading text-5xl md:text-6xl font-bold text-white leading-tight max-w-2xl mx-auto">
                Ce que tu as contre ce que<br className="hidden md:block" /> tu n'as pas encore vécu.
              </h1>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 1B — HERO TEXT ═══ */}
        <section className="bg-muted">
          <div className="max-w-2xl mx-auto px-6 py-16 md:py-20 text-center">
            <Reveal>
              <p className="font-body text-lg text-foreground/70 leading-relaxed text-center max-w-lg mx-auto">
                Un coup de main contre un repas. Un jardin contre des légumes. Une compétence contre une soirée. Ici personne ne facture ce qui n'a pas de prix.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
                <Button asChild className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200">
                  <Link to="/petites-missions/creer">Je propose une mission</Link>
                </Button>
                <Button asChild variant="outline" className="border-2 border-primary text-primary rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                  <Link to="/petites-missions?type=offre">Je veux aider</Link>
                </Button>
              </div>
              <p className="text-xs text-foreground/50 mt-4">
                Gratuit. Accessible dès que ton profil est complété.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 2 — LA CONVICTION ═══ */}
        <section className="bg-background">
          <div className="max-w-xl mx-auto px-6 py-24 md:py-32">
            <Reveal>
              <p className="text-lg font-heading italic leading-relaxed text-foreground/85 text-center mb-7">
                On n'a pas créé les petites missions pour que les gens se rendent des services. On les a créées parce que les échanges les plus vrais ne passent pas par un virement.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg font-heading italic leading-relaxed text-foreground/85 text-center mb-7">
                Tes bras pour planter les légumes ce week-end. Ses tomates cet été. Peut-être son aide pour repeindre la cuisine en septembre. L'échange n'a pas besoin d'être immédiat pour être juste.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-lg font-heading italic leading-relaxed text-foreground/85 text-center">
                C'est ça qu'on appelle vivre quelque part.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 3 — LES DEUX MODES ═══ */}
        <section className="bg-muted">
          <div className="max-w-4xl mx-auto px-6 py-24 md:py-32">
            <Reveal>
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-12">
                Comment ça marche
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-semibold text-foreground text-center leading-snug mb-12">
                Deux façons d'entrer dans l'échange.
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Card Besoin */}
              <Reveal delay={0.1}>
                <div className="bg-card border border-border rounded-2xl p-10 md:p-12 border-t-4 border-t-primary h-full flex flex-col">
                  <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary mb-6">
                    Tu as besoin d'un coup de main
                  </p>
                  <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 leading-tight">
                    Tu publies ce dont tu as besoin.
                  </h3>
                  <div className="space-y-9 flex-1">
                    {[
                      { n: "01", t: "Tu décris la mission — tonte, bricolage, promener le chien, réceptionner un colis." },
                      { n: "02", t: "Tu proposes ce que tu donnes en échange — un repas, des légumes, une bouteille." },
                      { n: "03", t: "Des gens du coin voient ta mission et proposent leur aide. Tu choisis. Vous vous rencontrez." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-6xl text-primary/20 font-bold leading-none block">{s.n}</span>
                        <p className="text-base font-body text-foreground/70 leading-relaxed mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/petites-missions/creer" className="inline-flex items-center gap-2 text-primary font-semibold text-sm mt-8 hover:gap-3 transition-all duration-200">
                    Publier une mission <span>→</span>
                  </Link>
                </div>
              </Reveal>

              {/* Card Offre */}
              <Reveal delay={0.2}>
                <div className="bg-card border border-border rounded-2xl p-10 md:p-12 border-t-4 border-t-secondary h-full flex flex-col">
                  <p className="text-xs font-body font-semibold tracking-widest uppercase text-secondary mb-6">
                    Tu veux donner un coup de main
                  </p>
                  <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 leading-tight">
                    Tu publies ce que tu proposes.
                  </h3>
                  <div className="space-y-9 flex-1">
                    {[
                      { n: "01", t: "Tu décris ce que tu sais faire — jardinage, montage meubles, cuisine, aide aux courses." },
                      { n: "02", t: "Tu dis ce que tu aimerais en échange — ou tu laisses l'autre proposer." },
                      { n: "03", t: "Quelqu'un a besoin exactement de ça. Il te contacte. L'échange commence." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-6xl text-secondary/20 font-bold leading-none block">{s.n}</span>
                        <p className="text-base font-body text-foreground/70 leading-relaxed mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/petites-missions?type=offre" className="inline-flex items-center gap-2 text-secondary font-semibold text-sm mt-8 hover:gap-3 transition-all duration-200">
                    Proposer mon aide <span>→</span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 4 — EXEMPLES ═══ */}
        <section className="bg-background">
          <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
            <Reveal>
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
                Ce que les gens s'échangent
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-semibold text-foreground text-center leading-snug mb-12">
                Des échanges qui ont eu lieu.
              </h2>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {examples.map((ex, i) => (
                <Reveal key={ex.title} delay={0.05 * i}>
                  <div className="bg-card border border-border rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                    <ex.Icon className="text-primary/70 mb-4" size={28} strokeWidth={1.5} />
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{ex.title}</h3>
                    <p className="text-sm md:text-base font-body text-foreground/70 leading-relaxed flex-1">{ex.text}</p>
                    <span className="inline-block mt-4 text-xs font-body font-semibold tracking-wide text-secondary bg-secondary/10 rounded-full px-3 py-1 w-fit">
                      {ex.badge}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.3}>
              <p className="text-center font-body text-base text-foreground/60 italic mt-12">
                L'échange se décide entre vous. Parfois immédiat. Parfois à la saison prochaine. C'est vous qui décidez — pas la plateforme.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 5 — RÈGLES ═══ */}
        <section className="bg-foreground">
          <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
            <div className="grid md:grid-cols-3 gap-10 md:gap-0">
              {[
                {
                  title: "Jamais d'argent.",
                  text: "Pas d'euros, pas de virement, pas de tarif horaire. L'échange a de la valeur parce qu'il n'a pas de prix.",
                },
                {
                  title: "Entre gens du coin.",
                  text: "Les missions sont visibles uniquement aux membres dans un rayon proche de chez toi.",
                },
                {
                  title: "En lien avec la maison.",
                  text: "Jardin, animaux, maison, quartier. Les missions restent dans l'univers de ce qui nous rassemble.",
                },
              ].map((rule, i) => (
                <Reveal key={rule.title} delay={0.1 * i}>
                  <div className={`text-center md:text-left md:px-8 ${i > 0 ? "md:border-l md:border-white/15" : ""}`}>
                    <h3 className="font-heading text-xl md:text-2xl font-semibold text-white mb-3">{rule.title}</h3>
                    <p className="font-body text-sm md:text-base text-white/70 leading-relaxed">{rule.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SECTION 6 — CTA FINAL ═══ */}
        <section className="bg-primary">
          <div className="max-w-2xl mx-auto px-6 py-24 md:py-32 text-center">
            <Reveal>
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                Le premier échange est souvent le plus simple.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-lg text-white/85 leading-relaxed mb-10">
                Gratuit. Entre gens du coin qui se choisissent. Accessible dès que ton profil est complété à 60%.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-white text-primary rounded-full px-10 py-4 h-auto text-sm font-bold tracking-wide hover:bg-white/90 hover:scale-[1.02] transition-all duration-200">
                  <Link to="/petites-missions/creer">Je propose une mission</Link>
                </Button>
                <Button asChild className="bg-transparent border-2 border-white/70 text-white rounded-full px-10 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-white/15 transition-all duration-200">
                  <Link to="/petites-missions?type=offre">Je veux aider</Link>
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-6">
                Gratuit · Badge Fondateur à vie · Accès jusqu'au 13 juin
              </p>
            </Reveal>
          </div>
        </section>

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Petites missions Guardiens",
              description: "Entraide communautaire entre gens du coin. Échanges sans argent autour des animaux, du jardin et de la maison.",
              areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
              provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
            }),
          }}
        />
      </div>
    </>
  );
};

export default SmallMissionsPublic;
