import { Link } from "react-router-dom";
import { FileText, MessageSquare, Award, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./SitterMatchSection";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Vague 3 sur 4, tuiles histoire.
 *
 * Trois tuiles à hauteur égale, chiffres réels, un zéro ne s'alarme jamais.
 * Aucun bouton primaire : le seul de l'écran reste celui de la carte
 * rencontre (vague 2). Liens texte uniquement.
 */

interface Props {
  pendingAppsCount: number;
  unreadCount: number;
  badgeCount: number;
}

type TileData = {
  key: string;
  Icon: LucideIcon;
  value: number;
  label: string;
  linkTo: string;
  linkText: string;
  spanFull?: boolean;
};

const Tile = ({ tile }: { tile: TileData }) => {
  const { Icon, value, label, linkTo, linkText } = tile;
  return (
    <article
      className={`bg-card border border-border flex flex-col items-start h-full ${
        tile.spanFull ? "col-span-2 md:col-span-1" : ""
      }`}
      style={{
        borderRadius: "16px",
        padding: "14px 22px",
        boxShadow:
          "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center text-secondary"
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "9px",
          backgroundColor: "hsl(var(--secondary) / 0.12)",
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <p
        className="font-heading text-foreground mt-[14px]"
        style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.1 }}
      >
        {value}
      </p>
      <p
        className="text-muted-foreground mt-[8px]"
        style={{ fontSize: "12.5px", lineHeight: 1.4 }}
      >
        {label}
      </p>
      <Link
        to={linkTo}
        className="text-primary hover:underline underline-offset-4 mt-auto"
        style={{
          fontSize: "12px",
          fontWeight: 700,
          paddingTop: "8px",
        }}
      >
        {linkText}
      </Link>
    </article>
  );
};

const SitterStoryTiles = ({
  pendingAppsCount,
  unreadCount,
  badgeCount,
}: Props) => {
  const tiles: TileData[] = [
    {
      key: "apps",
      Icon: FileText,
      value: pendingAppsCount,
      label:
        pendingAppsCount > 1
          ? "candidatures en attente de réponse"
          : "candidature en attente de réponse",
      linkTo: pendingAppsCount === 0 ? "/recherche" : "/mes-candidatures",
      linkText:
        pendingAppsCount === 0
          ? "Postuler à votre première garde"
          : "Suivre vos candidatures",
    },
    {
      key: "messages",
      Icon: MessageSquare,
      value: unreadCount,
      label: unreadCount > 1 ? "messages à lire" : "message à lire",
      linkTo: "/messages",
      linkText: "Ouvrir vos conversations",
    },
    {
      key: "badges",
      Icon: Award,
      value: badgeCount,
      label: badgeCount > 1 ? "écussons obtenus" : "écusson obtenu",
      linkTo: "/profile#badges",
      linkText:
        badgeCount === 0
          ? "Débloquer votre premier écusson"
          : "En débloquer d'autres",
      spanFull: true,
    },
  ];

  return (
    <section aria-label="Votre activité">
      <SectionHeader
        eyebrow="Votre activité"
        title="Là où votre histoire avance."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-[14px]">
        {tiles.map((t) => (
          <Tile key={t.key} tile={t} />
        ))}
      </div>
    </section>
  );
};

export default SitterStoryTiles;
