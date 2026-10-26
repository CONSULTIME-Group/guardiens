/**
 * Lot E23 : l'auteur d'un besoin qui arrive d'un email d'entraide sans session
 * voit la vue visiteur. Le lien de l'email porte ?vous=auteur : ce bandeau lui
 * dit que c'est son besoin et le mène à la connexion, avec retour sur la fiche.
 */
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isAuthorReturn } from "@/lib/authorReturn";

export default function AuthorReturnBanner({ redirect }: { redirect: string }) {
  const [params] = useSearchParams();
  if (!isAuthorReturn(params)) return null;
  return (
    <section
      data-author-return
      aria-label="C'est votre besoin"
      className="mb-6 rounded-card border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex-1">
        <p className="font-heading text-lg font-semibold text-foreground">
          C'est votre besoin ?
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Connectez-vous pour lire les réponses et écrire à chaque personne.
        </p>
      </div>
      <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="shrink-0">
        <Button className="w-full sm:w-auto rounded-full font-bold min-h-11">Me connecter</Button>
      </Link>
    </section>
  );
}
