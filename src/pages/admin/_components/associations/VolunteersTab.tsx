/**
 * Bénévolat en association, écran nominatif d'administration.
 *
 * Lit `volunteer_availability` (accès administrateur par RLS) et rapproche les
 * prénoms et adresses depuis `profiles`. L'action de contact reprend le motif
 * « Contacter le posteur » de AdminSmallMissions : une boîte de confirmation,
 * un message saisi, un envoi par le mécanisme existant
 * `admin_send_message_to_user`.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { DEPT_NAMES } from "@/lib/departments";
import { VOLUNTEER_FREQUENCIES } from "@/lib/volunteerAvailability";

type VolunteerRow = {
  user_id: string;
  available: boolean;
  structure_types: string[] | null;
  skills: string[] | null;
  departments: string[] | null;
  frequency: string | null;
  current_association: string | null;
  created_at: string | null;
  first_name?: string | null;
  email?: string | null;
};

const frequencyLabel = (value: string | null): string =>
  VOLUNTEER_FREQUENCIES.find((f) => f.value === value)?.label ?? "";

const deptLabel = (code: string): string =>
  DEPT_NAMES[code] ? `${code} ${DEPT_NAMES[code]}` : code;

const shortDate = (value: string | null): string =>
  value ? new Intl.DateTimeFormat("fr-FR").format(new Date(value)) : "";

const listCell = (values: string[] | null): string => (values ?? []).join(", ");

export const VolunteersTab = () => {
  const [rows, setRows] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [departement, setDepartement] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [contact, setContact] = useState<VolunteerRow | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("volunteer_availability" as any)
        .select(
          "user_id, available, structure_types, skills, departments, frequency, current_association, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) toast.error("Chargement impossible");
      const list = ((data as any) ?? []) as VolunteerRow[];

      let profiles: Array<{ id: string; first_name: string | null; email: string | null }> = [];
      if (list.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, first_name, email")
          .in(
            "id",
            list.map((r) => r.user_id),
          );
        profiles = ((p as any) ?? []) as typeof profiles;
      }
      const byId = new Map(profiles.map((p) => [p.id, p]));
      if (cancelled) return;
      setRows(
        list.map((r) => ({
          ...r,
          first_name: byId.get(r.user_id)?.first_name ?? null,
          email: byId.get(r.user_id)?.email ?? null,
        })),
      );
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const departements = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.departments ?? []).forEach((d) => set.add(d)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (onlyAvailable && !r.available) return false;
        if (departement !== "all" && !(r.departments ?? []).includes(departement)) return false;
        return true;
      }),
    [rows, onlyAvailable, departement],
  );

  const availableRows = rows.filter((r) => r.available);
  const coveredDepartements = new Set(
    availableRows.flatMap((r) => r.departments ?? []),
  ).size;

  const sendMessage = async () => {
    if (!contact) return;
    const content = message.trim();
    if (!content) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSending(true);
    const { error } = await supabase.rpc("admin_send_message_to_user", {
      p_target_user_id: contact.user_id,
      p_content: content,
    });
    setSending(false);
    if (error) {
      toast.error(error.message || "Envoi impossible");
      return;
    }
    toast.success("Message envoyé");
    setContact(null);
    setMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{availableRows.length}</p>
            <p className="text-sm text-muted-foreground">personnes disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{coveredDepartements}</p>
            <p className="text-sm text-muted-foreground">départements couverts</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={departement}
          onChange={(e) => setDepartement(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Département"
        >
          <option value="all">Tous les départements</option>
          {departements.map((code) => (
            <option key={code} value={code}>
              {deptLabel(code)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Voir seulement les personnes disponibles
        </label>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prénom</TableHead>
              <TableHead>Départements</TableHead>
              <TableHead>Types de structure</TableHead>
              <TableHead>Ce qu'elle peut apporter</TableHead>
              <TableHead>Rythme</TableHead>
              <TableHead>Association actuelle</TableHead>
              <TableHead>Déclarée le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Aucune déclaration pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">
                    <span>{r.first_name || "Sans prénom"}</span>
                    {r.email && (
                      <span className="block text-xs text-muted-foreground">{r.email}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(r.departments ?? []).map(deptLabel).join(", ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {listCell(r.structure_types)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[280px]">
                    {listCell(r.skills)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {frequencyLabel(r.frequency)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.current_association ?? ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {shortDate(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Contacter la personne"
                      title="Contacter"
                      onClick={() => {
                        setContact(r);
                        setMessage("");
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!contact}
        onOpenChange={(open) => {
          if (!open && !sending) {
            setContact(null);
            setMessage("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contacter la personne</AlertDialogTitle>
            <AlertDialogDescription>
              Envoyer un message à {contact?.first_name || "cette personne"} dans sa messagerie
              Guardiens, au sujet de sa déclaration de bénévolat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="volunteer-contact-message">Message</Label>
            <Textarea
              id="volunteer-contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              placeholder="Ex : une association de votre département cherche un coup de main, souhaitez-vous que nous fassions la mise en relation ?"
              rows={5}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">{message.length}/2000</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={sendMessage} disabled={sending}>
              {sending ? "Envoi…" : "Envoyer le message"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VolunteersTab;
