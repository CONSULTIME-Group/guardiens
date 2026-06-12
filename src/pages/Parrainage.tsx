import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Share2, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { safeUUID } from "@/lib/uuid";

const SITTER_PRICE_START = "14 juillet 2026";

const ParrainagePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [myCount, setMyCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Compteur public : nombre total d'activations parrainées
      const { count: total } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .in("status", ["activated", "rewarded"]);
      if (cancelled) return;
      setTotalCount(total ?? 0);

      if (!user?.id) { setLoading(false); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();

      let c = (prof?.referral_code as string | null) ?? null;
      if (!c) {
        c = safeUUID().replace(/-/g, "").slice(0, 8);
        await supabase.from("profiles").update({ referral_code: c }).eq("id", user.id);
      }
      if (cancelled) return;
      setCode(c);

      const { count: mine } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .in("status", ["activated", "rewarded"]);
      if (cancelled) return;
      setMyCount(mine ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const url = code ? `https://guardiens.fr/inscription?ref=${code}` : "";
  const shareText = `Je vous invite à rejoindre Guardiens, la communauté de garde d'animaux entre gens du coin. Inscription gratuite jusqu'au ${SITTER_PRICE_START} : ${url}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  };
  const shareSMS = () => {
    window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`;
  };
  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent("Rejoignez Guardiens")}&body=${encodeURIComponent(shareText)}`;
  };
  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Guardiens", text: shareText, url }); } catch {}
    } else copy();
  };

  const tiers = [
    { count: 1, label: "Premier filleul", reward: "1 mois d'accès offert dès qu'il deviendra payant" },
    { count: 3, label: "3 filleuls", reward: "Mise en avant sur votre profil public" },
    { count: 5, label: "5 filleuls", reward: "Badge Ambassadeur permanent" },
    { count: 10, label: "10 filleuls", reward: "Statut Ambassadeur, accès prioritaire support" },
  ];

  return (
    <div className="animate-fade-in">
      <PageMeta
        title="Parrainage Guardiens, invitez vos proches"
        description="Invitez vos proches à rejoindre Guardiens. Inscription gratuite, accès offert pour vous et votre filleul à l'activation de l'abonnement gardien."
      />
      <PageBreadcrumb items={[{ label: "Parrainage" }]} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-8">
        <header>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-foreground">
            Faites grandir la communauté
          </h1>
          <p className="text-muted-foreground font-body mt-2">
            Plus nous sommes nombreux, plus les gardes de confiance se trouvent près de chez vous.
            Invitez vos proches, recevez un mois d'accès offert à chaque activation.
          </p>
        </header>

        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-heading text-4xl font-semibold text-primary">{totalCount}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">activations parrainées</div>
              </div>
              <div>
                <div className="font-heading text-4xl font-semibold text-foreground">{myCount}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">vos filleuls actifs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connectez-vous pour récupérer votre lien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground font-body">
                Votre lien de parrainage est généré automatiquement après connexion.
              </p>
              <Button onClick={() => navigate("/connexion")}>
                Se connecter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card><CardContent className="py-6 text-sm text-muted-foreground">Chargement…</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Votre lien de parrainage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground font-body truncate"
                />
                <Button variant="outline" size="sm" onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" /> Copier
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button variant="secondary" size="sm" onClick={shareWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
                <Button variant="secondary" size="sm" onClick={shareSMS}>
                  <MessageCircle className="h-4 w-4 mr-1" /> SMS
                </Button>
                <Button variant="secondary" size="sm" onClick={shareEmail}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                <Button variant="secondary" size="sm" onClick={shareNative}>
                  <Share2 className="h-4 w-4 mr-1" /> Partager
                </Button>
              </div>

              <p className="text-xs text-muted-foreground font-body">
                Votre filleul rejoint Guardiens gratuitement jusqu'au {SITTER_PRICE_START}.
                Quand l'abonnement gardien deviendra payant, vous recevez tous les deux un mois d'accès offert dès son activation.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Paliers de récompense</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tiers.map((t) => {
                const reached = myCount >= t.count;
                return (
                  <li key={t.count} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.count}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-muted-foreground font-body">{t.reward}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Comment ça marche</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground font-body list-decimal pl-5">
              <li>Vous partagez votre lien personnel à un proche.</li>
              <li>Votre filleul crée son compte gratuitement via votre lien.</li>
              <li>Dès qu'il active son espace, son inscription compte dans vos filleuls.</li>
              <li>Au moment du passage à l'abonnement payant, vous recevez tous les deux un mois offert.</li>
            </ol>
            <div className="mt-4">
              <Link to="/cgs" className="text-xs text-primary underline">Conditions du programme</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParrainagePage;
