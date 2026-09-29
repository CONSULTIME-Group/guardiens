/**
 * Écran unique du parcours express (lot N5), mobile d'abord.
 * Composant de présentation : tout l'état et la publication restent dans
 * CreateSit, qui passe les mêmes valeurs et le même handlePublish.
 */
import { useRef, useState } from "react";
import { ArrowLeft, Check, Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MAX_TITLE_LENGTH, type PublishBlocker } from "@/lib/sitPublishRules";
import {
  EXPRESS_PERIOD_HEADER, NOEL_DATE_PRESETS, alreadyFilledPhrase, housingLabel, joinPetNames, matchingPreset,
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
}

const today = () => new Date().toISOString().slice(0, 10);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>{children}</section>
);

const CreateSitExpress = (p: CreateSitExpressProps) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const preset = matchingPreset(p.startDate, p.endDate);
  const [otherDates, setOtherDates] = useState(p.period !== "noel" || (!!p.startDate && !preset));
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
          ) : (
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
              <p className="mt-3 text-[14px] text-muted-foreground">Le jardin, le salon ou vos animaux : une photo suffit pour publier.</p>
            </div>
          )}
        </Card>

        {/* Bloc 2 : dates */}
        <Card>
          <h2 className="font-heading text-[19px] text-foreground">Vos dates</h2>
          {p.period === "noel" && (
            <div className="mt-3 flex flex-wrap gap-2" data-testid="express-date-presets">
              {NOEL_DATE_PRESETS.map((d) => {
                const active = !otherDates && preset?.key === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { setOtherDates(false); p.onDates(d.start, d.end, "preset"); }}
                    className={cn(
                      "min-h-[44px] rounded-full border-[1.5px] px-4 text-[15px] font-medium",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={otherDates}
                onClick={() => setOtherDates(true)}
                className={cn(
                  "min-h-[44px] rounded-full border-[1.5px] border-dashed px-4 text-[15px] font-medium",
                  otherDates ? "border-primary text-primary" : "border-border text-muted-foreground",
                )}
              >
                Autres dates
              </button>
            </div>
          )}
          {otherDates && (
            <div className="mt-3 grid grid-cols-2 gap-3" data-testid="express-date-inputs">
              <div>
                <Label htmlFor="express-start" className="mb-1 block text-xs text-muted-foreground">Début</Label>
                <Input id="express-start" type="date" min={today()} value={p.startDate} className="h-12 text-base"
                  onChange={(e) => p.onDates(e.target.value, p.endDate, "autres")} />
              </div>
              <div>
                <Label htmlFor="express-end" className="mb-1 block text-xs text-muted-foreground">Fin</Label>
                <Input id="express-end" type="date" min={p.startDate || today()} value={p.endDate} className="h-12 text-base"
                  onChange={(e) => p.onDates(p.startDate, e.target.value, "autres")} />
              </div>
            </div>
          )}
          {p.dateError && <p className="mt-2 text-sm text-destructive">{p.dateError}</p>}
          <label className="mt-4 flex min-h-[44px] items-center gap-3 text-[15px] text-foreground">
            <Checkbox checked={p.flexibleDates} onCheckedChange={(v) => p.onFlexibleDates(v === true)} />
            Mes dates sont flexibles
          </label>
        </Card>

        {/* Bloc 3 : texte */}
        <Card>
          <h2 className="font-heading text-[19px] text-foreground">Votre texte, proposé par Alma</h2>
          <div className="mt-3 space-y-4">
            <div>
              <Label htmlFor="express-title" className="mb-1 block text-sm">Titre</Label>
              <Input id="express-title" value={p.title} maxLength={MAX_TITLE_LENGTH} className="h-12 text-base" onChange={(e) => p.onTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="express-reason" className="mb-1 block text-sm">Pourquoi vous partez</Label>
              <Textarea id="express-reason" value={p.absenceReason} className="min-h-[72px] text-base" onChange={(e) => p.onAbsenceReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="express-expect" className="mb-1 block text-sm">Ce que vous attendez du gardien</Label>
              <Textarea id="express-expect" value={p.sitterExpectations} className="min-h-[96px] text-base" onChange={(e) => p.onSitterExpectations(e.target.value)} />
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

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-[640px]">
          {p.blocking.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-[13.5px] text-muted-foreground" data-testid="express-blockers">
              {p.blocking.map((b) => <li key={b.id}>{b.label}</li>)}
            </ul>
          )}
          <Button type="button" className="h-[50px] w-full rounded-full text-[16px]" disabled={p.blocking.length > 0 || p.publishing} onClick={p.onPublish}>
            {p.publishing ? "Publication en cours…" : "Publier mon annonce"}
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">Publier est gratuit. Les gardiens vous écrivent, et c'est vous qui choisissez.</p>
        </div>
      </footer>
    </div>
  );
};

export default CreateSitExpress;
