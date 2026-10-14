/**
 * /annonce-noel/:token (lot V1, email de Noël v3)
 *
 * Page mobile à jeton, sans connexion : trois questions pour qui n'avait pas
 * décrit son logement (logement, animaux, dates), une photo, puis l'annonce
 * préparée côté serveur. La publication passe par la fiche de l'annonce, avec
 * connexion. Maquettes Claude Design « Guardiens · Email Noël v3 »
 * (PageQuestions, PagePhoto, PagePrete).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Camera, DoorOpen, ImageIcon, Loader2, Sofa, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/compressImage";
import { trackEvent } from "@/lib/analytics";
import { avatarImageUrl } from "@/lib/storageImage";
import {
  callAnnonceNoel,
  editHref,
  frRange,
  isPlaceType,
  NOEL_DATE_OPTIONS,
  NOEL_V3_FREE_LINE,
  NOEL_V3_PROOF,
  nextStep,
  notedLine,
  petNamesLabel,
  photoExt,
  PLACE_TYPES,
  publishHref,
  readyNearbyLine,
  stepLabel,
  type AnnonceNoelBody,
  type AnnonceNoelState,
  type AnnonceNoelStep,
} from "@/lib/annonceNoel";

type View =
  | { kind: "loading" }
  | { kind: "error"; state?: string; reason?: string }
  | { kind: "ready"; data: AnnonceNoelState };

const TYPE_WORD: Record<string, string> = {
  house: "Maison", apartment: "Appartement", farm: "Ferme", chalet: "Chalet", other: "Logement",
};

const PET_CHOICES = [
  { kind: "dog" as const, label: "Un chien", placeholder: "Prénom du chien" },
  { kind: "cat" as const, label: "Un chat", placeholder: "Prénom du chat" },
  { kind: "other" as const, label: "D'autres animaux", placeholder: "Prénom de l'animal" },
];

const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen min-w-0 bg-background px-4 pb-16 pt-6">
    <PageMeta title="Votre annonce de Noël | Guardiens" description="Votre annonce de Noël, préparée en quelques gestes." noindex />
    <div className="mx-auto w-full max-w-[520px]">
      <p className="mb-6 font-heading text-[22px] font-semibold text-primary">guardiens</p>
      {children}
    </div>
  </main>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8A5C38]">{children}</p>
);

const Progress = ({ step }: { step: AnnonceNoelStep }) => {
  const label = stepLabel(step);
  if (!label) return null;
  const pct = step === "logement" ? 33 : step === "pets" ? 66 : 100;
  return (
    <div className="mb-6" data-testid="noel-progress">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
};

const Faces = ({ sitters }: { sitters: Array<{ id: string; firstName: string; avatarUrl?: string }> }) => (
  <div className="flex shrink-0">
    {sitters.slice(0, 3).map((s, i) => (
      s.avatarUrl
        ? <img key={s.id} src={avatarImageUrl(s.avatarUrl, 80)} alt={s.firstName} className={`h-10 w-10 rounded-full border-2 border-background object-cover ${i ? "-ml-2.5" : ""}`} />
        : <span key={s.id} className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary/10 font-heading font-semibold text-primary ${i ? "-ml-2.5" : ""}`}>{(s.firstName || "G").charAt(0).toUpperCase()}</span>
    ))}
  </div>
);

const AnnonceNoel = () => {
  const { token = "" } = useParams<{ token?: string }>();
  const [params] = useSearchParams();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const started = useRef(false);
  const tracked = useRef<string>("");

  const apply = useCallback(async (body: AnnonceNoelBody): Promise<AnnonceNoelState | null> => {
    const res = await callAnnonceNoel(token, body);
    if (!res.ok) {
      const state = (res as { state?: string }).state;
      const reason = (res as { reason?: string }).reason;
      if (state && state !== "valid") { setView({ kind: "error", state }); return null; }
      if (reason === "rate_limited") { setView({ kind: "error", reason }); return null; }
      setActionError("Ce choix n'a pas pu être enregistré. Réessayez dans un instant.");
      return null;
    }
    let data = res as AnnonceNoelState;
    // L'annonce se prépare dès que tout est là.
    if (!data.published && nextStep(data) === "ready" && !data.draft) {
      const prepared = await callAnnonceNoel(token, { mode: "prepare" });
      if (prepared.ok) data = prepared as AnnonceNoelState;
    }
    setActionError(null);
    setView({ kind: "ready", data });
    return data;
  }, [token]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const first = await apply({ mode: "peek" });
      const type = params.get("type");
      if (first && !first.has_property && isPlaceType(type)) {
        setBusy(true);
        try { await apply({ mode: "property", type }); } finally { setBusy(false); }
      }
    })();
  }, [apply, params]);

  const run = async (body: AnnonceNoelBody) => {
    setBusy(true);
    try { await apply(body); } finally { setBusy(false); }
  };

  const data = view.kind === "ready" ? view.data : null;
  const step: AnnonceNoelStep | null = data ? (data.published ? null : nextStep(data)) : null;

  useEffect(() => {
    if (!data || !step || tracked.current === step) return;
    tracked.current = step;
    void trackEvent("noel_v3_page_step", { source: "annonce_noel", anonymous: true, metadata: { step, variant: data.variant } });
  }, [data, step]);

  if (view.kind === "loading") {
    return <Shell><p className="text-muted-foreground">Un instant…</p></Shell>;
  }

  if (view.kind === "error") {
    return (
      <Shell>
        <section data-testid="noel-error">
          <h1 className="font-heading text-[26px] leading-tight text-foreground">
            {view.reason === "rate_limited"
              ? "Beaucoup de demandes en peu de temps. Réessayez dans quelques minutes."
              : "Ce lien a expiré. Retrouvez votre annonce en vous connectant à votre espace."}
          </h1>
          <Button asChild className="mt-6 h-[50px] rounded-full px-8 text-[16px]">
            <Link to="/login?redirect=/dashboard">Me connecter</Link>
          </Button>
        </section>
      </Shell>
    );
  }

  const d = view.data;

  if (d.published) {
    return (
      <Shell>
        <section data-testid="noel-published">
          <h1 className="font-heading text-[28px] leading-tight text-foreground">Votre annonce est en ligne.</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">Les gardiens à proximité la découvrent et vous écrivent. Vous les retrouvez dans votre espace.</p>
          <Button asChild className="mt-6 h-[50px] rounded-full px-8 text-[16px]">
            <Link to="/dashboard">Aller à mon espace</Link>
          </Button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      {step && step !== "ready" && step !== "photo" ? <Progress step={step} /> : null}
      {actionError ? <p className="mb-4 rounded-xl bg-destructive/10 p-3 text-[14px] text-destructive" role="alert">{actionError}</p> : null}
      {step === "logement" && <PlaceStep busy={busy} onPick={(type) => run({ mode: "property", type })} />}
      {step === "pets" && <PetsStep busy={busy} noted={notedLine(d.property_type)} onSubmit={(b) => run(b)} />}
      {step === "dates" && <DatesStep busy={busy} onSubmit={(b) => run(b)} />}
      {step === "photo" && <PhotoStep token={token} data={d} questions={d.questions} onDone={(b) => run(b)} onError={setActionError} />}
      {step === "ready" && <ReadyStep data={d} busy={busy} onRetry={() => run({ mode: "prepare" })} />}
    </Shell>
  );
};

const PlaceStep = ({ busy, onPick }: { busy: boolean; onPick: (t: "house" | "apartment" | "other") => void }) => (
  <section data-testid="noel-step-logement">
    <Eyebrow>Votre annonce de Noël</Eyebrow>
    <h1 className="mt-2 font-heading text-[28px] leading-tight text-foreground">Vous vivez dans :</h1>
    <div className="mt-5 grid gap-3">
      {PLACE_TYPES.map((p) => (
        <Button key={p.type} variant="outline" disabled={busy} onClick={() => onPick(p.type)}
          className="h-[54px] justify-start rounded-2xl px-5 text-[16px] font-semibold">
          {p.label}
        </Button>
      ))}
    </div>
    <p className="mt-4 text-[14px] text-muted-foreground">Ensuite : qui reste à la maison, vos dates, une photo.</p>
  </section>
);

const PetsStep = ({ busy, noted, onSubmit }: { busy: boolean; noted: string; onSubmit: (b: AnnonceNoelBody) => void }) => {
  const [kinds, setKinds] = useState<Array<"dog" | "cat" | "other">>([]);
  const [alone, setAlone] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const toggle = (k: "dog" | "cat" | "other") => {
    setAlone(false);
    setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  };
  const ready = alone || kinds.length > 0;
  return (
    <section data-testid="noel-step-pets">
      <p className="text-[14px] font-medium text-primary">{noted}</p>
      <h1 className="mt-2 font-heading text-[28px] leading-tight text-foreground">Qui reste à la maison ?</h1>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {PET_CHOICES.map((p) => (
          <Button key={p.kind} type="button" variant={kinds.includes(p.kind) ? "default" : "outline"} aria-pressed={kinds.includes(p.kind)}
            onClick={() => toggle(p.kind)} className="h-[52px] rounded-2xl text-[15px] font-semibold">
            {p.label}
          </Button>
        ))}
        <Button type="button" variant={alone ? "default" : "outline"} aria-pressed={alone}
          onClick={() => { setAlone(true); setKinds([]); }} className="h-[52px] rounded-2xl text-[15px] font-semibold">
          La maison seule
        </Button>
      </div>
      {kinds.length > 0 && (
        <div className="mt-5 grid gap-3">
          {kinds.map((k) => {
            const c = PET_CHOICES.find((p) => p.kind === k)!;
            return (
              <label key={k} className="grid gap-1.5 text-[14px] text-muted-foreground">
                Son prénom
                <input value={names[k] ?? ""} maxLength={40} placeholder={c.placeholder}
                  onChange={(e) => setNames((n) => ({ ...n, [k]: e.target.value }))}
                  className="h-[48px] rounded-xl border border-input bg-background px-4 text-[16px] text-foreground" />
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-[14px] text-muted-foreground">Plusieurs animaux ? Choisissez-les tous, vous ajoutez leurs prénoms ensuite.</p>
      <Button disabled={!ready || busy} className="mt-6 h-[52px] w-full rounded-full text-[16px]"
        onClick={() => onSubmit(alone
          ? { mode: "pets", none: true }
          : { mode: "pets", pets: kinds.map((k) => ({ kind: k, ...(names[k]?.trim() ? { name: names[k].trim() } : {}) })) })}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continuer"}
      </Button>
    </section>
  );
};

const DatesStep = ({ busy, onSubmit }: { busy: boolean; onSubmit: (b: AnnonceNoelBody) => void }) => {
  const [choice, setChoice] = useState<"vacances" | "noel" | "nouvel_an" | "autres" | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const today = todayIso();
  const customOk = !!start && !!end && start >= today && end > start;
  const ready = choice !== null && (choice !== "autres" || customOk);
  return (
    <section data-testid="noel-step-dates">
      <h1 className="font-heading text-[28px] leading-tight text-foreground">Vous partez quand ?</h1>
      <div className="mt-5 grid gap-3">
        {(Object.keys(NOEL_DATE_OPTIONS) as Array<keyof typeof NOEL_DATE_OPTIONS>).map((k) => (
          <Button key={k} type="button" variant={choice === k ? "default" : "outline"} aria-pressed={choice === k}
            onClick={() => setChoice(k)} className="h-auto min-h-[52px] justify-start whitespace-normal rounded-2xl px-5 py-3 text-left text-[15px] font-semibold">
            {NOEL_DATE_OPTIONS[k].label}
          </Button>
        ))}
        <Button type="button" variant={choice === "autres" ? "default" : "outline"} aria-pressed={choice === "autres"}
          onClick={() => setChoice("autres")} className="h-[52px] justify-start rounded-2xl px-5 text-[15px] font-semibold">
          D'autres dates
        </Button>
      </div>
      {choice === "autres" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-[14px] text-muted-foreground">Départ
            <input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)}
              className="h-[48px] rounded-xl border border-input bg-background px-3 text-[16px] text-foreground" />
          </label>
          <label className="grid gap-1.5 text-[14px] text-muted-foreground">Retour
            <input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)}
              className="h-[48px] rounded-xl border border-input bg-background px-3 text-[16px] text-foreground" />
          </label>
        </div>
      )}
      <p className="mt-4 text-[14px] text-muted-foreground">Vos dates restent modifiables jusqu'à la publication.</p>
      <Button disabled={!ready || busy} className="mt-6 h-[52px] w-full rounded-full text-[16px]"
        onClick={() => onSubmit(choice === "autres" ? { mode: "dates", start, end } : { mode: "dates", choice: choice as "vacances" | "noel" | "nouvel_an" })}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continuer"}
      </Button>
      <p className="mt-3 text-center text-[14px] text-muted-foreground">Ensuite, une photo de chez vous.</p>
    </section>
  );
};

const PhotoStep = ({ token, data, questions, onDone, onError }: {
  token: string; data: AnnonceNoelState; questions: boolean;
  onDone: (b: AnnonceNoelBody) => Promise<void>; onError: (m: string | null) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    onError(null);
    try {
      const compressed = await compressImageFile(file, 5, 1200);
      const slot = await callAnnonceNoel(token, { mode: "photo_url", ext: photoExt(compressed) });
      if (!slot.ok || !slot.path || !slot.upload_token) throw new Error("upload_url");
      const { error } = await supabase.storage.from("property-photos")
        .uploadToSignedUrl(slot.path, slot.upload_token, compressed, { contentType: compressed.type || "image/jpeg" });
      if (error) throw error;
      await onDone({ mode: "photo_done", path: slot.path });
    } catch {
      onError("La photo n'a pas pu être envoyée. Réessayez, ou choisissez-en une autre.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section data-testid="noel-step-photo">
      <Eyebrow>{questions ? "Dernière étape" : "Votre annonce de Noël"}</Eyebrow>
      <h1 className="mt-2 font-heading text-[28px] leading-tight text-foreground">Une photo de chez vous.</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
        C'est la première chose que voient les gardiens. Une pièce de vie, le jardin ou l'entrée, à la lumière du jour, téléphone tenu à l'horizontale.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[{ icon: Sofa, label: "Le salon" }, { icon: Trees, label: "Le jardin" }, { icon: DoorOpen, label: "L'entrée" }].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-[13px] text-foreground">
            <Icon className="h-6 w-6 text-primary" aria-hidden />
            {label}
          </div>
        ))}
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" data-testid="noel-camera"
        onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" data-testid="noel-gallery"
        onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ""; }} />
      <Button disabled={uploading} className="mt-6 h-[52px] w-full rounded-full text-[16px]" onClick={() => camera.current?.click()}>
        {uploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Envoi de la photo…</> : <><Camera className="mr-2 h-5 w-5" />Prendre une photo</>}
      </Button>
      <Button variant="outline" disabled={uploading} className="mt-3 h-[52px] w-full rounded-full text-[16px]" onClick={() => gallery.current?.click()}>
        <ImageIcon className="mr-2 h-5 w-5" />Choisir dans ma galerie
      </Button>
      <p className="mt-4 text-center text-[14px] text-muted-foreground">Vous changez votre photo quand vous voulez, depuis votre profil.</p>
      {data.nearby?.label ? <p className="mt-6 text-[14px] text-muted-foreground">{data.nearby.label}. {NOEL_V3_PROOF}</p> : null}
    </section>
  );
};

const ReadyStep = ({ data, busy, onRetry }: { data: AnnonceNoelState; busy: boolean; onRetry: () => void }) => {
  const draft = data.draft;
  if (!draft) {
    return (
      <section data-testid="noel-ready-missing">
        <h1 className="font-heading text-[26px] leading-tight text-foreground">Votre annonce se prépare.</h1>
        <Button disabled={busy} className="mt-6 h-[52px] w-full rounded-full text-[16px]" onClick={onRetry}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Préparer mon annonce"}
        </Button>
      </section>
    );
  }
  const photo = draft.cover_photo_url || data.photo_url;
  const dates = draft.start_date && draft.end_date ? frRange(draft.start_date, draft.end_date) : frRange(data.dates.start, data.dates.end);
  const pets = petNamesLabel(data.pets.map((p) => p.name));
  const meta = [dates, TYPE_WORD[data.property_type ?? ""] ?? "Logement", pets].filter(Boolean).join(" · ");
  const nearbyLine = data.has_city ? readyNearbyLine(data.nearby?.count) : null;
  return (
    <section data-testid="noel-step-ready">
      <h1 className="font-heading text-[30px] leading-tight text-foreground">Votre annonce de Noël est prête.</h1>
      <p className="mt-2 text-[16px] text-muted-foreground">Relisez-la, puis publiez. Vous pourrez la modifier ensuite.</p>
      <article className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {photo ? <img src={photo} alt="Votre photo du logement" className="aspect-[4/3] w-full object-cover" /> : null}
        <div className="p-5">
          <h2 className="font-heading text-[21px] leading-snug text-foreground">{draft.title}</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">{meta}</p>
          {draft.text ? <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{draft.text}</p> : null}
          <Link to={editHref(draft.id)} className="mt-3 inline-block text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
            Modifier le texte ou les dates
          </Link>
        </div>
      </article>
      {nearbyLine ? (
        <div className="mt-5 flex items-center gap-3" data-testid="noel-ready-nearby">
          {data.nearby?.sitters?.length ? <Faces sitters={data.nearby.sitters} /> : null}
          <p className="text-[15px] text-foreground">{nearbyLine}</p>
        </div>
      ) : !data.has_city ? (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4" data-testid="noel-ready-no-city">
          <p className="text-[15px] text-foreground">Ajoutez votre commune : votre annonce apparaît aux gardiens qui habitent à proximité.</p>
          <Link to="/owner-profile" className="mt-2 inline-block text-[15px] font-semibold text-primary underline-offset-4 hover:underline">Ajouter ma commune</Link>
        </div>
      ) : null}
      <Button asChild className="mt-6 h-[54px] w-full rounded-full text-[17px] font-semibold">
        <Link to={publishHref(draft.id)} data-testid="noel-publish"
          onClick={() => { void trackEvent("noel_v3_publish_clicked", { source: "annonce_noel", anonymous: true, metadata: { variant: data.variant } }); }}>
          Publier mon annonce
        </Link>
      </Button>
      <p className="mt-3 text-center text-[14px] text-muted-foreground">{NOEL_V3_FREE_LINE}</p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">La publication se fait depuis votre compte Guardiens.</p>
    </section>
  );
};

export default AnnonceNoel;
