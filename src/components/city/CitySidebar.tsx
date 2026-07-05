import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShieldCheck } from "lucide-react";

interface Sitter {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
}

interface CitySidebarProps {
  city: string;
  sitters: Sitter[];
}

export default function CitySidebar({ city, sitters }: CitySidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Sitters widget */}
      <Card className="sticky top-24 shadow-md border-primary/10">
        <CardContent className="p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Gardiens disponibles à {city}
          </h3>

          {sitters.length > 0 ? (
            <div className="space-y-3 mb-5">
              {sitters.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.first_name || ""} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold text-sm">
                        {s.first_name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.first_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.city}</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              Pas encore de gardien à {city}. Soyez le premier !
            </p>
          )}

          <Link to="/inscription" className="block">
            <Button className="w-full gap-2" size="lg">
              Devenir gardien à {city}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* CTA Card */}
      <Card className="sticky top-[420px] bg-primary text-primary-foreground border-0 shadow-lg">
        <CardContent className="p-5">
          <h3 className="font-heading text-lg font-semibold mb-2">
            Vous partez bientôt ?
          </h3>
          <p className="text-sm text-primary-foreground/85 mb-4">
            Publiez votre annonce en 2 minutes. C'est gratuit pour les propriétaires.
          </p>
          <Link to="/inscription" className="block">
            <Button variant="secondary" className="w-full gap-2 font-semibold">
              Trouver mon gardien
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </aside>
  );
}
