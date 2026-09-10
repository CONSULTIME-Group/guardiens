// Texte unique de la demande d'accord envoyée aux associations.
//
// Source de vérité côté serveur. La copie côté application vit dans
// `src/lib/associationConsentEmail.ts` et un test vitest échoue si les deux
// textes divergent.

export const ASSOCIATION_CONSENT_SUBJECT = "Une page pour {name} sur Guardiens";

export interface AssociationConsentInput {
  name: string;
  ficheUrl: string;
}

export const buildAssociationConsentText = ({ name, ficheUrl }: AssociationConsentInput): string =>
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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const linkStyle = "color:#1a4d8f;";

/** Lettre sobre : paragraphes, police système, 15 px, fond blanc, 600 px. */
export const buildAssociationConsentHtml = ({ name, ficheUrl }: AssociationConsentInput): string => {
  const text = buildAssociationConsentText({ name, ficheUrl });
  const safeFicheUrl = escapeHtml(ficheUrl);
  const safeGuardiensUrl = escapeHtml("https://guardiens.fr");

  const body = escapeHtml(text)
    .replace(new RegExp(safeFicheUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "§FICHE_URL§")
    .replace(new RegExp(safeGuardiensUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "§GUARDIENS_URL§")
    .replace(/guardiens\.fr/g, "§SIGNATURE_URL§")
    .replace(/§FICHE_URL§/g, `<a href="${safeFicheUrl}" style="${linkStyle}">${safeFicheUrl}</a>`)
    .replace(/§GUARDIENS_URL§/g, `<a href="${safeGuardiensUrl}" style="${linkStyle}">${safeGuardiensUrl}</a>`)
    .replace(/§SIGNATURE_URL§/g, `<a href="${safeGuardiensUrl}" style="${linkStyle}">guardiens.fr</a>`);

  const paragraphs = body
    .split("\n\n")
    .map(
      (block) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1f2937;">${block.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const subject = ASSOCIATION_CONSENT_SUBJECT.replace("{name}", escapeHtml(name));

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${subject}</title></head><body style="margin:0;padding:24px;background-color:#ffffff;"><div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${paragraphs}</div></body></html>`;
};

export const buildAssociationConsentEmail = (input: AssociationConsentInput): {
  subject: string;
  text: string;
  html: string;
} => ({
  subject: ASSOCIATION_CONSENT_SUBJECT.replace("{name}", input.name),
  text: buildAssociationConsentText(input),
  html: buildAssociationConsentHtml(input),
});
