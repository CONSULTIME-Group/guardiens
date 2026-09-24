import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import rooftops1600 from "@/assets/landing/village-rooftops-1600.webp";
import step1 from "@/assets/illustrations/howto-step-1-annonce-448.webp";
import step2 from "@/assets/illustrations/howto-step-2-rencontre-448.webp";
import step3 from "@/assets/illustrations/howto-step-3-depart-448.webp";

const STEPS = [
  { image: step1, text: "Juillet : Claire, trois rues plus loin, arrose vos tomates pendant un week-end." },
  { image: step2, text: "Septembre : vous l'aidez à monter une étagère, elle vous offre un café." },
  { image: step3, text: "Décembre : c'est à elle que vous confiez votre chat pour Noël." },
];

export function ServiceAfterServiceSection() {
  return (
    <section id="service-apres-service" className="relative overflow-hidden bg-pine py-[52px] text-pine-foreground scroll-mt-24 md:py-20">
      <GrainOverlay />
      <div className="relative lp-wide">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-terra-soft">Réseau de confiance</p>
        <h2 className="mt-4 text-center font-heading text-3xl font-semibold md:text-5xl">Un service après l'autre.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ image, text }) => (
            <article key={text} className="text-center">
              <img src={image} alt="" width={224} height={224} loading="lazy" className="mx-auto h-36 w-36 object-contain md:h-44 md:w-44" />
              <p className="mt-4 text-base leading-relaxed text-pine-foreground/90">{text}</p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center font-heading text-xl italic md:text-2xl">La technologie sert à se trouver. Tout le reste se passe en vrai.</p>
        <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-pine-foreground/90">Nous nous sommes posé une question : et si la technologie servait à se rencontrer ? À découvrir qu'à quelques kilomètres, quelqu'un a besoin d'un coup de main. Pour l'un, c'est un vrai besoin. Pour l'autre, une heure. Et se sentir utile, échanger quelques mots, rencontrer une personne, c'est aussi une façon de se faire du bien.</p>
        <p className="mx-auto mt-4 max-w-2xl font-semibold">Elisa et Jérémie</p>
        <div className="mx-auto mt-5 max-w-2xl space-y-1 text-sm text-pine-foreground/85">
          <p>Promenades de chiens à Lyon, puis gardes à la maison.</p>
          <p>Aujourd'hui, chaque semaine, on reçoit des animaux chez nous.</p>
          <p>Un réseau local de confiance, ouvert à toute la France.</p>
        </div>
        <Link to="/a-propos" className="mx-auto mt-5 block w-fit text-sm underline underline-offset-4">Lire notre histoire</Link>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" className="border-pine-foreground/60 bg-transparent text-pine-foreground hover:bg-pine-foreground/10 hover:text-pine-foreground">
            <Link to="/petites-missions/creer">Demander un premier coup de main</Link>
          </Button>
          <Button asChild><Link to="/sits/create">Publier une annonce de garde</Link></Button>
        </div>
        <Link to="/actualites/technologie-recreer-lien-pres-de-chez-soi" className="mx-auto mt-5 block w-fit text-sm underline underline-offset-4">Lire l'article</Link>
      </div>
      <img src={rooftops1600} alt="" width={1600} height={415} loading="lazy" className="mx-auto mt-8 block w-full max-w-[820px] opacity-50" />
    </section>
  );
}