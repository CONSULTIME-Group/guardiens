/**
 * Texte unique de la demande d'accord envoyée aux associations.
 * Copie côté application du texte serveur
 * `supabase/functions/_shared/association-consent-email.ts`.
 * Un test vitest échoue si les deux textes divergent.
 */

export const ASSOCIATION_CONSENT_SUBJECT = "Une page pour {name} sur Guardiens";

export const buildConsentText = (name: string, ficheUrl: string): string =>
  `Bonjour,

Je me permets de vous contacter car, avec ma femme Elisa, nous avons créé une plateforme qui a pour objectif de favoriser l'entraide de proximité, autour des animaux mais pas seulement. La plateforme est 100 % gratuite : nous souhaitons avant tout créer un réseau et du lien social.

Nous sommes très contents du démarrage, puisque nous avons déjà plus de 1 300 inscrits en quelques mois. Nous aimerions en profiter pour donner de la visibilité à des associations comme la vôtre, afin que vous puissiez vous présenter et peut-être obtenir ce dont vous avez besoin : des dons, du bénévolat ou quoi que ce soit d'autre. On se dit simplement que pour nous, le coût est nul, et que cela peut aider.

Nous aimerions simplement avoir votre accord. Vous pouvez voir ce que nous avons fait pour ${name} ici : ${ficheUrl}
Et découvrir Guardiens ici : https://guardiens.fr

Et évidemment, si vous souhaitez nous donner des informations supplémentaires sur votre association (photos, présentation, logo, lien vers vos dons…), n'hésitez pas !

En attendant votre retour,
Merci à vous,

Jérémie et Elisa
guardiens.fr`;

/** Version copiée dans le presse-papiers depuis l'admin, objet compris. */
export const buildConsentEmail = (name: string, ficheUrl: string): string =>
  `Objet : ${ASSOCIATION_CONSENT_SUBJECT.replace("{name}", name)}

${buildConsentText(name, ficheUrl)}`;
