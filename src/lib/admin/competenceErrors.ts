/** Lot A10 : message d'erreur à l'ajout d'une compétence au référentiel. */
export function competenceInsertError(error: { code?: string } | null | undefined, label: string): string {
  if (error?.code === "23505") return `« ${label} » existe déjà dans le référentiel.`;
  return `Impossible d'ajouter « ${label} », réessayez.`;
}
