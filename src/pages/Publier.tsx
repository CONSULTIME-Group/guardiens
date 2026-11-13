import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { useOutingsEnabled } from "@/hooks/useOutingsEnabled";
import { trackEvent } from "@/lib/analytics";
import { PUBLISH_COPY, publishChoices, type PublishKind } from "@/lib/publishChoices";
import spotChat from "@/assets/missions/spot-chat-480.webp";
import spotBricolage from "@/assets/missions/spot-bricolage-480.webp";
import spotJeux from "@/assets/missions/spot-jeux-480.webp";

const ART: Record<PublishKind, string> = { garde: spotChat, coup_de_main: spotBricolage, sortie: spotJeux };

/**
 * Lot SORT9 : le bouton « Publier » mène ici, dans les deux espaces.
 * Une carte par type de publication, la première est celle de l'espace.
 */
const Publier = () => {
  const { user, activeRole } = useAuth();
  const outings = useOutingsEnabled();
  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  const space = effectiveRole === "owner" ? "owner" : "sitter";
  const choices = publishChoices(space, outings.enabled);

  useEffect(() => {
    trackEvent("publish_chooser_viewed", { metadata: { space } });
  }, [space]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 pb-10 pt-6">
      <PageMeta title={PUBLISH_COPY.title} description={PUBLISH_COPY.intro} path="/publier" noindex />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[30px] font-bold leading-tight">{PUBLISH_COPY.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {choices.length === 3 ? PUBLISH_COPY.intro : PUBLISH_COPY.introTwo}
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3" data-testid="publish-choices">
        {choices.map((c, index) => (
          <li key={c.kind}>
            <Link
              to={c.to}
              onClick={() => trackEvent("publish_chooser_clicked", { metadata: { kind: c.kind, space, rank: index + 1 } })}
              className={`flex h-full items-center gap-3.5 rounded-2xl border-[1.5px] p-4 no-underline text-foreground md:flex-col md:items-start md:p-5 ${
                index === 0 ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"
              }`}
            >
              <img src={ART[c.kind]} alt="" width={76} height={76} className="h-[76px] w-[76px] shrink-0 object-contain md:h-24 md:w-24" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-pastel-honey-ink">{c.eyebrow}</span>
                <span className="text-[19px] font-semibold leading-snug">{c.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{c.text}</span>
              </span>
              <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-primary md:hidden" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm leading-relaxed text-muted-foreground">{PUBLISH_COPY.footer}</p>
    </div>
  );
};

export default Publier;
