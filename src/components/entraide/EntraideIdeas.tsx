/**
 * Lot E4 (11/10/2026) : « Une idée pour commencer ».
 * Six tuiles illustrées (gouaches de la banque missions) qui ouvrent le
 * formulaire de besoin avec le titre déjà écrit (?titre=). Chaque clic est
 * mesuré (entraide_idea_tile_clicked).
 */
import spotJardin from "@/assets/missions/spot-jardin-160.webp";
import spotBricolage from "@/assets/missions/spot-bricolage-160.webp";
import spotChien from "@/assets/missions/spot-chien-160.webp";
import spotCourses from "@/assets/missions/spot-courses-160.webp";
import spotJeux from "@/assets/missions/spot-jeux-160.webp";
import spotTrajet from "@/assets/missions/spot-trajet-160.webp";
import { ENTRAIDE_IDEAS, type EntraideIdeaKey } from "@/lib/entraideIdeas";
import { HubIdeas } from "@/components/outings/HubHeader";

const IMAGES: Record<EntraideIdeaKey, string> = {
  potager: spotJardin,
  courses: spotCourses,
  meuble: spotBricolage,
  chien: spotChien,
  // Lot E22 (25/10/2026) : gouaches courses, jeux et trajet peintes.
  trajet: spotTrajet,
  jeux: spotJeux,
};

const EntraideIdeas = ({ onPick }: { onPick: (key: EntraideIdeaKey, label: string) => void }) => (
  <HubIdeas
    id="entraide-ideas-title"
    ideas={ENTRAIDE_IDEAS.map((idea) => ({ key: idea.key, label: idea.label, image: IMAGES[idea.key] }))}
    onPick={(picked) => {
      const idea = ENTRAIDE_IDEAS.find((row) => row.key === picked.key);
      if (idea) onPick(idea.key, idea.title);
    }}
  />
);

export default EntraideIdeas;
