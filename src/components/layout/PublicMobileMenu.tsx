import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MOBILE_AUTH_BTN, NAV_DEFS } from "./PublicHeader";

/**
 * Lot perf 6 : menu mobile du header public, chargé à la demande (Radix
 * Dialog hors de l'entrée du site). Le bouton qui l'ouvre reste dans
 * PublicHeader ; même contenu et mêmes libellés qu'avant.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: (path: string) => boolean;
  authChecked: boolean;
  hasSession: boolean;
  mySpaceLabel: string;
  loginLabel: string;
  registerLabel: string;
  bells: ReactNode;
}

export default function PublicMobileMenu({ open, onOpenChange, isActive, authChecked, hasSession, mySpaceLabel, loginLabel, registerLabel, bells }: Props) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(88vw,24rem)] border-primary/20 bg-background p-0 [&>button]:hidden">
              <div className="flex min-h-full flex-col px-6 pb-8 pt-6">
                <div className="flex min-h-11 items-center justify-between border-b border-border pb-4">
                  <SheetTitle className="font-heading text-2xl font-bold">Navigation</SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Fermer la navigation">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <nav aria-label="Navigation mobile" className="flex flex-1 flex-col py-5 font-body">
                  {NAV_DEFS.map((l) => (
                    <SheetClose asChild key={l.to}>
                      <Link
                        to={l.to}
                        aria-current={isActive(l.to) ? "page" : undefined}
                        className={`flex min-h-12 items-center rounded-md px-3 text-base font-medium transition-colors ${
                          isActive(l.to) ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-accent"
                        }`}
                      >
                        {t(`nav.${l.shortKey ?? l.key}`)}
                      </Link>
                    </SheetClose>
                  ))}

                  <div className="mt-auto border-t border-border pt-5">
                    {!authChecked ? (
                      <div className="h-12 w-full rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
                    ) : hasSession ? (
                      <SheetClose asChild>
                        <Button asChild className={MOBILE_AUTH_BTN}>
                          <Link to="/dashboard">{mySpaceLabel}</Link>
                        </Button>
                      </SheetClose>
                    ) : (
                      <div className="space-y-3">
                        <SheetClose asChild>
                          <Button asChild variant="outline" className={MOBILE_AUTH_BTN}>
                            <Link to="/login">{loginLabel}</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button asChild className={MOBILE_AUTH_BTN}>
                            <Link to="/inscription">{registerLabel}</Link>
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                    {bells && <div className="mt-4 flex items-center justify-center gap-2">{bells}</div>}
                  </div>
                </nav>
              </div>
            </SheetContent>
    </Sheet>
  );
}
