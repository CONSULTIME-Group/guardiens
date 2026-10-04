import type { CityData } from "@/data/cities";

interface Props {
  city: CityData;
  faqItems: ReadonlyArray<{ q: string; a: string }>;
}

const CitySchemaOrg = ({ city, faqItems }: Props) => {
 const isLyon = city.slug === "lyon";

 const graph: any[] = [
 {
 "@type": "Service",
 name: isLyon
 ? "Garde de chien et de chat à Lyon"
 : `House-sitting, garde d'animaux, de maison et de jardin à ${city.name}`,
 description: city.metaDescription,
 serviceType: ["House Sitting", "Pet Sitting", "Dog Sitting", "Cat Sitting", "Garden Sitting"],
 provider: {
 "@type": "Organization",
 name: "Guardiens",
 url: "https://guardiens.fr",
 },
 areaServed: {
 "@type": "City",
 name: city.name,
 containedInPlace: {
 "@type": "Country",
 name: "France",
 },
 },
 offers: {
 "@type": "Offer",
 price: "0",
 priceCurrency: "EUR",
 eligibleCustomerType: "Owner",
 description: "0 € pour les propriétaires.",
 },
 },
 ...(faqItems.length ? [
 {
 "@type": "FAQPage",
 mainEntity: faqItems.map((f) => ({
 "@type": "Question",
 name: f.q,
 acceptedAnswer: {
 "@type": "Answer",
 text: f.a,
 },
 })),
 },
 ] : []),
 ];

 return (
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
 />
 );
};

export default CitySchemaOrg;
