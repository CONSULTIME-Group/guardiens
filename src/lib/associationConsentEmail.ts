/**
 * Texte unique de la demande d'accord photos envoyée aux associations.
 * Copié tel quel dans le presse-papiers depuis l'admin.
 */
export const buildConsentEmail = (name: string, ficheUrl: string): string =>
  `Objet : ${name} présentée sur Guardiens, votre accord pour les photos

Bonjour,

Nous sommes Jérémie et Elisa, fondateurs de Guardiens, une plateforme de garde de maison et d'animaux entre particuliers. Nous avons créé une page qui présente des associations de protection animale, et ${name} y figure : ${ficheUrl}

La fiche présente votre action, vos besoins du moment et renvoie directement vers votre page de dons, votre site et vos réseaux. Pour l'illustrer, nous avons repris quelques photos publiées sur votre site, en citant leur source.

Nous aimerions votre accord pour continuer à les utiliser. Si vous préférez d'autres photos, envoyez-les en réponse à ce message et nous les mettrons en ligne. Si vous souhaitez modifier ou retirer la fiche, un simple mot suffit : nous le faisons sous 48 heures.

Merci pour tout ce que vous faites pour les animaux.

Jérémie et Elisa
guardiens.fr`;
