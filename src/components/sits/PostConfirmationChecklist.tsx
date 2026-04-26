import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, BookOpen, MapPin, MessageSquare, Shield, Calendar, Home, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

interface PostConfirmationChecklistProps {
  sitId: string;
  sitOwnerId: string;
  propertyId: string;
  startDate: string | null;
  endDate: string | null;
  ownerCity?: string;
  isOwner: boolean;
  
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  link?: string;
  externalCheck?: () => Promise<boolean>;
  autoChecked?: boolean;
}

const PostConfirmationChecklist = ({
  sitId, sitOwnerId, propertyId, startDate, isOwner, ownerCity,
}: PostConfirmationChecklistProps) => {
  const { user } = useAuth();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [guideExists, setGuideExists] = useState(false);
  const [localGuideSlug, setLocalGuideSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Check house guide
      const { data: guide } = await supabase
        .from("house_guides")
        .select("id")
        .eq("property_id", propertyId)
        .maybeSingle();
      setGuideExists(!!guide);

      // Check local guide for owner's city
      if (ownerCity) {
        const slug = slugify(ownerCity);
        const { data: cityGuide } = await supabase
          .from("city_guides")
          .select("slug")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (cityGuide) setLocalGuideSlug(cityGuide.slug);
      }

      // Check conversation exists
      const storageKey = `checklist_${sitId}_${user?.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { setChecked(JSON.parse(saved)); } catch {}
      }

      setLoading(false);
    };
    load();
  }, [sitId, propertyId, ownerCity, user?.id]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(`checklist_${sitId}_${user?.id}`, JSON.stringify(next));
  };

  const daysUntilStart = startDate ? differenceInDays(parseISO(startDate), new Date()) : null;

  const ownerChecklist: CheckItem[] = [
    {
      id: "guide",
      label: "Compléter le guide de la maison",
      description: "Adresse exacte, codes, WiFi, contacts véto et urgences",
      icon: BookOpen,
      link: `/house-guide/${propertyId}`,
    },
    {
      id: "message_sitter",
      label: "Contacter le gardien",
      description: "Présentez-vous et convenez d'un appel ou d'une rencontre",
      icon: MessageSquare,
      link: "/messages",
    },
    {
      id: "phone_call",
      label: "Appel ou rencontre avant la garde",
      description: "Validez les détails importants en direct",
      icon: Phone,
    },
    {
      id: "keys",
      label: "Préparer la remise des clés",
      description: "Confiez un double ou organisez la remise en main propre",
      icon: Home,
    },
  ];

  const sitterChecklist: CheckItem[] = [
    {
      id: "read_guide",
      label: "Lire le guide de la maison",
      description: "Adresse, codes d'accès, instructions animaux et urgences",
      icon: BookOpen,
      link: `/house-guide/${propertyId}`,
    },
    {
      id: "message_owner",
      label: "Contacter le propriétaire",
      description: "Posez vos questions et planifiez l'arrivée",
      icon: MessageSquare,
      link: "/messages",
    },
    {
      id: "phone_call",
      label: "Appel ou rencontre avant la garde",
      description: "Pour vous sentir à l'aise dès le premier jour",
      icon: Phone,
    },
    {
      id: "plan_travel",
      label: "Organiser le trajet",
      description: "Vérifiez l'itinéraire et le moyen de transport",
      icon: MapPin,
    },
  ];

  const items = isOwner ? ownerChecklist : sitterChecklist;
  const completedCount = items.filter(item => checked[item.id]).length;
  const progress = Math.round((completedCount / items.length) * 100);

  if (loading) return null;

  return (
    <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/5 dark:border-green-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Garde confirmée — Préparez l'arrivée
          </h3>
          {daysUntilStart !== null && daysUntilStart > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3 inline mr-1" />
              J-{daysUntilStart} avant le début
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-green-200 dark:bg-green-900/30 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">{completedCount}/{items.length}</span>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {items.map(item => {
          const Icon = item.icon;
          const done = checked[item.id];
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                done
                  ? "bg-green-100/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  : "bg-card border-border hover:border-green-300"
              )}
              onClick={() => toggle(item.id)}
            >
              <button className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              {item.link && !done && (
                <Link
                  to={item.link}
                  className="shrink-0 text-xs text-primary font-medium hover:underline self-center"
                  onClick={e => e.stopPropagation()}
                >
                  Ouvrir →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {!guideExists && isOwner && (
          <Link to={`/house-guide/${propertyId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
              <BookOpen className="h-3.5 w-3.5" /> Créer le guide de la maison
            </Button>
          </Link>
        )}
        {guideExists && (
          <Link to={`/house-guide/${propertyId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> {isOwner ? "Modifier le guide" : "Voir le guide"}
            </Button>
          </Link>
        )}
        {localGuideSlug && (
          <Link to={`/guides/${localGuideSlug}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" /> Guide local {ownerCity}
            </Button>
          </Link>
        )}
      </div>


      {/* All done celebration */}
      {completedCount === items.length && (
        <div className="text-center py-2">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">🎉 Tout est prêt ! Bonne garde !</p>
        </div>
      )}
    </div>
  );
};

export default PostConfirmationChecklist;
