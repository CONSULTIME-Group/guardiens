import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Lot A12 : un seul bouton « Actions » par membre, à la place des 12 icônes.
 * Chaque entrée appelle le gestionnaire existant, qui ouvre le dialogue
 * existant, inchangé. Les entrées sans objet sont absentes.
 */
export interface MemberActionsTarget {
  id: string;
  name: string;
  account_status?: string | null;
  identity_verified?: boolean | null;
  is_manual_super?: boolean | null;
  /** false seulement si l'on sait que l'email n'est pas confirmé ; inconnu = entrée affichée. */
  email_confirmed?: boolean | null;
  has_identity_documents?: boolean | null;
}

export interface MemberActionsHandlers {
  onWrite: () => void;
  onMessage: () => void;
  onLastMessage: () => void;
  onResendConfirmation: () => void;
  onForceVerify: () => void;
  onChangeRole: () => void;
  onToggleSuper: () => void;
  onNote: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

export function visibleMemberActions(t: MemberActionsTarget): string[] {
  const suspended = t.account_status === "suspended";
  const keys = ["write", "message", "last-message"];
  if (t.email_confirmed !== true) keys.push("resend-confirmation");
  if (!t.identity_verified) keys.push("force-verify");
  if (t.has_identity_documents) keys.push("documents");
  keys.push("change-role", "super", "note", suspended ? "reactivate" : "suspend", "delete");
  return keys;
}

export const MemberActionsMenu = ({ target, handlers, align = "end" }: { target: MemberActionsTarget; handlers: MemberActionsHandlers; align?: "start" | "end" }) => {
  const show = new Set(visibleMemberActions(target));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Actions pour ${target.name}`} className="gap-1.5">
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 font-body">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Communiquer</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={handlers.onWrite}>Écrire à ce membre</DropdownMenuItem>
          <DropdownMenuItem onSelect={handlers.onMessage}>Envoyer un message</DropdownMenuItem>
          <DropdownMenuItem onSelect={handlers.onLastMessage}>Voir le dernier message</DropdownMenuItem>
          {show.has("resend-confirmation") && (
            <DropdownMenuItem onSelect={handlers.onResendConfirmation}>Renvoyer l'email de confirmation</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {(show.has("force-verify") || show.has("documents")) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Vérification</DropdownMenuLabel>
            <DropdownMenuGroup>
              {show.has("force-verify") && (
                <DropdownMenuItem onSelect={handlers.onForceVerify}>Forcer la vérification d'identité</DropdownMenuItem>
              )}
              {show.has("documents") && (
                <DropdownMenuItem asChild>
                  <a href="/admin/verifications" target="_blank" rel="noopener noreferrer">Consulter les pièces déposées</a>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Compte</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={handlers.onChangeRole}>Changer le rôle</DropdownMenuItem>
          <DropdownMenuItem onSelect={handlers.onToggleSuper}>
            {target.is_manual_super ? "Retirer le statut super gardien" : "Activer le statut super gardien"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handlers.onNote}>Note interne</DropdownMenuItem>
          {show.has("reactivate") ? (
            <DropdownMenuItem onSelect={handlers.onReactivate}>Réactiver le compte</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={handlers.onSuspend}>Suspendre le compte</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handlers.onDelete}
          data-destructive="true"
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          Supprimer définitivement
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
