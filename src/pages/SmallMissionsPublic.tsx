import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Scissors, Hammer, Mail, PawPrint, Sprout, Lightbulb } from "lucide-react";

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
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── data ── */
const examples = [
  { Icon: Scissors, title: "Jardin tondu", text: "3h de tonte contre un panier\nde légumes du potager.", badge: "Légumes · Écully" },
  { Icon: Hammer, title: "Meubles montés", text: "Une armoire IKEA contre\nun repas fait maison.", badge: "Repas · Lyon 3e" },
  { Icon: Mail, title: "Colis réceptionné", text: "Garder un colis 2 jours\ncontre un cours de cuisine.", badge: "Cuisine · Caluire" },
  { Icon: PawPrint, title: "Chien promené", text: "30 minutes par jour pendant\nles vacances contre des œufs frais.", badge: "Œufs · Grenoble" },
  { Icon: Sprout, title: "Plantes arrosées", text: "10 jours d'arrosage contre\nune bouteille de vin local.", badge: "Vin · Annecy" },
  { Icon: Lightbulb, title: "Cours donné", text: "2h de cours de guitare contre\nune aide à la déclaration d'impôts.", badge: "Admin · Chambéry" },
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
        {/* ═══ SECTION 1 — HERO ═══ */}
        <section className="bg-muted">
          <div className="max-w-[720px] mx-auto px-6 py-20 md:py-[120px] text-center">
            <Reveal>
              <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 mb-6">
                Petites missions · Entraide
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="font-heading text-[44px] md:text-[64px] font-bold text-foreground leading-[1.1] max-w-[680px] mx-auto">
                Ce que vous avez.
                <br />
                Contre ce que vous n'avez pas encore vécu.
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="font-body text-[20px] text-foreground/75 leading-[1.7] max-w-[560px] mx-auto mt-8">
                Un coup de main contre un repas.
                <br />
                Un jardin contre des légumes.
                <br />
                Une compétence contre une soirée.
                <br />
                Ici personne ne facture ce qui n'a pas de prix.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Button asChild className="bg-primary text-primary-foreground rounded-pill px-9 py-4 h-auto text-[15px] font-semibold tracking-[0.03em] hover:bg-primary/90 transition-all duration-200">
                  <Link to="/petites-missions/creer">Je propose une mission</Link>
                </Button>
                <Button asChild variant="outline" className="border-2 border-primary text-primary rounded-pill px-9 py-4 h-auto text-[15px] font-semibold tracking-[0.03em] hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                  <Link to="/petites-missions?type=offre">Je veux aider</Link>
                </Button>
              </div>
              <p className="text-[13px] text-foreground/50 mt-4">
                Gratuit. Accessible dès que ton profil est complété.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 2 — LA CONVICTION ═══ */}
        <section className="bg-background">
          <div className="max-w-[680px] mx-auto px-6 py-20 md:py-[100px]">
            <Reveal>
              <p className="font-heading text-[22px] md:text-[28px] text-foreground leading-[1.6] italic text-center">
                On n'a pas créé les petites missions
                <br />
                pour que les gens se rendent des services.
                <br /><br />
                On les a créées parce que les échanges les plus vrais
                <br />
                ne passent pas par un virement.
                <br /><br />
                Votre expertise de bricoleur contre le tajine
                <br />
                de votre voisine de quartier.
                <br />
                Vos bras contre ses légumes du potager.
                <br />
                Votre temps contre une histoire.
                <br /><br />
                C'est ça qu'on appelle vivre quelque part.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 3 — LES DEUX MODES ═══ */}
        <section className="bg-muted">
          <div className="max-w-[900px] mx-auto px-6 py-20 md:py-[100px]">
            <Reveal>
              <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 text-center mb-12">
                Comment ça marche
              </p>
              <h2 className="font-heading text-[36px] md:text-[48px] font-semibold text-foreground text-center leading-[1.2] mb-12">
                Deux façons d'entrer dans l'échange.
              </h2>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Card Besoin */}
              <Reveal delay={0.1}>
                <div className="bg-card border border-border rounded-[20px] p-10 md:p-12 border-t-4 border-t-primary h-full flex flex-col">
                  <p className="text-[11px] font-body font-semibold tracking-[0.1em] uppercase text-primary mb-6">
                    Tu as besoin d'un coup de main
                  </p>
                  <h3 className="font-heading text-[24px] md:text-[28px] font-semibold text-foreground mb-8 leading-tight">
                    Tu publies ce dont tu as besoin.
                  </h3>
                  <div className="space-y-6 flex-1">
                    {[
                      { n: "01", t: "Tu décris la mission — tonte, bricolage, promener le chien, réceptionner un colis." },
                      { n: "02", t: "Tu proposes ce que tu donnes en échange — un repas, des légumes, une bouteille." },
                      { n: "03", t: "Des gens du coin voient ta mission et proposent leur aide. Tu choisis. Vous vous rencontrez." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-[40px] text-primary/15 font-bold leading-none block">{s.n}</span>
                        <p className="font-body text-[16px] text-foreground/70 leading-[1.7] mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/petites-missions/creer" className="inline-flex items-center gap-2 text-primary font-semibold text-[15px] mt-8 hover:gap-3 transition-all duration-200">
                    Publier une mission <span>→</span>
                  </Link>
                </div>
              </Reveal>

              {/* Card Offre */}
              <Reveal delay={0.2}>
                <div className="bg-card border border-border rounded-[20px] p-10 md:p-12 border-t-4 border-t-secondary h-full flex flex-col">
                  <p className="text-[11px] font-body font-semibold tracking-[0.1em] uppercase text-secondary mb-6">
                    Tu veux donner un coup de main
                  </p>
                  <h3 className="font-heading text-[24px] md:text-[28px] font-semibold text-foreground mb-8 leading-tight">
                    Tu publies ce que tu proposes.
                  </h3>
                  <div className="space-y-6 flex-1">
                    {[
                      { n: "01", t: "Tu décris ce que tu sais faire — jardinage, montage meubles, cuisine, aide aux courses." },
                      { n: "02", t: "Tu dis ce que tu aimerais en échange — ou tu laisses l'autre proposer." },
                      { n: "03", t: "Quelqu'un a besoin exactement de ça. Il te contacte. L'échange commence." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-[40px] text-secondary/15 font-bold leading-none block">{s.n}</span>
                        <p className="font-body text-[16px] text-foreground/70 leading-[1.7] mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/petites-missions?type=offre" className="inline-flex items-center gap-2 text-secondary font-semibold text-[15px] mt-8 hover:gap-3 transition-all duration-200">
                    Proposer mon aide <span>→</span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 4 — EXEMPLES ═══ */}
        <section className="bg-background">
          <div className="max-w-[960px] mx-auto px-6 py-20 md:py-[100px]">
            <Reveal>
              <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 text-center mb-4">
                Ce que les gens s'échangent
              </p>
              <h2 className="font-heading text-[36px] md:text-[48px] font-semibold text-foreground text-center leading-[1.2] mb-12">
                Des échanges qui ont eu lieu.
              </h2>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {examples.map((ex, i) => (
                <Reveal key={ex.title} delay={0.05 * i}>
                  <div className="bg-card border border-border rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                    <ex.Icon className="text-primary/70 mb-4" size={28} strokeWidth={1.5} />
                    <h3 className="font-heading text-[18px] font-semibold text-foreground mb-2">{ex.title}</h3>
                    <p className="font-body text-[15px] text-foreground/70 leading-[1.7] whitespace-pre-line flex-1">{ex.text}</p>
                    <span className="inline-block mt-4 text-[12px] font-body font-semibold tracking-[0.05em] text-secondary bg-secondary/10 rounded-pill px-3 py-1 w-fit">
                      {ex.badge}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.3}>
              <p className="text-center font-body text-[16px] text-foreground/60 italic mt-12">
                L'échange se décide entre vous.
                <br />
                Guardiens fournit l'espace — pas la transaction.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 5 — RÈGLES ═══ */}
        <section className="bg-foreground">
          <div className="max-w-[800px] mx-auto px-6 py-16 md:py-20">
            <div className="grid md:grid-cols-3 gap-10 md:gap-0">
              {[
                {
                  title: "Jamais d'argent.",
                  text: "Pas d'euros, pas de virement,\npas de tarif horaire.\nCe n'est pas un service — c'est un échange.",
                },
                {
                  title: "Entre gens du coin.",
                  text: "Les missions sont visibles\nuniquement aux membres\ndans un rayon proche de chez toi.",
                },
                {
                  title: "En lien avec la maison.",
                  text: "Jardin, animaux, maison, quartier.\nLes missions restent dans l'univers\nde ce qui nous rassemble.",
                },
              ].map((rule, i) => (
                <Reveal key={rule.title} delay={0.1 * i}>
                  <div className={`text-center md:text-left md:px-8 ${i > 0 ? "md:border-l md:border-white/15" : ""}`}>
                    <h3 className="font-heading text-[22px] font-semibold text-white mb-3">{rule.title}</h3>
                    <p className="font-body text-[15px] text-white/70 leading-[1.7] whitespace-pre-line">{rule.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SECTION 6 — CTA FINAL ═══ */}
        <section className="bg-primary">
          <div className="max-w-[700px] mx-auto px-6 py-20 md:py-[100px] text-center">
            <Reveal>
              <h2 className="font-heading text-[36px] md:text-[52px] font-bold text-white leading-[1.1] mb-6">
                Le premier échange
                <br />
                est souvent le plus simple.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-body text-[18px] text-white/85 leading-[1.7] mb-10">
                Gratuit. Entre gens du coin qui se choisissent.
                <br />
                Accessible dès que ton profil est complété à 60%.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-white text-primary rounded-pill px-10 py-4 h-auto text-[15px] font-bold tracking-[0.03em] hover:bg-white/90 hover:scale-[1.02] transition-all duration-200">
                  <Link to="/petites-missions/creer">Je propose une mission</Link>
                </Button>
                <Button asChild className="bg-transparent border-2 border-white/70 text-white rounded-pill px-10 py-4 h-auto text-[15px] font-semibold tracking-[0.03em] hover:bg-white/15 transition-all duration-200">
                  <Link to="/petites-missions?type=offre">Je veux aider</Link>
                </Button>
              </div>
              <p className="text-[13px] text-white/50 mt-6">
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
