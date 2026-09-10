import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ASSOCIATION_NEEDS_VALUES,
  ASSOCIATION_SPECIES_VALUES,
  ASSOCIATION_TYPE_VALUES,
  associationNeedLabel,
  associationSpeciesLabel,
  associationTypeLabel,
} from "@/lib/associationLabels";
import {
  ASSOCIATION_NEED_DETAIL_VALUES,
  associationNeedDetailLabel,
} from "@/lib/associationLabels";
import type {
  AssociationKeyFigure,
  AssociationNeedDetail,
  AssociationPhoto,
  AssociationPressItem,
} from "@/components/associations/types";
import { ASSOCIATION_CONSENT_SUBJECT, buildConsentEmail } from "@/lib/associationConsentEmail";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type AssociationRow = {
  id: string;
  slug: string;
  name: string;
  association_type: string;
  city: string;
  postal_code: string | null;
  departement_code: string;
  species: string[];
  description: string;
  needs: string[];
  siren: string | null;
  rna: string | null;
  legal_form: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  donation_url: string | null;
  adoption_url: string | null;
  volunteer_url: string | null;
  contact_email: string | null;
  contact_page_url: string | null;
  logo_url: string | null;
  tagline: string | null;
  founded_year: number | null;
  key_figures: AssociationKeyFigure[];
  press: AssociationPressItem[];
  needs_details: AssociationNeedDetail[];
  photos: AssociationPhoto[];
  photo_credit: string | null;
  sources: Array<{ fact?: string; url?: string }>;
  consent_status: string;
  consent_requested_at: string | null;
  consent_granted_at: string | null;
  consent_note: string | null;
  verified_at: string;
  status: string;
  internal_note: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  archived: "Archivée",
};

const shortDate = (value: string | null): string =>
  value ? new Intl.DateTimeFormat("fr-FR").format(new Date(value)) : "";

const consentLabel = (row: AssociationRow): string => {
  switch (row.consent_status) {
    case "requested":
      return `Demandé le ${shortDate(row.consent_requested_at)}`;
    case "granted":
      return `Accordé le ${shortDate(row.consent_granted_at)}`;
    case "refused":
      return "Refusé";
    default:
      return "En attente";
  }
};

const TEXT_FIELDS: Array<{ key: keyof AssociationRow; label: string }> = [
  { key: "slug", label: "Slug" },
  { key: "name", label: "Nom" },
  { key: "city", label: "Ville" },
  { key: "postal_code", label: "Code postal" },
  { key: "departement_code", label: "Code département" },
  { key: "siren", label: "SIREN" },
  { key: "rna", label: "RNA" },
  { key: "legal_form", label: "Forme juridique" },
  { key: "website_url", label: "Site" },
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "donation_url", label: "Page de dons" },
  { key: "adoption_url", label: "Page adoptions" },
  { key: "volunteer_url", label: "Page bénévolat" },
  { key: "contact_email", label: "Email de contact" },
  { key: "contact_page_url", label: "Page de contact" },
  { key: "logo_url", label: "URL du logo" },
  { key: "tagline", label: "Accroche (120 caractères maximum)" },
  { key: "founded_year", label: "Année de création" },
  { key: "photo_credit", label: "Crédit photo" },
  { key: "verified_at", label: "Vérifiée le (AAAA-MM-JJ)" },
];

export default function AdminAssociations() {
  const [rows, setRows] = useState<AssociationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AssociationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sendingSlug, setSendingSlug] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("animal_associations" as any)
      .select("*")
      .order("name");
    if (error) toast.error("Chargement impossible");
    setRows(((data as any) ?? []) as AssociationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const editingPhotos: AssociationPhoto[] = useMemo(
    () => (Array.isArray(editing?.photos) ? editing!.photos : []),
    [editing],
  );

  const patch = (values: Partial<AssociationRow>) =>
    setEditing((prev) => (prev ? { ...prev, ...values } : prev));

  const persist = async (id: string, values: Record<string, unknown>) => {
    const { error } = await supabase
      .from("animal_associations" as any)
      .update(values as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    await load();
    return true;
  };

  const saveEditing = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...values } = editing;
    // Le champ année est saisi en texte : la colonne attend un entier ou rien.
    const raw = (values as any).founded_year;
    (values as any).founded_year =
      raw === "" || raw === null || raw === undefined ? null : Number(raw) || null;
    const ok = await persist(id, values as any);
    setSaving(false);
    if (ok) {
      toast.success("Fiche enregistrée");
      setEditing(null);
    }
  };

  const recentlyRequested = (row: AssociationRow): boolean => {
    if (!row.consent_requested_at) return false;
    const ageMs = Date.now() - new Date(row.consent_requested_at).getTime();
    return ageMs < 30 * 24 * 60 * 60 * 1000;
  };

  const invokeConsentEmail = async (
    row: AssociationRow,
    payload: Record<string, unknown>,
  ) => {
    setSendingSlug(row.slug);
    const { data, error } = await supabase.functions.invoke("send-association-consent-email", {
      body: { slug: row.slug, ...payload },
    });
    setSendingSlug(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Envoyé à ${(data as any)?.to ?? ""}`);
    await load();
  };

  const sendTest = async (row: AssociationRow) => {
    const { data: userData } = await supabase.auth.getUser();
    const adminEmail = userData?.user?.email;
    if (!adminEmail) {
      toast.error("Adresse de l'administrateur introuvable");
      return;
    }
    await invokeConsentEmail(row, { mode: "test", test_to: adminEmail });
  };

  const copyConsentEmail = async (row: AssociationRow) => {
    const text = buildConsentEmail(row.name, `https://guardiens.fr/associations/${row.slug}`);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Email copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const copyPhotos = async (row: AssociationRow) => {
    setCopying(true);
    const { data, error } = await supabase.functions.invoke("copy-association-photos", {
      body: { association_id: row.id },
    });
    setCopying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Photos copiées : ${(data as any)?.copied ?? 0}`);
    await load();
  };

  const toggleInArray = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const editingFigures: AssociationKeyFigure[] = Array.isArray(editing?.key_figures)
    ? editing!.key_figures
    : [];
  const editingPress: AssociationPressItem[] = Array.isArray(editing?.press) ? editing!.press : [];
  const editingNeeds: AssociationNeedDetail[] = Array.isArray(editing?.needs_details)
    ? editing!.needs_details
    : [];

  const updatePhoto = (index: number, values: Partial<AssociationPhoto>) =>
    patch({
      photos: editingPhotos.map((p, i) => (i === index ? { ...p, ...values } : p)),
    });

  const movePhoto = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= editingPhotos.length) return;
    const copy = [...editingPhotos];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    patch({ photos: copy });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Associations et refuges"
        description="Fiches rédigées par l'équipe Guardiens, publiées sur la page publique des associations."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune fiche pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {associationTypeLabel(row.association_type)} · {row.city} ·{" "}
                    {row.departement_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accord photos : {consentLabel(row)} · Vérifiée le {shortDate(row.verified_at)}
                  </p>
                </div>
                <Badge variant={row.status === "published" ? "default" : "secondary"}>
                  {STATUS_LABELS[row.status] ?? row.status}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                    Modifier
                  </Button>
                  {row.status !== "published" && (
                    <Button size="sm" onClick={() => persist(row.id, { status: "published" })}>
                      Publier
                    </Button>
                  )}
                  {row.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => persist(row.id, { status: "draft" })}>
                      Dépublier
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => persist(row.id, { status: "archived" })}>
                    Archiver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      persist(row.id, {
                        consent_status: "requested",
                        consent_requested_at: new Date().toISOString(),
                      })
                    }
                  >
                    Demande envoyée
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      persist(row.id, {
                        consent_status: "granted",
                        consent_granted_at: new Date().toISOString(),
                      })
                    }
                  >
                    Accord reçu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => persist(row.id, { consent_status: "refused" })}
                  >
                    Refus
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyConsentEmail(row)}>
                    Copier l'email de demande
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendingSlug === row.slug}
                    onClick={() => sendTest(row)}
                  >
                    M'envoyer un test
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !row.contact_email ||
                          recentlyRequested(row) ||
                          sendingSlug === row.slug
                        }
                      >
                        Envoyer la demande
                      </Button>
                    }
                    title="Envoyer la demande d'accord ?"
                    description={
                      <>
                        Destinataire : {row.contact_email ?? ""}
                        <br />
                        Objet : {ASSOCIATION_CONSENT_SUBJECT.replace("{name}", row.name)}
                        {recentlyRequested(row) && (
                          <>
                            <br />
                            Demande déjà envoyée le {shortDate(row.consent_requested_at)}
                          </>
                        )}
                      </>
                    }
                    confirmLabel="Envoyer"
                    onConfirm={() => invokeConsentEmail(row, { mode: "send" })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={row.consent_status !== "granted" || copying}
                    onClick={() => copyPhotos(row)}
                  >
                    Copier les photos dans notre stockage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">Édition : {editing.name}</h2>

            <div className="grid gap-3 md:grid-cols-2">
              {TEXT_FIELDS.map((field) => (
                <label key={String(field.key)} className="text-sm space-y-1">
                  <span className="text-muted-foreground">{field.label}</span>
                  <Input
                    value={(editing[field.key] as string) ?? ""}
                    onChange={(e) => patch({ [field.key]: e.target.value } as any)}
                  />
                </label>
              ))}
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">Type</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.association_type}
                  onChange={(e) => patch({ association_type: e.target.value })}
                >
                  {ASSOCIATION_TYPE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {associationTypeLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-sm space-y-1 block">
              <span className="text-muted-foreground">Présentation</span>
              <Textarea
                rows={8}
                value={editing.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Espèces accueillies</p>
                <div className="space-y-1">
                  {ASSOCIATION_SPECIES_VALUES.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editing.species?.includes(v)}
                        onCheckedChange={() =>
                          patch({ species: toggleInArray(editing.species ?? [], v) })
                        }
                      />
                      {associationSpeciesLabel(v)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Besoins du moment</p>
                <div className="space-y-1">
                  {ASSOCIATION_NEEDS_VALUES.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editing.needs?.includes(v)}
                        onCheckedChange={() => patch({ needs: toggleInArray(editing.needs ?? [], v) })}
                      />
                      {associationNeedLabel(v)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Photos</p>
              {editingPhotos.map((photo, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    value={photo.url}
                    placeholder="URL de la photo"
                    onChange={(e) => updatePhoto(index, { url: e.target.value })}
                  />
                  <Input
                    value={photo.alt ?? ""}
                    placeholder="Texte alternatif"
                    onChange={(e) => updatePhoto(index, { alt: e.target.value })}
                  />
                  <Input
                    value={photo.source_page_url ?? ""}
                    placeholder="Page source"
                    onChange={(e) => updatePhoto(index, { source_page_url: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {photo.hosting === "storage" ? "Notre stockage" : "Site de l'association"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => movePhoto(index, -1)}>
                      Monter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => movePhoto(index, 1)}>
                      Descendre
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch({ photos: editingPhotos.filter((_, i) => i !== index) })
                      }
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({
                    photos: [
                      ...editingPhotos,
                      { url: "", alt: "", source_page_url: "", hosting: "external" },
                    ],
                  })
                }
              >
                Ajouter une photo
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Chiffres clés</p>
              {editingFigures.map((figure, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    value={figure.value ?? ""}
                    placeholder="Valeur"
                    onChange={(e) =>
                      patch({
                        key_figures: editingFigures.map((f, i) =>
                          i === index ? { ...f, value: e.target.value } : f,
                        ),
                      })
                    }
                  />
                  <Input
                    value={figure.label ?? ""}
                    placeholder="Libellé"
                    onChange={(e) =>
                      patch({
                        key_figures: editingFigures.map((f, i) =>
                          i === index ? { ...f, label: e.target.value } : f,
                        ),
                      })
                    }
                  />
                  <Input
                    value={figure.year ?? ""}
                    placeholder="Année"
                    onChange={(e) =>
                      patch({
                        key_figures: editingFigures.map((f, i) =>
                          i === index ? { ...f, year: e.target.value } : f,
                        ),
                      })
                    }
                  />
                  <Input
                    value={figure.source_url ?? ""}
                    placeholder="URL de la source"
                    onChange={(e) =>
                      patch({
                        key_figures: editingFigures.map((f, i) =>
                          i === index ? { ...f, source_url: e.target.value } : f,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch({ key_figures: editingFigures.filter((_, i) => i !== index) })
                    }
                  >
                    Retirer
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({
                    key_figures: [
                      ...editingFigures,
                      { value: "", label: "", year: "", source_url: "" },
                    ],
                  })
                }
              >
                Ajouter un chiffre clé
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Revue de presse</p>
              {editingPress.map((article, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    value={article.media ?? ""}
                    placeholder="Média"
                    onChange={(e) =>
                      patch({
                        press: editingPress.map((a, i) =>
                          i === index ? { ...a, media: e.target.value } : a,
                        ),
                      })
                    }
                  />
                  <Input
                    value={article.title ?? ""}
                    placeholder="Titre"
                    onChange={(e) =>
                      patch({
                        press: editingPress.map((a, i) =>
                          i === index ? { ...a, title: e.target.value } : a,
                        ),
                      })
                    }
                  />
                  <Input
                    value={article.date ?? ""}
                    placeholder="Date (AAAA-MM-JJ)"
                    onChange={(e) =>
                      patch({
                        press: editingPress.map((a, i) =>
                          i === index ? { ...a, date: e.target.value } : a,
                        ),
                      })
                    }
                  />
                  <Input
                    value={article.url ?? ""}
                    placeholder="URL de l'article"
                    onChange={(e) =>
                      patch({
                        press: editingPress.map((a, i) =>
                          i === index ? { ...a, url: e.target.value } : a,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patch({ press: editingPress.filter((_, i) => i !== index) })}
                  >
                    Retirer
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({ press: [...editingPress, { media: "", title: "", date: "", url: "" }] })
                }
              >
                Ajouter un article
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Détail des besoins</p>
              {editingNeeds.map((need, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={need.need ?? "benevoles"}
                    onChange={(e) =>
                      patch({
                        needs_details: editingNeeds.map((n, i) =>
                          i === index ? { ...n, need: e.target.value } : n,
                        ),
                      })
                    }
                  >
                    {ASSOCIATION_NEED_DETAIL_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {associationNeedDetailLabel(v)}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    rows={2}
                    value={need.detail ?? ""}
                    placeholder="Détail du besoin"
                    onChange={(e) =>
                      patch({
                        needs_details: editingNeeds.map((n, i) =>
                          i === index ? { ...n, detail: e.target.value } : n,
                        ),
                      })
                    }
                  />
                  <Input
                    value={need.url ?? ""}
                    placeholder="URL de l'association"
                    onChange={(e) =>
                      patch({
                        needs_details: editingNeeds.map((n, i) =>
                          i === index ? { ...n, url: e.target.value } : n,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch({ needs_details: editingNeeds.filter((_, i) => i !== index) })
                    }
                  >
                    Retirer
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({
                    needs_details: [
                      ...editingNeeds,
                      { need: "benevoles", detail: "", url: "" },
                    ],
                  })
                }
              >
                Ajouter un besoin détaillé
              </Button>
            </div>

            <label className="text-sm space-y-1 block">
              <span className="text-muted-foreground">Note interne</span>
              <Textarea
                rows={3}
                value={editing.internal_note ?? ""}
                onChange={(e) => patch({ internal_note: e.target.value })}
              />
            </label>

            <label className="text-sm space-y-1 block">
              <span className="text-muted-foreground">Note sur l'accord</span>
              <Textarea
                rows={2}
                value={editing.consent_note ?? ""}
                onChange={(e) => patch({ consent_note: e.target.value })}
              />
            </label>

            <div className="flex gap-2">
              <Button onClick={saveEditing} disabled={saving}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
