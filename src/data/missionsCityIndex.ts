/**
 * Index léger des pages entraide par ville (lot P2), pour le pied de page.
 * Le contenu complet (71 Ko) reste dans missionsCityContent.ts, chargé par
 * la page ville. Parité verrouillée par src/__tests__/p2/startup-build.test.ts.
 */
export const MISSIONS_CITY_INDEX: ReadonlyArray<{ slug: string; cityName: string }> = [
  { slug: "lyon", cityName: "Lyon" },
  { slug: "marseille", cityName: "Marseille" },
  { slug: "strasbourg", cityName: "Strasbourg" },
  { slug: "paris", cityName: "Paris" },
  { slug: "toulouse", cityName: "Toulouse" },
  { slug: "lille", cityName: "Lille" },
  { slug: "annecy", cityName: "Annecy" },
  { slug: "nice", cityName: "Nice" },
  { slug: "nantes", cityName: "Nantes" },
  { slug: "saint-etienne", cityName: "Saint-Étienne" },
  { slug: "rennes", cityName: "Rennes" },
  { slug: "montpellier", cityName: "Montpellier" },
  { slug: "grenoble", cityName: "Grenoble" },
  { slug: "bordeaux", cityName: "Bordeaux" },
];
