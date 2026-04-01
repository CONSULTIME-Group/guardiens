import { useState } from "react";

interface BadgeTimbreProps {
  id: string;
  unlocked: boolean;
  size?: "normal" | "compact";
  showTooltip?: boolean;
  ariaLabel?: string;
}

const TIMBRES_META: Record<string, { label: string; condition: string }> = {
  animaux_adopte: { label: "Les animaux l'ont adopté", condition: "Reçu après une garde" },
  maison_nickel: { label: "Maison nickel", condition: "Reçu après une garde" },
  potager_respire: { label: "Le potager respire", condition: "Reçu après une garde" },
  nouvelles_quotidiennes: { label: "Des nouvelles tous les jours", condition: "Reçu après une garde" },
  debrouillard: { label: "Débrouillard(e)", condition: "Reçu après une garde" },
  voisins_adorent: { label: "Les voisins l'adorent", condition: "Reçu après une garde" },
  invite_noel: { label: "On l'invite à Noël", condition: "Reçu après une garde" },
  au_dela_attentes: { label: "Au-delà des attentes", condition: "Reçu après une garde" },
  id_verifiee: { label: "ID vérifiée", condition: "Vérifier ton identité" },
  fondateur: { label: "Fondateur", condition: "Inscrit avant le 13 mai 2026" },
  gardien_urgence: { label: "Gardien d'urgence", condition: "5 gardes + note ≥ 4.7" },
  courant_passe: { label: "Le courant passe", condition: "Évaluation positive mutuelle" },
};

const TIMBRES_ORDER = [
  "animaux_adopte",
  "maison_nickel",
  "invite_noel",
  "voisins_adorent",
  "nouvelles_quotidiennes",
  "potager_respire",
  "debrouillard",
  "au_dela_attentes",
  "courant_passe",
  "id_verifiee",
  "gardien_urgence",
  "fondateur",
];

const D = "M5 5 Q5 3 7 3 L9 3 Q9 1 11 1 Q13 1 13 3 L17 3 Q17 1 19 1 Q21 1 21 3 L25 3 Q25 1 27 1 Q29 1 29 3 L33 3 Q33 1 35 1 Q37 1 37 3 L41 3 Q41 1 43 1 Q45 1 45 3 L47 3 Q49 3 49 5 L49 7 Q51 7 51 9 Q51 11 49 11 L49 15 Q51 15 51 17 Q51 19 49 19 L49 23 Q51 23 51 25 Q51 27 49 27 L49 31 Q51 31 51 33 Q51 35 49 35 L49 39 Q51 39 51 41 Q51 43 49 43 L49 47 Q51 47 51 49 Q51 51 49 51 L49 53 Q49 55 47 55 L45 55 Q45 57 43 57 Q41 57 41 55 L37 55 Q37 57 35 57 Q33 57 33 55 L29 55 Q29 57 27 57 Q25 57 25 55 L21 55 Q21 57 19 57 Q17 57 17 55 L13 55 Q13 57 11 57 Q9 57 9 55 L7 55 Q5 55 5 53 L5 51 Q3 51 3 49 Q3 47 5 47 L5 43 Q3 43 3 41 Q3 39 5 39 L5 35 Q3 35 3 33 Q3 31 5 31 L5 27 Q3 27 3 25 Q3 23 5 23 L5 19 Q3 19 3 17 Q3 15 5 15 L5 11 Q3 11 3 9 Q3 7 5 7 Z";

function renderTimbre(
  id: string,
  unlocked: boolean,
  w: number,
  h: number,
  label: string,
  condition: string,
): JSX.Element | null {
  const gs = !unlocked ? { filter: "grayscale(100%)" as const, opacity: 0.3 } : {};
  const ttl = unlocked ? label : `À débloquer — ${condition}`;

  switch (id) {
    case "animaux_adopte":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
          <path d="M26 38 C26 38 14 30 14 23 C14 19 17 16 20 16 C22 16 24 17.5 26 20 C28 17.5 30 16 32 16 C35 16 38 19 38 23 C38 30 26 38 26 38Z" fill="#0F6E56" opacity="0.75" />
          <circle cx="22" cy="22" r="2" fill="#3B6D11" opacity="0.5" />
        </svg>
      );

    case "maison_nickel":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#E6F1FB" stroke="#185FA5" strokeWidth="1" />
          <rect x="13" y="18" width="26" height="20" rx="2" fill="none" stroke="#185FA5" strokeWidth="1.5" />
          <path d="M13 23 L26 15 L39 23" fill="none" stroke="#185FA5" strokeWidth="1.5" />
          <path d="M20 28 L23.5 31.5 L31 24" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case "potager_respire":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#E1F5EE" stroke="#0F6E56" strokeWidth="1" />
          <path d="M26 38 L26 24" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="20" cy="20" rx="6" ry="7" fill="#1D9E75" opacity="0.85" transform="rotate(-15 20 20)" />
          <ellipse cx="32" cy="19" rx="6" ry="7" fill="#1D9E75" opacity="0.85" transform="rotate(15 32 19)" />
          <ellipse cx="26" cy="17" rx="6" ry="8" fill="#1D9E75" />
          <rect x="23" y="37" width="6" height="4" rx="1" fill="#0F6E56" opacity="0.3" />
        </svg>
      );

    case "nouvelles_quotidiennes":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#EEEDFE" stroke="#534AB7" strokeWidth="1" />
          <rect x="13" y="22" width="26" height="16" rx="3" fill="none" stroke="#534AB7" strokeWidth="1.5" />
          <circle cx="32" cy="17" r="5" fill="none" stroke="#534AB7" strokeWidth="1.5" />
          <circle cx="19" cy="30" r="2" fill="#534AB7" opacity="0.5" />
          <circle cx="26" cy="30" r="2" fill="#534AB7" opacity="0.7" />
          <circle cx="33" cy="30" r="2" fill="#534AB7" opacity="0.5" />
        </svg>
      );

    case "debrouillard":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FAEEDA" stroke="#854F0B" strokeWidth="1" />
          <path d="M15 27 L19 21 L22 27 L26 18 L30 27 L33 21 L37 27" fill="none" stroke="#854F0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26" cy="34" r="4" fill="#EF9F27" opacity="0.8" />
          <path d="M24 34 L25.5 35.5 L28.5 32" stroke="#854F0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case "voisins_adorent":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FBEAF0" stroke="#993556" strokeWidth="1" />
          <path d="M26 36 C26 36 13 28 13 21 C13 17 16 14 19 14 C21.5 14 24 15.5 26 18.5 C28 15.5 30.5 14 33 14 C36 14 39 17 39 21 C39 28 26 36 26 36Z" fill="#D4537E" opacity="0.75" />
        </svg>
      );

    case "invite_noel":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FAEEDA" stroke="#BA7517" strokeWidth="2" />
          <polygon points="26,12 29,20 38,20 31,25 33.5,34 26,29 18.5,34 21,25 14,20 23,20" fill="#EF9F27" stroke="#BA7517" strokeWidth="0.5" />
          <polygon points="26,16 28.2,22.5 35,22.5 29.5,26.5 31.5,33.5 26,29.5 20.5,33.5 22.5,26.5 17,22.5 23.8,22.5" fill="#FAC775" />
        </svg>
      );

    case "au_dela_attentes":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FAEEDA" stroke="#854F0B" strokeWidth="1" />
          <path d="M26 16 L26 34" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 16 L30 23 L26 20 L22 23 Z" fill="#EF9F27" />
          <circle cx="26" cy="35" r="2.5" fill="#EF9F27" />
          <path d="M18 24 L22 27" stroke="#854F0B" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
          <path d="M34 24 L30 27" stroke="#854F0B" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        </svg>
      );

    case "id_verifiee":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#EAF3DE" stroke="#2D6A4F" strokeWidth="1.5" />
          <rect x="7" y="7" width="38" height="46" rx="2" fill="#2D6A4F" opacity="0.06" />
          <path d="M14 30 L22 38 L38 20" stroke="#2D6A4F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case "fondateur":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FAEEDA" stroke="#BA7517" strokeWidth="2" />
          <polygon points="26,12 29,20 38,20 31,25 33.5,34 26,29 18.5,34 21,25 14,20 23,20" fill="#EF9F27" stroke="#BA7517" strokeWidth="0.5" />
          <polygon points="26,16 28.2,22.5 35,22.5 29.5,26.5 31.5,33.5 26,29.5 20.5,33.5 22.5,26.5 17,22.5 23.8,22.5" fill="#FAC775" />
        </svg>
      );

    case "gardien_urgence":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#FAEEDA" stroke="#854F0B" strokeWidth="1" />
          <circle cx="26" cy="28" r="10" fill="none" stroke="#EF9F27" strokeWidth="1" opacity="0.4" />
          <path d="M26 17 L29 25 L26 22 L23 25 Z" fill="#EF9F27" />
          <path d="M26 22 L26 34" stroke="#EF9F27" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case "courant_passe":
      return (
        <svg width={w} height={h} viewBox="0 0 52 60" xmlns="http://www.w3.org/2000/svg" aria-label={label} role="img" style={gs}>
          <title>{ttl}</title>
          <path d={D} fill="#E6F1FB" stroke="#185FA5" strokeWidth="1" />
          <path d="M26 20 C20 20 15 24 15 29 C15 33 18 36 22 37 L26 40 L30 37 C34 36 37 33 37 29 C37 24 32 20 26 20Z" fill="#378ADD" opacity="0.25" />
          <path d="M19 29 Q22 24 26 29 Q30 24 33 29" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}

export default function BadgeTimbre({
  id,
  unlocked,
  size = "normal",
  showTooltip = true,
  ariaLabel,
}: BadgeTimbreProps) {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const meta = TIMBRES_META[id];
  if (!meta) return null;

  const w = size === "normal" ? 52 : 34;
  const h = size === "normal" ? 60 : 40;
  const { label, condition } = meta;

  const svg = renderTimbre(id, unlocked, w, h, ariaLabel || label, condition);
  if (!svg) return null;

  return (
    <div
      className="relative inline-flex cursor-default"
      onMouseEnter={() => showTooltip && setShowMobileTooltip(true)}
      onMouseLeave={() => setShowMobileTooltip(false)}
      onTouchStart={() => showTooltip && setShowMobileTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowMobileTooltip(false), 1500)}
    >
      {svg}
      {showMobileTooltip && showTooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md z-50 pointer-events-none">
          {unlocked ? label : `À débloquer — ${condition}`}
        </div>
      )}
    </div>
  );
}

export { TIMBRES_META as TIMBRES, TIMBRES_ORDER };
