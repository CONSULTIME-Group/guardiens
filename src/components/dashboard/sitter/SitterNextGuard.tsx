import { Link } from "react-router-dom";
import { Calendar, User, PawPrint } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SitterNextGuardProps {
  nextGuard: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    ownerName: string;
    daysUntil: number;
    pets: { species: string }[];
  };
}

const SitterNextGuard = ({ nextGuard }: SitterNextGuardProps) => {
  const speciesList = [...new Set(nextGuard.pets.map((p) => p.species))].join(", ");

  return (
    <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      <Link
        to={`/sits/${nextGuard.id}`}
        className="block bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-primary font-sans font-medium">
            Prochaine garde
          </p>
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 font-medium">
            J-{nextGuard.daysUntil}
          </span>
        </div>

        <p className="text-sm font-semibold text-foreground mb-2 line-clamp-1">
          {nextGuard.title}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(nextGuard.start_date), "d MMM", { locale: fr })} → {format(new Date(nextGuard.end_date), "d MMM", { locale: fr })}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {nextGuard.ownerName}
          </span>
          {speciesList && (
            <span className="flex items-center gap-1">
              <PawPrint className="h-3.5 w-3.5" />
              {speciesList}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
};

export default SitterNextGuard;
