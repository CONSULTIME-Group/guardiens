/**
 * NextGuardRailCard — carte "prochaine garde" du rail confirmé (vague 4).
 * Ne s'affiche que si nextGuard existe. Construite sur les VRAIS champs.
 */
import { Link } from "react-router-dom";

interface NextGuardRailCardProps {
  nextGuard: {
    id: string;
    slug?: string | null;
    title?: string | null;
    city?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    ownerName?: string | null;
    pets?: Array<{ species?: string | null }>;
  };
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const safeFmt = (d?: string | null) => {
  if (!d) return null;
  try {
    return dateFmt.format(new Date(d));
  } catch {
    return null;
  }
};

// Traduction discrète des espèces (aucun emoji).
const speciesLabel = (s?: string | null): string | null => {
  if (!s) return null;
  const key = s.toLowerCase();
  if (key.includes("chien") || key === "dog") return "chien";
  if (key.includes("chat") || key === "cat") return "chat";
  if (key.includes("oiseau") || key === "bird") return "oiseau";
  if (key.includes("rongeur") || key === "rodent") return "rongeur";
  if (key.includes("nac")) return "NAC";
  return s;
};

const NextGuardRailCard = ({ nextGuard }: NextGuardRailCardProps) => {
  const owner = (nextGuard.ownerName || "").trim();
  const city = (nextGuard.city || "").trim();
  const title = (nextGuard.title || "").trim();

  // Titre : "Chez {prénom}, à {ville}" si les deux dispos, sinon composition
  // dégradée, sinon repli sur le titre de l'annonce.
  let composed: string;
  if (owner && city) composed = `Chez ${owner}, à ${city}`;
  else if (owner) composed = `Chez ${owner}`;
  else if (city) composed = `À ${city}`;
  else composed = title || "Votre prochaine garde";

  const start = safeFmt(nextGuard.start_date);
  const end = safeFmt(nextGuard.end_date);
  const dateRange =
    start && end
      ? start === end
        ? start
        : `du ${start} au ${end}`
      : start || end || null;

  const petLabels = Array.from(
    new Set(
      (nextGuard.pets || [])
        .map((p) => speciesLabel(p.species))
        .filter((v): v is string => !!v),
    ),
  );
  const petsMeta =
    petLabels.length === 0
      ? null
      : petLabels.length === 1
        ? petLabels[0]
        : `${petLabels.slice(0, -1).join(", ")} et ${petLabels[petLabels.length - 1]}`;

  const meta = [dateRange, petsMeta].filter(Boolean).join(" · ");
  const href = `/sits/${nextGuard.slug || nextGuard.id}`;

  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block"
          style={{
            width: "20px",
            height: "1px",
            background: "hsl(var(--secondary))",
          }}
        />
        <p
          style={{
            color: "hsl(var(--secondary))",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Votre prochaine garde
        </p>
      </div>

      <h3
        className="font-heading text-foreground mt-[14px]"
        style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
      >
        {composed}
      </h3>

      {meta && (
        <p
          className="font-sans text-muted-foreground mt-[8px]"
          style={{ fontSize: "13.5px", lineHeight: 1.45 }}
        >
          {meta}
        </p>
      )}

      <div className="mt-[14px]">
        <Link
          to={href}
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          Préparer cette garde
        </Link>
      </div>
    </article>
  );
};

export default NextGuardRailCard;
