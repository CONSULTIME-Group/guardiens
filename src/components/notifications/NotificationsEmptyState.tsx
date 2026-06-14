import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const NotificationsEmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
    {/* Partie 1 : illustration fonctionnelle */}
    <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
      <Bell className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
    </div>

    {/* Partie 2 : titre + description */}
    <div className="space-y-1.5 max-w-xs">
      <p className="font-heading font-semibold text-foreground text-base">
        Tout est à jour
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Vos prochaines actualités apparaîtront ici : nouvelles propositions, candidatures, messages et gardes confirmées.
      </p>
    </div>

    {/* Partie 3 : CTA contextuel */}
    <Button asChild variant="outline" size="sm" className="mt-2">
      <Link to="/dashboard">Retour au tableau de bord</Link>
    </Button>
  </div>
);
