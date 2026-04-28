import { ShieldCheck, BadgeCheck, Eye, MessageSquare, Star, Users } from "lucide-react";

const items = [
  {
    icon: BadgeCheck,
    title: "Identité vérifiée",
    desc: "Chaque gardien valide son identité avec une pièce officielle avant de pouvoir postuler.",
  },
  {
    icon: Eye,
    title: "Profils transparents",
    desc: "Photo, expériences, compétences, lieu : aucune zone d'ombre avant de dire oui.",
  },
  {
    icon: Star,
    title: "Avis croisés et écussons",
    desc: "Propriétaires et gardiens s'évaluent mutuellement. La confiance se construit visiblement.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie modérée",
    desc: "Échangez en confiance — signalements, blocages et modération humaine en cas de besoin.",
  },
  {
    icon: Users,
    title: "Communauté à taille humaine",
    desc: "Pas d'inconnus venus de l'autre bout du monde. Des gens du coin, vérifiés et notés.",
  },
  {
    icon: ShieldCheck,
    title: "Vous gardez le contrôle",
    desc: "Vous choisissez avec qui échanger, qui rencontrer, et à qui confier vos animaux.",
  },
];

export default function SecurityTrustSection() {
  return (
    <section className="max-w-5xl mx-auto mb-12 md:mb-16">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Une confiance qui se vérifie
        </h2>
        <p className="text-sm md:text-base font-body text-foreground/60 max-w-2xl mx-auto">
          Confier ses animaux ou entrer chez quelqu'un, ça ne s'improvise pas. Voici tout ce qu'on met en place pour que chaque rencontre se fasse en confiance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-card border border-border/40 rounded-xl p-5 hover:border-primary/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">
                {item.title}
              </h3>
              <p className="text-sm font-body text-foreground/65 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
