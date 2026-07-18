import { useTranslation } from "react-i18next";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
import howtoStep1 from "@/assets/illustrations/howto-step-1-annonce.png";
import howtoStep2 from "@/assets/illustrations/howto-step-2-rencontre.png";
import howtoStep3 from "@/assets/illustrations/howto-step-3-depart.png";

const HOME_CONTENT_LAST_MODIFIED = "2026-07-01";

const HOME_ROUTE = staticRoutes.find((route) => route.path === "/");
const HOME_OG_IMAGE = HOME_ROUTE?.ogImage ?? DEFAULT_OG_IMAGE;

/**
 * JSON-LD consolidé de la page d'accueil : un seul @graph
 * (Organization, WebSite, WebPage, BreadcrumbList, Service, FAQPage, Person).
 */
export default function HomeJsonLd() {
  const { t } = useTranslation();

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
                "Plateforme de house-sitting, garde d'animaux à domicile et petites missions d'entraide entre gens du coin. Sans abonnement pour les propriétaires.",
              areaServed: [
                { "@type": "Country", name: "France" },
                { "@type": "City", name: "Lyon" },
                { "@type": "City", name: "Annecy" },
                { "@type": "City", name: "Grenoble" },
              ],
              knowsAbout: [
                "House-sitting",
                "Pet-sitting",
                "Garde d'animaux à domicile",
                "Garde de chien",
                "Garde de chat",
                "Entraide entre gens du coin",
                "Petites missions de proximité",
              ],
              slogan: "Quelqu'un du coin veille sur votre maison.",
              founder: [
                { "@type": "Person", name: "Jérémie Martinot" },
                { "@type": "Person", name: "Elisa" },
              ],
              sameAs: [
                "https://www.linkedin.com/in/jeremiemartinot",
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
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://guardiens.fr/recherche?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "WebPage",
              "@id": "https://guardiens.fr/#webpage",
              url: "https://guardiens.fr/",
              name: "Garde d'animaux à domicile et house-sitting près de chez vous | Guardiens",
              description:
                "House-sitting et petites missions d'entraide entre gens du coin. Confiez votre maison, demandez un coup de main au quartier. Partout en France.",
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
                { "@id": "https://guardiens.fr/#howto" },
                { "@id": "https://guardiens.fr/#faq" },
              ],
            },
            {
              "@type": "HowTo",
              "@id": "https://guardiens.fr/#howto",
              name: "Comment trouver un gardien de confiance pour sa maison et ses animaux",
              description:
                "Trois étapes pour confier votre maison et vos animaux à un gardien du coin sur Guardiens, sans abonnement pour les propriétaires.",
              totalTime: "PT5M",
              estimatedCost: {
                "@type": "MonetaryAmount",
                currency: "EUR",
                value: "0",
              },
              supply: [
                { "@type": "HowToSupply", name: "Dates de votre absence" },
                { "@type": "HowToSupply", name: "Description de votre maison et de vos animaux" },
              ],
              step: [
                {
                  "@type": "HowToStep",
                  position: 1,
                  name: "Décrivez votre garde",
                  text: "Renseignez vos animaux, vos dates et votre maison. En quelques minutes, votre annonce est publiée et visible des gardiens du coin.",
                  url: "https://guardiens.fr/#how-it-works",
                  image: `https://guardiens.fr${howtoStep1}`,
                },
                {
                  "@type": "HowToStep",
                  position: 2,
                  name: "Recevez des candidatures",
                  text: "Des gardiens proches de chez vous postulent. Consultez leurs profils vérifiés, lisez les avis, échangez par messagerie et rencontrez celui ou celle qui vous correspond.",
                  url: "https://guardiens.fr/#how-it-works",
                  image: `https://guardiens.fr${howtoStep2}`,
                },
                {
                  "@type": "HowToStep",
                  position: 3,
                  name: "Partez sereinement",
                  text: "Signez l'accord de garde, votre gardien s'installe, vous recevez des nouvelles régulières et vous rentrez l'esprit léger.",
                  url: "https://guardiens.fr/#how-it-works",
                  image: `https://guardiens.fr${howtoStep3}`,
                },
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
              name: "House-sitting, garde d'animaux et entraide locale entre gens du coin",
              description:
                "Deux services indépendants : house-sitting et garde d'animaux à domicile d'un côté ; petites missions d'entraide entre gens du coin de l'autre. Avis croisés, vérification d'identité, sans commission.",
              provider: { "@id": "https://guardiens.fr/#organization" },
              areaServed: [
                { "@type": "Country", name: "France" },
                { "@type": "City", name: "Lyon" },
                { "@type": "City", name: "Annecy" },
                { "@type": "City", name: "Grenoble" },
              ],
              serviceType: [
                "House-sitting",
                "Pet sitting",
                "Garde d'animaux à domicile",
                "Garde de chien",
                "Garde de chat",
                "Entraide locale",
              ],
            },
            {
              "@type": "FAQPage",
              "@id": "https://guardiens.fr/#faq",
              mainEntity: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
                "@type": "Question",
                name: t(`landing.faq.q${n}`),
                acceptedAnswer: {
                  "@type": "Answer",
                  text: t(`landing.faq.a${n}`),
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
