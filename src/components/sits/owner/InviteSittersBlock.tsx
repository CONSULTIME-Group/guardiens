/**
 * Bloc « Inviter des gardiens » affiché sur la fiche annonce côté propriétaire
 * (statut = published). Deux onglets :
 *  - Mes favoris : gardiens favoris du propriétaire, bouton « Inviter ».
 *  - Trouver des gardiens : recherche par nom / ville parmi les profils 'sitter'.
 *
 * Les états par sitter (non invité / invité / a candidaté) sont calculés à
 * partir de la table `sit_invitations` (hook useSitInvitations).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Send, Check, MailCheck, Heart, Sparkles, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useSitInvitations } from "@/hooks/useSitInvitations";
import { DEPT_NAMES } from "@/lib/departments";
import InviteSitterDialog from "./InviteSitterDialog";

interface SitterRow {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
}

interface InviteSittersBlockProps {
  sitId: string;
  ownerId: string;
  sitTitle: string;
  sitCity: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Si true → applique un effet visuel d'accent (juste après publication) */
  highlight?: boolean;
}

const InviteSittersBlock = ({
  sitId,
  ownerId,
  sitTitle,
  sitCity,
  startDate,
  endDate,
  highlight = false,
}: InviteSittersBlockProps) => {
  const { data: favorites = [] } = useFavorites("sitter");
  const { data: invitations = [] } = useSitInvitations(sitId);

  const invitedById = useMemo(() => {
    const map = new Map<string, "sent" | "viewed" | "applied" | "declined">();
    invitations.forEach((i) => map.set(i.sitter_id, i.status));
    return map;
  }, [invitations]);

  const favoriteIds = useMemo(() => favorites.map((f) => f.target_id), [favorites]);
  const [favSitters, setFavSitters] = useState<SitterRow[]>([]);
  useEffect(() => {
    let cancel = false;
    if (favoriteIds.length === 0) {
      setFavSitters([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, bio")
        .in("id", favoriteIds)
        .eq("role", "sitter");
      if (!cancel) setFavSitters((data as SitterRow[]) || []);
    })();
    return () => {
      cancel = true;
    };
  }, [favoriteIds]);

  // Recherche : par mots-clés (prénom/ville) et/ou par département (code postal)
  const [query, setQuery] = useState("");
  const [deptCode, setDeptCode] = useState<string>(""); // "" = tous départements
  const [searchResults, setSearchResults] = useState<SitterRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    // Au moins un critère requis
    if (q.length < 2 && !deptCode) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      let req = supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, bio, postal_code")
        .eq("role", "sitter")
        .neq("id", ownerId);

      if (q.length >= 2) {
        req = req.or(`first_name.ilike.%${q}%,city.ilike.%${q}%`);
      }
      if (deptCode) {
        // Postal codes français : préfixe = code département (2 chiffres ou 2A/2B/97x)
        req = req.like("postal_code", `${deptCode}%`);
      }
      const { data } = await req.limit(30);
      setSearchResults((data as SitterRow[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, deptCode, ownerId]);

  const [inviteTarget, setInviteTarget] = useState<SitterRow | null>(null);

  // Compteurs
  const sentCount = invitations.filter((i) => i.status === "sent" || i.status === "viewed").length;
  const appliedCount = invitations.filter((i) => i.status === "applied").length;

  const renderCard = (s: SitterRow) => {
    const status = invitedById.get(s.id);
    return (
      <div
        key={s.id}
        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={s.avatar_url || undefined} alt={s.first_name || "Gardien"} />
          <AvatarFallback>{(s.first_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            to={`/gardiens/${s.id}`}
            className="font-medium text-sm hover:underline truncate block"
          >
            {s.first_name || "Gardien"}
          </Link>
          {s.city && <p className="text-xs text-muted-foreground truncate">{s.city}</p>}
        </div>
        {status === "applied" ? (
          <span className="text-xs flex items-center gap-1 text-success font-medium">
            <Check className="h-3.5 w-3.5" /> A candidaté
          </span>
        ) : status ? (
          <span className="text-xs flex items-center gap-1 text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5" /> Invité
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInviteTarget(s)}
            className="shrink-0"
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Inviter
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="mt-8 mb-8 rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Proposer votre annonce à des gardiens
            </h2>
            <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
              Recommandé
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ne laissez pas le hasard faire tout le travail. Envoyez votre annonce directement aux gardiens
            que vous avez déjà repérés ou que vous découvrez par la recherche. Cela multiplie vos chances
            de recevoir des candidatures.
          </p>
          {(sentCount > 0 || appliedCount > 0) && (
            <p className="text-xs text-primary/80 mt-2 font-medium">
              {sentCount} invitation{sentCount > 1 ? "s" : ""} envoyée{sentCount > 1 ? "s" : ""}
              {appliedCount > 0 && ` · ${appliedCount} candidature${appliedCount > 1 ? "s" : ""} reçue${appliedCount > 1 ? "s" : ""}`}
              {sentCount >= 20 && " — limite de 20 par 24 h atteinte"}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="bg-background/80">
          <TabsTrigger value="favorites">
            <Heart className="h-4 w-4 mr-1.5" /> Mes favoris ({favSitters.length})
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1.5" /> Rechercher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-4">
          {favSitters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas encore de gardiens en favoris.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                En parcourant les profils, cliquez sur le cœur pour sauvegarder les gardiens qui vous plaisent.
                Vous pourrez ensuite les inviter ici en un clic.
              </p>
              <Link to="/recherche">
                <Button variant="outline" size="sm">
                  Parcourir les gardiens <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{favSitters.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Prénom ou ville du gardien…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-background/80"
            />
          </div>
          {query.trim().length < 2 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Tapez au moins 2 caractères (prénom ou ville).
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cherchez un gardien par son prénom ou par la ville où il se trouve, puis invitez-le à candidater.
              </p>
            </div>
          ) : searching ? (
            <p className="text-sm text-muted-foreground py-4">Recherche en cours…</p>
          ) : searchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun gardien trouvé pour « {query.trim()} ».
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Essayez un autre prénom ou une autre ville, ou parcourez la liste des gardiens depuis la recherche.
              </p>
              <Link to="/recherche" className="inline-block mt-3">
                <Button variant="outline" size="sm">
                  Recherche avancée <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{searchResults.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      <InviteSitterDialog
        open={!!inviteTarget}
        onOpenChange={(o) => !o && setInviteTarget(null)}
        sitter={inviteTarget}
        sitId={sitId}
        ownerId={ownerId}
        sitTitle={sitTitle}
        sitCity={sitCity}
        startDate={startDate}
        endDate={endDate}
      />
    </section>
  );
};

export default InviteSittersBlock;
