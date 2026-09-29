import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/ui";
import {
  adminLabel, auditActionLabel, EMPTY_FIELD_VALUE, fieldValue,
  APPLICATION_STATUS_LABELS, MISSION_STATUS_LABELS, MISSION_RESPONSE_STATUS_LABELS,
  REPORT_STATUS_LABELS, ROLE_LABELS, SIT_STATUS_LABELS, VERIFICATION_STATUS_LABELS,
} from "@/lib/admin/labels";
import { normalizeMemberCard, sumCounts, type CountByStatus, type MemberCard } from "@/lib/admin/memberCard";
import { MemberActionsMenu, type MemberActionsHandlers } from "./MemberActionsMenu";

const ACCOUNT_STATUS: Record<string, string> = {
  active: "Actif", suspended: "Suspendu", deleted: "Supprimé", deletion_pending: "Suppression en cours",
};
const TEAM_STATUS: Record<string, string> = { success: "Envoyé", sent: "Envoyé", failed: "Échoué" };

const fmtDate = (d: string | null | undefined) => (d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : EMPTY_FIELD_VALUE);
const fmtShort = (d: string | null | undefined) => (d ? format(new Date(d), "d MMM yyyy", { locale: fr }) : EMPTY_FIELD_VALUE);

export async function fetchMemberCard(userId: string): Promise<MemberCard> {
  const { data, error } = await (supabase.rpc as any)("admin_get_member_card", { p_user_id: userId });
  if (error) throw error;
  return normalizeMemberCard(data);
}

const Section = ({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) => (
  <Collapsible defaultOpen={defaultOpen} className="rounded-xl border border-border bg-card">
    <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left">
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-3 px-4 pb-4 text-sm">{children}</CollapsibleContent>
  </Collapsible>
);

const Counts = ({ counts, dict, empty }: { counts: CountByStatus; dict: Record<string, string>; empty: string }) => {
  const entries = Object.entries(counts).filter(([, n]) => Number(n) > 0);
  if (entries.length === 0) return <EmptyState className="py-4">{empty}</EmptyState>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, n]) => (
        <Badge key={k} variant="secondary" className="font-normal">{adminLabel(k, dict)} : {n}</Badge>
      ))}
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right text-foreground">{children}</span>
  </div>
);

interface Props {
  userId: string | null;
  onClose: () => void;
  handlers: MemberActionsHandlers;
  /** Même écriture que NoteUserDialog (handleSaveNote). */
  onSaveNote: (userId: string, note: string) => Promise<boolean>;
}

export const MemberCardSheet = ({ userId, onClose, handlers, onSaveNote }: Props) => {
  const q = useQuery({
    queryKey: ["admin-member-card", userId],
    enabled: !!userId,
    queryFn: () => fetchMemberCard(userId as string),
    retry: false,
  });
  const card = q.data;
  const id = card?.identity;
  const name = id ? `${id.first_name ?? ""} ${id.last_name ?? ""}`.trim() || id.email || "Membre" : "Membre";

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  useEffect(() => { setNote(card?.moderation.admin_notes ?? ""); setNoteSaved(false); }, [card?.moderation.admin_notes, userId]);

  const saveNote = async () => {
    if (!userId) return;
    setSavingNote(true);
    const ok = await onSaveNote(userId, note);
    setSavingNote(false);
    if (ok) { setNoteSaved(true); q.refetch(); }
  };

  const copyEmail = async () => {
    if (!id?.email) return;
    try { await navigator.clipboard.writeText(id.email); toast.success("Email copié"); } catch { toast.error("Copie impossible"); }
  };

  const publicUrl = id ? `/gardiens/${id.id}${id.role === "owner" ? "?tab=proprio" : ""}` : "#";

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto font-body p-0">
        <div className="space-y-4 p-5 sm:p-6">
          {q.isLoading ? (
            <>
              <SheetHeader><SheetTitle className="font-heading">Fiche membre</SheetTitle><SheetDescription className="sr-only">Chargement</SheetDescription></SheetHeader>
              <LoadingState label="Chargement de la fiche" />
            </>
          ) : q.isError ? (
            <>
              <SheetHeader><SheetTitle className="font-heading">Fiche membre</SheetTitle><SheetDescription className="sr-only">Erreur</SheetDescription></SheetHeader>
              <ErrorState detail="La fiche n'a pas pu être lue." onRetry={() => q.refetch()} />
            </>
          ) : !card || !id ? (
            <>
              <SheetHeader><SheetTitle className="font-heading">Fiche membre</SheetTitle><SheetDescription className="sr-only">Introuvable</SheetDescription></SheetHeader>
              <EmptyState>Ce compte n'existe plus ou n'a jamais existé.</EmptyState>
            </>
          ) : (
            <>
              <SheetHeader className="space-y-3 text-left">
                <div className="flex items-start gap-4 pr-6">
                  <Avatar className="h-16 w-16 border border-border">
                    <AvatarImage src={id.avatar_url || undefined} alt="" />
                    <AvatarFallback className="font-heading text-lg">{(id.first_name?.[0] || "").toUpperCase()}{(id.last_name?.[0] || "").toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SheetTitle className="font-heading text-2xl leading-tight text-foreground">{name}</SheetTitle>
                    <SheetDescription className="sr-only">Fiche admin du membre</SheetDescription>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{adminLabel(id.role, ROLE_LABELS)}</Badge>
                      <Badge variant={id.account_status === "suspended" ? "destructive" : "secondary"}>{ACCOUNT_STATUS[id.account_status] ?? adminLabel(id.account_status)}</Badge>
                      <Badge variant={id.identity_verified ? "default" : "outline"}>{adminLabel(id.identity_verification_status, VERIFICATION_STATUS_LABELS)}</Badge>
                      {id.is_manual_super && <Badge variant="secondary">Super gardien</Badge>}
                      {id.is_founder && <Badge variant="secondary">Fondateur</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{fieldValue(id.city)} · Inscrit le {fmtDate(id.created_at)}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="truncate text-foreground">{fieldValue(id.email)}</span>
                      {id.email && (
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyEmail} aria-label="Copier l'email">
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Voir le profil public</a>
                  <MemberActionsMenu
                    target={{ id: id.id, name, account_status: id.account_status, identity_verified: id.identity_verified, is_manual_super: id.is_manual_super, email_confirmed: id.email_confirmed, has_identity_documents: id.has_identity_documents }}
                    handlers={handlers}
                  />
                </div>
              </SheetHeader>

              <Section title="Vérification">
                <Row label="Statut">{adminLabel(id.identity_verification_status, VERIFICATION_STATUS_LABELS)}</Row>
                <Row label="Validée le">{fmtDate(id.identity_verified_at)}</Row>
                <Row label="Dernier dépôt ou décision">{fmtDate(id.identity_last_log_at)}</Row>
                {id.has_identity_documents ? (
                  <Link to="/admin/verifications" className="text-sm text-primary underline-offset-4 hover:underline">Voir les pièces dans la file Vérifications</Link>
                ) : (
                  <p className="text-muted-foreground">Aucune pièce déposée pour l'instant.</p>
                )}
              </Section>

              <Section title="Propriétaire">
                <Counts counts={card.owner.sits_by_status} dict={SIT_STATUS_LABELS} empty="Aucune annonce publiée par ce membre." />
                {card.owner.recent_sits.length > 0 && (
                  <ul className="divide-y divide-border">
                    {card.owner.recent_sits.map((s) => (
                      <li key={s.id} className="py-2">
                        <Link to={`/admin/listings?sit=${s.id}`} className="font-medium text-foreground hover:text-primary">{fieldValue(s.title)}</Link>
                        <p className="text-xs text-muted-foreground">{fmtShort(s.start_date)} au {fmtShort(s.end_date)} · {adminLabel(s.status, SIT_STATUS_LABELS)} · {s.applications_count} candidature{s.applications_count > 1 ? "s" : ""}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Gardien">
                <Row label="Gardes réalisées">{card.sitter.completed_sits}</Row>
                <Row label="Disponibilité">{card.sitter.is_available == null ? EMPTY_FIELD_VALUE : card.sitter.is_available ? "Disponible" : "Indisponible"}</Row>
                <Counts counts={card.sitter.applications_by_status} dict={APPLICATION_STATUS_LABELS} empty="Aucune candidature envoyée par ce membre." />
                {card.sitter.recent_applications.length > 0 && (
                  <ul className="divide-y divide-border">
                    {card.sitter.recent_applications.map((a) => (
                      <li key={a.id} className="py-2">
                        <Link to={`/admin/listings?sit=${a.sit_id}`} className="font-medium text-foreground hover:text-primary">{fieldValue(a.sit_title)}</Link>
                        <p className="text-xs text-muted-foreground">{adminLabel(a.status, APPLICATION_STATUS_LABELS)} · {fmtShort(a.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Entraide">
                <p className="text-xs text-muted-foreground">Demandes publiées</p>
                <Counts counts={card.mutual_aid.missions_by_status} dict={MISSION_STATUS_LABELS} empty="Aucune demande d'entraide publiée." />
                <p className="text-xs text-muted-foreground">Réponses envoyées</p>
                <Counts counts={card.mutual_aid.responses_by_status} dict={MISSION_RESPONSE_STATUS_LABELS} empty="Aucune réponse envoyée." />
              </Section>

              <Section title="Avis">
                {card.reviews.received_count + card.reviews.given_count + card.reviews.hidden_count === 0 ? (
                  <EmptyState className="py-4">Aucun avis reçu ni donné pour l'instant.</EmptyState>
                ) : (
                  <>
                    <Row label="Reçus">{card.reviews.received_count}{card.reviews.received_avg != null ? `, moyenne ${card.reviews.received_avg.toLocaleString("fr-FR")} sur 5` : ""}</Row>
                    <Row label="Donnés">{card.reviews.given_count}</Row>
                    <Row label="Masqués">{card.reviews.hidden_count}</Row>
                  </>
                )}
              </Section>

              <Section title="Signalements">
                {sumCounts(card.reports.targeting_by_status) + card.reports.made_count === 0 ? (
                  <EmptyState className="py-4">Aucun signalement lié à ce membre.</EmptyState>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Visant ce membre</p>
                    <Counts counts={card.reports.targeting_by_status} dict={REPORT_STATUS_LABELS} empty="Aucun signalement visant ce membre." />
                    <Row label="Faits par ce membre">{card.reports.made_count}</Row>
                    <Link to="/admin/reports" className="text-sm text-primary underline-offset-4 hover:underline">Ouvrir les signalements</Link>
                  </>
                )}
              </Section>

              <Section title="Messagerie">
                {card.messaging.conversations_count === 0 ? (
                  <EmptyState className="py-4">Aucune conversation pour l'instant.</EmptyState>
                ) : (
                  <>
                    <Row label="Conversations">{card.messaging.conversations_count}</Row>
                    <Row label="Dernière activité">{fmtDate(card.messaging.last_activity_at)}</Row>
                    {card.messaging.last_conversation_id && (
                      <Link to={`/admin/messages?conversation=${card.messaging.last_conversation_id}`} className="text-sm text-primary underline-offset-4 hover:underline">Ouvrir la dernière conversation</Link>
                    )}
                  </>
                )}
              </Section>

              <Section title="Messages de l'équipe">
                {card.team_messages.length === 0 ? (
                  <EmptyState className="py-4">Aucun message de l'équipe pour l'instant.</EmptyState>
                ) : (
                  <ul className="divide-y divide-border">
                    {card.team_messages.map((m) => (
                      <li key={m.id} className="space-y-1 py-2">
                        <p className="text-xs text-muted-foreground">{fmtShort(m.sent_at)} · {TEAM_STATUS[m.status ?? ""] ?? adminLabel(m.status)}</p>
                        <p className="text-foreground">{m.excerpt || EMPTY_FIELD_VALUE}</p>
                        {m.error_message && <p className="text-xs text-destructive">{m.error_message}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Note interne">
                {card.moderation.suspension_reason && (
                  <Row label="Motif de suspension">{card.moderation.suspension_reason}</Row>
                )}
                <Textarea aria-label="Note interne" placeholder="Note visible uniquement par les admins" value={note} rows={4}
                  onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }} />
                <div className="flex items-center justify-end gap-3">
                  {noteSaved && <span role="status" className="text-sm text-success">Note enregistrée</span>}
                  <Button size="sm" onClick={saveNote} disabled={savingNote}>{savingNote ? "Enregistrement…" : "Enregistrer la note"}</Button>
                </div>
              </Section>

              <Section title="Historique">
                {card.history.length === 0 ? (
                  <EmptyState className="py-4">Aucune action d'équipe sur ce compte.</EmptyState>
                ) : (
                  <ul className="divide-y divide-border">
                    {card.history.map((h) => (
                      <li key={h.id} className="py-2">
                        <p className="font-medium text-foreground">{auditActionLabel(h.action)}</p>
                        <p className="text-xs text-muted-foreground">{fmtShort(h.created_at)} · {h.admin_name ?? "Équipe"}{h.note ? ` · ${h.note}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
