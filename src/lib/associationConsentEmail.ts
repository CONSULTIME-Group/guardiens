/**
 * Texte unique de la demande d'accord envoyée aux associations.
 * Copie côté application du texte serveur
 * `supabase/functions/_shared/association-consent-email.ts`.
 * Un test vitest échoue si les deux textes divergent.
 */

export const ASSOCIATION_CONSENT_SUBJECT = "Votre association présentée sur Guardiens";

export const buildConsentText = (name: string, ficheUrl: string): string =>
  `Bonjour,

Je suis Jérémie. Avec ma femme Elisa, nous avons créé Guardiens.fr au printemps : une plateforme de garde de maison et d'animaux entre particuliers, partout en France. Nous comptons déjà plus de 1 300 inscrits, et l'inscription comme l'usage du site sont sans frais pendant notre phase de lancement.

Nous avons ouvert une page qui fait connaître des associations de protection animale auprès de nos membres et relaie leurs besoins : dons, bénévolat, familles d'accueil. ${name} y figure déjà : ${ficheUrl}

Nous le faisons parce que c'est simple pour nous et que cela peut vous être utile.

Nous aimerions simplement votre accord pour continuer. Pour illustrer la fiche, nous avons repris quelques photos que vous avez publiées en ligne, en citant leur source. Si vous avez des photos, des liens ou une présentation à nous envoyer, nous mettrons la fiche à jour avec plaisir. Et si vous souhaitez la modifier ou la retirer, un simple mot suffit.

Merci pour tout ce que vous faites pour les animaux.

Jérémie et Elisa
Guardiens.fr`;

/** Version copiée dans le presse-papiers depuis l'admin, objet compris. */
export const buildConsentEmail = (name: string, ficheUrl: string): string =>
  `Objet : ${ASSOCIATION_CONSENT_SUBJECT}

${buildConsentText(name, ficheUrl)}`;
