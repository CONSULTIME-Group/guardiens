import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, MessageCircle, CheckCircle, Star } from "lucide-react";
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
            <OwnerSlide6 onComplete={() => completeOnboarding("/sits/create")} />
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
    <div className="flex flex-col gap-4 mt-4">
      {/* Mock 1 — Breed card */}
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-2">
          Conseils race
        </p>
        <div className="bg-primary/10 rounded-lg h-12 w-full mb-3" />
        <p className="text-sm font-semibold mb-2">Berger Australien</p>
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
      </div>
      {/* Mock 2 — Local guide */}
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-2">
          Guide du quartier
        </p>
        <div className="bg-primary/10 rounded-lg h-12 w-full mb-3" />
        <p className="text-sm font-semibold mb-2">Lyon 6e — Brotteaux</p>
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
      </div>
      {/* Mock 3 — Compétences */}
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-3">
          Vos compétences sur votre profil
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">Jardinage</span>
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">Bricolage</span>
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">Soins animaliers</span>
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">Cuisine</span>
        </div>
        <div className="border-t border-border my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/80">Disponible pour aider</span>
          <div className="w-9 h-5 bg-primary rounded-full relative">
            <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Visible sur votre profil public
        </p>
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
    <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none mt-4">
      <p className="text-xs uppercase tracking-widest text-primary/60 mb-3">Petites missions d'entraide</p>
      <div className="flex items-center gap-3 py-2 border-b border-border">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Promener un chien</p>
          <p className="text-xs text-muted-foreground">Lyon 6e · Ce soir</p>
        </div>
      </div>
      <div className="flex items-center gap-3 py-2 border-b border-border">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Arroser le potager</p>
          <p className="text-xs text-muted-foreground">Caluire · Ce week-end</p>
        </div>
      </div>
      <div className="flex items-center gap-3 py-2">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Conseils véto</p>
          <p className="text-xs text-muted-foreground">Grenoble · Flexible</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">L'échange se décide entre vous. Jamais d'argent.</p>
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
      Bienvenue chez vous.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Vous cherchez quelqu'un de confiance pour veiller sur votre maison et vos
      animaux. Ici, vous trouverez des gardiens passionnés, vérifiés, prêts à
      prendre soin de ce qui compte pour vous.
    </p>
  </div>
);

const OwnerSlide2 = ({ completionRate }: { completionRate: number }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Votre profil rassure les gardiens.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Décrivez votre logement, présentez vos animaux. Plus votre profil est
      complet, plus les gardiens auront envie de postuler.
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
  </div>
);

const OwnerSlide3 = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Tout est prévu pour faciliter la garde.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Créez un guide de la maison pour que le gardien sache tout : les clés, le
      vétérinaire, les habitudes de vos animaux. Et les petites missions
      d'entraide permettent de rester connecté avec votre voisinage.
    </p>
    <div className="flex flex-col gap-4 md:flex-row mt-4">
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-2">
          Guide maison
        </p>
        <div className="bg-primary/10 rounded-lg h-14 w-full mb-3" />
        <p className="text-sm font-semibold mb-2">Accès et consignes</p>
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
      </div>
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-2">
          Missions d'entraide
        </p>
        <div className="bg-primary/10 rounded-lg h-14 w-full mb-3" />
        <p className="text-sm font-semibold mb-2">Arroser les plantes</p>
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
      </div>
    </div>
  </div>
);

const OwnerSlide4Entraide = () => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Et au-delà des gardes.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      L'échange ne s'arrête pas à la porte d'entrée. Votre jardin à entretenir,
      une compétence à partager, un service à rendre — tout ça a de la valeur
      pour les gens du coin. Vous proposez une mission, vous mettez une
      compétence en avant sur votre profil. Les gardiens font de même. C'est
      dans les deux sens, toujours.
    </p>
    <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none mt-4">
      <p className="text-xs uppercase tracking-widest text-primary/60 mb-3">
        Échanges autour de vous
      </p>
      <div className="flex items-center gap-3 py-2 border-b border-border">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Taille de haie proposée</p>
          <p className="text-xs text-muted-foreground">Par un gardien · Écully</p>
        </div>
      </div>
      <div className="flex items-center gap-3 py-2 border-b border-border">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Relève du courrier</p>
          <p className="text-xs text-muted-foreground">Proposée par vous · Ce mois-ci</p>
        </div>
      </div>
      <div className="flex items-center gap-3 py-2">
        <div className="rounded-full bg-primary/10 h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Conseils jardinage</p>
          <p className="text-xs text-muted-foreground">Compétence partagée · Lyon 5e</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        L'échange se décide entre vous. Jamais d'argent.
      </p>
    </div>
  </div>
);

const OwnerSlide5 = () => {
  const steps = [
    {
      icon: Send,
      title: "Vous publiez une annonce",
      desc: "Décrivez votre besoin : dates, animaux, logement.",
    },
    {
      icon: MessageCircle,
      title: "Vous recevez des candidatures",
      desc: "Les gardiens postulent. Vous échangez, vous choisissez.",
    },
    {
      icon: CheckCircle,
      title: "La garde est confirmée",
      desc: "Un accord de garde est généré automatiquement. Chacun valide de son côté.",
    },
    {
      icon: Star,
      title: "Vous vous évaluez mutuellement",
      desc: "Un avis croisé, des écussons. Une relation qui dure.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">
        Publier une garde, c'est simple.
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
    </div>
  );
};

const OwnerSlide6 = ({ onComplete }: { onComplete: () => void }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      C'est à vous.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Publiez votre première annonce et recevez des candidatures en quelques
      heures.
    </p>
    <Button className="w-full mt-4" onClick={onComplete}>
      Publier une annonce →
    </Button>
  </div>
);

export default OnboardingModal;
