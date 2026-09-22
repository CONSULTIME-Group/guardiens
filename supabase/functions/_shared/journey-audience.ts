// Rôle du destinataire pour une séquence de nurturing.
//
// Un template dont le contenu ou le sujet dépend du rôle ne doit jamais se
// tromper : onboarding-j1 partait avec un sujet propriétaire à 250 gardiens.

export function journeyIsOwner(audience: string, role: string | null): boolean {
  if (audience === "owner") return true;
  if (audience === "sitter") return false;
  return role === "owner";
}
