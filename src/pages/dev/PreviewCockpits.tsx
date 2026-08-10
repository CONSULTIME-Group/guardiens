/**
 * Page de prévisualisation, réservée à la recette visuelle.
 *
 * Elle rend les deux variantes de la carte d'accueil (gardien et
 * propriétaire) avec plusieurs prénoms, pour permettre au garde fou
 * Playwright de mesurer le nombre de lignes réellement rendues par le
 * titre en 390 px.
 */
import SitterCockpit from "@/components/dashboard/sitter/SitterCockpit";
import OwnerCockpit from "@/components/dashboard/owner/OwnerCockpit";

const CASES: { greeting: string; firstName: string }[] = [
  { greeting: "Bonjour", firstName: "Jeremie" },
  { greeting: "Bienvenue", firstName: "Jeremie" },
  { greeting: "Bienvenue", firstName: "Jean-Christophe" },
  { greeting: "Bienvenue", firstName: "J" },
];

const PreviewCockpits = () => (
  <main className="min-w-0 px-4 py-6 space-y-8">
    <h1 className="sr-only">Prévisualisation des cartes d'accueil</h1>
    {CASES.map((c, i) => (
      <div key={`sitter-${i}`} data-testid="cockpit-case" data-role="sitter">
        <SitterCockpit
          userId="00000000-0000-0000-0000-000000000000"
          firstName={c.firstName}
          greeting={c.greeting}
          isAvailable={i % 2 === 0}
          onToggleAvailability={() => {}}
        />
      </div>
    ))}
    {CASES.map((c, i) => (
      <div key={`owner-${i}`} data-testid="cockpit-case" data-role="owner">
        <OwnerCockpit
          userId="00000000-0000-0000-0000-000000000000"
          firstName={c.firstName}
          greeting={c.greeting}
          subtitle="Votre maison est prête à accueillir."
        />
      </div>
    ))}
  </main>
);

export default PreviewCockpits;
