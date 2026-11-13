import { useTranslation } from "@/i18n/react";
import { SOCIAL_LINKS } from "@/data/socialLinks";
import { useInternationalSitsCount } from "@/hooks/useInternationalSitsCount";
// Lot P2b : constante légère, siteRoutes (22 Ko) reste hors de la page d'accueil.
import { HOME_OG_IMAGE } from "@/data/siteConstants";

// Mise à jour manuelle à chaque retouche du contenu de la home.
const HOME_CONTENT_LAST_MODIFIED = "2026-10-04";


/**
 * JSON-LD consolidé de la page d'accueil : un seul @graph
 * (Organization, WebSite, WebPage, BreadcrumbList, Service, FAQPage, Person).
 */
export default function HomeJsonLd() {
  const { t } = useTranslation();
  const { count: internationalCount } = useInternationalSitsCount();
  const faqNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const internationalListings =
    internationalCount > 0
      ? t(
          internationalCount === 1 ? "landing.faq.a9_count_one" : "landing.faq.a9_count_other",
          { count: internationalCount },
        )
      : "";

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://guardiens.fr/#organization",
              name: "Guardiens",
              alternateName: ["Guardiens.fr", "House-sitting Guardiens"],
              url: "https://guardiens.fr",
              logo: {
                "@type": "ImageObject",
                url: "https://guardiens.fr/icons/icon-512.png",
                width: 512,
                height: 512,
              },
              description:
                "Réseau d'entraide entre particuliers : house-sitting, garde d'animaux à domicile, de maison et de jardin, et entraide entre gens du coin. Mise en relation par affinité, identité vérifiable, avis croisés. France entière et Français à l'étranger.",
              areaServed: { "@type": "Country", name: "France" },
              knowsAbout: [
                "House-sitting",
                "Pet-sitting",
                "Garde d'animaux à domicile",
                "Garde de maison",
                "Garde de jardin pendant une absence",
                "Garde de chien",
                "Garde de chat",
                "Entraide entre particuliers",
                "Entraide entre particuliers",
                "Score d'affinité entre propriétaires et gardiens",
                "Guides de race et de ville",
                "Chantiers participatifs entre particuliers",
              ],
              slogan: "Proches de chez vous.",
              foundingDate: "2026-05-13",
              identifier: {
                "@type": "PropertyValue",
                propertyID: "SIRET",
                value: "894 864 040 00015",
              },
              founder: [
                { "@id": "https://guardiens.fr/#founder-jeremie" },
                { "@id": "https://guardiens.fr/#founder-elisa" },
              ],
              address: {
                "@type": "PostalAddress",
                streetAddress: "22 rue Juiverie",
                postalCode: "69005",
                addressLocality: "Lyon",
                addressCountry: "FR",
              },
              email: "contact@guardiens.fr",
              sameAs: [
                ...SOCIAL_LINKS.map((s) => s.url),
                "https://maps.app.goo.gl/wBCoMpnyRu8GbrTV7",
              ],

            },
            {
              "@type": "WebSite",
              "@id": "https://guardiens.fr/#website",
              name: "Guardiens",
              url: "https://guardiens.fr",
              inLanguage: "fr-FR",
              publisher: { "@id": "https://guardiens.fr/#organization" },
            },
            {
              "@type": "WebPage",
              "@id": "https://guardiens.fr/#webpage",
              url: "https://guardiens.fr/",
              name: "Garde d'animaux et de maison près de chez vous | Guardiens",
              description:
                "Faites garder votre chien, votre chat et votre maison par un gardien près de chez vous, et trouvez un coup de main au quotidien. Guardiens est gratuit.",
              inLanguage: "fr-FR",
              isPartOf: { "@id": "https://guardiens.fr/#website" },
              about: { "@id": "https://guardiens.fr/#organization" },
              primaryImageOfPage: {
                "@type": "ImageObject",
                url: HOME_OG_IMAGE,
              },
              dateModified: HOME_CONTENT_LAST_MODIFIED,
              mainEntity: [
                { "@id": "https://guardiens.fr/#service" },
                { "@id": "https://guardiens.fr/#faq" },
              ],
            },
            {
              "@type": "BreadcrumbList",
              "@id": "https://guardiens.fr/#breadcrumb",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Accueil",
                  item: "https://guardiens.fr/",
                },
              ],
            },
            {
              "@type": "Service",
              "@id": "https://guardiens.fr/#service",
              name: "House-sitting, garde d'animaux, de maison et de jardin, entraide locale entre gens du coin",
              description:
                "Deux services indépendants : house-sitting, garde d'animaux à domicile, de maison et de jardin d'un côté ; entraide entre gens du coin de l'autre. Avis croisés, vérification d'identité, gardes entre membres, en temps et en services.",
              provider: { "@id": "https://guardiens.fr/#organization" },
              areaServed: { "@type": "Country", name: "France" },
              serviceType: [
                "House-sitting",
                "Pet sitting",
                "Garde d'animaux à domicile",
                "Garde de maison",
                "Garde de jardin pendant une absence",
                "Garde de chien",
                "Garde de chat",
                "Entraide locale",
              ],
            },
            {
              "@type": "FAQPage",
              "@id": "https://guardiens.fr/#faq",
              mainEntity: faqNumbers.map((n) => ({
                "@type": "Question",
                name: t(`landing.faq.q${n}`),
                acceptedAnswer: {
                  "@type": "Answer",
                  text: t(`landing.faq.a${n}`, { listings: internationalListings }).trim(),
                },
              })),
            },
            {
              "@type": "Person",
              "@id": "https://guardiens.fr/#founder-jeremie",
              name: "Jérémie Martinot",
              jobTitle: "Cofondateur",
              worksFor: { "@id": "https://guardiens.fr/#organization" },
              url: "https://guardiens.fr/a-propos",
              sameAs: ["https://www.linkedin.com/in/jeremiemartinot"],
            },
            {
              "@type": "Person",
              "@id": "https://guardiens.fr/#founder-elisa",
              name: "Elisa",
              jobTitle: "Cofondatrice",
              worksFor: { "@id": "https://guardiens.fr/#organization" },
              url: "https://guardiens.fr/a-propos",
            },
          ],
        }),
      }}
    />
  );
}

