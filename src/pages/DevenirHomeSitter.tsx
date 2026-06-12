import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";

const SITE = "https://guardiens.fr";
const URL = `${SITE}/devenir-home-sitter`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HowTo",
      name: "Devenir home-sitter en France",
      description:
        "Guide complet pour devenir home-sitter : créer votre profil, gagner la confiance des propriétaires, décrocher vos premières gardes à domicile.",
      url: URL,
      step: [
        { "@type": "HowToStep", position: 1, name: "Créer votre profil gardien", text: "Inscrivez-vous gratuitement, complétez votre bio, ajoutez vos expériences avec les animaux et vérifiez votre identité." },
        { "@type": "HowToStep", position: 2, name: "Renseigner votre zone et vos disponibilités", text: "Indiquez la ville où vous pouvez garder, votre rayon d'intervention et vos créneaux disponibles." },
        { "@type": "HowToStep", position: 3, name: "Candidater aux annonces", text: "Parcourez les gardes proposées près de chez vous. Personnalisez chaque message pour convaincre le propriétaire." },
        { "@type": "HowToStep", position: 4, name: "Échanger et rencontrer", text: "Discutez via la messagerie sécurisée, organisez une rencontre préalable avec l'animal et les propriétaires." },
        { "@type": "HowToStep", position: 5, name: "Effectuer la garde et collecter vos avis", text: "Réalisez la garde avec sérieux. Chaque avis positif renforce votre réputation et accélère vos prochaines candidatures." },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Faut-il être professionnel pour devenir home-sitter ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. La majorité des gardiens sont des particuliers passionnés d'animaux. Vous devez être majeur, sérieux, et avoir une expérience minimale avec les animaux.",
          },
        },
        {
          "@type": "Question",
          name: "Combien gagne un home-sitter ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sur Guardiens, les gardes à domicile s'organisent comme des échanges de services entre particuliers, sans transaction financière directe via la plateforme. Vous bénéficiez gratuitement du logement et de la confiance des propriétaires, eux d'une garde de qualité pour leurs animaux.",
          },
        },
        {
          "@type": "Question",
          name: "Comment décrocher ma première garde ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Soignez votre profil (photo, bio détaillée, expériences), vérifiez votre identité, et candidatez avec un message personnalisé qui montre que vous avez lu l'annonce. La rencontre préalable rassure presque toujours.",
          },
        },
        {
          "@type": "Question",
          name: "Suis-je couvert pendant une garde ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Votre responsabilité civile habitation couvre la plupart des situations. Pour les gardes longues ou à fort enjeu, nous recommandons de vérifier votre contrat ou de souscrire une extension.",
          },
        },
        {
          "@type": "Question",
          name: "Quelle différence entre home-sitting et pet-sitting ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le home-sitting consiste à s'installer chez le propriétaire pour veiller sur sa maison et ses animaux pendant son absence. Le pet-sitting peut se faire à votre domicile ou par visites. Guardiens couvre les deux formats.",
          },
        },
      ],
    },
  ],
};

export default function DevenirHomeSitter() {
  return (
    <>
      <PageMeta
        title="Devenir home-sitter, guide complet 2026"
        description="Comment devenir home-sitter en France : créer votre profil, décrocher vos premières gardes, gagner la confiance des propriétaires. Guide pratique."
        canonical={URL}
        jsonLd={jsonLd}
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageBreadcrumb items={[{ label: "Devenir home-sitter" }]} />

        <article className="prose prose-stone max-w-none font-body">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Devenir home-sitter, guide complet
          </h1>
          <p className="text-lg text-muted-foreground">
            Le home-sitting consiste à veiller sur la maison et les animaux d'un
            propriétaire absent, en s'installant à son domicile. Voici comment
            démarrer sereinement et décrocher vos premières gardes près de chez
            vous.
          </p>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              1. Qu'est-ce qu'un home-sitter ?
            </h2>
            <p>
              Un home-sitter (ou gardien d'animaux à domicile) s'installe chez le
              propriétaire pour la durée de son absence. Il nourrit, promène,
              donne les traitements éventuels, et garde une présence rassurante
              à la maison. Pour l'animal, c'est la solution la moins stressante :
              il reste dans ses repères, avec ses odeurs et ses habitudes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              2. Le profil d'un bon home-sitter
            </h2>
            <ul>
              <li>Une expérience réelle avec les animaux (votre propre animal, gardes ponctuelles, refuge, famille).</li>
              <li>Disponibilité sur la durée de la garde, sans absence prolongée.</li>
              <li>Sens des responsabilités : entretien du logement, respect des consignes, communication régulière.</li>
              <li>Calme, patience, et bienveillance avec l'animal comme avec les propriétaires.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              3. Les 5 étapes pour démarrer
            </h2>
            <ol>
              <li>
                <strong>Créer votre profil.</strong> Inscription gratuite. Photo
                claire, bio honnête, expériences animales détaillées.
              </li>
              <li>
                <strong>Vérifier votre identité.</strong> Le badge identité
                vérifiée multiplie vos chances d'être retenu.
              </li>
              <li>
                <strong>Définir votre zone.</strong> Ville, rayon
                d'intervention, dates disponibles.
              </li>
              <li>
                <strong>Candidater avec soin.</strong> Lisez l'annonce, citez
                un détail spécifique, proposez une rencontre préalable.
              </li>
              <li>
                <strong>Collecter vos premiers avis.</strong> Un avis positif
                vaut dix candidatures. Soyez irréprochable sur la première
                garde.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              4. Combien gagne un home-sitter sur Guardiens ?
            </h2>
            <p>
              Sur Guardiens, les gardes à domicile reposent sur un échange de
              services entre particuliers : pas de transaction financière
              directe via la plateforme. Vous bénéficiez gratuitement du
              logement et de la confiance des propriétaires ; eux profitent
              d'une garde sereine pour leurs animaux. Ce modèle attire des
              gardiens engagés par passion, pas par opportunisme.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              5. Sécurité, assurance, cadre légal
            </h2>
            <p>
              Votre responsabilité civile habitation couvre la majorité des
              situations courantes. Pour les gardes longues ou à enjeu (animaux
              de valeur, maison isolée), vérifiez les clauses de votre contrat
              ou souscrivez une extension. Guardiens applique le RGPD, vérifie
              les identités, et propose une messagerie modérée.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold mt-8">
              6. Questions fréquentes
            </h2>
            <h3 className="font-heading text-lg font-semibold mt-4">
              Faut-il être professionnel ?
            </h3>
            <p>
              Non. La majorité des gardiens sont des particuliers passionnés.
              Majorité légale et sérieux suffisent.
            </p>
            <h3 className="font-heading text-lg font-semibold mt-4">
              Quelle différence avec le pet-sitting ?
            </h3>
            <p>
              Le home-sitting se fait au domicile du propriétaire. Le
              pet-sitting peut se faire chez vous ou par visites. Guardiens
              couvre les deux formats.
            </p>
            <h3 className="font-heading text-lg font-semibold mt-4">
              Combien de temps avant la première garde ?
            </h3>
            <p>
              Comptez 2 à 6 semaines entre l'inscription et la première garde
              confirmée, selon votre zone et la qualité de vos candidatures.
            </p>
          </section>

          <Card className="mt-10 border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-xl font-semibold text-foreground m-0">
                Prêt à devenir home-sitter ?
              </h2>
              <p className="text-muted-foreground m-0">
                Créez votre profil gratuitement et candidatez aux gardes près
                de chez vous. Service gardien gratuit jusqu'au 14 juillet 2026.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/auth?role=sitter">Créer mon profil gardien</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/gardes">Voir les gardes disponibles</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <nav className="mt-10 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">À lire ensuite</p>
            <ul className="space-y-1">
              <li><Link to="/tarifs" className="underline">Tarifs et fonctionnement</Link></li>
              <li><Link to="/parrainage" className="underline">Programme de parrainage</Link></li>
              <li><Link to="/faq" className="underline">FAQ complète</Link></li>
            </ul>
          </nav>
        </article>
      </div>
    </>
  );
}
