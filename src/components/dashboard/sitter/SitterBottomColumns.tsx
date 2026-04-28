import { Link, useNavigate } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface SitterBottomColumnsProps {
  nearbyListings: any[];
  nearbyMissions: any[];
  postalCode: string | null;
}

const SitterBottomColumns = ({ nearbyListings, nearbyMissions, postalCode }: SitterBottomColumnsProps) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      {/* Colonne gauche — Annonces */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-foreground">Annonces près de chez vous</p>
          <Link to="/search" className="text-xs text-primary font-sans">Voir tout →</Link>
        </div>
        {nearbyListings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground font-sans italic mb-3">Pas encore d'annonce dans votre zone.</p>
            <p className="text-xs text-muted-foreground font-sans">Activez le mode disponible pour être contacté directement par les propriétaires.</p>
          </div>
        ) : (
          nearbyListings.slice(0, 3).map((sit: any) => {
            const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
            return (
              <Link key={sit.id} to={`/sits/${sit.id}`} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs text-foreground/80 font-sans leading-snug">
                    {sit.title}
                    {isNew && <span className="ml-2 text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">Nouveau</span>}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {sit.start_date && sit.end_date
                      ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                      : "Dates flexibles"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Colonne droite — Échanges */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-foreground">Échanges autour de vous</p>
          <Link to="/petites-missions" className="text-xs text-primary font-sans">Voir tout →</Link>
        </div>
        {nearbyMissions.length === 0 ? (
          <>
            <p className="text-xs text-muted-foreground font-sans mb-3"><span className="font-semibold text-foreground">Osez !</span> Demandez un coup de main en publiant une petite mission, ou proposez quelque chose en échange — un café, une histoire, un service…</p>
            <div className="flex flex-col gap-2 mb-4">
              <Button onClick={() => navigate("/petites-missions/creer")} className="w-full rounded-xl text-xs font-medium">Publier un besoin →</Button>
              <Button variant="outline" onClick={() => navigate("/petites-missions")} className="w-full rounded-xl text-xs font-medium">Proposer mon aide →</Button>
            </div>
            <p className="text-xs text-muted-foreground font-sans italic text-center">
              {postalCode ? "Pas encore d'échange dans votre zone." : "Ajoutez votre code postal pour voir les échanges proches."}
            </p>
          </>
        ) : (
          <>
            {nearbyMissions.map((m: any) => (
              <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-accent-foreground/40 shrink-0 mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs text-foreground/80 font-sans leading-snug">{m.title}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {m.city}{m.date_needed ? ` · ${format(new Date(m.date_needed), "d MMM", { locale: fr })}` : ""}
                  </p>
                </div>
              </Link>
            ))}
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => navigate("/petites-missions/creer")} className="flex-1 rounded-xl text-xs">Publier un besoin</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/petites-missions")} className="flex-1 rounded-xl text-xs">Voir tout</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SitterBottomColumns;
