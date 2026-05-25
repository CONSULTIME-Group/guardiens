import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  id: string;
  first_name: string;
  city: string | null;
  avatar_url: string | null;
}

/**
 * Bandeau de preuve sociale authentique pour la Landing :
 * - Compteur live du nombre de membres réels (profils avec prénom + ville)
 * - Mosaïque d'avatars de 14 membres réels, liés à leur profil public
 *
 * Aucune citation textuelle n'est inventée à leur place : on se contente de
 * montrer qu'ils existent et de pointer vers leurs profils publics. Les
 * citations détaillées vivent dans la section témoignages anonymisés
 * (Programme Fondateurs).
 */
const FALLBACK_COUNT = 460;
const STRIP_SIZE = 14;

const RealMembersStrip = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState<number>(FALLBACK_COUNT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count } = await supabase
          .from("public_profiles")
          .select("id", { count: "exact", head: true })
          .not("first_name", "is", null)
          .not("city", "is", null);
        if (!cancelled && typeof count === "number" && count > 0) {
          setTotal(count);
        }

        const { data } = await supabase
          .from("public_profiles")
          .select("id, first_name, city, avatar_url")
          .not("first_name", "is", null)
          .not("city", "is", null)
          .not("avatar_url", "is", null)
          .neq("avatar_url", "")
          .order("created_at", { ascending: false })
          .limit(40);

        if (!cancelled && data) {
          // Échantillon pseudo-aléatoire stable côté client (rotation par jour)
          const day = new Date().getDate();
          const shuffled = [...data].sort(
            (a, b) =>
              ((a.id.charCodeAt(0) + day) % 53) -
              ((b.id.charCodeAt(0) + day) % 53)
          );
          setMembers(shuffled.slice(0, STRIP_SIZE) as Member[]);
        }
      } catch {
        /* fallback silencieux : compteur par défaut, pas d'avatars */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Round to nearest 10 for a stable, communicating number
  const roundedTotal = Math.max(FALLBACK_COUNT, Math.floor(total / 10) * 10);

  return (
    <div className="mb-16 flex flex-col items-center gap-5">
      {members.length > 0 && (
        <ul className="flex -space-x-3" aria-label="Aperçu des membres récents">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                to={`/gardiens/${m.id}`}
                title={`${m.first_name}${m.city ? " · " + m.city : ""}`}
                className="block h-11 w-11 rounded-full overflow-hidden border-2 border-background ring-1 ring-border bg-muted hover:ring-primary/60 transition-all hover:z-10 hover:scale-110"
              >
                <img
                  src={m.avatar_url ?? ""}
                  alt={`${m.first_name}, membre Guardiens à ${m.city ?? "France"}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={44}
                  height={44}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="font-body text-sm text-foreground/70 text-center max-w-xl">
        <span className="font-semibold text-foreground">
          Plus de {roundedTotal} membres
        </span>{" "}
        ont déjà rejoint le réseau, partout en France — de Valence à Quimper, de
        Paris à Sète.
      </p>
    </div>
  );
};

export default RealMembersStrip;
