import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lots L1 et L3 : ?espace=gardien ou ?espace=proprietaire, proposé par Alma,
 * fait passer dans l'espace demandé, sur n'importe quelle page. La bascule ne
 * vaut que pour un compte qui possède déjà cet espace ; elle n'active jamais
 * un espace à la place du membre. Le paramètre est retiré ensuite.
 */
export default function EspaceParamSwitch() {
  const { user, activeRole, switchRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const espace = searchParams.get("espace");
  useEffect(() => {
    if (!espace || !user) return;
    const role = (user as { role?: string }).role;
    if (espace === "gardien" && (role === "both" || role === "sitter") && activeRole !== "sitter") switchRole("sitter");
    if (espace === "proprietaire" && (role === "both" || role === "owner") && activeRole !== "owner") switchRole("owner");
    const next = new URLSearchParams(searchParams);
    next.delete("espace");
    setSearchParams(next, { replace: true });
  }, [espace, user, activeRole, switchRole, searchParams, setSearchParams]);
  return null;
}
