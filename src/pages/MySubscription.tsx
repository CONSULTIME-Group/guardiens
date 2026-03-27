import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Star, Lock, CheckCircle2, XCircle, Zap, Search as SearchIcon,
  Mail, Map, PawPrint, Award, Radio, CalendarDays, Handshake, CreditCard, AlertTriangle,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00Z");
const GRACE_END_DATE = new Date("2026-06-13T00:00:00Z");

type SubStatus = "founder_grace" | "founder_expired" | "premium" | "expired" | "never" | "owner";

const benefitCards = [
  { icon: SearchIcon, title: "Annonces complètes", desc: "Photos, descriptions, détails des animaux et infos de contact." },
  { icon: Mail, title: "Postuler illimité", desc: "Candidatez à autant de gardes que vous voulez." },
  { icon: Zap, title: "Messagerie", desc: "Échangez avec les propriétaires. Photos, messages, organisation." },
  { icon: Map, title: "Guides locaux", desc: "Parcs dog-friendly, vétos, sentiers de balade, cafés par ville." },
  { icon: PawPrint, title: "Fiches races", desc: "Caractère, conseils de garde, points d'attention pour chaque race." },
  { icon: Award, title: "Badges et réputation", desc: "Construisez votre profil de confiance avec des écussons." },
  { icon: Radio, title: "Mode disponible", desc: "Rendez-vous visible. Les propriétaires vous trouvent." },
  { icon: CalendarDays, title: "Gardes longue durée", desc: "Accédez aux gardes de 30 jours et plus." },
  { icon: Handshake, title: "Petites missions", desc: "Entraide entre voisins. Coup de main contre bon repas." },
];

const withoutSub = [
  "Voir les détails des annonces",
  "Postuler aux gardes",
  "Envoyer des messages",
  "Apparaître dans la recherche",
  "Mode « Je suis disponible »",
  "Fiches races complètes",
  "Guides locaux détaillés",
  "Articles complets du blog",
  "Gardes longue durée",
  "Badges et métriques",
];

const withSub = [
  "Accès complet aux annonces",
  "Postuler illimité",
  "Messagerie illimitée",
  "Visible par les propriétaires",
  "Mode disponible",
  "Fiches races complètes",
  "Guides locaux complets",
  "Blog complet",
  "Gardes longue durée",
  "Badges et métriques",
];

const ownerPerks = [
  "Publier vos annonces de garde",
  "Recevoir des candidatures de gardiens vérifiés",
  "Messagerie illimitée",
  "Avis croisés détaillés avec écussons",
  "Guide de la maison intégré",
  "Guides locaux (parcs, vétos, balades)",
  "Galerie photos + coups de cœur des gardiens",
  "Petites missions d'entraide",
  "Support",
];

const newSubFeatures = [
  { icon: SearchIcon, title: "Accès complet aux annonces", desc: "Photos, détails, infos de contact" },
  { icon: Mail, title: "Postuler et échanger", desc: "Candidatez et discutez avec les proprios" },
  { icon: Map, title: "Guides locaux", desc: "Parcs, vétos, balades, cafés par ville" },
  { icon: PawPrint, title: "Fiches races", desc: "Tout savoir sur chaque race d'animal" },
  { icon: Star, title: "Badges et réputation", desc: "Construisez votre profil de confiance" },
  { icon: CalendarDays, title: "Gardes longue durée", desc: "Accédez aux gardes de 30 jours et plus" },
];

const MySubscription = () => {
  const { user, activeRole } = useAuth();
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [sub, setSub] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyInfo, setEmergencyInfo] = useState<{ interventions: number } | null>(null);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, subRes, emergencyRes] = await Promise.all([
        supabase.from("profiles").select("is_founder, created_at, role").eq("id", user.id).single(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("emergency_sitter_profiles").select("interventions_count").eq("user_id", user.id).maybeSingle(),
      ]);

      const p = profileRes.data;
      setProfile(p);
      setSub(subRes.data);
      setEmergencyInfo(emergencyRes.data ? { interventions: emergencyRes.data.interventions_count } : null);

      const createdDate = p?.created_at ? new Date(p.created_at) : new Date();
      const isFounder = p?.is_founder || createdDate < LAUNCH_DATE;
      const now = new Date();

      const hasActiveSub = subRes.data?.status === "active";

      if (effectiveRole === "owner") {
        setStatus("owner");
      } else if (hasActiveSub) {
        setStatus("premium");
      } else if (isFounder && now < GRACE_END_DATE) {
        setStatus("founder_grace");
      } else if (isFounder && !hasActiveSub) {
        setStatus("founder_expired");
      } else if (subRes.data?.status === "expired" || subRes.data?.status === "cancelled") {
        setStatus("expired");
      } else {
        setStatus("never");
      }
      setLoading(false);
    };
    load();
  }, [user, effectiveRole]);

  if (loading || !status) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="h-64 flex items-center justify-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const now = new Date();
  const isBeforeLaunch = now < LAUNCH_DATE;
  const isInGracePeriod = now >= LAUNCH_DATE && now < GRACE_END_DATE;
  const daysLeftGrace = Math.max(0, differenceInDays(GRACE_END_DATE, now));
  const totalGraceDays = differenceInDays(GRACE_END_DATE, LAUNCH_DATE); // 31
  const daysElapsed = Math.max(0, totalGraceDays - daysLeftGrace);
  const graceProgressPct = Math.min(100, Math.max(0, Math.round((daysLeftGrace / totalGraceDays) * 100)));
  const graceBarColor = daysLeftGrace < 7 ? "bg-red-500" : daysLeftGrace < 14 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." />

      <h1 className="font-heading text-3xl font-bold">Mon abonnement</h1>

      {/* ═══ FONDATEUR EN PÉRIODE DE GRÂCE ═══ */}
      {status === "founder_grace" && (
        <div className="rounded-xl border-2 border-[#C4956A] bg-[#FEF3C7]/60 dark:bg-amber-900/20 p-6 space-y-5">
          <div className="text-center space-y-2">
            <Star className="h-16 w-16 text-amber-500 mx-auto" fill="currentColor" />
            <h2 className="font-heading text-2xl font-bold">Vous êtes Fondateur</h2>
            <p className="text-sm text-muted-foreground">
              Inscrit avant le 13 mai — votre accès gratuit est valable jusqu'au <strong>13 juin 2026</strong>.
              Après cette date, l'abonnement à 49€/an sera nécessaire pour continuer. Votre badge Fondateur reste à vie, quoi qu'il arrive ✨
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Plan :</span> <span className="font-medium">Fondateur (gratuit)</span></div>
            <div><span className="text-muted-foreground">Accès gratuit jusqu'au :</span> <span className="font-medium">13 juin 2026</span></div>
            <div><span className="text-muted-foreground">Badge :</span> <span className="font-medium">Fondateur — permanent ✨</span></div>
            <div><span className="text-muted-foreground">Après le 13 juin :</span> <span className="font-medium">49€/an</span></div>
          </div>

          {isBeforeLaunch ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1.5" />
              C'est <strong>gratuit pour tout le monde</strong> jusqu'au 13 mai 2026 !
            </div>
          ) : isInGracePeriod ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Il vous reste {daysLeftGrace} jour{daysLeftGrace > 1 ? "s" : ""} d'accès gratuit Fondateur</span>
                <span className="font-medium">{graceProgressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${graceBarColor}`} style={{ width: `${graceProgressPct}%` }} />
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 inline mr-1.5" />
              Votre accès gratuit a expiré. Abonnez-vous pour continuer.
            </div>
          )}

          {emergencyInfo && emergencyInfo.interventions > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <Zap className="h-4 w-4 text-amber-500 inline mr-1.5" />
              Gardien d'urgence — {emergencyInfo.interventions} intervention{emergencyInfo.interventions > 1 ? "s" : ""} → {emergencyInfo.interventions * 3} mois offert{emergencyInfo.interventions * 3 > 1 ? "s" : ""}
            </div>
          )}

          <div className="text-center space-y-1.5">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-base px-8">
              Souscrire maintenant — 49€/an
            </Button>
            <p className="text-xs text-muted-foreground">Activé immédiatement, prolonge votre accès d'un an à partir du 13 juin.</p>
          </div>

          {daysLeftGrace <= 7 && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Derniers jours d'accès gratuit</p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Votre période de grâce expire dans {daysLeftGrace} jour{daysLeftGrace > 1 ? "s" : ""}. 
                  Abonnez-vous pour ne pas perdre l'accès à vos gardes, messages et candidatures.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ FONDATEUR EXPIRÉ (après le 13 juin, pas abonné) ═══ */}
      {status === "founder_expired" && (
        <div className="rounded-xl border-2 border-destructive bg-red-50/60 dark:bg-red-900/10 p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <Lock className="h-16 w-16 text-destructive mx-auto" />
              <Star className="h-6 w-6 text-amber-500 absolute -top-1 -right-1" fill="currentColor" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Votre accès gratuit Fondateur a expiré</h2>
            <p className="text-sm text-muted-foreground">
              Votre période de grâce (jusqu'au 13 juin) est terminée. Votre <strong>badge Fondateur reste à vie</strong>,
              mais l'accès complet nécessite un abonnement.
            </p>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/70 p-4 space-y-2">
              <p className="font-semibold text-sm text-center">Sans abonnement</p>
              {withoutSub.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
              <p className="font-semibold text-sm text-center">Avec abonnement</p>
              {withSub.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center text-sm">
            <Star className="h-4 w-4 text-amber-500 inline mr-1" fill="currentColor" />
            Votre badge Fondateur est <strong>conservé à vie</strong> — il continuera d'apparaître sur votre profil.
          </div>

          <div className="text-center space-y-1.5">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-base px-8">
              S'abonner — 49€/an
            </Button>
            <p className="text-xs text-muted-foreground">Votre profil, vos avis et votre historique sont conservés.</p>
          </div>
        </div>
      )}

      {/* ═══ PREMIUM ═══ */}
      {status === "premium" && (
        <div className="rounded-xl border-2 border-[#2D6A4F] bg-[#D8F3DC]/60 dark:bg-green-900/20 p-6 space-y-5">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="font-heading text-2xl font-bold">Abonnement Premium actif</h2>
            <p className="text-sm text-muted-foreground">Vous avez accès à toutes les fonctionnalités.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Plan :</span> <span className="font-medium">Premium (49€/an)</span></div>
            <div><span className="text-muted-foreground">Début :</span> <span className="font-medium">{sub?.started_at ? format(new Date(sub.started_at), "d MMMM yyyy", { locale: fr }) : "—"}</span></div>
            <div><span className="text-muted-foreground">Prochain renouvellement :</span> <span className="font-medium">{sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : "—"} — 49€</span></div>
            <div><span className="text-muted-foreground">Paiement :</span> <span className="font-medium">•••• 4242</span></div>
          </div>

          {/* Show founder badge if applicable */}
          {profile && (profile.is_founder || (profile.created_at && new Date(profile.created_at) < LAUNCH_DATE)) && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-amber-500 shrink-0" fill="currentColor" />
              <span>Badge <strong>Fondateur</strong> — permanent ✨</span>
            </div>
          )}

          {emergencyInfo && emergencyInfo.interventions > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <Zap className="h-4 w-4 text-amber-500 inline mr-1.5" />
              Gardien d'urgence — {emergencyInfo.interventions} intervention{emergencyInfo.interventions > 1 ? "s" : ""} → {emergencyInfo.interventions * 3} mois offert{emergencyInfo.interventions * 3 > 1 ? "s" : ""}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <CreditCard className="h-4 w-4" /> Gérer mon abonnement
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              Télécharger ma facture
            </Button>
          </div>
        </div>
      )}

      {/* ═══ EXPIRÉ (non-fondateur) ═══ */}
      {status === "expired" && (
        <div className="rounded-xl border-2 border-destructive bg-red-50/60 dark:bg-red-900/10 p-6 space-y-5">
          <div className="text-center space-y-2">
            <Lock className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="font-heading text-2xl font-bold">Votre abonnement a expiré</h2>
            <p className="text-sm text-muted-foreground">Renouvelez pour retrouver l'accès complet.</p>
          </div>

          <div className="text-sm text-muted-foreground">
            Expiré depuis le {sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : "—"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/70 p-4 space-y-2">
              <p className="font-semibold text-sm text-center">Sans abonnement</p>
              {withoutSub.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
              <p className="font-semibold text-sm text-center">Avec abonnement</p>
              {withSub.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center text-sm">
            Un seul week-end en house-sitting, c'est 0€ de logement. <strong>49€/an c'est rentabilisé dès la première garde.</strong>
          </div>

          <div className="text-center space-y-1.5">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-base px-8">
              Renouveler — 49€/an
            </Button>
            <p className="text-xs text-muted-foreground">Votre profil, vos avis et votre historique sont conservés.</p>
          </div>
        </div>
      )}

      {/* ═══ JAMAIS ABONNÉ (post-13 mai) ═══ */}
      {status === "never" && (
        <div className="rounded-xl border-2 border-blue-400 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-900/10 p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl font-bold">Débloquez tout Guardiens</h2>
            <p className="text-sm text-muted-foreground">49€/an — moins de 5€ par mois pour des expériences incroyables.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newSubFeatures.map((f, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <f.icon className="h-6 w-6 text-primary" />
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-1.5">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-base px-8">
              S'abonner — 49€/an
            </Button>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-sm">Est-ce que 49€/an c'est rentable ?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Un week-end = 0€ de logement. 49€ rentabilisés dès la première garde.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-sm">Je peux annuler ?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Oui, à tout moment. Pas d'engagement. Vous êtes prévenu 30 jours avant le renouvellement.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-sm">Mes données sont conservées si je ne m'abonne pas ?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Oui. Votre profil existe toujours. Vous retrouvez tout en vous abonnant.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Nouveau sur Guardiens ?{" "}
            <a href="/actualites/reussir-premiere-garde-house-sitting" className="text-primary underline font-medium">
              Découvrez comment réussir votre première garde →
            </a>
          </p>
        </div>
      )}

      {/* ═══ PROPRIO ═══ */}
      {status === "owner" && (
        <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-[#D8F3DC]/60 dark:bg-green-900/20 p-6 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl font-bold">Votre accès est gratuit — pour toujours 🎉</h2>
            <p className="text-sm text-muted-foreground">En tant que propriétaire, vous avez accès à toutes les fonctionnalités sans abonnement.</p>
          </div>

          <div className="space-y-2">
            {ownerPerks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                {perk}
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center italic">
            Merci de faire vivre la communauté. Chaque annonce que vous publiez aide un gardien à découvrir un nouvel endroit.
          </p>
        </div>
      )}

      {/* ═══ SECTION COMMUNE — VOS AVANTAGES ═══ */}
      {status !== "owner" && (
        <div className="space-y-6">
          <h2 className="font-heading text-xl font-bold">Vos avantages en détail</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefitCards.map((card, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <card.icon className="h-6 w-6 text-primary" />
                <p className="font-heading font-semibold text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubscription;
