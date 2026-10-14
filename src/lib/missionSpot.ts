/**
 * Lot P3 (14/10/2026) : gouache d'un besoin sans photo.
 *
 * Une carte de besoin sans photo montre la gouache de sa catégorie au lieu
 * d'une carte vide. Logique pure : catégorie enregistrée, sinon déduite du
 * texte (inferMissionCategory) ; pour les animaux, l'espèce citée choisit
 * chat, poules ou chien.
 */
import { inferMissionCategory } from "@/lib/missionCategories";

export type MissionSpotKey = "chat" | "chien" | "poules" | "jardin" | "verger" | "bricolage" | "bienetre";

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function missionSpotKey(
  category: string | null | undefined,
  title?: string | null,
  description?: string | null,
): MissionSpotKey {
  const resolved = category && category !== "other" ? category : inferMissionCategory(title, description);
  const text = fold(`${title ?? ""} ${description ?? ""}`);
  switch (resolved) {
    case "animals":
      if (/\b(chats?|chatons?|minou)\b/.test(text)) return "chat";
      if (/\b(poules?|poulettes?|poulaillers?|canards?|oies?|lapins?|chevres?|moutons?|vaches?|chevaux|cheval|anes?)\b/.test(text)) return "poules";
      return "chien";
    case "garden":
      return /\b(fruits?|verger|pommes?|cerises?|confitures?|legumes?|potager|recolte)\b/.test(text) ? "verger" : "jardin";
    case "errand":
      return "verger";
    case "house":
      return "bricolage";
    default:
      return "bienetre";
  }
}
