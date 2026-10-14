/**
 * Lot J2d : encadré d'information sur l'aide aux devoirs (CGU 7.4), affiché
 * par le formulaire de besoin quand le texte en parle. Information seule,
 * la publication reste possible.
 */
import { Link } from "react-router-dom";
import {
  HOMEWORK_CONDITIONS,
  HOMEWORK_CONDITIONS_SOURCE,
  HOMEWORK_CONDITIONS_TITLE,
} from "@/lib/missionHomework";

const HomeworkConditionsNote = () => (
  <div
    className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2"
    role="note"
    data-testid="homework-conditions-note"
  >
    <p className="text-sm font-semibold text-foreground">{HOMEWORK_CONDITIONS_TITLE}</p>
    <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
      {HOMEWORK_CONDITIONS.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
    <p className="text-xs text-muted-foreground">
      <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
        {HOMEWORK_CONDITIONS_SOURCE}
      </Link>
    </p>
  </div>
);

export default HomeworkConditionsNote;
