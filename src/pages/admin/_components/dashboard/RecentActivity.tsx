import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ErrorState, LoadingState } from "@/components/admin/ui";
import type { ActivityItem } from "./types";
import { CollapsibleSection } from "./CollapsibleSection";

const ACTIVITY_BADGE: Record<ActivityItem["type"], { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  inscription: { label: "Inscription", variant: "secondary" },
  annonce: { label: "Annonce", variant: "outline" },
  avis: { label: "Avis", variant: "secondary" },
  candidature: { label: "Candidature", variant: "outline" },
  publication: { label: "Publication", variant: "secondary" },
  confirmation: { label: "Garde confirmée", variant: "secondary" },
  expiration: { label: "Annonce expirée", variant: "outline" },
  brouillon: { label: "Remise en brouillon", variant: "outline" },
  depublication: { label: "Retirée", variant: "outline" },
  suppression: { label: "Suppression compte", variant: "destructive" },
};

interface Props {
  activity: ActivityItem[];
  loading?: boolean;
  error?: boolean;
}

/** Activité récente, dépliée sur la vue d'ensemble (lot A13). */
export const RecentActivity = ({ activity, loading, error }: Props) => (
  <CollapsibleSection title="Activité récente" defaultOpen testId="overview-activity">
    {loading ? (
      <LoadingState />
    ) : error ? (
      <ErrorState />
    ) : activity.length === 0 ? (
      <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
    ) : (
      <div className="space-y-0">
        {activity.map((item) => (
          <Link
            key={item.id}
            to={item.link}
            className="flex items-start gap-3 w-full text-left py-3 px-2 rounded-lg hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={ACTIVITY_BADGE[item.type].variant} className="text-[10px] px-1.5 py-0">
                  {ACTIVITY_BADGE[item.type].label}
                </Badge>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    )}
  </CollapsibleSection>
);
