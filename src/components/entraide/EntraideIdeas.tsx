/**
 * Lot E4 (11/10/2026) : « Une idée pour commencer ».
 * Six tuiles illustrées (gouaches de la banque missions) qui ouvrent le
 * formulaire de besoin avec le titre déjà écrit (?titre=). Chaque clic est
 * mesuré (entraide_idea_tile_clicked).
 */
import spotJardin from "@/assets/missions/spot-jardin-160.webp";
import spotVerger from "@/assets/missions/spot-verger-160.webp";
import spotBricolage from "@/assets/missions/spot-bricolage-160.webp";
import spotChien from "@/assets/missions/spot-chien-160.webp";
import spotChat from "@/assets/missions/spot-chat-160.webp";
import spotBienetre from "@/assets/missions/spot-bienetre-160.webp";
import { ENTRAIDE_IDEAS, type EntraideIdeaKey } from "@/lib/entraideIdeas";

const IMAGES: Record<EntraideIdeaKey, string> = {
  potager: spotJardin,
  courses: spotVerger,
  meuble: spotBricolage,
  chien: spotChien,
  chat: spotChat,
  jeux: spotBienetre,
};

const EntraideIdeas = ({ onPick }: { onPick: (key: EntraideIdeaKey, label: string) => void }) => (
  <section className="mt-5" aria-labelledby="entraide-ideas-title">
    <h2 id="entraide-ideas-title" className="text-sm font-semibold text-foreground">Une idée pour commencer</h2>
    <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
      {ENTRAIDE_IDEAS.map((idea) => (
        <li key={idea.key} className="shrink-0">
          <button
            type="button"
            onClick={() => onPick(idea.key, idea.label)}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-full sm:flex-col sm:items-start sm:whitespace-normal sm:rounded-lg sm:p-3"
          >
            <img
              src={IMAGES[idea.key]}
              alt=""
              width={80}
              height={80}
              decoding="async"
              className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-16 sm:w-16 sm:rounded-md"
            />
            <span className="leading-snug">{idea.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

export default EntraideIdeas;
