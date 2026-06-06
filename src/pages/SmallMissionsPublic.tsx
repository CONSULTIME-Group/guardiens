import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { useEffect, useRef, useState, type ReactNode } from "react";
import PublicHeader from "@/components/layout/PublicHeader";
import FreePeriodBanner from "@/components/marketing/FreePeriodBanner";
import ReachReassuranceBanner from "@/components/marketing/ReachReassuranceBanner";
import PublicFooter from "@/components/layout/PublicFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  MISSIONS_EXAMPLES,
  MISSIONS_FAQ,
  MISSIONS_TESTIMONIALS,
} from "@/data/missionsPublicContent";


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

/* ── Sticky CTA mobile (QW#6), visible uniquement <md, après scroll de 600px ── */
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

/* ── data (centralisée dans @/data/missionsPublicContent) ── */
const examples = MISSIONS_EXAMPLES;
const FAQ_ITEMS = MISSIONS_FAQ;

interface OpenMissionRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  created_at: string;
  date_needed: string | null;
  duration_estimate: string | null;
  exchange_offer: string | null;
  photos: string[] | null;
  mission_type: "besoin" | "offre" | null;
}

/* Date relative en français, court */
function timeAgoFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  if (w < 5) return `il y a ${w} sem`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDateNeeded(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
}

const CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  errand: "Courses",
  tech: "Technique",
  company: "Compagnie",
  home: "Maison",
  other: "Autre",
};

const DURATION_LABEL: Record<string, string> = {
  "1-2h": "1-2 heures",
  half_day: "Demi-journée",
  several: "Plusieurs passages",
};

/* ── page ── */
const SmallMissionsPublic = () => {
 const navigate = useNavigate();
 const { isAuthenticated } = useAuth();

  /* KPIs */
  const [kpiMissions, setKpiMissions] = useState<number>(0);
  const [kpiHelpers, setKpiHelpers] = useState<number>(0);

  /* Missions ouvertes, preuve sociale dynamique */
  const [openMissions, setOpenMissions] = useState<OpenMissionRow[]>([]);

  useEffect(() => {
    const load = async () => {
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

  const [missionTab, setMissionTab] = useState<"all" | "besoin" | "offre">("all");

  useEffect(() => {
    const loadOpen = async () => {
      try {
         const { data } = await supabase
           .from("small_missions")
           .select("id, title, description, category, city, created_at, date_needed, duration_estimate, exchange_offer, photos, mission_type")
           .eq("status", "open")
           .order("created_at", { ascending: false })
           .limit(12);
         if (data) setOpenMissions(data as unknown as OpenMissionRow[]);
      } catch (err) {
        console.warn("small_missions unavailable:", err);
      }
    };
    void loadOpen();
  }, []);

  const filteredOpenMissions = missionTab === "all"
    ? openMissions
    : openMissions.filter(m => (m.mission_type ?? "besoin") === missionTab);
  const besoinCount = openMissions.filter(m => (m.mission_type ?? "besoin") === "besoin").length;
  const offreCount = openMissions.filter(m => (m.mission_type ?? "besoin") === "offre").length;

 /** Auth-aware navigation: redirect to register if not logged in */
  const goToCreate = () =>
 navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");
 // QW#2, corrige la route : on envoie sur la page de PUBLICATION d'une offre, pas sur la liste filtrée
 const goToHelp = () =>
 navigate(isAuthenticated ? "/petites-missions/creer?type=offre" : "/inscription?redirect=/petites-missions/creer?type=offre");

 return (
 <>
 <PageMeta
 title="Petites missions d'entraide locale, Guardiens"
 description="Échangez des coups de main entre gens du coin. Jardinage, animaux, bricolage, sans argent. Gratuit pour tous."
 />

 <div className="min-h-screen bg-background font-body">
 {/* ═══ HEADER ═══ */}
  <PublicHeader />
  <FreePeriodBanner />
 <PageBreadcrumb items={[{ label: "Petites missions" }]} />

 {/* ═══ SECTION 1, HERO ═══ */}
 <section className="bg-background">
 <div className="max-w-2xl mx-auto px-6 py-20 md:py-28 text-center">
 <Reveal>
 <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-6">
 Petites missions · Entraide
 </p>
 </Reveal>

 <Reveal delay={0.1}>
  <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight max-w-2xl mx-auto">
 Un coup de main, près de chez vous.
 </h1>
 <p className="font-heading text-lg md:text-xl italic text-foreground/70 mt-4 max-w-lg mx-auto">
 Gratuit, sans engagement. Publiez une demande ou proposez votre aide.
 </p>
 </Reveal>

 <Reveal delay={0.25}>
 {/* QW#1, CTA "offrir" en principal (friction sociale ~0), "demander" en secondaire */}
 <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
 <Button onClick={goToHelp} className="bg-primary text-primary-foreground rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200">
 Je propose mon aide
 </Button>
 <Button onClick={goToCreate} variant="outline" className="border-2 border-primary text-primary rounded-full px-9 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-200">
 J'ai besoin d'un coup de main
 </Button>
 </div>
  <p className="text-xs text-foreground/50 mt-4">
 Gratuit pour tous. Aucun engagement, aucun jugement.
 </p>
 </Reveal>

 {/* ── Lien direct vers le feed live ── */}
 {openMissions.length > 0 && (
   <Reveal delay={0.3}>
     <a
       href="#missions-ouvertes"
       className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
     >
       <span className="relative flex h-2 w-2">
         <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
         <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
       </span>
       {openMissions.length} mission{openMissions.length > 1 ? "s" : ""} ouverte{openMissions.length > 1 ? "s" : ""} en ce moment →
     </a>
   </Reveal>
 )}


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

 {/* Réassurance périmètre, promesse mondiale, pas régionale */}
 <Reveal delay={0.45}>
 <div className="mt-8 max-w-md mx-auto">
 <ReachReassuranceBanner variant="inline" className="text-center" />
 </div>
 </Reveal>
 </div>
 </section>

  {/* ═══ SECTION 1.5, MISSIONS OUVERTES (preuve sociale dynamique, remontée après hero) ═══ */}
  {openMissions.length > 0 && (
    <section id="missions-ouvertes" className="bg-muted/40 border-t border-border/40 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <Reveal>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/70">
              En direct · {openMissions.length} mission{openMissions.length > 1 ? "s" : ""} ouverte{openMissions.length > 1 ? "s" : ""}
            </p>
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-3">
            Voici les coups de main demandés en ce moment.
          </h2>
          <p className="font-body text-base text-foreground/65 text-center max-w-xl mx-auto mb-12">
            Cliquez sur une mission pour la lire, ou publiez la vôtre en deux minutes.
          </p>
        </Reveal>
        {(() => {
          const count = openMissions.length;
          return (
            <div className="flex flex-col gap-3 max-w-3xl mx-auto">
              {openMissions.map((m, i) => {
                const dateNeeded = formatDateNeeded(m.date_needed);
                const durationLabel = m.duration_estimate
                  ? DURATION_LABEL[m.duration_estimate] || null
                  : null;
                const thumb = m.photos && m.photos.length > 0 ? m.photos[0] : null;
                const shareMission = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = `${window.location.origin}/petites-missions/${m.id}`;
                  const shareData = { title: `Coup de main : ${m.title}`, text: m.description?.slice(0, 140) || "", url };
                  if (typeof navigator !== "undefined" && (navigator as any).share) {
                    try { await (navigator as any).share(shareData); return; } catch { /* fallback */ }
                  }
                  try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
                };
                return (
                  <Reveal key={m.id} delay={0.04 * i}>
                    <Link
                      to={`/petites-missions/${m.id}`}
                      className="group relative flex items-stretch gap-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5 transition-all overflow-hidden p-3 sm:p-4"
                    >
                      <div className="shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={m.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-[10px] font-body font-semibold uppercase tracking-wider text-foreground/40 px-1 text-center leading-tight">
                            {CATEGORY_LABEL[m.category] || "Mission"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-body font-semibold tracking-wide">
                            {CATEGORY_LABEL[m.category] || "Mission"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-foreground/50">{timeAgoFr(m.created_at)}</span>
                            <button
                              type="button"
                              onClick={shareMission}
                              aria-label="Partager cette mission"
                              title="Partager"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            </button>
                          </div>
                        </div>
                        <h3 className="font-heading font-semibold text-foreground leading-snug mb-1 line-clamp-1 text-base">
                          {m.title}
                        </h3>
                        {m.description && (
                          <p className="font-body text-xs text-foreground/65 leading-relaxed mb-2 line-clamp-2">
                            {m.description}
                          </p>
                        )}
                        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/60">
                          <span className="font-medium text-foreground/75">{m.city || "France"}</span>
                          {dateNeeded && <><span aria-hidden>·</span><span>{dateNeeded}</span></>}
                          {durationLabel && <><span aria-hidden>·</span><span>{durationLabel}</span></>}
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}

              {count < 3 && (
                <Reveal delay={0.04 * count}>
                  <button
                    type="button"
                    onClick={goToCreate}
                    className="group flex w-full items-center justify-between gap-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors p-4"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-heading text-base font-semibold text-foreground">
                        Votre demande pourrait être ici.
                      </span>
                      <span className="font-body text-xs text-foreground/70">
                        Publiez un coup de main en deux minutes, gratuit, sans engagement.
                      </span>
                    </div>
                    <span className="inline-flex items-center text-sm font-semibold text-primary group-hover:underline shrink-0">
                      Publier →
                    </span>
                  </button>
                </Reveal>
              )}
            </div>
          );
        })()}
        <Reveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-10">
            <Button onClick={goToCreate} className="bg-primary text-primary-foreground rounded-full px-7 py-3 h-auto text-sm font-semibold">
              Publier ma demande
            </Button>
            <Button onClick={goToHelp} variant="outline" className="border-2 border-primary text-primary rounded-full px-7 py-3 h-auto text-sm font-semibold">
              Proposer mon aide
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )}

  {/* ═══ SECTION 2, LA CONVICTION (fusionnée avec ex-3.5) ═══ */}
 <section className="bg-background border-t border-border/40">
 <div className="max-w-2xl mx-auto px-6 py-20 md:py-24">
 <Reveal>
 <p className="font-heading text-xl md:text-2xl italic leading-relaxed text-foreground/85 text-center mb-8">
 Les petites missions, ce n'est pas une bourse au coup de main. C'est une porte entrouverte sur ce qu'on n'avait pas prévu, la chance d'une rencontre, le goût de l'imprévu, l'envie de découvrir.
 </p>
 </Reveal>
 <Reveal delay={0.1}>
 <p className="font-heading text-lg italic leading-relaxed text-foreground/75 text-center">
 On vient donner une heure pour planter, et l'on repart avec une adresse, une recette, parfois une amitié. On propose un coup de main, et c'est une saison qui s'invente, un lien qui se noue, une histoire qui commence. <span className="text-foreground/90">Parfois un simple service. Parfois bien plus. C'est tout ça, à la fois.</span>
 </p>
 </Reveal>
 </div>
 </section>

 {/* ═══ SECTION 2.5, LEVÉE DES FREINS ═══ */}
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
 answer: "Personne ne reçoit votre demande de force. Les gens du coin la voient, et seuls ceux qui ont envie d'aider répondent. Vous ne dérangez personne, vous offrez une opportunité.",
 },
 {
 fear: "« Je n'ai rien à offrir en échange. »",
 answer: "Un café, un sourire, une conversation, un panier de tomates l'été prochain. L'échange n'a pas besoin d'être à la hauteur. Il a juste besoin d'être sincère.",
 },
 {
 fear: "« C'est trop petit comme demande. »",
 answer: "Justement. Les petites missions sont faites pour les petites choses, celles qu'on n'ose pas demander parce qu'on a peur de paraître faible ou exigeant. C'est exactement pour ça qu'on a créé cet espace.",
 },
 {
 fear: "« Je ne connais personne ici. »",
 answer: "C'est précisément le bon moment pour publier. Chaque mission est une porte ouverte sur une rencontre. La première est toujours la plus difficile à oser, la suivante devient évidente.",
 },
 {
 fear: "« Et si personne ne répond ? »",
 answer: "Ça peut arriver. Reformulez, relancez, ou proposez vous-même votre aide ailleurs. La communauté grandit chaque semaine. Votre demande n'est jamais perdue, elle peut trouver quelqu'un demain.",
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

 {/* ═══ SECTION 3, LES DEUX MODES ═══ */}
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
 { n: "01", t: "Vous décrivez la mission, tonte, bricolage, promener le chien, réceptionner un colis." },
 { n: "02", t: "Vous proposez ce que vous donnez en échange, un repas, des légumes, une bouteille." },
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
 { n: "01", t: "Vous décrivez ce que vous savez faire, jardinage, montage meubles, cuisine, aide aux courses." },
 { n: "02", t: "Vous dites ce que vous aimeriez en échange, ou vous laissez l'autre proposer." },
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

 {/* (ex-section 3.5 « Pourquoi l'entraide fonctionne » fusionnée avec la section 2, supprimée) */}

 {/* ═══ SECTION 4, EXEMPLES ═══ */}
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
 L'échange se décide entre vous. Parfois immédiat. Parfois à la saison prochaine. C'est vous qui décidez, pas la plateforme.
 </p>
 </Reveal>

 {/* CTA intermédiaire, pic d'intention après les exemples */}
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

 {/* ═══ SECTION 4.5, CE QU'ON ÉCHANGE / CE QU'ON N'ÉCHANGE PAS (densification éditoriale) ═══ */}
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
 {/* Bloc gauche, ce qu'on échange */}
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

 {/* Bloc droit, ce qu'on n'échange pas */}
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
 "Du travail au noir déguisé en « petit coup de main ». Si c'est un job, c'est un job, et ça ne passe pas par Guardiens.",
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

 {/* (ex-section 4.6 « Comment ça se passe » supprimée, doublon avec la section 4 Exemples) */}

 {/* ═══ SECTION 5, RÈGLES ═══ */}
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
 <div className={`text-center md:text-left md:px-8 ${i > 0 ? "md:border-l md:border-accent/15" : ""}`}>
 <h3 className="font-heading text-xl md:text-2xl font-semibold text-accent mb-3">{rule.title}</h3>
 <p className="font-body text-sm md:text-base text-accent/75 leading-relaxed">{rule.text}</p>
 </div>
 </Reveal>
 ))}
 </div>
 </div>
  </section>

  {/* ═══ SECTION MISSIONS OUVERTES (preuve sociale dynamique), placeholder, rendu réel après le hero ═══ */}

  {/* ═══ SECTION 5.7, TÉMOIGNAGES ═══ */}
  <section className="bg-background border-t border-border/40">
    <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
      <Reveal>
        <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 text-center mb-4">
          Ce qu'en disent les membres
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-12">
          Trois échanges, trois rencontres.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MISSIONS_TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={0.08 * i}>
            <figure className="h-full bg-card border border-border rounded-2xl p-8 flex flex-col">
              <blockquote className="font-heading text-base md:text-lg italic text-foreground/85 leading-relaxed flex-1">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-6 pt-4 border-t border-border/60">
                <span className="block font-heading font-semibold text-foreground">{t.name}</span>
                <span className="text-xs text-foreground/55 tracking-wide">{t.city}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  </section>

  {/* ═══ SECTION 5.8, POURQUOI L'ENTRAIDE LOCALE FONCTIONNE (densification YMYL) ═══ */}
  <section className="bg-muted/30 border-t border-border/40">
    <div className="max-w-3xl mx-auto px-6 py-20 md:py-24">
      <Reveal>
        <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4">
          Le fond de l'idée
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground leading-snug mb-8">
          Pourquoi l'entraide entre gens du coin fonctionne
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
          Quand on demande un service à une personne du quartier, il se passe quelque chose qu'aucune plateforme tarifée ne peut reproduire : la relation existe avant la transaction. Vous croisez la personne au marché. Vous savez où elle habite. Vous avez intérêt, l'un comme l'autre, à ce que l'échange se passe bien, parce que vous allez vous revoir.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
          Le coût caché des services payants
        </h3>
        <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
          Faire venir un professionnel pour arroser des plantes, déplacer un meuble ou promener un chien revient souvent à 25-40 € par intervention. Sur une saison, le calcul devient déraisonnable pour des gestes qui prennent quinze minutes à une personne du coin. La transaction monétaire transforme un service simple en prestation, avec ce qu'elle implique de cadre, de TVA, et de distance émotionnelle.
        </p>
        <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
          L'entraide gratuite réintroduit la souplesse. Une heure aujourd'hui, un panier de légumes la semaine prochaine. Un coup de main pour un déménagement, un dîner partagé en retour. Personne ne tient les comptes, et c'est précisément ce qui rend l'échange durable.
        </p>
      </Reveal>

      <Reveal delay={0.15}>
        <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
          Ce que la loi française autorise (et ce qu'elle proscrit)
        </h3>
        <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
          L'entraide non monétaire entre particuliers est parfaitement légale en France, à condition de respecter trois principes simples. D'abord, aucune somme d'argent ne doit circuler, la contrepartie en nature (repas, produits du jardin, service rendu en retour) reste libre, mais l'argent transforme l'échange en travail dissimulé. Ensuite, le service rendu doit rester ponctuel et accessoire : si la même personne vient garder vos enfants tous les mercredis, ce n'est plus de l'entraide, c'est un emploi à déclarer (chèque emploi-service, par exemple). Enfin, certains domaines restent réservés aux professionnels : aide à la personne médicalisée, garde d'enfants régulière, électricité, plomberie sous pression.
        </p>
        <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed">
          Les petites missions Guardiens s'inscrivent strictement dans ce cadre : un coup de main, ponctuel, sans transaction financière, autour de la maison, du jardin, des animaux. C'est volontairement étroit, pour rester sain.
        </p>
      </Reveal>
    </div>
  </section>

  {/* ═══ SECTION 5.5, POUR ALLER PLUS LOIN (maillage interne) ═══ */}
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

  {/* ═══ SECTION 6, CTA FINAL ═══ */}
 <section className="bg-primary">
 <div className="max-w-2xl mx-auto px-6 py-24 md:py-32 text-center">
 <Reveal>
  <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary-foreground leading-tight mb-6">
 Osez. Vraiment.<br />Personne ne vous jugera.
 </h2>
 </Reveal>
 <Reveal delay={0.1}>
 <p className="font-body text-lg text-primary-foreground/85 leading-relaxed mb-10">
 Le pire qui puisse arriver, c'est que personne ne réponde. Le meilleur, c'est de rencontrer quelqu'un qui change votre semaine. Gratuit. Pour tous. Sans abonnement requis.
 </p>
 </Reveal>
 <Reveal delay={0.2}>
  <div className="flex flex-col sm:flex-row gap-4 justify-center">
 <Button onClick={goToHelp} className="bg-primary-foreground text-primary rounded-full px-10 py-4 h-auto text-sm font-bold tracking-wide hover:bg-primary-foreground/90 hover:scale-[1.02] transition-all duration-200">
 Je propose mon aide
 </Button>
 <Button onClick={goToCreate} className="bg-transparent border-2 border-primary-foreground/70 text-primary-foreground rounded-full px-10 py-4 h-auto text-sm font-semibold tracking-wide hover:bg-primary-foreground/15 transition-all duration-200">
 J'ai besoin d'un coup de main
 </Button>
 </div>
 <p className="text-xs text-primary-foreground/70 mt-6">
 Gratuit · Badge Fondateur · Accès jusqu'au 14 juillet
 </p>
 </Reveal>
 </div>
 </section>

 {/* ═══ SECTION 7, FAQ ═══ */}
  <section className="bg-muted/50 py-20 md:py-24">
   <div className="max-w-3xl mx-auto px-6">
    <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center leading-snug mb-10">Questions fréquentes</h2>
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

  {/* Schema.org, Service + FAQPage (dans <head> via Helmet) */}
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
   <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Publier une demande de coup de main près de chez vous",
    description: "Comment publier une petite mission d'entraide gratuite sur Guardiens, sans abonnement.",
    totalTime: "PT3M",
    step: [
     { "@type": "HowToStep", position: 1, name: "Décrire la mission", text: "Vous décrivez la mission, tonte, bricolage, promener le chien, réceptionner un colis." },
     { "@type": "HowToStep", position: 2, name: "Proposer une contrepartie", text: "Vous proposez ce que vous donnez en échange, un repas, des légumes, une bouteille." },
     { "@type": "HowToStep", position: 3, name: "Choisir et rencontrer", text: "Des gens du coin voient votre mission et proposent leur aide. Vous choisissez. Vous vous rencontrez." },
    ],
   })}</script>
   <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Proposer son aide à des gens du coin",
    description: "Comment publier une offre d'aide bénévole sur Guardiens et rencontrer des personnes proches qui en ont besoin.",
    totalTime: "PT3M",
    step: [
     { "@type": "HowToStep", position: 1, name: "Décrire votre savoir-faire", text: "Vous décrivez ce que vous savez faire, jardinage, montage de meubles, cuisine, aide aux courses." },
     { "@type": "HowToStep", position: 2, name: "Préciser la contrepartie", text: "Vous dites ce que vous aimeriez en échange, ou vous laissez la personne proposer." },
     { "@type": "HowToStep", position: 3, name: "Rencontrer et échanger", text: "Quelqu'un a besoin exactement de ça. Il vous contacte. L'échange commence." },
    ],
   })}</script>
   </Helmet>

   {/* QW#6, Sticky CTA mobile : apparaît après dépassement du hero, masqué en desktop */}
   <StickyMobileCta onPropose={goToHelp} onAsk={goToCreate} />
   </div>
  </>
 );
};

export default SmallMissionsPublic;
