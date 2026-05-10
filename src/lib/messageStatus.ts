/**
 * Helper partagé pour les badges de statut de candidature dans la messagerie.
 * Tous les styles utilisent les tokens sémantiques (warning/info/primary/muted).
 */
export const appStatusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning-soft text-warning-foreground" },
  viewed: { label: "En attente", className: "bg-warning-soft text-warning-foreground" },
  discussing: { label: "En discussion", className: "bg-info-soft text-info-foreground" },
  accepted: { label: "Acceptée", className: "bg-primary/10 text-primary" },
  rejected: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
};
