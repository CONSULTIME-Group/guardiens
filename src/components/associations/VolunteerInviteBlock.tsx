/**
 * Invitation à se déclarer disponible pour une association animalière.
 *
 * C'est aujourd'hui le seul chemin visible vers le formulaire, qui vit dans la
 * section compétences du profil. La destination suit l'état de la personne :
 * gardien, propriétaire, ou visiteur qui doit d'abord créer son compte.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const VolunteerInviteBlock = () => {
  const { isAuthenticated, activeRole } = useAuth();

  const target = !isAuthenticated
    ? "/inscription"
    : activeRole === "owner"
      ? "/owner-profile?section=skills"
      : "/profile?section=competences";

  const label = isAuthenticated ? "Me déclarer disponible" : "Créer mon compte pour me déclarer";

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-[2px] w-5 bg-terra" />
        <p className="text-[11px] font-bold uppercase text-terra [letter-spacing:.16em]">
          Donner un coup de main
        </p>
      </div>
      <h2 className="mt-2 font-heading text-lg md:text-xl font-semibold text-foreground">
        Vous avez du temps pour les associations près de chez vous ?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dites ce que vous savez faire et dans quels départements vous pouvez vous déplacer. On s'en
        sert pour rapprocher les associations des personnes disponibles.
      </p>
      <Button asChild size="sm" className="mt-4 rounded-full">
        <Link to={target}>{label}</Link>
      </Button>
    </section>
  );
};

export default VolunteerInviteBlock;
