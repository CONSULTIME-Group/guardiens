import { useState } from "react";

interface BadgeTimbreProps {
  id: string;
  unlocked: boolean;
  size?: "normal" | "compact";
  showTooltip?: boolean;
  ariaLabel?: string;
}

const DENTELURE =
  "M5 5 Q5 3 7 3 L9 3 Q9 1 11 1 Q13 1 13 3 L17 3 Q17 1 19 1 Q21 1 21 3 L25 3 Q25 1 27 1 Q29 1 29 3 L33 3 Q33 1 35 1 Q37 1 37 3 L41 3 Q41 1 43 1 Q45 1 45 3 L47 3 Q49 3 49 5 L49 7 Q51 7 51 9 Q51 11 49 11 L49 15 Q51 15 51 17 Q51 19 49 19 L49 23 Q51 23 51 25 Q51 27 49 27 L49 31 Q51 31 51 33 Q51 35 49 35 L49 39 Q51 39 51 41 Q51 43 49 43 L49 47 Q51 47 51 49 Q51 51 49 51 L49 53 Q49 55 47 55 L45 55 Q45 57 43 57 Q41 57 41 55 L37 55 Q37 57 35 57 Q33 57 33 55 L29 55 Q29 57 27 57 Q25 57 25 55 L21 55 Q21 57 19 57 Q17 57 17 55 L13 55 Q13 57 11 57 Q9 57 9 55 L7 55 Q5 55 5 53 L5 51 Q3 51 3 49 Q3 47 5 47 L5 43 Q3 43 3 41 Q3 39 5 39 L5 35 Q3 35 3 33 Q3 31 5 31 L5 27 Q3 27 3 25 Q3 23 5 23 L5 19 Q3 19 3 17 Q3 15 5 15 L5 11 Q3 11 3 9 Q3 7 5 7 Z";

const TIMBRES: Record<
  string,
  {
    label: string;
    condition: string;
    fill: string;
    stroke: string;
    strokeWidth: string;
    illustration: React.ReactNode;
  }
> = {
  animaux_adopte: {
    label: "Les animaux l'ont adopté",
    condition: "Reçu après une garde",
    fill: "#EAF3DE",
    stroke: "#3B6D11",
    strokeWidth: "1",
    illustration: (
      <>
        <circle cx="26" cy="26" r="5" fill="#3B6D11" opacity={0.15} />
        <path d="M22 30 Q26 22 30 30" stroke="#3B6D11" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="21" cy="24" r="2" fill="#3B6D11" />
        <circle cx="31" cy="24" r="2" fill="#3B6D11" />
        <ellipse cx="26" cy="32" rx="3" ry="1.5" fill="#3B6D11" opacity={0.3} />
      </>
    ),
  },
  maison_nickel: {
    label: "Maison nickel",
    condition: "Reçu après une garde",
    fill: "#E6F1FB",
    stroke: "#185FA5",
    strokeWidth: "1",
    illustration: (
      <>
        <path d="M18 34 L18 26 L26 20 L34 26 L34 34 Z" fill="#185FA5" opacity={0.15} stroke="#185FA5" strokeWidth="1" />
        <path d="M26 20 L18 26 L34 26 Z" fill="#185FA5" opacity={0.25} />
        <rect x="24" y="28" width="4" height="6" rx="0.5" fill="#185FA5" opacity={0.4} />
      </>
    ),
  },
  potager_respire: {
    label: "Le potager respire",
    condition: "Reçu après une garde",
    fill: "#E1F5EE",
    stroke: "#0F6E56",
    strokeWidth: "1",
    illustration: (
      <>
        <path d="M26 34 L26 24" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 24 Q22 20 26 18 Q30 20 26 24" fill="#0F6E56" opacity={0.3} />
        <path d="M26 28 Q21 25 22 22" stroke="#0F6E56" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M26 28 Q31 25 30 22" stroke="#0F6E56" strokeWidth="1" fill="none" strokeLinecap="round" />
        <ellipse cx="26" cy="35" rx="5" ry="1" fill="#0F6E56" opacity={0.15} />
      </>
    ),
  },
  nouvelles_quotidiennes: {
    label: "Des nouvelles tous les jours",
    condition: "Reçu après une garde",
    fill: "#EEEDFE",
    stroke: "#534AB7",
    strokeWidth: "1",
    illustration: (
      <>
        <rect x="20" y="22" width="12" height="9" rx="2" fill="#534AB7" opacity={0.15} stroke="#534AB7" strokeWidth="1" />
        <circle cx="26" cy="26" r="3" fill="#534AB7" opacity={0.25} />
        <path d="M24 33 L22 35" stroke="#534AB7" strokeWidth="1" strokeLinecap="round" />
        <circle cx="30" cy="21" r="1.5" fill="#534AB7" opacity={0.4} />
      </>
    ),
  },
  debrouillard: {
    label: "Débrouillard(e)",
    condition: "Reçu après une garde",
    fill: "#FAEEDA",
    stroke: "#854F0B",
    strokeWidth: "1",
    illustration: (
      <>
        <path d="M22 30 L26 22 L30 30" stroke="#854F0B" strokeWidth="1.5" fill="#854F0B" opacity={0.15} strokeLinejoin="round" />
        <circle cx="26" cy="26" r="2" fill="#854F0B" opacity={0.3} />
        <path d="M23 34 L29 34" stroke="#854F0B" strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  voisins_adorent: {
    label: "Les voisins l'adorent",
    condition: "Reçu après une garde",
    fill: "#FBEAF0",
    stroke: "#993556",
    strokeWidth: "1",
    illustration: (
      <path
        d="M26 33 C26 33 19 28 19 24 C19 21 22 20 26 24 C30 20 33 21 33 24 C33 28 26 33 26 33Z"
        fill="#993556"
        opacity={0.3}
        stroke="#993556"
        strokeWidth="1"
      />
    ),
  },
  invite_noel: {
    label: "On l'invite à Noël",
    condition: "Reçu après une garde",
    fill: "#FAEEDA",
    stroke: "#BA7517",
    strokeWidth: "2",
    illustration: (
      <>
        <polygon points="26,19 28,25 34,25 29,29 31,35 26,31 21,35 23,29 18,25 24,25" fill="#BA7517" opacity={0.25} stroke="#BA7517" strokeWidth="0.5" />
        <circle cx="26" cy="27" r="2" fill="#BA7517" opacity={0.3} />
      </>
    ),
  },
  au_dela_attentes: {
    label: "Au-delà des attentes",
    condition: "Reçu après une garde",
    fill: "#FAEEDA",
    stroke: "#854F0B",
    strokeWidth: "1",
    illustration: (
      <>
        <path d="M20 30 L26 20 L32 30" stroke="#854F0B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 26 L26 20 L29 26" fill="#854F0B" opacity={0.15} />
        <path d="M26 30 L26 35" stroke="#854F0B" strokeWidth="1" strokeLinecap="round" />
        <circle cx="26" cy="23" r="1.5" fill="#854F0B" opacity={0.4} />
      </>
    ),
  },
  id_verifiee: {
    label: "ID vérifiée",
    condition: "Vérifier ton identité",
    fill: "#EAF3DE",
    stroke: "#2D6A4F",
    strokeWidth: "1.5",
    illustration: (
      <>
        <path d="M26 20 L33 24 L33 30 C33 34 26 38 26 38 C26 38 19 34 19 30 L19 24 Z" fill="#2D6A4F" opacity={0.15} stroke="#2D6A4F" strokeWidth="1" />
        <path d="M23 28 L25 30 L30 25" stroke="#2D6A4F" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  fondateur: {
    label: "Fondateur",
    condition: "Inscrit avant le 13 mai 2026",
    fill: "#FAEEDA",
    stroke: "#BA7517",
    strokeWidth: "2",
    illustration: (
      <>
        <polygon points="26,19 28,25 34,25 29,29 31,35 26,31 21,35 23,29 18,25 24,25" fill="#BA7517" opacity={0.2} stroke="#BA7517" strokeWidth="0.8" />
        <circle cx="26" cy="27" r="3" fill="#BA7517" opacity={0.15} />
      </>
    ),
  },
  gardien_urgence: {
    label: "Gardien d'urgence",
    condition: "5 gardes + note ≥ 4.7",
    fill: "#FAEEDA",
    stroke: "#854F0B",
    strokeWidth: "1",
    illustration: (
      <>
        <path d="M26 20 L29 27 L26 25 L23 27 Z" fill="#854F0B" opacity={0.3} stroke="#854F0B" strokeWidth="0.8" />
        <path d="M26 27 L29 34 L26 32 L23 34 Z" fill="#854F0B" opacity={0.2} stroke="#854F0B" strokeWidth="0.8" />
      </>
    ),
  },
  courant_passe: {
    label: "Le courant passe",
    condition: "Évaluation positive mutuelle",
    fill: "#E6F1FB",
    stroke: "#185FA5",
    strokeWidth: "1",
    illustration: (
      <>
        <circle cx="23" cy="27" r="4" fill="#185FA5" opacity={0.15} stroke="#185FA5" strokeWidth="0.8" />
        <circle cx="29" cy="27" r="4" fill="#185FA5" opacity={0.15} stroke="#185FA5" strokeWidth="0.8" />
      </>
    ),
  },
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

export default function BadgeTimbre({
  id,
  unlocked,
  size = "normal",
  showTooltip = true,
  ariaLabel,
}: BadgeTimbreProps) {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const timbre = TIMBRES[id];
  if (!timbre) return null;

  const w = size === "normal" ? 52 : 34;
  const h = size === "normal" ? 60 : 40;
  const { label, condition, fill, stroke, strokeWidth, illustration } = timbre;

  return (
    <div className="relative inline-flex" style={{ cursor: "default" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 52 60"
        width={w}
        height={h}
        role="img"
        aria-label={ariaLabel || label}
        style={
          unlocked
            ? undefined
            : { filter: "grayscale(100%)", opacity: 0.3 }
        }
        onMouseEnter={() => showTooltip && setShowMobileTooltip(true)}
        onMouseLeave={() => setShowMobileTooltip(false)}
        onTouchStart={() => showTooltip && setShowMobileTooltip(true)}
        onTouchEnd={() =>
          setTimeout(() => setShowMobileTooltip(false), 1500)
        }
      >
        <title>{unlocked ? label : `À débloquer — ${condition}`}</title>
        <path
          d={DENTELURE}
          fill={unlocked ? fill : "#F1EFE8"}
          stroke={unlocked ? stroke : "#B4B2A9"}
          strokeWidth={unlocked ? strokeWidth : "1"}
        />
        {illustration}
      </svg>

      {showMobileTooltip && showTooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md z-50 pointer-events-none">
          {unlocked ? label : `À débloquer — ${condition}`}
        </div>
      )}
    </div>
  );
}

export { TIMBRES, TIMBRES_ORDER };
