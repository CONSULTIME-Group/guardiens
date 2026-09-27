/**
 * Bandeau entraide du tableau de bord propriétaire (lot D1). Variante
 * propriétaire de SitterEntraideSection : le rendu gardien reste inchangé.
 *
 * Reprend aussi le contenu utile de MesCoupsDeMain (échange en cours avec
 * son action, sinon dernier échange terminé), de MutualAidRadiusLine (rayon)
 * et de NearbyAssociationCard (repliée en une ligne).
 */
import { Link } from "react-router-dom";
import entraideGouache from "@/assets/illustrations/sitter-entraide-empty.webp";
import MeetupAnswer from "@/components/entraide/MeetupAnswer";
import { useMyHelpExchanges, type HelpRow } from "@/components/dashboard/MesCoupsDeMain";
import { useMutualAidRadiusKm, ALERT_SETTINGS_PATH, radiusLineText } from "@/components/entraide/MutualAidRadiusLine";
import { useNearbyAssociation } from "@/components/associations/NearbyAssociationCard";
import { formatDateRangeFr } from "@/lib/formatDateRangeFr";
import { formatCityLabel } from "@/lib/cityLabel";
import DashEyebrow from "./DashEyebrow";

export interface EntraideMission {
  id: string;
  title?: string | null;
  city?: string | null;
  date_needed?: string | null;
}

export interface OwnerEntraideBandViewProps {
  helpersCount: number;
  helpersRadiusKm: number;
  mission?: EntraideMission | null;
  exchanges: HelpRow[];
  busyId?: string | null;
  onAnswer?: (missionId: string, happened: boolean, word: string, publicOk: boolean) => void;
  mutualRadiusKm?: number | null;
  association?: { slug: string; name: string } | null;
}

const dateWithYear = (d?: string | null) => formatDateRangeFr(d, null)?.replace(/^le /, "") ?? null;

export function OwnerEntraideBandView({
  helpersCount,
  helpersRadiusKm,
  mission,
  exchanges,
  busyId,
  onAnswer,
  mutualRadiusKm,
  association,
}: OwnerEntraideBandViewProps) {
  const ongoing = exchanges.find((r) => r.status === "in_progress") ?? null;
  const lastDone = ongoing ? null : exchanges.find((r) => r.status === "completed") ?? null;
  const missionMeta = mission
    ? [mission.city ? formatCityLabel(mission.city) : null, dateWithYear(mission.date_needed)].filter(Boolean).join(" · ")
    : "";

  return (
    <section
      aria-label="L'entraide, tout près"
      data-testid="owner-entraide-band"
      className="flex flex-col md:flex-row gap-[22px] p-[22px] md:px-[28px] md:py-[26px]"
      style={{ backgroundColor: "hsl(var(--secondary) / 0.08)", borderRadius: "20px" }}
    >
      <img
        src={entraideGouache}
        alt=""
        width={128}
        height={128}
        loading="lazy"
        decoding="async"
        className="w-full h-[140px] md:w-[128px] md:h-[128px] object-cover shrink-0"
        style={{ borderRadius: "14px" }}
      />
      <div className="min-w-0 flex-1">
        <DashEyebrow>L'entraide, tout près</DashEyebrow>
        {helpersCount > 0 && (
          <p className="font-heading text-foreground mt-[8px] text-[19px] md:text-[21px] font-semibold leading-snug">
            {helpersCount} personne{helpersCount > 1 ? "s sont prêtes" : " est prête"} à aider à moins de {helpersRadiusKm} km.
          </p>
        )}
        <p className="text-muted-foreground mt-[8px] text-[13.5px] leading-relaxed">
          Un service contre un service : un café, des œufs du jardin, un coup de main en retour.
        </p>

        {mission && (
          <div className="mt-[14px] flex flex-col sm:flex-row sm:items-center gap-[14px] rounded-[14px] bg-card px-[16px] py-[12px]">
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-[14px] font-semibold">{mission.title || "Une aide à proposer"}</p>
              {missionMeta && <p className="text-muted-foreground text-[12.5px] mt-[2px]">{missionMeta}</p>}
            </div>
            <Link
              to={`/petites-missions/${mission.id}`}
              className="shrink-0 inline-flex items-center justify-center rounded-full border border-border px-[16px] min-h-[40px] text-[13px] font-semibold text-foreground hover:bg-muted/40"
            >
              Proposer mon aide
            </Link>
          </div>
        )}

        {ongoing && (
          <div className="mt-[14px] rounded-[14px] bg-card px-[16px] py-[12px]" data-testid="entraide-ongoing">
            <p className="text-foreground text-[14px] font-semibold">
              {ongoing.title}
              <span className="font-normal text-muted-foreground">
                {" "}· {ongoing.role === "owner" ? "avec" : "pour"} {ongoing.other_first_name}
              </span>
            </p>
            {ongoing.answered ? (
              <p className="text-muted-foreground text-[13px] mt-[6px]">Votre réponse est enregistrée, merci.</p>
            ) : (
              <div className="mt-[8px]">
                <p className="text-muted-foreground text-[13px] mb-[8px]">Vous vous êtes rencontrés ?</p>
                <MeetupAnswer
                  otherFirstName={ongoing.other_first_name}
                  busy={busyId === ongoing.id}
                  onYes={(word, publicOk) => onAnswer?.(ongoing.id, true, word, publicOk)}
                  onNo={() => onAnswer?.(ongoing.id, false, "", false)}
                />
              </div>
            )}
          </div>
        )}

        {lastDone && (
          <p className="mt-[14px] text-muted-foreground text-[13px]" data-testid="entraide-last-done">
            Votre dernier échange : {lastDone.title}
            {lastDone.city ? `, à ${formatCityLabel(lastDone.city)}` : ""}. Terminé.
          </p>
        )}

        <div className="mt-[22px] flex flex-col sm:flex-row sm:items-center gap-[14px]">
          <Link
            to="/petites-missions/creer"
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-[18px] min-h-[44px] text-[14px] font-bold hover:bg-primary/90"
          >
            Demander un coup de main
          </Link>
          <Link to="/petites-missions" className="text-primary text-[13px] font-semibold hover:underline underline-offset-4">
            Toutes les missions d'entraide
          </Link>
        </div>

        {typeof mutualRadiusKm === "number" && (
          <p className="mt-[14px] text-muted-foreground text-[12.5px]">
            {radiusLineText(mutualRadiusKm)}{" "}
            <Link to={ALERT_SETTINGS_PATH} className="font-semibold text-primary hover:underline underline-offset-4">Modifier</Link>
          </p>
        )}
        {association && (
          <p className="mt-[8px] text-muted-foreground text-[12.5px]">
            {association.name}, près de chez vous, cherche des bénévoles.{" "}
            <Link to={`/associations/${association.slug}`} className="font-semibold text-primary hover:underline underline-offset-4">
              Découvrir l'association
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export default function OwnerEntraideBand(props: {
  helpersCount: number;
  helpersRadiusKm: number;
  mission?: EntraideMission | null;
}) {
  const { rows, busy, answer } = useMyHelpExchanges();
  const mutualRadiusKm = useMutualAidRadiusKm();
  const association = useNearbyAssociation();
  return (
    <OwnerEntraideBandView
      {...props}
      exchanges={rows}
      busyId={busy}
      onAnswer={(id, h, w, p) => void answer(id, h, w, p)}
      mutualRadiusKm={mutualRadiusKm}
      association={association}
    />
  );
}
