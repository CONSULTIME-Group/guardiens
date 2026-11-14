/**
 * Fiche gardien publique v2 (lot FG1, 14/11/2026). Maquettes Claude Design
 * « Fiche gardien publique · avant / après », validées par Jérémie (« ça me
 * plaît, go ») : la présentation se lit comme une lettre, le quotidien
 * déclaré tient dans une carte, chaque chiffre n'apparaît qu'une fois.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { avatarImageUrl } from "@/lib/storageImage";
import promenade from "@/assets/aquarelles/es-vide-promenade-256.webp";

/* ── Titre de section, sans surtitre en capitales ─────────────────── */
export const V2Heading = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 id={id} className="font-heading text-[22px] md:text-[26px] font-semibold leading-tight text-foreground scroll-mt-24">
    {children}
  </h2>
);

/* ── La présentation, en lettre ───────────────────────────────────── */
export const SitterLetter = ({
  firstName,
  motivation,
  bio,
  ownPreview,
}: {
  firstName: string;
  motivation: string;
  bio: string;
  /** Aperçu de sa propre fiche : invitation à écrire sa présentation. */
  ownPreview: boolean;
}) => {
  const full = [motivation, bio].filter(Boolean).join("\n\n");
  if (!full && !ownPreview) return null;
  return (
    <section aria-labelledby="qui-est" className="relative rounded-[22px] border border-border bg-card px-6 pb-7 pt-8 md:px-12 md:pb-10 md:pt-11" data-profile-letter>
      <span aria-hidden="true" className="pointer-events-none absolute -top-1 left-4 font-heading text-[60px] leading-none text-secondary/60 md:left-7 md:text-[80px]">
        «
      </span>
      <h2 id="qui-est" className="ml-9 font-heading text-[23px] md:ml-12 md:text-[28px] font-semibold leading-tight text-foreground">
        Qui est {firstName}
      </h2>
      {full ? (
        <>
          <p className="mt-4 whitespace-pre-line font-heading text-[18px] leading-[28px] text-foreground md:mt-5 md:text-[19px] md:leading-[31px]">
            {full}
          </p>
          <p className="mt-5 flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-secondary" />
            <span className="font-heading text-[18px] italic text-foreground/80 md:text-[20px]">{firstName}</span>
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-secondary/50 bg-secondary/5 px-4 py-3" data-letter-invite>
          <p className="text-[15px] leading-relaxed text-foreground">
            Votre présentation commence ici : quelques lignes sur vous donnent votre voix à votre fiche.
          </p>
          <Link to="/profile" className="mt-1 inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline underline-offset-4">
            Écrire ma présentation
          </Link>
        </div>
      )}
    </section>
  );
};

/* ── Son quotidien : ce que le gardien a déclaré ──────────────────── */
export type DailyRow = { label: string; chips?: string[]; text?: string; spots?: string[] };

export const SitterDailyCard = ({
  firstName,
  presence,
  rows,
  children,
}: {
  firstName: string;
  presence: string;
  rows: DailyRow[];
  /** Correspondance avec la maison du propriétaire connecté. */
  children?: ReactNode;
}) => {
  const visible = rows.filter((r) => (r.chips && r.chips.length > 0) || r.text);
  if (visible.length === 0 && !presence && !children) return null;
  return (
    <section aria-labelledby="son-quotidien" className="relative overflow-hidden rounded-[22px] bg-[hsl(var(--hero-paper))] px-5 pb-6 pt-6 md:px-7 md:pt-7" data-profile-daily>
      <img src={promenade} alt="" aria-hidden="true" width={82} height={122} loading="lazy" decoding="async" className="pointer-events-none absolute right-3 top-3 h-[92px] w-[62px] object-contain md:h-[122px] md:w-[82px]" />
      <h2 id="son-quotidien" className="font-heading text-[21px] md:text-[24px] font-semibold leading-tight text-foreground">
        Son quotidien
      </h2>
      <p className="mt-1 max-w-[16rem] text-[13px] leading-snug text-muted-foreground">
        Ce que {firstName} a déclaré, pour voir si votre maison lui ressemble.
      </p>
      <dl className="mt-5 space-y-4">
        {visible.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[12.5px] font-semibold text-secondary">{r.label}</dt>
            <dd className="mt-1.5">
              {r.spots && r.spots.length > 0 && (
                <span className="mb-1 flex items-center gap-1" aria-hidden="true">
                  {r.spots.map((s) => (
                    <img key={s} src={s} alt="" width={34} height={34} loading="lazy" decoding="async" className="h-[34px] w-[34px] object-contain" />
                  ))}
                </span>
              )}
              {r.chips && r.chips.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {r.chips.map((c) => (
                    <li key={c} className="rounded-full border border-secondary/30 bg-card px-3 py-1 text-[14px] text-foreground">{c}</li>
                  ))}
                </ul>
              ) : (
                <span className="block break-words text-[15px] text-foreground">{r.text}</span>
              )}
            </dd>
          </div>
        ))}
        {presence && (
          <div>
            <dt className="text-[12.5px] font-semibold text-secondary">Pendant la garde</dt>
            <dd className="mt-1 font-heading text-[18px] leading-snug text-foreground">{presence}</dd>
          </div>
        )}
      </dl>
      {children ? <div className="mt-5 border-t border-secondary/20 pt-4">{children}</div> : null}
    </section>
  );
};

/* ── Carte blanche sobre (parcours) ──────────────────────────────── */
export const V2Card = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="rounded-[22px] border border-border bg-card px-5 py-5 md:px-6" aria-label={label} role="group">
    {children}
  </div>
);

/* ── D'autres gardiens du département ─────────────────────────────── */
export type NearbySitter = { id: string; firstName: string; city: string | null; avatarUrl: string | null };

export const NearbySitters = ({
  areaLabel,
  sitters,
  moreLink,
}: {
  areaLabel: string;
  sitters: NearbySitter[];
  moreLink: { href: string; label: string } | null;
}) => {
  if (sitters.length === 0 && !moreLink) return null;
  return (
    <section aria-labelledby="autres-gardiens" data-profile-nearby>
      {sitters.length > 0 && (
        <>
          <V2Heading id="autres-gardiens">D'autres gardiens {areaLabel}</V2Heading>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
            {sitters.map((s) => (
              <li key={s.id}>
                <Link to={`/gardiens/${s.id}`} className="flex min-h-11 items-center gap-3 rounded-xl pr-2 hover:bg-muted/40">
                  {s.avatarUrl ? (
                    <img src={avatarImageUrl(s.avatarUrl, 120)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-muted font-heading text-xl">{s.firstName.charAt(0)}</span>
                  )}
                  <span className="text-[15px] leading-tight text-foreground">
                    <span className="block font-medium">{s.firstName}</span>
                    {s.city && <span className="block text-[13.5px] text-muted-foreground">{s.city}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {moreLink && (
        <Link to={moreLink.href} className="mt-3 inline-flex min-h-11 items-center text-[15px] text-primary underline underline-offset-4">
          {moreLink.label}
        </Link>
      )}
    </section>
  );
};
