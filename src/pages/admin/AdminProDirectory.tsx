import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { getCategoryByValue } from "@/lib/proCategories";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { trackEvent } from "@/lib/analytics";
import { ShieldCheck } from "lucide-react";

type ProRow = {
  id: string;
  user_id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  siret: string | null;
  status: "pending" | "approved" | "rejected";
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  email_contact: string | null;
  created_at: string;
  rejection_reason: string | null;
  siret_verified: boolean;
  siret_verified_at: string | null;
  pricing_tier: "standard" | "verified";
};

type Tab = "pending" | "approved" | "rejected";

export default function AdminProDirectory() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const load = async (t: Tab) => {
    setLoading(true);
    const { data } = await supabase
      .from("pro_profiles")
      .select("*")
      .eq("status", t)
      .order("created_at", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const decide = async (row: ProRow, decision: "approved" | "rejected") => {
    const patch: any = { status: decision };
    if (decision === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.rejection_reason = null;
    } else {
      patch.rejection_reason = reasonById[row.id] ?? "Non conforme aux exigences de l'annuaire.";
    }
    const { error } = await supabase.from("pro_profiles").update(patch).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Notification email au pro (non bloquant)
    sendTransactionalEmail({
      templateName: decision === "approved" ? "pro-profile-approved" : "pro-profile-rejected",
      recipientUserId: row.user_id,
      idempotencyKey: `pro-${decision}-${row.id}-${Date.now()}`,
      templateData: {
        raisonSociale: row.raison_sociale,
        slug: row.slug,
        reason: decision === "rejected" ? patch.rejection_reason : undefined,
      },
    }).catch(() => {});

    toast.success(decision === "approved" ? "Fiche approuvée, email envoyé" : "Fiche refusée, email envoyé");
    load(tab);
  };

  const toggleVerified = async (row: ProRow) => {
    const next = !row.siret_verified;
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id ?? null;
    const { error } = await supabase
      .from("pro_profiles")
      .update({
        siret_verified: next,
        siret_verified_by: next ? adminId : null,
      } as any)
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void trackEvent("pro_admin_verification_toggled", {
      metadata: { pro_id: row.id, verified: next, admin_id: adminId },
    });
    toast.success(next ? "SIRET marqué comme vérifié" : "Vérification SIRET retirée");
    load(tab);
  };

  const verifiedCount = rows.filter((r) => r.siret_verified).length;
  const standardCount = rows.length - verifiedCount;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl min-w-0">
      <AdminPageHeader
        title="Annuaire pros, modération"
        description="Valider ou refuser les fiches de l'annuaire des pros animaliers."
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/pros">Vérifications Pro (diplômes, SIRET)</Link>
        </Button>
      </div>


      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
          <TabsTrigger value="rejected">Refusées</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">Aucune fiche dans cet onglet.</p>
          ) : (
            rows.map((row) => {
              const cat = getCategoryByValue(row.category);
              return (
                <Card key={row.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {row.logo_url ? (
                        <img
                          src={row.logo_url}
                          alt={row.raison_sociale}
                          className="w-16 h-16 rounded-lg object-contain bg-muted"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{row.raison_sociale}</h3>
                          <Badge variant="outline">{cat?.label}</Badge>
                          {row.city && <Badge variant="secondary">{row.city}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          SIRET : {row.siret || "non renseigné"} · Créée le{" "}
                          {new Date(row.created_at).toLocaleDateString("fr-FR")}
                        </p>
                        {row.description && (
                          <p className="text-sm mt-3 whitespace-pre-line line-clamp-4">
                            {row.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-3 space-x-3">
                          {row.phone && <span>Tél : {row.phone}</span>}
                          {row.email_contact && <span>Email : {row.email_contact}</span>}
                          {row.website && (
                            <a
                              href={row.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Site web
                            </a>
                          )}
                        </div>
                        {row.rejection_reason && (
                          <p className="text-xs text-destructive mt-2">
                            Motif refus : {row.rejection_reason}
                          </p>
                        )}

                        {tab === "pending" && (
                          <div className="mt-4 space-y-2">
                            <Textarea
                              placeholder="Motif de refus (optionnel)"
                              value={reasonById[row.id] ?? ""}
                              onChange={(e) =>
                                setReasonById((m) => ({ ...m, [row.id]: e.target.value }))
                              }
                              rows={2}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => decide(row, "approved")}>
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => decide(row, "rejected")}
                              >
                                Refuser
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/pros/${row.slug}?preview=1`} target="_blank">
                                  Prévisualiser
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}

                        {tab !== "pending" && (
                          <div className="mt-4 flex gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/pros/${row.slug}`} target="_blank">
                                Voir la fiche
                              </Link>
                            </Button>
                            {tab === "rejected" && (
                              <Button size="sm" onClick={() => decide(row, "approved")}>
                                Approuver finalement
                              </Button>
                            )}
                            {tab === "approved" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => decide(row, "rejected")}
                              >
                                Retirer
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
