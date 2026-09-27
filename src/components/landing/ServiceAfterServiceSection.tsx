import { Link } from "react-router-dom";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { homeCtaTarget } from "@/components/landing/homeCta";
import rooftops1600 from "@/assets/landing/village-rooftops-1600.webp";

const STEPS = [
  { month: "Juillet", text: "Claire, trois rues plus loin, arrose vos tomates pendant un week-end." },
  { month: "Septembre", text: "Vous l'aidez à monter une étagère, elle vous offre un café." },
  { month: "Décembre", text: "C'est à elle que vous confiez votre chat pour Noël." },
];

export function ServiceAfterServiceSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section id="service-apres-service" className="relative overflow-hidden bg-pine py-[52px] text-pine-foreground scroll-mt-24 md:py-20">
      <GrainOverlay />
      <div className="relative lp-wide">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-terra-soft">Réseau de confiance</p>
        <h2 className="mt-4 text-center font-heading text-3xl font-semibold md:text-5xl">Un service après l'autre.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ month, text }) => (
            <li key={month} className="text-center">
              <p className="font-heading text-4xl font-semibold md:text-5xl">{month}</p>
              <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-pine-foreground/90">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-10 max-w-2xl text-center font-heading text-xl italic md:text-2xl">La technologie sert à se trouver. Tout le reste se passe en vrai.</p>
        <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-pine-foreground/90">Nous nous sommes posé une question : et si la technologie servait à se rencontrer ? À découvrir qu'à quelques kilomètres, quelqu'un a besoin d'un coup de main. Pour l'un, c'est un vrai besoin. Pour l'autre, une heure. Et se sentir utile, échanger quelques mots, rencontrer une personne, c'est aussi une façon de se faire du bien.</p>
        <p className="mx-auto mt-4 max-w-2xl font-semibold">
          Elisa et Jérémie · <Link to="/a-propos" className="underline underline-offset-4">Lire notre histoire</Link>
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to={homeCtaTarget("/petites-missions/creer", isAuthenticated)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-pine-foreground px-8 py-3 font-body text-sm font-semibold text-pine transition-colors hover:bg-pine-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Demander un coup de main
          </Link>
        </div>
        <Link to="/actualites/technologie-recreer-lien-pres-de-chez-soi" className="mx-auto mt-5 block w-fit text-sm underline underline-offset-4">Lire l'article</Link>
      </div>
      <img src={rooftops1600} alt="" width={1600} height={415} loading="lazy" className="mx-auto mt-8 block w-full max-w-[820px] opacity-50" />
    </section>
  );
}
