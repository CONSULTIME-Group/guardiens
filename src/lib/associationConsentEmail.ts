/**
 * Texte unique de la demande d'accord envoyée aux associations.
 * Copie côté application du texte serveur
 * `supabase/functions/_shared/association-consent-email.ts`.
 * Un test vitest échoue si les deux textes divergent.
 */

export const ASSOCIATION_CONSENT_SUBJECT = "Une page pour {name} sur Guardiens";

export const buildConsentText = (name: string, ficheUrl: string): string =>
  `Bonjour,

Je m'appelle Jérémie. Avec ma femme Elisa, on a lancé Guardiens.fr au printemps. L'idée vient de notre propre histoire : en cinq ans, on a gardé 37 maisons et 234 animaux chez des gens qui nous ont fait confiance.

Guardiens met en relation des gens du coin pour garder une maison et des animaux pendant une absence, et pour se donner des coups de main au quotidien. Ce qui nous tient à cœur, c'est de créer des réseaux d'entraide, du lien social et de la proximité. On compte déjà plus de 1 300 inscrits partout en France, et pour l'instant, tout le site est à 0 €. Si vous voulez voir à quoi ça ressemble : https://guardiens.fr

Les associations comme la vôtre font vivre cette entraide tous les jours. On a donc ouvert une page qui les présente à nos membres, avec leurs besoins du moment : dons, bénévolat, familles d'accueil. ${name} y figure déjà : ${ficheUrl}

Pour nous, c'est simple à faire. Pour vous, ça peut compter : un don, un bénévole de plus, une famille d'accueil.

On aimerait simplement avoir votre accord pour continuer. Pour illustrer la fiche, on a repris quelques photos publiées sur vos pages, en citant la source. Si vous avez des photos, des liens ou une présentation à nous envoyer, on met la fiche à jour avec plaisir. Et si vous voulez la modifier ou la retirer, un petit mot suffit.

Merci pour tout ce que vous faites pour les animaux. Au plaisir de vous lire,

Jérémie et Elisa
guardiens.fr`;

/** Version copiée dans le presse-papiers depuis l'admin, objet compris. */
export const buildConsentEmail = (name: string, ficheUrl: string): string =>
  `Objet : ${ASSOCIATION_CONSENT_SUBJECT.replace("{name}", name)}

${buildConsentText(name, ficheUrl)}`;
