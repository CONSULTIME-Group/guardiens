/**
 * Lot X3a (13/10/2026), constat A-04 : l'auteur ouvre ses propres annonces
 * expirées et annulées.
 *
 * get_public_sit ne rendait que les statuts publics (et le brouillon à son
 * auteur) : l'auteur d'une annonce expirée ou annulée était renvoyé vers
 * /sits avec « Elle a été retirée ou annulée », y compris depuis une
 * notification « Nouvelle candidature » (31 notifications vers 9 annonces
 * expirées, base du 13/10/2026). La migration X3a élargit la RPC ; en
 * attendant, SitDetail relit la ligne de l'auteur sous sa propre RLS.
 */

/** Mêmes colonnes que get_public_sit, pour un rendu identique. */
export const OWN_SIT_COLUMNS =
  "id, slug, user_id, property_id, status, title, city, country, start_date, end_date, environments, daily_routine, open_to, accepting_applications, max_applications, specific_expectations, owner_message, flexible_dates, flexibility_notes, accepts_sitter_pets, accepts_sitter_children, published_at, cover_photo_url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Même règle que get_public_sit : un uuid vise id, sinon slug. */
export function ownSitLookupColumn(param: string): "id" | "slug" {
  return UUID_RE.test(param) ? "id" : "slug";
}

export interface ClosedSitNotice {
  title: string;
  body: string;
  /** Vrai quand « Republier » a du sens (dates nouvelles à choisir). */
  canRepublish: boolean;
}

/**
 * Encart affiché à l'auteur d'une annonce close : ce qu'elle est devenue,
 * ce qu'il retrouve sur la page, ce qu'il peut faire ensuite.
 */
export function closedSitNotice(status: string | null | undefined): ClosedSitNotice | null {
  switch (String(status)) {
    case "expired":
      return {
        title: "Cette annonce est arrivée à échéance",
        body: "Ses dates sont passées. Les candidatures reçues restent lisibles ci-dessous, et vous pouvez republier l'annonce avec de nouvelles dates.",
        canRepublish: true,
      };
    case "cancelled":
      return {
        title: "Cette garde est annulée",
        body: "L'historique des candidatures reste lisible ci-dessous. Pour un nouveau départ, republiez l'annonce avec de nouvelles dates.",
        canRepublish: true,
      };
    default:
      return null;
  }
}
