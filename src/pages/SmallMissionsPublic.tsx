import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import spotVergerSrc from "@/assets/missions/spot-verger.png";
import spotJardinSrc from "@/assets/missions/spot-jardin.png";
import spotPoulesSrc from "@/assets/missions/spot-poules.png";
import spotChienSrc from "@/assets/missions/spot-chien.png";
import spotBricolageSrc from "@/assets/missions/spot-bricolage.png";
import spotBienetreSrc from "@/assets/missions/spot-bienetre.png";

/* Cache-buster: force le navigateur à re-télécharger les illustrations (gouache v2) */
const ILLU_VERSION = "gouache-v2-20260427";
const bust = (src: string) => `${src}${src.includes("?") ? "&" : "?"}v=${ILLU_VERSION}`;
const spotVerger = bust(spotVergerSrc);
const spotJardin = bust(spotJardinSrc);
const spotPoules = bust(spotPoulesSrc);
const spotChien = bust(spotChienSrc);
const spotBricolage = bust(spotBricolageSrc);
const spotBienetre = bust(spotBienetreSrc);
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  { img: spotVerger, alt: "Panier en osier rempli de fruits frais — illustration gouache", title: "Verger à ramasser", text: "Venir ramasser les fruits avant qu'ils tombent contre un énorme panier de fruits frais à emporter.", badge: "Fruits · Écully" },
  { img: spotJardin, alt: "Panier d'herbes aromatiques et sécateur — illustration gouache", title: "Coup de main au jardin", text: "Donner un coup de main pour planter, désherber ou tailler — et venir se servir librement à la récolte.", badge: "Jardinage · entre gens du coin" },
  { img: spotPoules, alt: "Poule rousse devant un nid de paille avec des œufs — illustration gouache", title: "Poules à garder", text: "Nourrir les poules et ramasser les œufs pendant 10 jours contre des œufs frais à volonté au retour.", badge: "Œufs · Caluire" },
  { img: spotChien, alt: "Chien assis avec sa laisse en cuir — illustration gouache", title: "Chien à promener", text: "Deux semaines de balades contre son chien promené la prochaine fois qu'on part.", badge: "Réciprocité · entre gens du coin" },
  { img: spotBricolage, alt: "Boîte à outils en bois ouverte avec marteau, tournevis et clé — illustration gouache", title: "Petit bricolage", text: "Un coup de main pour monter une étagère, fixer un meuble ou changer un robinet, contre un vrai repas fait maison.", badge: "Repas · Annecy" },
  { img: spotBienetre, alt: "Tasse en céramique, brin de lavande et galet — illustration gouache", title: "Énergie & bien-être", text: "Une séance de Reiki, un massage ou un moment de méditation partagés, en échange d'un service rendu en retour.", badge: "Échange · entre gens du coin" },
];

/* ── page ── */
const SmallMissionsPublic = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  /* KPIs */
  const [kpiMissions, setKpiMissions] = useState<number>(0);
  const [kpiHelpers, setKpiHelpers] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("public_stats").select("*").single();
      if (data) {
        if (typeof data.missions_entraide === "number") setKpiMissions(data.missions_entraide);
        if (typeof data.total_inscrits === "number") setKpiHelpers(data.total_inscrits);
      }
    };
    load();
  }, []);

  /** Auth-aware navigation: redirect to register if not logged in */
  const goToCreate = () =>
    navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");
  const goToHelp = () =>
    navigate(isAuthenticated ? "/petites-missions?type=offre" : "/inscription?redirect=/petites-missions?type=offre");

  return (
    <>
      <PageMeta
        title="Petites missions d'entraide locale — Guardiens"
        description="Échangez des coups de main entre gens du coin. Jardinage, animaux, bricolage — sans argent. À 0 € pour tous, pour toujours."
      />

      <div className="min-h-screen bg-background font-body">
        {/* ═══ HEADER ═══ */}
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Petites missions" }]} />

        {/* ═══ SECTION 1 — HERO ═══ */}
        <section className="bg-background">
          <div className="max-w-2xl mx-auto px-6 py-20 md:py-28 text-center">
            <Reveal>
              <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-6">
                Petites missions · Entraide
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="font-heading text-5xl md:text-6xl font-bold text-foreground leading-tight max-w-2xl mx-auto">
                Entraide locale entre gens du coin —<br /> échangez sans argent.
              </h1>
              <p className="font-heading text-xl md:text-2xl italic text-foreground/70 mt-3 max-w-lg mx-auto">
                Ce que vous avez contre ce que vous n'avez pas encore vécu.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="font-body text-lg text-foreground/70 leading-relaxed text-center max-w-lg mx-auto mt-6">
                Un coup de main contre un repas. Un jardin contre des légumes. Une compétence contre une soirée. Ici personne ne facture ce qui n'a pas de prix.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Button onClick={goToCreate} className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200">
                  Je propose une mission
                </Button>
                <Button onClick={goToHelp} variant="outline" className="border-2 border-primary text-primary rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                  Je veux aider
                </Button>
              </div>
              <p className="text-xs text-foreground/50 mt-4">
                À 0 € pour tous — pour toujours.
              </p>
            </Reveal>

            {/* ── Social proof KPIs ── */}
            {(kpiMissions > 0 || kpiHelpers > 0) && (
              <Reveal delay={0.4}>
                <div className="flex justify-center gap-12 mt-10 pt-8 border-t border-border">
                  {kpiMissions > 0 && (
                    <div className="text-center">
                      <span className="block text-3xl font-heading font-bold text-foreground">{kpiMissions}</span>
                      <span className="text-xs text-muted-foreground tracking-wide uppercase">missions réalisées</span>
                    </div>
                  )}
                  {kpiHelpers > 0 && (
                    <div className="text-center">
                      <span className="block text-3xl font-heading font-bold text-foreground">{kpiHelpers}</span>
                      <span className="text-xs text-muted-foreground tracking-wide uppercase">membres actifs</span>
                    </div>
                  )}
                </div>
              </Reveal>
            )}
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
                Vos bras pour planter les légumes ce week-end. Ses tomates cet été. Peut-être son aide pour repeindre la cuisine en septembre. L'échange n'a pas besoin d'être immédiat pour être juste.
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
                    Vous avez besoin d'un coup de main
                  </p>
                  <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 leading-tight">
                    Vous publiez ce dont vous avez besoin.
                  </h3>
                  <div className="space-y-9 flex-1">
                    {[
                      { n: "01", t: "Vous décrivez la mission — tonte, bricolage, promener le chien, réceptionner un colis." },
                      { n: "02", t: "Vous proposez ce que vous donnez en échange — un repas, des légumes, une bouteille." },
                      { n: "03", t: "Des gens du coin voient votre mission et proposent leur aide. Vous choisissez. Vous vous rencontrez." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-6xl text-primary/20 font-bold leading-none block">{s.n}</span>
                        <p className="text-base font-body text-foreground/70 leading-relaxed mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={goToCreate} className="inline-flex items-center gap-2 text-primary font-semibold text-sm mt-8 hover:gap-3 transition-all duration-200">
                    Publier une mission <span>→</span>
                  </button>
                </div>
              </Reveal>

              {/* Card Offre */}
              <Reveal delay={0.2}>
                <div className="bg-card border border-border rounded-2xl p-10 md:p-12 border-t-4 border-t-secondary h-full flex flex-col">
                  <p className="text-xs font-body font-semibold tracking-widest uppercase text-secondary mb-6">
                    Vous voulez donner un coup de main
                  </p>
                  <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 leading-tight">
                    Vous publiez ce que vous proposez.
                  </h3>
                  <div className="space-y-9 flex-1">
                    {[
                      { n: "01", t: "Vous décrivez ce que vous savez faire — jardinage, montage meubles, cuisine, aide aux courses." },
                      { n: "02", t: "Vous dites ce que vous aimeriez en échange — ou vous laissez l'autre proposer." },
                      { n: "03", t: "Quelqu'un a besoin exactement de ça. Il vous contacte. L'échange commence." },
                    ].map((s) => (
                      <div key={s.n}>
                        <span className="font-heading text-6xl text-secondary/20 font-bold leading-none block">{s.n}</span>
                        <p className="text-base font-body text-foreground/70 leading-relaxed mt-1">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={goToHelp} className="inline-flex items-center gap-2 text-secondary font-semibold text-sm mt-8 hover:gap-3 transition-all duration-200">
                    Proposer mon aide <span>→</span>
                  </button>
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
                    <img
                      src={ex.img}
                      alt={ex.alt}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="w-24 h-24 md:w-28 md:h-28 object-contain mb-4 -ml-2"
                    />
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
        <section className="bg-accent-foreground text-accent">
          <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
            <div className="grid md:grid-cols-3 gap-10 md:gap-0">
              {[
                {
                  title: "Jamais d'argent.",
                  text: "Pas d'euros, pas de virement, pas de tarif horaire. L'échange a de la valeur parce qu'il n'a pas de prix.",
                },
                {
                  title: "Entre gens du coin.",
                  text: "Les missions sont visibles uniquement aux membres dans un rayon proche de chez vous.",
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
                À 0 €. Pour tous. Pour toujours. Entre gens du coin qui se choisissent.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={goToCreate} className="bg-white text-primary rounded-full px-10 py-4 h-auto text-sm font-bold tracking-wide hover:bg-white/90 hover:scale-[1.02] transition-all duration-200">
                  Je propose une mission
                </Button>
                <Button onClick={goToHelp} className="bg-transparent border-2 border-white/70 text-white rounded-full px-10 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-white/15 transition-all duration-200">
                  Je veux aider
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-6">
                0 € · Badge Fondateur à vie · Accès jusqu'au 13 juin
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══ SECTION 7 — FAQ ═══ */}
        <section className="bg-muted/50 py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-heading text-2xl font-bold text-center mb-10">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {[
                { q: "C'est quoi les petites missions ?", a: "Des coups de main entre gens du coin — jardinage, animaux, bricolage — échangés sans argent. Vous proposez ce que vous savez faire, ou publiez ce dont vous avez besoin." },
                { q: "C'est vraiment à 0 € ?", a: "Oui. L'entraide entre gens du coin est à 0 € pour tous, pour toujours. Aucun frais, aucune commission." },
                { q: "Comment fonctionne l'échange ?", a: "Pas d'argent. Vous proposez quelque chose en retour — un repas, des légumes, un coup de main futur. L'échange se décide entre vous." },
                { q: "Faut-il être abonné ?", a: "Non. Les petites missions sont accessibles à tous les membres inscrits, sans abonnement." },
                { q: "Quels types de missions peut-on publier ?", a: "Tout ce qui tourne autour de la maison, du jardin, des animaux et du quartier. Tonte, arrosage, promenade de chien, bricolage, cuisine…" },
                { q: "Comment je sais que la personne est fiable ?", a: "Chaque membre a un profil avec avis, badges et score de confiance. Vous pouvez échanger par messagerie avant de vous engager." },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4">
                  <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <PublicFooter />

        {/* Schema.org — Service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Petites missions Guardiens",
              description: "Entraide communautaire entre gens du coin. Échanges sans argent autour des animaux, du jardin et de la maison.",
              areaServed: { "@type": "Country", name: "France" },
              provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
            }),
          }}
        />

        {/* Schema.org — FAQPage */}
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "C'est quoi les petites missions ?", acceptedAnswer: { "@type": "Answer", text: "Des coups de main entre gens du coin — jardinage, animaux, bricolage — échangés sans argent. Vous proposez ce que vous savez faire, ou publiez ce dont vous avez besoin." } },
              { "@type": "Question", name: "C'est vraiment à 0 € ?", acceptedAnswer: { "@type": "Answer", text: "Oui. L'entraide entre gens du coin est à 0 € pour tous, pour toujours. Aucun frais, aucune commission." } },
              { "@type": "Question", name: "Comment fonctionne l'échange ?", acceptedAnswer: { "@type": "Answer", text: "Pas d'argent. Vous proposez quelque chose en retour — un repas, des légumes, un coup de main futur. L'échange se décide entre vous." } },
              { "@type": "Question", name: "Faut-il être abonné ?", acceptedAnswer: { "@type": "Answer", text: "Non. Les petites missions sont accessibles à tous les membres inscrits, sans abonnement." } },
              { "@type": "Question", name: "Quels types de missions peut-on publier ?", acceptedAnswer: { "@type": "Answer", text: "Tout ce qui tourne autour de la maison, du jardin, des animaux et du quartier. Tonte, arrosage, promenade de chien, bricolage, cuisine…" } },
              { "@type": "Question", name: "Comment je sais que la personne est fiable ?", acceptedAnswer: { "@type": "Answer", text: "Chaque membre a un profil avec avis, badges et score de confiance. Vous pouvez échanger par messagerie avant de vous engager." } },
            ],
          })}</script>
        </Helmet>
      </div>
    </>
  );
};

export default SmallMissionsPublic;
