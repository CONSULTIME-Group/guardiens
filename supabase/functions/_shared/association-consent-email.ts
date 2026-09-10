// Texte unique de la demande d'accord envoyée aux associations.
//
// Source de vérité côté serveur. La copie côté application vit dans
// `src/lib/associationConsentEmail.ts` et un test vitest échoue si les deux
// textes divergent.

export const ASSOCIATION_CONSENT_SUBJECT = "Votre association présentée sur Guardiens";

export interface AssociationConsentInput {
  name: string;
  ficheUrl: string;
}

export const buildAssociationConsentText = ({ name, ficheUrl }: AssociationConsentInput): string =>
  `Bonjour,

Je suis Jérémie. Avec ma femme Elisa, nous avons créé Guardiens.fr au printemps : une plateforme de garde de maison et d'animaux entre particuliers, partout en France. Nous comptons déjà plus de 1 300 inscrits, et l'inscription comme l'usage du site sont sans frais pendant notre phase de lancement.

Nous avons ouvert une page qui fait connaître des associations de protection animale auprès de nos membres et relaie leurs besoins : dons, bénévolat, familles d'accueil. ${name} y figure déjà : ${ficheUrl}

Nous le faisons parce que c'est simple pour nous et que cela peut vous être utile.

Nous aimerions simplement votre accord pour continuer. Pour illustrer la fiche, nous avons repris quelques photos que vous avez publiées en ligne, en citant leur source. Si vous avez des photos, des liens ou une présentation à nous envoyer, nous mettrons la fiche à jour avec plaisir. Et si vous souhaitez la modifier ou la retirer, un simple mot suffit.

Merci pour tout ce que vous faites pour les animaux.

Jérémie et Elisa
Guardiens.fr`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Lettre sobre : paragraphes, police système, 15 px, fond blanc, 600 px. */
export const buildAssociationConsentHtml = ({ name, ficheUrl }: AssociationConsentInput): string => {
  const text = buildAssociationConsentText({ name, ficheUrl });
  const link = escapeHtml(ficheUrl);
  const paragraphs = text
    .split("\n\n")
    .map((block) => {
      const safe = escapeHtml(block).replace(/\n/g, "<br />");
      return safe.replace(link, `<a href="${link}" style="color:#1a4d8f;">${link}</a>`);
    })
    .map(
      (block) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1f2937;">${block}</p>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(
    ASSOCIATION_CONSENT_SUBJECT,
  )}</title></head><body style="margin:0;padding:24px;background-color:#ffffff;"><div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${paragraphs}</div></body></html>`;
};

export const buildAssociationConsentEmail = (input: AssociationConsentInput): {
  subject: string;
  text: string;
  html: string;
} => ({
  subject: ASSOCIATION_CONSENT_SUBJECT,
  text: buildAssociationConsentText(input),
  html: buildAssociationConsentHtml(input),
});
