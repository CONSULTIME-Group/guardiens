/**
 * Lot PHOTO2 : motif d'un échec d'envoi de photo, pour le journal.
 *
 * Avant ce lot, les événements d'échec ne portaient que l'extension et la
 * taille : 37 échecs de photo d'expérience sur 30 jours sans cause lisible.
 */
export type UploadFailureStage = "compress" | "upload";

/** Message nettoyé : lettres, chiffres et ponctuation simple, 120 signes, sans nom de fichier. */
export function uploadFailureReason(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const cleaned = raw.replace(/[^\p{L}\p{N} .,:_-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return cleaned || "unknown";
}

/** Données d'un événement d'échec : extension, taille, étape et motif. */
export function uploadFailureMetadata(file: File, stage: UploadFailureStage, error: unknown) {
  return {
    ext: file.name.split(".").pop()?.toLowerCase() || "unknown",
    size_kb: Math.round(file.size / 1024),
    stage,
    reason: uploadFailureReason(error),
  };
}
