import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from "@/i18n";

interface Props {
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
  compact?: boolean;
}

export default function LanguageSwitcher({
  variant = "ghost",
  size = "sm",
  compact = false,
}: Props) {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LANGS as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLang)
    : "fr";
  const meta = LANG_LABELS[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          aria-label={t("language.switcher_aria")}
          className="gap-1.5"
        >
          <Globe className="h-4 w-4" aria-hidden />
          {!compact && (
            <span className="text-xs font-semibold uppercase tracking-wide">
              {current}
            </span>
          )}
          <span className="sr-only">
            {t("language.current", { lang: meta.native })}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {SUPPORTED_LANGS.map((code) => {
          const m = LANG_LABELS[code];
          const isActive = code === current;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => void i18n.changeLanguage(code)}
              className={isActive ? "bg-accent font-semibold" : ""}
              aria-label={`${m.native} (${code.toUpperCase()})`}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="mr-2 inline-flex h-6 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground" aria-hidden>
                {code}
              </span>
              <span>{m.native}</span>
              <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                {code}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
