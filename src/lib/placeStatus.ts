/**
 * Lot G2 : texte du bandeau d'un profil au lieu incohérent (profiles.place_status,
 * écrit par geocode-profile). Tant que le lieu n'est pas corrigé, le membre
 * n'a pas de point en France et n'apparaît pas « près de chez vous ».
 */
export type PlaceStatus = "country_mismatch" | "foreign_city";

export function placeStatusMessage(status: unknown): { title: string; body: string } | null {
  if (status === "country_mismatch") {
    return {
      title: "Votre pays ne correspond pas à votre commune",
      body: "Tant que ce n'est pas corrigé, vous n'apparaissez pas auprès des membres près de chez vous. Si vous vivez en France, choisissez « Je vis en France » puis votre commune ; sinon, indiquez votre ville à l'étranger.",
    };
  }
  if (status === "foreign_city") {
    return {
      title: "Votre ville ne correspond pas à votre code postal",
      body: "Tant que ce n'est pas corrigé, vous n'apparaissez pas auprès des membres près de chez vous. Si vous vivez à l'étranger, choisissez « Je vis à l'étranger » ; sinon, choisissez votre commune dans la liste de votre code postal.",
    };
  }
  return null;
}
