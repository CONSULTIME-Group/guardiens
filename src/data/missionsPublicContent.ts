/**
 * Données éditoriales centralisées pour /petites-missions.
 * Extraites de SmallMissionsPublic.tsx pour faciliter la maintenance.
 */
import spotVerger from "@/assets/missions/spot-verger.png";
import spotJardin from "@/assets/missions/spot-jardin.png";
import spotPoules from "@/assets/missions/spot-poules.png";
import spotChien from "@/assets/missions/spot-chien.png";
import spotBricolage from "@/assets/missions/spot-bricolage.png";
import spotBienetre from "@/assets/missions/spot-bienetre.png";

export const MISSIONS_ILLUSTRATIONS = {
  spotVerger,
  spotJardin,
  spotPoules,
  spotChien,
  spotBricolage,
  spotBienetre,
};

export const MISSIONS_EXAMPLES = [
  { img: spotVerger, alt: "Panier en osier rempli de fruits frais, illustration gouache", title: "Verger à ramasser", text: "Venir ramasser les fruits avant qu'ils tombent contre un énorme panier de fruits frais à emporter.", badge: "Fruits · entre gens du coin" },
  { img: spotJardin, alt: "Panier d'herbes aromatiques et sécateur, illustration gouache", title: "Coup de main au jardin", text: "Donner un coup de main pour planter, désherber ou tailler, et venir se servir librement à la récolte.", badge: "Jardinage · entre gens du coin" },
  { img: spotPoules, alt: "Poule rousse devant un nid de paille avec des œufs, illustration gouache", title: "Poules à garder", text: "Nourrir les poules et ramasser les œufs pendant 10 jours contre des œufs frais à volonté au retour.", badge: "Œufs · entre gens du coin" },
  { img: spotChien, alt: "Chien assis avec sa laisse en cuir, illustration gouache", title: "Chien à promener", text: "Deux semaines de balades contre son chien promené la prochaine fois qu'on part.", badge: "Réciprocité · entre gens du coin" },
  { img: spotBricolage, alt: "Boîte à outils en bois ouverte avec marteau, tournevis et clé, illustration gouache", title: "Petit bricolage", text: "Un coup de main pour monter une étagère, fixer un meuble ou changer un robinet, contre un vrai repas fait maison.", badge: "Repas · entre gens du coin" },
  { img: spotBienetre, alt: "Tasse en céramique, brin de lavande et galet, illustration gouache", title: "Énergie & bien-être", text: "Une séance de Reiki, un massage ou un moment de méditation partagés, en échange d'un service rendu en retour.", badge: "Échange · entre gens du coin" },
];

export const MISSIONS_FAQ: { q: string; a: string }[] = [
  { q: "C'est quoi les petites missions ?", a: "Des coups de main entre gens du coin, jardinage, animaux, bricolage, échangés sans argent. Vous proposez ce que vous savez faire, ou publiez ce dont vous avez besoin." },
  { q: "C'est vraiment gratuit ?", a: "Oui. L'entraide entre gens du coin est entièrement gratuite pour tous, sans frais ni commission. Aucune carte bancaire n'est demandée pour publier une mission ou y répondre. Cela fait partie de notre engagement : l'échange a de la valeur précisément parce qu'il n'a pas de prix." },
  { q: "Comment fonctionne l'échange ?", a: "Pas d'argent. Vous proposez quelque chose en retour, un repas, des légumes, un coup de main futur, une compétence partagée. L'échange se décide entre vous, à votre rythme, et peut être différé : vos bras aujourd'hui, ses tomates cet été." },
  { q: "Faut-il être abonné ?", a: "Non. Les petites missions sont accessibles à tous les membres inscrits, sans abonnement. L'espace gardien (pour proposer des gardes longues) est également gratuit aujourd'hui, sans engagement." },
  { q: "Quels types de missions peut-on publier ?", a: "Tout ce qui tourne autour de la maison, du jardin, des animaux et du quartier : tonte, arrosage, promenade de chien, bricolage, cuisine, transmission d'un savoir, dépannage informatique léger. La règle : rester dans l'univers de ce qui rassemble les gens du coin." },
  { q: "Comment je sais que la personne est fiable ?", a: "Chaque membre a un profil avec avis, badges et score de confiance. Vous pouvez échanger par messagerie avant de vous engager, demander des précisions, prendre le temps de sentir si le courant passe. Et vous restez libre de refuser une proposition sans avoir à vous justifier." },
  { q: "Comment proposer une petite mission près de chez vous ?", a: "Vous publiez votre demande ou votre offre depuis votre espace Guardiens. Décrivez clairement ce dont vous avez besoin (ou ce que vous proposez), précisez votre ville et ce que vous donnez en échange. Les gens du coin la voient et répondent s'ils peuvent vous aider. C'est aussi simple que ça." },
  { q: "Quelle différence entre une petite mission et une garde sur Guardiens ?", a: "Une garde, c'est une présence dans la durée : un gardien dort chez vous, prend soin de vos animaux et de votre maison pendant votre absence. Une petite mission, c'est un coup de main ponctuel : arroser les plantes, promener un chien une heure, monter un meuble. La garde et les petites missions sont accessibles Les petites missions sont gratuites pour tous." },
  { q: "L'entraide entre gens du coin est-elle réservée à certaines villes ?", a: "Non. Guardiens est ouvert dans toute la France. Les missions sont visibles uniquement aux personnes situées à proximité de chez vous, pour préserver l'esprit local de l'échange. Plus la communauté grandit dans votre quartier, plus les missions trouvent rapidement preneur." },
  { q: "Que faire si quelqu'un me propose de l'argent pour une petite mission ?", a: "Refusez. C'est non négociable et c'est ce qui rend Guardiens unique. Aucun argent ne doit circuler dans une petite mission. Si quelqu'un insiste, signalez-le à l'équipe via le formulaire de contact. Les échanges acceptés sont en nature : produits du jardin, repas, service rendu en retour." },
  { q: "Et si je n'ai jamais rendu ce genre de service auparavant ?", a: "C'est exactement le bon moment pour commencer. Les petites missions sont conçues pour être à la portée de tout le monde : pas besoin d'être expert, ni d'avoir de l'expérience. Une heure de votre temps, un peu de bonne volonté, et vous découvrirez que rendre service est souvent plus simple, et plus gratifiant, qu'on l'imagine." },
  { q: "Et si la mission ne se passe pas bien ?", a: "Vous pouvez à tout moment interrompre une mission, en parler à l'équipe Guardiens, ou laisser un avis sincère. Notre rôle est de garder l'espace sain : les comportements abusifs sont signalables et traités par l'équipe de modération. La grande majorité des échanges se passent très bien, mais nous sommes là si ce n'est pas le cas." },
];

/** Témoignages, hardcodés au lancement, pourront passer en BDD plus tard. */
export const MISSIONS_TESTIMONIALS = [
  {
    quote: "Je n'osais pas demander pour mes courses depuis mon opération. J'ai publié une mission un soir, le lendemain matin trois personnes du quartier m'avaient répondu. C'est devenu un rituel du jeudi.",
    name: "Marie",
    city: "Annecy",
  },
  {
    quote: "J'ai proposé d'aider à monter un meuble Ikea pour un voyage en mer. On a fini par devenir amis avec la famille, et je garde leur chat depuis deux étés.",
    name: "Thomas",
    city: "Lyon",
  },
  {
    quote: "Mon verger débordait de pommes que je n'avais pas le temps de ramasser. Une étudiante du coin est venue trois après-midi. Elle est repartie avec quinze kilos, moi j'ai retrouvé un jardin propre.",
    name: "Hélène",
    city: "Grenoble",
  },
];
