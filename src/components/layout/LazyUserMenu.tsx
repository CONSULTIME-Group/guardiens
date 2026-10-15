import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

/**
 * Lot perf 6 : le menu du compte (Radix DropdownMenu et ses dépendances) ne
 * part plus avec l'entrée du site ; il n'est chargé que pour un membre
 * connecté. La réservation garde la place exacte du bouton (aucun décalage).
 */
const UserMenu = lazyWithRetry(() => import("./UserMenu"), "UserMenu");

interface Props {
  compact?: boolean;
  className?: string;
}

export function UserMenuPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center rounded-full min-h-11 min-w-11">
      <span className={`rounded-full border border-border bg-muted ${compact ? "h-8 w-8" : "h-9 w-9"}`} />
    </span>
  );
}

export default function LazyUserMenu(props: Props) {
  return (
    <Suspense fallback={<UserMenuPlaceholder compact={props.compact} />}>
      <UserMenu {...props} />
    </Suspense>
  );
}
