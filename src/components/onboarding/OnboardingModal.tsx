import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, MessageCircle, CheckCircle, Star, User, Circle, PawPrint, MapPin, Leaf, ShieldCheck, Home, Calendar, Plus, Zap, Activity, Heart, BookOpen, Key, Wifi, Phone, Wrench, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActiveTab = "gardien" | "proprio";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 7; // 0..6

const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("gardien");
  const [completionRate, setCompletionRate] = useState(0);

  // Load completion rate
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("profile_completion")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setCompletionRate(data.profile_completion || 0);
      });
  }, [user]);

  // No longer pre-select role — toggle is always visible

  // Reset slide on open
  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && slide < TOTAL_SLIDES - 1) {
        setSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
      }
      if (e.key === "ArrowLeft" && slide > 0) {
        setSlide((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, slide]);

  const dismiss = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_dismissed_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    onClose();
  }, [user, onClose]);

  // No more selectRole — role selection removed from slide 0

  const completeOnboarding = async (destination: string) => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
    }
    onClose();
    navigate(destination);
  };

  if (!open) return null;

  const viewingRole: ActiveTab = activeTab;

  const slideCount = TOTAL_SLIDES - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-sm bg-background/80">
      <div className="max-w-2xl w-full mx-auto mt-16 bg-card rounded-2xl shadow-xl p-8 md:p-12 relative">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex justify-center gap-1 mb-6">
          <button
            onClick={() => setActiveTab("gardien")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "gardien"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Parcours gardien
          </button>
          <button
            onClick={() => setActiveTab("proprio")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "proprio"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Parcours propriétaire
          </button>
        </div>

        <div className="min-h-[340px]">
          {slide === 0 && <Slide0 />}
          {slide === 1 && viewingRole === "gardien" && <SitterSlide1 />}
          {slide === 1 && viewingRole === "proprio" && <OwnerSlide1 />}
          {slide === 2 && viewingRole === "gardien" && <SitterSlide2 completionRate={completionRate} />}
          {slide === 2 && viewingRole === "proprio" && <OwnerSlide2 completionRate={completionRate} />}
          {slide === 3 && viewingRole === "gardien" && <SitterSlide3 />}
          {slide === 3 && viewingRole === "proprio" && <OwnerSlide3 />}
          {slide === 4 && viewingRole === "gardien" && <SitterSlide4 />}
          {slide === 4 && viewingRole === "proprio" && <OwnerSlide4Entraide />}
          {slide === 5 && viewingRole === "gardien" && <SitterSlide5 />}
          {slide === 5 && viewingRole === "proprio" && <OwnerSlide5 />}
          {slide === 6 && viewingRole === "gardien" && (
            <SitterSlide6 onComplete={() => completeOnboarding("/recherche")} />
          )}
          {slide === 6 && viewingRole === "proprio" && (
            <OwnerSlide6 onComplete={() => completeOnboarding("/mes-annonces")} />
          )}
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
          >
            Reprendre plus tard
          </button>

          {slide > 0 && (
            <div className="flex gap-1.5">
              {Array.from({ length: slideCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i + 1 === slide ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {slide > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSlide((s) => s - 1)}
              >
                Précédent
              </Button>
            )}
            {slide < TOTAL_SLIDES - 1 && (
              <Button size="sm" onClick={() => setSlide((s) => s + 1)}>
                Suivant
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── SLIDE 0 — Welcome ─── */
const Slide0 = () => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Bienvenue sur Guardiens.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed mb-6">
      Ici on garde des maisons, on accompagne des animaux, on échange des
      services entre gens du coin. Choisissez le parcours que vous voulez
      découvrir — vous pouvez changer à tout moment grâce au toggle en haut de
      chaque page.
    </p>
  </div>
);

/* ─── SITTER SLIDES ─── */
const SitterSlide1 = () => (
  <div className="space-y-4">
    <p className="block md:hidden text-xs text-muted-foreground italic mb-4">
      Pour une meilleure expérience, nous vous recommandons de parcourir cette
      présentation sur ordinateur.
    </p>
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Bienvenue parmi les gardiens.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Trois chats à Caluire. Un cocker à Collonges. Une maison en Ardèche avec
      un potager qui déborde. Vous allez garder des endroits que vous n'auriez
      jamais connus autrement. Accompagner des animaux qui vous attendront à la
      porte. Vivre dans des maisons qui ont une histoire — et en rapporter une.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      On collectionnait des vies, ici. La vôtre commence maintenant.
    </p>

    {/* Mock dashboard gardien */}
    <div className="pointer-events-none select-none mt-6 rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-60 mb-1 font-body">ESPACE GARDIEN</p>
          <p className="text-xl font-heading font-bold">Bonjour, Sophie !</p>
          <p className="text-sm opacity-70 mt-0.5">Explorez les annonces près de chez vous.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-primary-foreground/10 rounded-lg px-3 py-2 flex items-center gap-2">
            <p className="text-xs font-medium">Je suis disponible</p>
            <div className="w-8 h-4 bg-primary rounded-full relative flex-shrink-0">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-card grid grid-cols-3 divide-x divide-border border-t border-border">
        {/* Colonne 1 — Mon profil */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">MON PROFIL</p>
          <div className="w-full bg-muted rounded-full h-1.5 mb-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-xs font-semibold text-primary">100% complété</p>
          <div className="mt-1.5 bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 inline-block">
            Visible par les proprios
          </div>
        </div>

        {/* Colonne 2 — Mes stats */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">MES STATS</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="text-center">
              <p className="text-lg font-bold">4</p>
              <p className="text-xs text-muted-foreground">Gardes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">4.8</p>
              <p className="text-xs text-muted-foreground">Note</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">3</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">2</p>
              <p className="text-xs text-muted-foreground">Candidatures</p>
            </div>
          </div>
        </div>

        {/* Colonne 3 — Mon statut */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">MON STATUT</p>
          <p className="text-xs font-semibold mb-2">Gardien actif</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">4 gardes réalisées (4/5)</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">3 badges actifs (3/5)</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Note ≥ 4.8 ✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SitterSlide2 = ({ completionRate }: { completionRate: number }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Votre profil, c'est votre première impression.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Les propriétaires ne vous connaissent pas encore. Ils vont regarder votre
      photo, lire vos quelques lignes, sentir si vous êtes la bonne personne
      pour leurs animaux. Une bio honnête vaut mieux que dix gardes sans avis.
      Dites qui vous êtes, pourquoi vous êtes là, ce que vous aimez dans une
      maison qui vit. Dix minutes suffisent.
    </p>
    <div className="mt-4">
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Votre profil est complété à {completionRate}%
      </p>
      {completionRate < 60 && (
        <p className="text-xs text-muted-foreground">
          Quelques minutes suffisent pour apparaître dans les recherches.
        </p>
      )}
    </div>

    {/* Mock profil gardien */}
    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm">
      <div className="bg-card p-4">
        <div className="flex items-start gap-4 mb-4">
          {/* Colonne gauche — avatar */}
          <div className="flex flex-col items-center gap-2 w-28 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-sm font-semibold">Sophie</p>
            <p className="text-xs text-muted-foreground">Lyon</p>
          </div>

          {/* Colonne droite — sections */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium">Identité</p>
              </div>
              <p className="text-xs text-primary">Complété ✓</p>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium">Profil gardien</p>
              </div>
              <p className="text-xs text-primary">Complété ✓</p>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium">Animaux</p>
              </div>
              <p className="text-xs text-primary">Complété ✓</p>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Galerie</p>
              </div>
              <p className="text-xs text-muted-foreground">Optionnel</p>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Compétences</p>
              </div>
              <p className="text-xs text-muted-foreground">Optionnel</p>
            </div>
          </div>
        </div>

        {/* Style de vie */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Style de vie</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">Sportif / grandes balades</span>
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">Tranquille / casanier</span>
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">Lève-tôt</span>
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">En télétravail</span>
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full">Famille</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SitterSlide3 = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      On vous prépare le terrain.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Avant chaque garde, Guardiens génère automatiquement les conseils sur la
      race des animaux que vous allez retrouver. Leur caractère, leurs besoins,
      ce qui les rassure et ce qui les perturbe.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Et sur votre profil : vos compétences et centres d'intérêt — jardinage,
      bricolage, soins animaliers — visibles par tous les propriétaires qui vous
      découvrent. Ce que vous savez faire compte autant que vos gardes.
    </p>
    {/* Mocks fiche race + guide local */}
    <div className="pointer-events-none select-none mt-4 grid grid-cols-2 gap-3">
      {/* Mock 1 — Fiche race */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <div className="bg-primary/10 h-16 w-full flex items-center justify-center">
          <PawPrint className="w-8 h-8 text-primary/40" />
        </div>
        <div className="p-3">
          <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">Fiche race</p>
          <p className="text-sm font-heading font-semibold mb-2">Berger Australien</p>
          <div className="flex items-start gap-1.5 mb-1">
            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Très énergique — 2h de sortie/jour</p>
          </div>
          <div className="flex items-start gap-1.5 mb-1">
            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Sensible aux séparations</p>
          </div>
          <div className="flex items-start gap-1.5 mb-1">
            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Aime les routines stables</p>
          </div>
        </div>
      </div>

      {/* Mock 2 — Guide local */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <div className="bg-primary/10 h-16 w-full flex items-center justify-center">
          <MapPin className="w-8 h-8 text-primary/40" />
        </div>
        <div className="p-3">
          <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">Guide du quartier</p>
          <p className="text-sm font-heading font-semibold mb-2">Lyon 6e — Brotteaux</p>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Parc de la Tête d'Or</p>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Balade des berges</p>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Véto Saint-Clair</p>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Café Sully dog-friendly</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SitterSlide4 = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Et au-delà des gardes.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Promener un chien ce soir. Arroser un potager le week-end. Partager un
      conseil sur une race que vous connaissez bien.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Les petites missions d'entraide, c'est l'échange au quotidien — vos
      compétences contre un repas, un service rendu, une connexion qui dure.
      Entre des gens du coin qui se choisissent. Jamais d'argent. Juste du
      concret.
    </p>
    {/* Mock missions + entraide */}
    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold">Petites missions</p>
        <div className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">1 mission</div>
      </div>

      {/* Mission card */}
      <div className="p-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5">M'aider à ramasser les légumes du potager</p>
            <p className="text-xs text-muted-foreground mb-1">Poleymieux · Demi-journée</p>
            <p className="text-xs text-muted-foreground italic">En échange : un gros panier de légumes du jardin</p>
          </div>
        </div>
      </div>

      {/* Disponibles pour aider */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Disponibles pour aider</p>
          <div className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">5 membres</div>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {/* Carte 1 */}
        <div className="bg-muted rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary/40" />
            </div>
            <div>
              <p className="text-xs font-semibold">Marie</p>
              <p className="text-xs text-muted-foreground">Lyon</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Animaux</span>
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Jardin</span>
          </div>
          <p className="text-xs text-primary font-medium">Proposer un échange →</p>
        </div>

        {/* Carte 2 */}
        <div className="bg-muted rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary/40" />
            </div>
            <div>
              <p className="text-xs font-semibold">Lilit</p>
              <p className="text-xs text-muted-foreground">Collonges</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Animaux</span>
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">Cuisine</span>
          </div>
          <p className="text-xs text-primary font-medium">Proposer un échange →</p>
        </div>
      </div>
    </div>
  </div>
);

const SitterSlide5 = () => {
  const steps = [
    {
      icon: Send,
      title: "Vous postulez",
      desc: "Un message sincère et direct. C'est votre première impression.",
    },
    {
      icon: MessageCircle,
      title: "Vous échangez",
      desc: "Une conversation, quelques questions. Souvent une rencontre avant le départ.",
    },
    {
      icon: CheckCircle,
      title: "La garde est confirmée",
      desc: "Un accord de garde est généré automatiquement. Chacun valide à son rythme.",
    },
    {
      icon: Star,
      title: "Vous vous évaluez mutuellement",
      desc: "Un avis croisé, des écussons choisis. Une relation qui peut durer.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">
        Une garde, c'est simple.
      </h2>
      <div className="flex flex-col gap-4 mt-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <Icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search page simulation */}
      <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        {/* Filter bar */}
        <div className="border-b border-border px-3 py-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted text-xs px-2.5 py-1 rounded-full text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Lyon</span>
          </div>
          <div className="flex items-center gap-1 bg-muted text-xs px-2.5 py-1 rounded-full text-muted-foreground">
            <div className="w-3 h-3 bg-muted-foreground/30 rounded" />
            <span>15 km</span>
          </div>
          <div className="flex items-center gap-1 bg-muted text-xs px-2.5 py-1 rounded-full text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Dates</span>
          </div>
          <div className="flex items-center gap-1 bg-muted text-xs px-2.5 py-1 rounded-full text-muted-foreground">
            <PawPrint className="w-3 h-3" />
            <span>Animaux</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">3 gardes disponibles</div>
        </div>

        {/* Listing cards */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-border">
          {/* Card 1 */}
          <div className="p-3">
            <div className="rounded-lg overflow-hidden h-20 mb-2 relative">
              <img src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80" alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 bg-white/90 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span>Vérifié</span>
              </div>
            </div>
            <p className="text-xs font-semibold leading-tight mb-1">Maison avec jardin, Laïka et ses deux compères</p>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <MapPin className="w-3 h-3" />
              <p className="text-xs">Lyon 6e</p>
            </div>
            <div className="flex gap-1">
              <PawPrint className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">×1</span>
              <Home className="w-3 h-3 text-primary ml-1" />
              <span className="text-xs text-muted-foreground">×2</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-3">
            <div className="rounded-lg overflow-hidden h-20 mb-2 relative">
              <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 bg-white/90 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span>Vérifié</span>
              </div>
            </div>
            <p className="text-xs font-semibold leading-tight mb-1">Maison en bois face au lac, potager et basse-cour</p>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <MapPin className="w-3 h-3" />
              <p className="text-xs">Annecy</p>
            </div>
            <div className="flex gap-1">
              <PawPrint className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">×3</span>
              <Home className="w-3 h-3 text-primary ml-1" />
              <span className="text-xs text-muted-foreground">×1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SitterSlide6 = ({ onComplete }: { onComplete: () => void }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      C'est à vous.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Les annonces sont là. Les propriétaires attendent quelqu'un en qui avoir
      confiance. Trouvez une garde qui vous ressemble.
    </p>
    <Button className="w-full mt-4" onClick={onComplete}>
      Explorer les annonces →
    </Button>
  </div>
);

/* ─── OWNER SLIDES ─── */
const OwnerSlide1 = () => (
  <div className="space-y-4">
    <p className="block md:hidden text-xs text-muted-foreground italic mb-4">
      Pour une meilleure expérience, nous vous recommandons de parcourir cette
      présentation sur ordinateur.
    </p>
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Bienvenue parmi les propriétaires.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Votre maison. Vos animaux. Leurs habitudes, leurs coins préférés, ce qui
      les rassure quand vous n'êtes pas là.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Guardiens met en relation des propriétaires avec des gens du coin qui se
      choisissent — des personnes proches, que vous avez rencontrées avant de
      confier vos clés.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Vous partez. Eux, ils veillent. Et vos animaux restent chez eux.
    </p>

    {/* Simulation dashboard proprio */}
    <div className="pointer-events-none select-none mt-6 rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-60 mb-1 font-body">ESPACE PROPRIÉTAIRE</p>
          <p className="text-xl font-heading font-bold">Bonjour, Claire !</p>
          <p className="text-sm opacity-70 mt-0.5">Votre prochaine garde commence dans 12 jours.</p>
        </div>
        <button className="bg-card text-primary text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 flex-shrink-0">
          <Plus className="w-3 h-3" />
          <span>Publier une annonce</span>
        </button>
      </div>
      {/* Stats */}
      <div className="bg-card grid grid-cols-4 divide-x divide-border border-t border-border">
        <div className="p-3 text-center">
          <p className="text-lg font-bold">3</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Gardes réalisées</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-bold text-primary">4.9</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Note moyenne</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-bold">1</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Annonces actives</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-bold">2</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Gardiens de confiance</p>
        </div>
      </div>
      {/* Candidatures */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <p className="text-xs font-medium">2 candidatures reçues</p>
        </div>
        <p className="text-xs text-primary font-medium">Voir tout →</p>
      </div>
    </div>
  </div>
);

const OwnerSlide2 = ({ completionRate }: { completionRate: number }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Vos animaux, présentés une fois.
      <br />
      Compris à chaque garde.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Renseignez Rex, Resa, leurs habitudes. Guardiens génère
      automatiquement leur fiche race — caractère, besoins,
      ce qui les rassure. Le gardien la lit avant même de vous
      rencontrer.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Vous n'avez pas à tout réexpliquer. Il arrive en sachant.
    </p>
    <div className="mt-4">
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Votre profil est complété à {completionRate}%
      </p>
      {completionRate < 60 && (
        <p className="text-xs text-muted-foreground">
          Quelques minutes suffisent pour recevoir vos premières candidatures.
        </p>
      )}
    </div>

    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      {/* Header animal */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=80&q=80"
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-card flex items-center justify-center">
            <CheckCircle className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Rex</p>
          <p className="text-xs text-muted-foreground">Chien · Malinois · 3 ans</p>
        </div>
        <div className="ml-auto bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          Garde confirmée ✓
        </div>
      </div>

      {/* Fiche race auto-générée */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Fiche race — Malinois · générée automatiquement
          </p>
        </div>

        <div className="flex items-start gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Caractère</p>
            <p className="text-xs text-muted-foreground">
              Très énergique, loyal, nécessite une stimulation mentale et physique constante.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Exercice</p>
            <p className="text-xs text-muted-foreground">
              Minimum 2h d'activité intense par jour. Excelle dans les longues balades dynamiques.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Heart className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Ce qui le rassure</p>
            <p className="text-xs text-muted-foreground">
              Les routines stables. Être occupé. Un gardien calme et présent.
            </p>
          </div>
        </div>
      </div>

      {/* Second animal */}
      <div className="border-t border-border p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <p className="text-xs font-bold text-primary">R</p>
        </div>
        <div>
          <p className="text-xs font-semibold">Resa</p>
          <p className="text-xs text-muted-foreground">Chat · Main Coon · 4 ans</p>
        </div>
        <div className="ml-auto bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          Fiche race prête ✓
        </div>
      </div>
    </div>
  </div>
);

const OwnerSlide3 = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Votre guide de la maison.
      <br />
      Transmis à la confirmation.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Adresse exacte, codes d'accès, WiFi, véto, contacts
      d'urgence. Tout se remplit une fois. Tout est partagé
      automatiquement quand vous confirmez une garde.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Le gardien a tout. Vous pouvez partir.
    </p>

    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Guide de la maison</p>
        </div>
        <div className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
          Partagé à la confirmation
        </div>
      </div>

      {/* Sections accordéon */}
      <div className="divide-y divide-border">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-medium">Accès &amp; logistique</p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-primary">Complété</p>
          </div>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-medium">WiFi</p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-primary">Complété</p>
          </div>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-medium">Contacts d'urgence</p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-primary">Complété</p>
          </div>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-2">
            <Home className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Instructions générales</p>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">À compléter</p>
          </div>
        </div>
      </div>

      {/* Checklist préparation */}
      <div className="border-t border-border px-4 py-3 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">Préparez l'arrivée — J-12</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground line-through">Compléter le guide de la maison</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground line-through">Contacter le gardien</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-border flex-shrink-0" />
            <p className="text-xs text-foreground/80">Appel ou rencontre avant la garde</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-border flex-shrink-0" />
            <p className="text-xs text-foreground/80">Préparer la remise des clés</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const OwnerSlide4Entraide = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Vous aussi, vous avez quelque chose à offrir.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Jardinage, soins animaliers, cuisine, coups de main.
      Vos compétences apparaissent sur votre profil.
      Les gardiens les voient. L'échange va dans les deux
      sens — toujours.
    </p>

    <div className="pointer-events-none select-none mt-4 space-y-3">
      {/* Bloc compétences */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs uppercase tracking-widest text-primary/60 mb-3">CE QUE JE SAIS FAIRE</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Leaf className="w-3 h-3" /> Jardin
            </span>
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <PawPrint className="w-3 h-3" /> Animaux
            </span>
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Wrench className="w-3 h-3" /> Coups de main
            </span>
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <ChefHat className="w-3 h-3" /> Cuisine
            </span>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ex : Soins chats, cuisine végétarienne...</p>
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md">+ Ajouter</div>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-primary rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
            </div>
            <p className="text-xs font-medium">Disponible pour aider</p>
          </div>
          <p className="text-xs text-muted-foreground">Visible sur votre profil</p>
        </div>
      </div>

      {/* Bloc missions */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold">Mes petites missions</p>
          <p className="text-xs text-primary">Voir tout →</p>
        </div>
        <div className="divide-y divide-border">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-through">M'aider à ramasser les légumes du potager</p>
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">Terminée</p>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-through">Repeindre ma salle de bain</p>
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">Terminée</p>
          </div>
        </div>
        <div className="px-4 py-2.5 flex gap-2">
          <div className="flex-1 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-lg text-center">
            Publier un besoin
          </div>
          <div className="flex-1 border border-primary text-primary text-xs px-3 py-1.5 rounded-lg text-center">
            Proposer mon aide
          </div>
        </div>
      </div>
    </div>
  </div>
);

const OwnerSlide5 = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Notre accord de garde.
      <br />
      Un engagement mutuel, généré automatiquement.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Quand la garde est confirmée, Guardiens génère
      automatiquement un document qui résume ce que vous
      avez prévu ensemble. Ce que le gardien prend en charge.
      Ce que vous vous engagez à transmettre. Les règles de vie.
      Les contacts d'urgence.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Chacun lit. Chacun valide. Vous partez l'esprit léger.
    </p>

    <div className="pointer-events-none select-none mt-4 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
      {/* Header accord */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Notre accord de garde</p>
          <p className="text-xs text-muted-foreground mt-0.5">Garde du 14 mai 2026 au 21 mai 2026</p>
        </div>
        <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          Généré automatiquement
        </div>
      </div>

      {/* Animaux concernés */}
      <div className="px-4 py-2.5 border-b border-border">
        <p className="text-xs font-semibold mb-1.5">Les animaux concernés</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-3 h-3 text-primary" />
            <p className="text-xs text-muted-foreground">Rex · Chien · Berger Australien · 3 ans</p>
          </div>
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-3 h-3 text-primary" />
            <p className="text-xs text-muted-foreground">Resa · Chat · Main Coon · 4 ans</p>
          </div>
        </div>
      </div>

      {/* Ce que le gardien prend en charge */}
      <div className="px-4 py-2.5 border-b border-border">
        <p className="text-xs font-semibold mb-2">Ce que le gardien prend en charge</p>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">Prendre soin des animaux selon leurs habitudes.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">Donner des nouvelles — une photo par jour.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">Laisser le logement propre et en bon état.</p>
          </div>
        </div>
      </div>

      {/* Règles de vie */}
      <div className="px-4 py-2.5 border-b border-border">
        <p className="text-xs font-semibold mb-2">Règles de vie dans le logement</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Animaux dans toutes les pièces</p>
            <p className="text-xs font-semibold mt-1">Oui</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Invités</p>
            <p className="text-xs font-semibold mt-1">Non</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Tabac</p>
            <p className="text-xs font-semibold mt-1">À confirmer</p>
          </div>
        </div>
      </div>

      {/* Validation clickwrap */}
      <div className="px-4 py-3 bg-primary/5">
        <p className="text-xs text-muted-foreground text-center mb-2">
          J'ai lu cet accord et je confirme que son contenu correspond à ce que nous avons prévu.
        </p>
        <div className="bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-lg text-center">
          C'est bon pour moi →
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          En attente de validation des deux parties
        </p>
      </div>
    </div>
  </div>
);

const OwnerSlide6 = ({ onComplete }: { onComplete: () => void }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      C'est à vous.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Publiez votre première annonce. Les gardiens proches de chez vous sont
      déjà là.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Vous partez. Eux, ils veillent.
    </p>
    <Button className="w-full mt-4" onClick={onComplete}>
      Publier une annonce →
    </Button>
  </div>
);

export default OnboardingModal;
