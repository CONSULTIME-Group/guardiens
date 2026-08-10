/**
 * Nœud Organization minimal, identifiant.
 *
 * Le nœud complet (founder, foundingDate, slogan, areaServed, knowsAbout,
 * sameAs) est déclaré une seule fois, sur la page d'accueil (HomeJsonLd).
 * Partout ailleurs, on émet ce nœud minimal portant le même @id afin que les
 * références publisher restent résolubles localement, sans dupliquer
 * l'objet complet sur chaque page.
 */
export const ORGANIZATION_ID = "https://guardiens.fr/#organization";

export const ORGANIZATION_NODE = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Guardiens",
  url: "https://guardiens.fr",
  logo: {
    "@type": "ImageObject",
    url: "https://guardiens.fr/icons/icon-512.png",
    width: 512,
    height: 512,
  },
} as const;

export const ORGANIZATION_REF = { "@id": ORGANIZATION_ID };

/** Enveloppe un schéma dans un @graph contenant aussi le nœud Organization. */
export function withOrganizationGraph(schema: Record<string, unknown>) {
  const { "@context": _ctx, ...rest } = schema as Record<string, unknown>;
  return {
    "@context": "https://schema.org",
    "@graph": [ORGANIZATION_NODE, rest],
  };
}
