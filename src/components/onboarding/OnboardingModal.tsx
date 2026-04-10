import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, MessageCircle, CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingRole = "gardien" | "proprio" | "both";
type ActiveTab = "gardien" | "proprio";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 6; // 0..5

const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [currentRole, setCurrentRole] = useState<OnboardingRole | null>(null);
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

  // Pre-select role from profile
  useEffect(() => {
    if (!user) return;
    const roleMap: Record<string, OnboardingRole> = {
      sitter: "gardien",
      owner: "proprio",
      both: "both",
    };
    if (user.role && roleMap[user.role]) {
      setCurrentRole(roleMap[user.role]);
      if (roleMap[user.role] === "both") {
        setActiveTab("gardien");
      }
    }
  }, [user]);

  // Reset slide on open
  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && slide < TOTAL_SLIDES - 1 && (slide === 0 ? currentRole !== null : true)) {
        setSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
      }
      if (e.key === "ArrowLeft" && slide > 0) {
        setSlide((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, slide, currentRole]);

  const dismiss = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_dismissed_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    onClose();
  }, [user, onClose]);

  const selectRole = async (role: OnboardingRole) => {
    setCurrentRole(role);
    if (role === "both") setActiveTab("gardien");

    if (user) {
      // Map to DB enum
      const dbRole = role === "gardien" ? "sitter" : role === "proprio" ? "owner" : "both";
      // Only update if role was null/default
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!data?.role || data.role === "sitter") {
        await supabase.from("profiles").update({ role: dbRole }).eq("id", user.id);
      }
    }
    setSlide(1);
  };

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

  // Determine which slides to show based on active tab for "both" users
  const viewingRole: ActiveTab =
    currentRole === "both" ? activeTab : currentRole === "proprio" ? "proprio" : "gardien";

  const slideCount = TOTAL_SLIDES - 1; // dots exclude slide 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-sm bg-background/80">
      <div className="max-w-2xl w-full mx-auto mt-16 bg-card rounded-2xl shadow-xl p-8 md:p-12 relative">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Toggle for "both" users on slides 1-5 */}
        {slide > 0 && currentRole === "both" && (
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
        )}

        {/* Slide content */}
        <div className="min-h-[340px]">
          {slide === 0 && <Slide0 currentRole={currentRole} onSelect={selectRole} />}
          {slide === 1 && viewingRole === "gardien" && <SitterSlide1 />}
          {slide === 1 && viewingRole === "proprio" && <OwnerSlide1 />}
          {slide === 2 && viewingRole === "gardien" && <SitterSlide2 completionRate={completionRate} />}
          {slide === 2 && viewingRole === "proprio" && <OwnerSlide2 completionRate={completionRate} />}
          {slide === 3 && viewingRole === "gardien" && <SitterSlide3 />}
          {slide === 3 && viewingRole === "proprio" && <OwnerSlide3 />}
          {slide === 4 && viewingRole === "gardien" && <SitterSlide4 />}
          {slide === 4 && viewingRole === "proprio" && <OwnerSlide4 />}
          {slide === 5 && viewingRole === "gardien" && (
            <SitterSlide5 onComplete={() => completeOnboarding("/recherche")} />
          )}
          {slide === 5 && viewingRole === "proprio" && (
            <OwnerSlide5 onComplete={() => completeOnboarding("/sits/create")} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {/* Dismiss link */}
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
          >
            Reprendre plus tard
          </button>

          {/* Dots */}
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

          {/* Prev/Next */}
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
            {slide > 0 && slide < TOTAL_SLIDES - 1 && (
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

/* ─── SLIDE 0 — Role selection ─── */
const Slide0 = ({
  currentRole,
  onSelect,
}: {
  currentRole: OnboardingRole | null;
  onSelect: (r: OnboardingRole) => void;
}) => {
  const options: { role: OnboardingRole; label: string }[] = [
    { role: "gardien", label: "Garder des maisons et des animaux" },
    { role: "proprio", label: "Trouver quelqu\u2019un de confiance pour ma maison" },
    { role: "both", label: "Les deux" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-foreground">
        Vous êtes ici pour…
      </h2>
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.role}
            onClick={() => onSelect(o.role)}
            className={`w-full text-left px-5 py-4 rounded-xl border text-sm font-medium transition-colors ${
              currentRole === o.role
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {currentRole === "both" && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Pas de panique — vous pourrez revoir chaque parcours quand vous voulez
          via le bouton dédié sur votre tableau de bord.
        </p>
      )}
    </div>
  );
};

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
      Vous allez garder des maisons, accompagner des animaux, découvrir des
      endroits que vous habitiez sans vraiment les connaître. On collectionnait
      des vies, ici. La vôtre commence maintenant.
    </p>
  </div>
);

const SitterSlide2 = ({ completionRate }: { completionRate: number }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      Votre profil, c'est votre première impression.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Une photo, quelques lignes sur qui vous êtes. Les propriétaires
      choisissent — donnez-leur de quoi dire oui.
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
      Quand vous gardez, vous n'arrivez jamais les mains vides.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      On vous prépare les conseils sur la race des animaux que vous allez garder
      — et le guide du quartier autour de la maison. Les parcs, les adresses
      utiles, les balades. Et au-delà des gardes : les petites missions
      d'entraide vous permettent d'échanger un service, un coup de main, une
      compétence — avec les gens du coin.
    </p>
    <div className="flex flex-col gap-4 md:flex-row mt-4">
      {/* Mock 1 — Breed card */}
      <div className="bg-muted rounded-xl p-4 w-full pointer-events-none select-none">
        <p className="text-xs uppercase tracking-widest text-primary/60 mb-2">
          Conseils race
        </p>
        <div className="bg-primary/10 rounded-lg h-14 w-full mb-3" />
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
        <div className="bg-primary/10 rounded-lg h-14 w-full mb-3" />
        <p className="text-sm font-semibold mb-2">Lyon 6e — Brotteaux</p>
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
        <div className="bg-muted-foreground/20 rounded h-2 mb-1.5" />
      </div>
    </div>
  </div>
);

const SitterSlide4 = () => {
  const steps = [
    {
      icon: Send,
      title: "Vous postulez",
      desc: "Un message au propriétaire. Une première impression.",
    },
    {
      icon: MessageCircle,
      title: "Vous échangez",
      desc: "Une conversation, quelques questions, une rencontre.",
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

const SitterSlide5 = ({ onComplete }: { onComplete: () => void }) => (
  <div className="space-y-4">
    <h2 className="font-heading text-2xl font-bold text-foreground">
      C'est à vous.
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed">
      Explorez les annonces autour de vous. Trouvez une garde qui vous
      ressemble.
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

const OwnerSlide4 = () => {
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

const OwnerSlide5 = ({ onComplete }: { onComplete: () => void }) => (
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
