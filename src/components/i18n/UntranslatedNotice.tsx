import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

/**
 * Bandeau de repli affiché quand la page n'existe pas dans la langue active.
 * Le contenu français reste visible en dessous : le visiteur comprend
 * pourquoi la langue change, au lieu de conclure à une panne.
 */
export default function UntranslatedNotice({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "fr").split("-")[0].toLowerCase();
  if (lang === "fr") return null;

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("i18n_fallback.notice")}</span>
    </div>
  );
}
