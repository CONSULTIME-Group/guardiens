import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ActivityItem } from "./types";

const ACTIVITY_BADGE: Record<ActivityItem["type"], { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  inscription: { label: "Inscription", variant: "secondary" },
  annonce: { label: "Annonce", variant: "outline" },
  avis: { label: "Avis", variant: "secondary" },
  candidature: { label: "Candidature", variant: "outline" },
  publication: { label: "Publication", variant: "secondary" },
  depublication: { label: "Dépubliée", variant: "destructive" },
  suppression: { label: "Suppression compte", variant: "destructive" },
};

interface Props {
  activity: ActivityItem[];
}

export const RecentActivity = ({ activity }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base font-heading">Activité récente</CardTitle>
    </CardHeader>
    <CardContent>
      {activity.length === 0 ? (
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
    </CardContent>
  </Card>
);
