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
import FreePeriodBanner from "@/components/marketing/FreePeriodBanner";
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

/* ── Sticky CTA mobile (QW#6) — visible uniquement <md, après scroll de 600px ── */
function StickyMobileCta({ onPropose, onAsk }: { onPropose: () => void; onAsk: () => void }) {
 const [visible, setVisible] = useState(false);
 useEffect(() => {
 const onScroll = () => setVisible(window.scrollY > 600);
 window.addEventListener("scroll", onScroll, { passive: true });
 onScroll();
 return () => window.removeEventListener("scroll", onScroll);
 }, []);
 return (
 <div
 className={`md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 bg-background/95 backdrop-blur border-t border-border/60 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
 style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
 >
 <div className="flex gap-2">
 <Button onClick={onPropose} className="flex-1 bg-primary text-primary-foreground rounded-full h-11 text-sm font-semibold">
 Je propose mon aide
 </Button>
 <Button onClick={onAsk} variant="outline" className="flex-1 border-2 border-primary text-primary rounded-full h-11 text-sm font-semibold">
 J'ai besoin
 </Button>
 </div>
 </div>
 );
}

/* ── data ── */
const examples = [
 { img: spotVerger, alt: "Panier en osier rempli de fruits frais — illustration gouache", title: "Verger à ramasser", text: "Venir ramasser les fruits avant qu'ils tombent contre un énorme panier de fruits frais à emporter.", badge: "Fruits · entre gens du coin" },
 { img: spotJardin, alt: "Panier d'herbes aromatiques et sécateur — illustration gouache", title: "Coup de main au jardin", text: "Donner un coup de main pour planter, désherber ou tailler — et venir se servir librement à la récolte.", badge: "Jardinage · entre gens du coin" },
 { img: spotPoules, alt: "Poule rousse devant un nid de paille avec des œufs — illustration gouache", title: "Poules à garder", text: "Nourrir les poules et ramasser les œufs pendant 10 jours contre des œufs frais à volonté au retour.", badge: "Œufs · entre gens du coin" },
 { img: spotChien, alt: "Chien assis avec sa laisse en cuir — illustration gouache", title: "Chien à promener", text: "Deux semaines de balades contre son chien promené la prochaine fois qu'on part.", badge: "Réciprocité · entre gens du coin" },
 { img: spotBricolage, alt: "Boîte à outils en bois ouverte avec marteau, tournevis et clé — illustration gouache", title: "Petit bricolage", text: "Un coup de main pour monter une étagère, fixer un meuble ou changer un robinet, contre un vrai repas fait maison.", badge: "Repas · entre gens du coin" },
 { img: spotBienetre, alt: "Tasse en céramique, brin de lavande et galet — illustration gouache", title: "Énergie & bien-être", text: "Une séance de Reiki, un massage ou un moment de méditation partagés, en échange d'un service rendu en retour.", badge: "Échange · entre gens du coin" },
];

/* ── FAQ items (source unique pour Accordion HTML + Schema FAQPage) ── */
const FAQ_ITEMS: { q: string; a: string }[] = [
 { q: "C'est quoi les petites missions ?", a: "Des coups de main entre gens du coin — jardinage, animaux, bricolage — échangés sans argent. Vous proposez ce que vous savez faire, ou publiez ce dont vous avez besoin." },
 { q: "C'est vraiment gratuit ?", a: "Oui. L'entraide entre gens du coin est gratuite pour tous. Aucun frais, aucune commission." },
 { q: "Comment fonctionne l'échange ?", a: "Pas d'argent. Vous proposez quelque chose en retour — un repas, des légumes, un coup de main futur. L'échange se décide entre vous." },
 { q: "Faut-il être abonné ?", a: "Non. Les petites missions sont accessibles à tous les membres inscrits, sans abonnement." },
 { q: "Quels types de missions peut-on publier ?", a: "Tout ce qui tourne autour de la maison, du jardin, des animaux et du quartier. Tonte, arrosage, promenade de chien, bricolage, cuisine…" },
 { q: "Comment je sais que la personne est fiable ?", a: "Chaque membre a un profil avec avis, badges et score de confiance. Vous pouvez échanger par messagerie avant de vous engager." },
 { q: "Comment proposer une petite mission près de chez vous ?", a: "Pour proposer une petite mission, vous publiez votre demande ou votre offre depuis votre espace Guardiens. Décrivez clairement ce dont vous avez besoin (ou ce que vous proposez), précisez votre ville et ce que vous donnez en échange. Les gens du coin la voient et répondent s'ils peuvent vous aider. C'est aussi simple que ça." },
 { q: "Quelle différence entre une petite mission et une garde sur Guardiens ?", a: "Une garde, c'est une présence dans la durée : un gardien dort chez vous, prend soin de vos animaux et de votre maison pendant votre absence. Une petite mission, c'est un coup de main ponctuel : arroser les plantes, promener un chien une heure, monter un meuble. La garde nécessite un abonnement gardien (6,99€/mois). Les petites missions sont gratuites pour tous, sans abonnement requis." },
 { q: "L'entraide entre gens du coin est-elle réservée à certaines villes ?", a: "Non. Guardiens est ouvert dans toute la France. Les missions sont visibles uniquement aux personnes situées à proximité de chez vous, pour préserver l'esprit local de l'échange. Plus la communauté grandit dans votre quartier, plus les missions trouvent rapidement preneur." },
 { q: "Que faire si quelqu'un me propose de l'argent pour une petite mission ?", a: "Refusez. C'est non négociable et c'est ce qui rend Guardiens unique. Aucun argent ne doit circuler dans une petite mission. Si quelqu'un insiste, signalez-le à l'équipe Guardiens via le formulaire de contact. Les échanges acceptés sont en nature : produits du jardin, repas, service rendu en retour." },
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
 // `.single()` rejette quand la vue ne renvoie pas exactement une ligne
 // (PGRST116). On dégrade silencieusement : les KPIs restent à 0 et
 // l'erreur ne pollue pas le moniteur d'`unhandled_rejection`.
 try {
        const { data: rows } = await supabase.rpc("get_public_stats");
        const data = Array.isArray(rows) ? rows[0] : rows;
 if (data) {
 if (typeof data.missions_entraide === "number") setKpiMissions(data.missions_entraide);
 if (typeof data.total_inscrits === "number") setKpiHelpers(data.total_inscrits);
 }
 } catch (err) {
 console.warn("public_stats unavailable:", err);
 }
 };
 void load();
 }, []);

 /** Auth-aware navigation: redirect to register if not logged in */
  const goToCreate = () =>
 navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");
 // QW#2 — corrige la route : on envoie sur la page de PUBLICATION d'une offre, pas sur la liste filtrée
 const goToHelp = () =>
 navigate(isAuthenticated ? "/petites-missions/creer?type=offre" : "/inscription?redirect=/petites-missions/creer?type=offre");

 return (
 <>
 <PageMeta
 title="Petites missions d'entraide locale — Guardiens"
 description="Échangez des coups de main entre gens du coin. Jardinage, animaux, bricolage — sans argent. Gratuite pour tous."
 />

 <div className="min-h-screen bg-background font-body">
 {/* ═══ HEADER ═══ */}
  <PublicHeader />
  <FreePeriodBanner />
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
 Quelqu'un, près de chez vous,<br />a besoin d'un coup de main.
 </h1>
 <p className="font-heading text-xl md:text-2xl italic text-foreground/70 mt-4 max-w-lg mx-auto">
 Vous avez une heure, un savoir-faire, deux mains disponibles ? C'est déjà tout ce qu'il faut.
 </p>
 </Reveal>

 <Reveal delay={0.2}>
 <p className="font-body text-lg text-foreground/70 leading-relaxed text-center max-w-lg mx-auto mt-6">
 Une plante à arroser, un colis à réceptionner, un chien à sortir une heure, un meuble à monter. Des micro-services qui changent une journée — et qui ne demandent ni argent, ni engagement.
 </p>
 </Reveal>

 <Reveal delay={0.3}>
 {/* QW#1 — CTA "offrir" en principal (friction sociale ~0), "demander" en secondaire */}
 <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
 <Button onClick={goToHelp} className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200">
 Je propose mon aide
 </Button>
 <Button onClick={goToCreate} variant="outline" className="border-2 border-primary text-primary rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-200">
 J'ai besoin d'un coup de main
 </Button>
 </div>
 <p className="text-xs text-foreground/50 mt-4">
 Gratuite pour tous. Aucun engagement, aucun jugement.
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

  {/* ═══ SECTION 2 — LA CONVICTION (fusionnée avec ex-3.5) ═══ */}
 <section className="bg-background border-t border-border/40">
 <div className="max-w-2xl mx-auto px-6 py-20 md:py-24">
 <Reveal>
 <p className="font-heading text-xl md:text-2xl italic leading-relaxed text-foreground/85 text-center mb-8">
 On n'a pas créé les petites missions pour que les gens se rendent des services. On les a créées parce que les échanges les plus vrais ne passent pas par un virement.
 </p>
 </Reveal>
 <Reveal delay={0.1}>
 <p className="font-heading text-lg italic leading-relaxed text-foreground/75 text-center">
 Vos bras pour planter les légumes ce week-end. Ses tomates cet été. Peut-être son aide pour repeindre la cuisine en septembre. <span className="text-foreground/90">L'échange n'a pas besoin d'être immédiat pour être juste.</span>
 </p>
 </Reveal>
 </div>
 </section>

 {/* ═══ SECTION 2.5 — LEVÉE DES FREINS ═══ */}
 <section className="bg-background border-t border-border/40">
 <div className="max-w-3xl mx-auto px-6 py-24 md:py-28">
 <Reveal>
 <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
 Ce qui vous retient n'a pas lieu d'être
 </p>
 <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-14">
 Vous hésitez ? C'est normal.<br />Voici pourquoi vous pouvez y aller.
 </h2>
 </Reveal>

 <div className="space-y-10">
 {[
 {
 fear: "« Je ne veux pas déranger. »",
 answer: "Personne ne reçoit votre demande de force. Les gens du coin la voient, et seuls ceux qui ont envie d'aider répondent. Vous ne dérangez personne — vous offrez une opportunité.",
 },
 {
 fear: "« Je n'ai rien à offrir en échange. »",
 answer: "Un café, un sourire, une conversation, un panier de tomates l'été prochain. L'échange n'a pas besoin d'être à la hauteur. Il a juste besoin d'être sincère.",
 },
 {
 fear: "« C'est trop petit comme demande. »",
 answer: "Justement. Les petites missions sont faites pour les petites choses — celles qu'on n'ose pas demander parce qu'on a peur de paraître faible ou exigeant. C'est exactement pour ça qu'on a créé cet espace.",
 },
 {
 fear: "« Je ne connais personne ici. »",
 answer: "C'est précisément le bon moment pour publier. Chaque mission est une porte ouverte sur une rencontre. La première est toujours la plus difficile à oser — la suivante devient évidente.",
 },
 {
 fear: "« Et si personne ne répond ? »",
 answer: "Ça peut arriver. Reformulez, relancez, ou proposez vous-même votre aide ailleurs. La communauté grandit chaque semaine. Votre demande n'est jamais perdue — elle peut trouver quelqu'un demain.",
 },
 ].map((item, i) => (
 <Reveal key={i} delay={0.05 * i}>
 <div className="grid md:grid-cols-[1fr_2fr] gap-4 md:gap-10 items-start border-b border-border/40 pb-10 last:border-0 last:pb-0">
 <p className="font-heading text-lg md:text-xl italic text-foreground/50 leading-snug">
 {item.fear}
 </p>
 <p className="font-body text-base md:text-lg text-foreground/85 leading-relaxed">
 {item.answer}
 </p>
 </div>
 </Reveal>
 ))}
 </div>

 <Reveal delay={0.3}>
 <div className="mt-16 text-center">
 <p className="font-heading text-xl md:text-2xl italic text-foreground/80 leading-relaxed max-w-xl mx-auto">
 La vraie question n'est pas « est-ce que j'ai le droit de demander ? ».<br />
 C'est « qu'est-ce que je rate en n'osant pas ? ».
 </p>
 <Button onClick={goToCreate} className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200 mt-8">
 J'ose, je publie ma première mission
 </Button>
 </div>
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
 J'ose demander <span>→</span>
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
 J'ai du temps à offrir <span>→</span>
 </button>
 </div>
 </Reveal>
 </div>
  </div>
 </section>

 {/* (ex-section 3.5 « Pourquoi l'entraide fonctionne » fusionnée avec la section 2 — supprimée) */}

 {/* ═══ SECTION 4 — EXEMPLES ═══ */}
 <section className="bg-background">
 <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
 <Reveal>
 <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
 Ce que les gens s'échangent
 </p>
 <h2 className="font-heading text-4xl md:text-5xl font-semibold text-foreground text-center leading-snug mb-12">
 Le genre de coups de main qu'on échange.
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

 {/* CTA intermédiaire — pic d'intention après les exemples */}
 <Reveal delay={0.35}>
 <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
 <Button onClick={goToCreate} className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200">
 Publier ma première mission
 </Button>
 <Button onClick={goToHelp} variant="outline" className="border-2 border-primary text-primary rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-200">
 Je propose mon aide
 </Button>
 </div>
 </Reveal>
 </div>
 </section>

 {/* ═══ SECTION 4.5 — CE QU'ON ÉCHANGE / CE QU'ON N'ÉCHANGE PAS (densification éditoriale) ═══ */}
 <section className="bg-background border-t border-border/40">
 <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
 <Reveal>
 <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
 Le cadre
 </p>
 <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-3">
 Ce qu'on échange (et ce qu'on n'échange pas)
 </h2>
  <p className="font-body text-base md:text-lg italic text-foreground/60 text-center max-w-xl mx-auto mb-12">
  Pour que chacun soit au bon endroit.
  </p>
 </Reveal>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Bloc gauche — ce qu'on échange */}
 <Reveal delay={0.05}>
 <div className="bg-card border border-border rounded-2xl p-8 md:p-10 h-full">
 <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-6">
 Ce qu'on échange
 </h3>
 <div className="space-y-6">
 {[
 {
 cat: "Animaux",
 desc: "Le quotidien d'un compagnon, sans engagement professionnel.",
 ex: "Promener un chien, nourrir des chats le weekend, accompagner chez le vétérinaire, garder les poules quelques jours.",
 },
 {
 cat: "Maison & jardin",
 desc: "Les petits gestes qui évitent qu'une absence vire au casse-tête.",
 ex: "Arroser les plantes, relever le courrier, réceptionner un colis, tondre la pelouse occasionnellement.",
 },
 {
 cat: "Compétences & temps",
 desc: "Ce que vous savez faire et que quelqu'un, à côté, ne sait pas encore.",
 ex: "Conseils, dépannage informatique léger, écoute, transmission d'un savoir, bricolage simple.",
 },
 ].map((item) => (
 <div key={item.cat} className="flex gap-4">
 <span
 aria-hidden="true"
 className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm mt-0.5"
 >
 ✓
 </span>
 <div>
 <h4 className="font-heading text-base md:text-lg font-semibold text-foreground mb-1">
 {item.cat}
 </h4>
 <p className="font-body text-sm md:text-base text-foreground/70 leading-relaxed mb-1">
 {item.desc}
 </p>
 <p className="font-body text-sm text-foreground/60 leading-relaxed italic">
 {item.ex}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </Reveal>

 {/* Bloc droit — ce qu'on n'échange pas */}
 <Reveal delay={0.1}>
 <div className="bg-card border border-border rounded-2xl p-8 md:p-10 h-full">
 <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-6">
 Ce qu'on n'échange pas
 </h3>
 <div className="space-y-5">
 {[
 "De l'argent. Jamais. C'est non négociable, et c'est précisément ce qui rend l'échange beau.",
 "Des services réguliers de garde d'enfants ou d'aide à la personne professionnelle. Pour ça, il faut un cadre déclaré et des assurances adaptées.",
 "Des objets à acheter, à louer, à troquer. Guardiens n'est pas un site de petites annonces.",
 "Du travail au noir déguisé en « petit coup de main ». Si c'est un job, c'est un job — et ça ne passe pas par Guardiens.",
 ].map((txt, i) => (
 <div key={i} className="flex gap-4">
 <span
 aria-hidden="true"
 className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-foreground/50 flex items-center justify-center font-bold text-sm mt-0.5"
 >
 ✗
 </span>
 <p className="font-body text-sm md:text-base text-foreground/75 leading-relaxed">
 {txt}
 </p>
 </div>
 ))}
 </div>
 </div>
 </Reveal>
 </div>
 </div>
 </section>

 {/* ═══ SECTION 4.6 — COMMENT ÇA SE PASSE, CONCRÈTEMENT (densification éditoriale) ═══ */}
 <section className="bg-muted/30 border-t border-border/40">
 <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
 <Reveal>
 <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
 Sur le terrain
 </p>
 <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-3">
 Comment ça se passe, concrètement
 </h2>
 <p className="font-body text-base md:text-lg italic text-foreground/60 text-center max-w-xl mx-auto mb-12">
 Trois exemples typiques de missions réalisées sur Guardiens.
 </p>
 </Reveal>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 {
 title: "Une demande d'arrosage",
 text: "Une habitante de la Croix-Rousse part deux semaines en juillet. Elle propose une corbeille de tomates de son potager, contre l'arrosage trois fois par semaine. Quatre personnes du quartier répondent en moins de vingt-quatre heures.",
 },
 {
 title: "Une offre de promenade",
 text: "Quelqu'un à Caluire propose de promener un chien le matin avant le travail, contre une bière partagée de temps en temps. Trois mois plus tard, il connaît la moitié du quartier et a trouvé un café où on lui garde sa table.",
 },
 {
 title: "Un échange de compétences",
 text: "À Annecy, une demande de cours de cuisine italienne contre un coup de main au montage d'une terrasse en bois. Les deux parties ont gagné un samedi mémorable, un nouveau contact, et l'envie de recommencer.",
 },
 ].map((s, i) => (
 <Reveal key={s.title} delay={0.05 * i}>
 <div className="bg-card border border-border rounded-2xl p-6 md:p-7 h-full flex flex-col">
 <h3 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-3">
 {s.title}
 </h3>
 <p className="font-body text-sm md:text-base text-foreground/75 leading-relaxed flex-1">
 {s.text}
 </p>
 </div>
 </Reveal>
 ))}
 </div>

  <Reveal delay={0.2}>
 <p className="text-center font-body text-sm text-foreground/55 italic mt-10 max-w-xl mx-auto">
 Trois situations typiques de l'entraide entre gens du coin. À vous de les faire exister près de chez vous.
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

  {/* ═══ SECTION 5.5 — POUR ALLER PLUS LOIN (maillage interne) ═══ */}
  <section className="py-20 bg-background">
  <div className="max-w-6xl mx-auto px-6">
  <Reveal>
  <div className="text-center mb-12">
  <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">Pour aller plus loin</span>
  <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
  Comment l'entraide locale prend forme près de chez vous
  </h2>
  </div>
  </Reveal>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {[
  {
  href: "/actualites/jardinage-entraide-quartier-lyon",
  category: "Jardinage",
  title: "Trouver de l'aide pour son jardin, sans passer par une agence",
  desc: "Tonte, taille, désherbage : comment l'entraide entre gens du coin remplace les pros dans bien des cas.",
  cta: "Lire l'article →",
  },
  {
  href: "/actualites/arroser-plantes-vacances-lyon",
  category: "Vacances",
  title: "Qui peut arroser vos plantes pendant les vacances ?",
  desc: "La solution la plus simple est souvent à trois étages au-dessus. On vous explique comment l'organiser.",
  cta: "Lire l'article →",
  },
  {
  href: "/actualites/courses-aide-domicile-entraide-senior-lyon",
  category: "Quotidien",
  title: "Aide aux courses entre particuliers : comment ça marche",
  desc: "Un coup de main pour faire les courses, accompagner un rendez-vous médical, ou simplement passer un moment ensemble.",
  cta: "Lire l'article →",
  },
   {
   href: "/actualites/petites-missions-entraide-guardiens",
   category: "Le guide complet",
   title: "Petites missions d'entraide : pourquoi ça existe, comment s'y mettre",
   desc: "Le mode d'emploi détaillé : la philosophie, les règles, les premières missions à oser, les pièges à éviter.",
   cta: "Lire l'article →",
   },
   {
   href: "/actualites/petites-missions-entraide-guide",
   category: "Premiers pas",
   title: "Comment publier votre première mission, étape par étape",
   desc: "Trois minutes pour décrire votre besoin ou votre offre. Voici comment formuler une demande qui obtient des réponses.",
   cta: "Suivre le guide →",
   },
  {
  href: "/faq#petites-missions",
  category: "FAQ",
  title: "Questions fréquentes sur l'entraide et la garde",
  desc: "Tout ce qu'il faut savoir avant de publier votre première demande ou de proposer votre aide.",
  cta: "Consulter la FAQ →",
  },
  ].map((card, i) => (
  <Reveal key={card.href} delay={0.05 * i}>
  <a
  href={card.href}
  className="group block h-full bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200"
  >
  <span className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3 block">{card.category}</span>
  <h3 className="text-lg font-heading font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
  {card.title}
  </h3>
  <p className="text-sm font-body text-foreground/70 leading-relaxed line-clamp-3">
  {card.desc}
  </p>
  <span className="mt-4 inline-flex items-center text-sm font-body text-primary font-medium group-hover:underline">
  {card.cta}
  </span>
  </a>
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
 Osez. Vraiment.<br />Personne ne vous jugera.
 </h2>
 </Reveal>
 <Reveal delay={0.1}>
 <p className="font-body text-lg text-white/85 leading-relaxed mb-10">
 Le pire qui puisse arriver, c'est que personne ne réponde. Le meilleur, c'est de rencontrer quelqu'un qui change votre semaine. Gratuit. Pour tous. Sans abonnement requis.
 </p>
 </Reveal>
 <Reveal delay={0.2}>
  <div className="flex flex-col sm:flex-row gap-4 justify-center">
 <Button onClick={goToHelp} className="bg-white text-primary rounded-full px-10 py-4 h-auto text-sm font-bold tracking-wide hover:bg-white/90 hover:scale-[1.02] transition-all duration-200">
 Je propose mon aide
 </Button>
 <Button onClick={goToCreate} className="bg-transparent border-2 border-white/70 text-white rounded-full px-10 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-white/15 transition-all duration-200">
 J'ai besoin d'un coup de main
 </Button>
 </div>
 <p className="text-xs text-white/50 mt-6">
 Gratuit · Badge Fondateur · Accès jusqu'au 14 juillet
 </p>
 </Reveal>
 </div>
 </section>

 {/* ═══ SECTION 7 — FAQ ═══ */}
  <section className="bg-muted/50 py-16">
   <div className="max-w-3xl mx-auto px-6">
    <h2 className="font-heading text-2xl font-bold text-center mb-10">Questions fréquentes</h2>
    <Accordion type="single" collapsible className="space-y-2">
     {FAQ_ITEMS.map((faq, i) => (
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

  {/* Schema.org — Service + FAQPage (dans <head> via Helmet) */}
  <Helmet>
   <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Petites missions Guardiens",
    description: "Entraide communautaire entre gens du coin. Échanges sans argent autour des animaux, du jardin et de la maison.",
    url: "https://guardiens.fr/petites-missions",
    serviceType: [
     "Entraide locale",
     "Garde d'animaux ponctuelle",
     "Aide jardinage",
     "Petits services entre gens du coin",
     "Échange de compétences",
    ],
    areaServed: { "@type": "Country", name: "France" },
    provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
    audience: {
     "@type": "Audience",
     name: "Habitants de France souhaitant échanger des services en nature avec les gens de leur coin",
    },
    offers: {
     "@type": "Offer",
     price: "0",
     priceCurrency: "EUR",
     description: "Service entièrement gratuit pour tous, sans abonnement requis. Aucune transaction financière entre membres.",
    },
   })}</script>
   <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((faq) => ({
     "@type": "Question",
     name: faq.q,
     acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
   })}</script>
   </Helmet>

   {/* QW#6 — Sticky CTA mobile : apparaît après dépassement du hero, masqué en desktop */}
   <StickyMobileCta onPropose={goToHelp} onAsk={goToCreate} />
   </div>
  </>
 );
};

export default SmallMissionsPublic;
