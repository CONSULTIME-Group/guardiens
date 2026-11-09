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
  /** Lot ADM15 : entrée « Renvoyer » seulement si l'on sait l'email non confirmé (la liste ne le lit pas, la fiche oui). */
  email_confirmed?: boolean | null;
  has_identity_documents?: boolean | null;
}

export interface MemberActionsHandlers {
  onWrite: () => void;
  onMessage: () => void;
  onLastMessage: () => void;
  onResendConfirmation: () => void;
  onForceVerify: () => void;
  onGeocode?: () => void;
  geocoding?: boolean;
  onChangeRole: () => void;
  onToggleSuper: () => void;
  onNote: () => void;
  onSuspend: () => void;
  /** Lot J2c : résiliation pour manquement, motivée (CGU 11.5, 14.5). */
  onTerminate?: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

export function visibleMemberActions(t: MemberActionsTarget): string[] {
  // Lot ADM15 : un compte supprimé est anonymisé, il ne reste qu'à relire.
  if (t.account_status === "deleted") return ["last-message", "note"];
  const suspended = t.account_status === "suspended";
  const keys = ["write", "message", "last-message"];
  if (t.email_confirmed === false) keys.push("resend-confirmation");
  if (!t.identity_verified) keys.push("force-verify");
  if (t.has_identity_documents) keys.push("documents");
  keys.push("geocode", "change-role", "super", "note", suspended ? "reactivate" : "suspend", "terminate", "delete");
  return keys;
}

export const MemberActionsMenu = ({ target, handlers, align = "end", large = false }: { target: MemberActionsTarget; handlers: MemberActionsHandlers; align?: "start" | "end"; large?: boolean }) => {
  const show = new Set(visibleMemberActions(target));
  const communicate = show.has("write") || show.has("message") || show.has("last-message") || show.has("resend-confirmation");
  const account = ["change-role", "super", "note", "suspend", "reactivate", "terminate"].some((k) => show.has(k));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Actions pour ${target.name}`} className={large ? "h-11 min-w-11 shrink-0 gap-1.5" : "gap-1.5"}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      {/* Lot ADM15 : le menu tient dans l'écran et défile au besoin. */}
      <DropdownMenuContent
        align={align}
        collisionPadding={8}
        data-testid="member-actions-menu"
        className="w-64 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto font-body"
      >
        {communicate && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Communiquer</DropdownMenuLabel>
            <DropdownMenuGroup>
              {show.has("write") && <DropdownMenuItem onSelect={handlers.onWrite}>Email personnel</DropdownMenuItem>}
              {show.has("message") && <DropdownMenuItem onSelect={handlers.onMessage}>Message dans la messagerie</DropdownMenuItem>}
              {show.has("last-message") && <DropdownMenuItem onSelect={handlers.onLastMessage}>Voir le dernier message</DropdownMenuItem>}
              {show.has("resend-confirmation") && (
                <DropdownMenuItem onSelect={handlers.onResendConfirmation}>Renvoyer l'email de confirmation</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
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
        {communicate && account && <DropdownMenuSeparator />}
        {handlers.onGeocode && show.has("geocode") && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Localisation</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handlers.onGeocode} disabled={handlers.geocoding}>
              {handlers.geocoding ? "Calcul de la localisation…" : "Recalculer la localisation"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {account && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Compte</DropdownMenuLabel>
            <DropdownMenuGroup>
              {show.has("change-role") && <DropdownMenuItem onSelect={handlers.onChangeRole}>Changer le rôle</DropdownMenuItem>}
              {show.has("super") && (
                <DropdownMenuItem onSelect={handlers.onToggleSuper}>
                  {target.is_manual_super ? "Retirer le statut super gardien" : "Activer le statut super gardien"}
                </DropdownMenuItem>
              )}
              {show.has("note") && <DropdownMenuItem onSelect={handlers.onNote}>Note interne</DropdownMenuItem>}
              {show.has("reactivate") && <DropdownMenuItem onSelect={handlers.onReactivate}>Réactiver le compte</DropdownMenuItem>}
              {show.has("suspend") && <DropdownMenuItem onSelect={handlers.onSuspend}>Suspendre le compte</DropdownMenuItem>}
              {show.has("terminate") && handlers.onTerminate && (
                <DropdownMenuItem onSelect={handlers.onTerminate}>Résilier le compte</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
        {show.has("delete") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handlers.onDelete}
              data-destructive="true"
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              Supprimer définitivement
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
