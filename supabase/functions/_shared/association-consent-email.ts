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

Je m'appelle Jérémie. Avec ma femme Elisa, on a lancé Guardiens.fr au printemps. L'idée vient de notre propre histoire : en cinq ans, on a gardé 37 maisons et 234 animaux chez des gens qui nous ont fait confiance.

Guardiens met en relation des gens du coin pour garder une maison et des animaux pendant une absence, et pour se donner des coups de main au quotidien. Ce qui nous tient à cœur, c'est de créer des réseaux d'entraide, du lien social et de la proximité. On compte déjà plus de 1 300 inscrits partout en France, et pour l'instant, tout le site est à 0 €. Si vous voulez voir à quoi ça ressemble : https://guardiens.fr

Les associations comme la vôtre font vivre cette entraide tous les jours. On a donc ouvert une page qui les présente à nos membres, avec leurs besoins du moment : dons, bénévolat, familles d'accueil. ${name} y figure déjà : ${ficheUrl}

Pour nous, c'est simple à faire. Pour vous, ça peut compter : un don, un bénévole de plus, une famille d'accueil.

On aimerait simplement avoir votre accord pour continuer. Pour illustrer la fiche, on a repris quelques photos publiées sur vos pages, en citant la source. Si vous avez des photos, des liens ou une présentation à nous envoyer, on met la fiche à jour avec plaisir. Et si vous voulez la modifier ou la retirer, un petit mot suffit.

Merci pour tout ce que vous faites pour les animaux. Au plaisir de vous lire,

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
