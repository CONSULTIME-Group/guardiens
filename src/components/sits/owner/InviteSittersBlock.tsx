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
import { Search, Send, UserPlus, Check, MailCheck, Heart, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useSitInvitations } from "@/hooks/useSitInvitations";
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
}

const InviteSittersBlock = ({
  sitId,
  ownerId,
  sitTitle,
  sitCity,
  startDate,
  endDate,
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

  // Recherche
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SitterRow[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, bio")
        .eq("role", "sitter")
        .neq("id", ownerId)
        .or(`first_name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(20);
      setSearchResults((data as SitterRow[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, ownerId]);

  const [inviteTarget, setInviteTarget] = useState<SitterRow | null>(null);

  const renderCard = (s: SitterRow) => {
    const status = invitedById.get(s.id);
    return (
      <div
        key={s.id}
        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition"
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
          <span className="text-xs flex items-center gap-1 text-success">
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
    <section className="mt-6 mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Inviter des gardiens à candidater
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vous pouvez proposer cette annonce directement à vos favoris ou à des gardiens trouvés
          par la recherche. Maximum 20 invitations par 24 h.
        </p>
      </div>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList>
          <TabsTrigger value="favorites">
            <Heart className="h-4 w-4 mr-1.5" /> Mes favoris ({favSitters.length})
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1.5" /> Rechercher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-4">
          {favSitters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Vous n'avez pas encore de gardiens en favoris.{" "}
              <Link to="/recherche" className="text-primary hover:underline">
                Parcourir les gardiens →
              </Link>
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{favSitters.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Prénom ou ville…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {query.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground py-4">
              Tapez au moins 2 caractères (prénom ou ville).
            </p>
          ) : searching ? (
            <p className="text-sm text-muted-foreground py-4">Recherche en cours…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucun gardien trouvé.</p>
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
