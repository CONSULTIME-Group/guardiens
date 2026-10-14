import { Link } from "react-router-dom";
import { frenchDate } from "@/config/legalVersions";
import { legalVersionHref, type LegalPageSelection } from "@/lib/legalPageVersion";

interface LegalVersionNoticeProps {
  /** Sigle du document dans les phrases (« CGU », « CGS »). */
  label: string;
  /** Adresse de la page (« /cgu »). */
  path: string;
  selection: LegalPageSelection;
}

const BOX = "not-prose rounded-lg border border-border bg-muted/40 px-4 py-3 mb-6 text-sm text-foreground";
const LINK = "text-primary hover:underline font-medium";

/**
 * Lot J2b : situe la version affichée par rapport au calendrier de
 * src/config/legalVersions.ts (nouvelle version publiée, version en vigueur,
 * version remplacée).
 */
const LegalVersionNotice = ({ label, path, selection }: LegalVersionNoticeProps) => {
  const { shown, inForce, upcoming, previous } = selection;

  // Version en vigueur, une nouvelle version est publiée : encadré d'annonce.
  if (shown === inForce && upcoming) {
    return (
      <div role="note" className={BOX} data-testid="legal-version-notice">
        <p>Une nouvelle version des {label} entre en vigueur le {frenchDate(upcoming.effectiveOn)}.</p>
        <p className="mt-1">
          <Link to={legalVersionHref(path, upcoming.version)} className={LINK}>
            Lire la version {upcoming.version}
          </Link>
        </p>
      </div>
    );
  }

  // Version publiée, pas encore en vigueur : lien vers celle qui s'applique.
  if (shown.effectiveOn > inForce.effectiveOn) {
    return (
      <p className="text-sm text-muted-foreground mb-6" data-testid="legal-version-notice">
        <Link to={legalVersionHref(path, inForce.version)} className={LINK}>
          Lire la version {inForce.version}, en vigueur aujourd'hui
        </Link>
      </p>
    );
  }

  // Version remplacée, lue par ?version= : encadré vers la version en vigueur.
  if (shown.effectiveOn < inForce.effectiveOn) {
    return (
      <div role="note" className={BOX} data-testid="legal-version-notice">
        <p>
          Cette version a été remplacée par la version {inForce.version}, en vigueur depuis le {frenchDate(inForce.effectiveOn)}.
        </p>
        <p className="mt-1">
          <Link to={path} className={LINK}>
            Lire la version en vigueur
          </Link>
        </p>
      </div>
    );
  }

  // Version en vigueur sans nouvelle version : lien discret vers la précédente.
  if (previous) {
    return (
      <p className="text-sm text-muted-foreground mb-6" data-testid="legal-version-notice">
        <Link to={legalVersionHref(path, previous.version)} className="hover:underline">
          Version précédente (version {previous.version})
        </Link>
      </p>
    );
  }

  return null;
};

export default LegalVersionNotice;
