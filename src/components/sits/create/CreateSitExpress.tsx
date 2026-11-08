/**
 * Écran unique du parcours express (lot N5), mobile d'abord.
 * Composant de présentation : tout l'état et la publication restent dans
 * CreateSit, qui passe les mêmes valeurs et le même handlePublish.
 */
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useHideBottomNav } from "@/components/layout/ChromeVisibility";
import { ArrowLeft, Check, Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localTodayIso } from "@/lib/localDate";
import ExpressDatesCard from "./ExpressDatesCard";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MAX_TITLE_LENGTH, type PublishBlocker } from "@/lib/sitPublishRules";
import {
  EXPRESS_PERIOD_HEADER, alreadyFilledPhrase, housingLabel, joinPetNames,
  type ExpressPet,
} from "@/lib/sitExpress";
import type { DeparturePeriod } from "@/lib/ownerDeparture";

export interface CreateSitExpressProps {
  period: DeparturePeriod;
  readinessPercent: number;
  propertyType: string | null;
  city: string;
  postalCode: string;
  pets: ExpressPet[];
  photoUrl: string | null;
  uploading: boolean;
  onPhotoFile: (file: File) => void;
  /** Lot PHOTO1 : conseil tiré de l'analyse de la photo ajoutée. */
  photoTip?: string | null;
  startDate: string;
  endDate: string;
  onDates: (start: string, end: string, method: "preset" | "autres") => void;
  dateError: string | null;
  flexibleDates: boolean;
  onFlexibleDates: (v: boolean) => void;
  title: string;
  onTitle: (v: string) => void;
  absenceReason: string;
  onAbsenceReason: (v: string) => void;
  sitterExpectations: string;
  onSitterExpectations: (v: string) => void;
  blocking: PublishBlocker[];
  publishing: boolean;
  onPublish: () => void;
  onBack: () => void;
  /** Verdict de modération sous chaque champ texte (même rendu que le formulaire classique). */
  moderationNotice?: (key: "title" | "absenceReason" | "sitterExpectations") => ReactNode;
  /** Annonce publiée à venir : bandeau et lien vers elle. */
  publishedSitId?: string | null;
}

/** Libellés du pied alignés sur les champs de l'écran express. */
export function expressBlockerLabel(b: PublishBlocker): string {
  if (b.id === "desc-reason") return "Pourquoi vous partez : quelques mots de plus";
  if (b.id === "desc-expectations") return "Ce que vous attendez du gardien : quelques mots de plus";
  if (b.id === "title") return "Titre";
  if (b.id === "dates") return "Vos dates";
  if (b.id === "photo") return "Une photo de chez vous";
  return b.label;
}

/** L'erreur de dates s'affiche déjà sous les dates : jamais une seconde fois dans le pied. */
const DATE_ERROR_IDS = new Set(["date-past", "date-error"]);

// Lot L5 : jour du calendrier de l'appareil, comme le formulaire (PUB1).
const today = () => localTodayIso();

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>{children}</section>
);

const CreateSitExpress = (p: CreateSitExpressProps) => {
  useHideBottomNav(true);
  const cameraRef = useRef<HTMLInputElement>(null);
  const footerBlockers = p.blocking.filter((b) => !(p.dateError && DATE_ERROR_IDS.has(b.id)));
  const galleryRef = useRef<HTMLInputElement>(null);
  const names = joinPetNames(p.pets);
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) p.onPhotoFile(f);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen min-w-0 bg-background pb-[calc(12rem+env(safe-area-inset-bottom))]" data-testid="sit-express">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={p.onBack} aria-label="Retour" className="flex h-[44px] w-[44px] items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{EXPRESS_PERIOD_HEADER[p.period]}</p>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary" data-testid="express-readiness">
          Prête à {p.readinessPercent} %
        </span>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-[640px] space-y-5 px-4 pt-6">
        <div>
          <h1 className="font-heading text-[30px] leading-tight text-foreground">Deux gestes, et elle est en ligne.</h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-muted-foreground">
            {alreadyFilledPhrase({ propertyType: p.propertyType, pets: p.pets, city: p.city })}
          </p>
        </div>

        {p.publishedSitId && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5" data-testid="express-already-online">
            <p className="text-[16px] font-semibold text-foreground">Votre annonce est déjà en ligne</p>
            <Link to={`/sits/${p.publishedSitId}`} className="mt-1 inline-block text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
              Voir mon annonce
            </Link>
          </section>
        )}

        {/* Bloc 1 : photo */}
        <Card>
          <h2 className="font-heading text-[19px] text-foreground">Une photo de chez vous</h2>
          {p.photoUrl ? (
            <div className="mt-3 flex items-center gap-3" data-testid="express-photo-done">
              <img src={p.photoUrl} alt="Photo de chez vous" className="h-[56px] w-[56px] rounded-xl object-cover" />
              <span className="flex items-center gap-2 text-[15px] text-foreground">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-[14px] w-[14px]" aria-hidden="true" />
                </span>
                Photo ajoutée
              </span>
            </div>
          ) : null}
          {p.photoUrl && p.photoTip ? (
            <p role="status" className="mt-2 text-[14px] text-muted-foreground" data-testid="express-photo-tip">{p.photoTip}</p>
          ) : null}
          {p.photoUrl ? null : (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4" data-testid="express-photo-empty">
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={pickFile} aria-label="Prendre une photo" />
              <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={pickFile} aria-label="Choisir dans ma galerie" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="h-[46px] flex-1 gap-2 rounded-full" disabled={p.uploading} onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-4 w-4" aria-hidden="true" /> {p.uploading ? "Envoi en cours…" : "Prendre une photo"}
                </Button>
                <Button type="button" variant="outline" className="h-[46px] flex-1 gap-2 rounded-full" disabled={p.uploading} onClick={() => galleryRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" /> Choisir dans ma galerie
                </Button>
              </div>
              <p className="mt-3 text-[14px] text-muted-foreground">La maison vue de l'extérieur, la pièce de vie ou la chambre, prise en journée.</p>
            </div>
          )}
        </Card>

        {/* Bloc 2 : dates (lot L5, carte unique A-02) */}
        <ExpressDatesCard
          period={p.period}
          today={today()}
          startDate={p.startDate}
          endDate={p.endDate}
          onDates={p.onDates}
          dateError={p.dateError}
          flexibleDates={p.flexibleDates}
          onFlexibleDates={p.onFlexibleDates}
        />

        {/* Bloc 3 : texte */}
        <Card>
          <h2 className="font-heading text-[19px] text-foreground">Votre texte, proposé par Alma</h2>
          <div className="mt-3 space-y-4">
            <div>
              <Label htmlFor="express-title" className="mb-1 block text-sm">Titre</Label>
              <Input id="express-title" value={p.title} maxLength={MAX_TITLE_LENGTH} className="h-12 text-base" onChange={(e) => p.onTitle(e.target.value)} />
              {p.moderationNotice?.("title")}
            </div>
            <div>
              <Label htmlFor="express-reason" className="mb-1 block text-sm">Pourquoi vous partez</Label>
              <Textarea id="express-reason" value={p.absenceReason} className="min-h-[72px] text-base" onChange={(e) => p.onAbsenceReason(e.target.value)} />
              {p.moderationNotice?.("absenceReason")}
            </div>
            <div>
              <Label htmlFor="express-expect" className="mb-1 block text-sm">Ce que vous attendez du gardien</Label>
              <Textarea id="express-expect" value={p.sitterExpectations} className="min-h-[96px] text-base" onChange={(e) => p.onSitterExpectations(e.target.value)} />
              {p.moderationNotice?.("sitterExpectations")}
            </div>
            <p className="text-[14px] text-muted-foreground">Écrit à partir de votre profil. Modifiez-le librement.</p>
          </div>
        </Card>

        <section className="rounded-2xl bg-secondary/10 p-5" data-testid="express-already">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">Déjà renseigné</h2>
          <ul className="mt-2 space-y-1 text-[15px] text-foreground">
            <li>{housingLabel(p.propertyType).replace(/^votre /, (m) => m.charAt(0).toUpperCase() + m.slice(1))}{p.city ? ` à ${p.city}` : ""}</li>
            {names && <li>{names}</li>}
            {p.postalCode && <li>Code postal {p.postalCode}</li>}
          </ul>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-[var(--bottom-nav-h,0px)] z-40 md:bottom-0 border-t border-border bg-background/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-[640px]">
          {footerBlockers.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-[13.5px] text-muted-foreground" data-testid="express-blockers">
              {footerBlockers.map((b) => <li key={b.id}>{expressBlockerLabel(b)}</li>)}
            </ul>
          )}
          <Button type="button" variant={p.publishedSitId ? "outline" : "default"} className="h-[50px] w-full rounded-full text-[16px]" disabled={p.blocking.length > 0 || p.publishing} onClick={p.onPublish}>
            {p.publishing ? "Publication en cours…" : p.publishedSitId ? "Publier une autre annonce" : "Publier mon annonce"}
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">Publier est gratuit. Les gardiens vous écrivent, et c'est vous qui choisissez.</p>
        </div>
      </footer>
    </div>
  );
};

export default CreateSitExpress;
