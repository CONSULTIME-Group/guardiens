/**
 * Lot J2-A : inventaire vivant autour de la personne.
 *
 * Uniquement des éléments réels et publics, nommés avec leur lien : gardes
 * publiées, demandes et offres d'entraide ouvertes, projets, associations,
 * questions sans réponse. Jamais un compte de membres (règle CHIFFRES).
 */

export interface InventoryItem {
  titre: string;
  ville: string | null;
  lien: string;
  debut?: string | null;
  fin?: string | null;
  id?: string;
}

export interface AlmaInventory {
  departement: string | null;
  hors_france: boolean;
  pays: string | null;
  gardes: InventoryItem[];
  demandes_entraide: InventoryItem[];
  offres_entraide: InventoryItem[];
  projets: InventoryItem[];
  associations: InventoryItem[];
  questions_sans_reponse: InventoryItem[];
}

export interface InventoryProfile {
  departement_code?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Département déduit : colonne dédiée, sinon code postal (97x sur trois chiffres). */
export function departementOf(p: InventoryProfile): string | null {
  const dep = (p.departement_code || "").trim();
  if (dep) return dep.toUpperCase();
  const cp = (p.postal_code || "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B";
  return cp.slice(0, 2);
}

/** Préfixe de code postal d'un département, pour les tables sans colonne département. */
export function postalPrefixOf(dep: string): string {
  if (dep === "2A" || dep === "2B") return "20";
  return dep;
}

export function isAbroad(p: InventoryProfile): boolean {
  const c = (p.country || "").trim().toUpperCase();
  return Boolean(c) && c !== "FR" && c !== "FRANCE";
}

export function emptyInventory(p: InventoryProfile): AlmaInventory {
  return {
    departement: departementOf(p),
    hors_france: isAbroad(p),
    pays: p.country ?? null,
    gardes: [], demandes_entraide: [], offres_entraide: [], projets: [], associations: [], questions_sans_reponse: [],
  };
}

export function inventoryIsEmpty(inv: AlmaInventory): boolean {
  return !inv.gardes.length && !inv.demandes_entraide.length && !inv.offres_entraide.length &&
    !inv.projets.length && !inv.associations.length && !inv.questions_sans_reponse.length;
}

/** Bloc envoyé au modèle. */
export function formatInventory(inv: AlmaInventory): string {
  const lines: string[] = [
    "AUTOUR DE LA PERSONNE, ÉLÉMENTS RÉELS ET PUBLICS (tu peux les nommer avec leur lien ; tu ne cites aucun nombre de membres)",
    `Département : ${inv.departement ?? "inconnu"}${inv.hors_france ? `, la personne vit hors de France (${inv.pays}) : propose /annonces/international` : ""}.`,
  ];
  const block = (title: string, items: InventoryItem[]) => {
    if (!items.length) return;
    lines.push(`${title} :`);
    for (const i of items) {
      const dates = i.debut ? `, du ${i.debut}${i.fin ? ` au ${i.fin}` : ""}` : "";
      lines.push(`- ${i.titre}${i.ville ? `, ${i.ville}` : ""}${dates}, ${i.lien}`);
    }
  };
  block("Gardes publiées", inv.gardes);
  block("Demandes d'entraide ouvertes", inv.demandes_entraide);
  block("Offres d'entraide", inv.offres_entraide);
  block("Projets ouverts", inv.projets);
  block("Associations", inv.associations);
  block("Questions sans réponse", inv.questions_sans_reponse);
  if (inventoryIsEmpty(inv)) {
    lines.push(
      "Rien n'est encore publié dans son département. Propose de lancer la première demande d'entraide du coin (/petites-missions/creer) ou le premier projet (/projets/publier), et de régler l'alerte de secteur (/mon-secteur).",
    );
  } else {
    if (!inv.projets.length) lines.push("Aucun projet dans son département : un premier projet du coin est possible sur /projets/publier.");
    if (!inv.demandes_entraide.length) lines.push("Aucune demande d'entraide ouverte dans son département : sa demande serait la première du coin.");
  }
  return lines.join("\n");
}

// deno-lint-ignore no-explicit-any
export async function loadAlmaInventory(client: any, p: InventoryProfile, today: string): Promise<AlmaInventory> {
  const inv = emptyInventory(p);
  const dep = inv.departement;
  const safe = async <T>(q: Promise<{ data: T[] | null }>): Promise<T[]> => {
    try {
      const r = await q;
      return (r?.data ?? []) as T[];
    } catch {
      return [];
    }
  };
  const hasCoords = typeof p.latitude === "number" && typeof p.longitude === "number";
  const qQuery = client
    .from("community_questions")
    .select("id, title, city")
    .eq("status", "open")
    .eq("answers_count", 0)
    .or("is_hidden.is.null,is_hidden.eq.false")
    .order("created_at", { ascending: false })
    .limit(2);
  const questionsP = hasCoords
    ? safe(qQuery.gte("latitude", p.latitude! - 0.5).lte("latitude", p.latitude! + 0.5).gte("longitude", p.longitude! - 0.7).lte("longitude", p.longitude! + 0.7))
    : p.city ? safe(qQuery.ilike("city", p.city)) : Promise.resolve([]);

  if (!dep) {
    // deno-lint-ignore no-explicit-any
    inv.questions_sans_reponse = ((await questionsP) as any[]).map((q) => ({ titre: q.title, ville: q.city, lien: `/questions/${q.id}`, id: q.id }));
    return inv;
  }
  const prefix = `${postalPrefixOf(dep)}%`;
  // deno-lint-ignore no-explicit-any
  const [sits, besoins, offres, projets, assos, questions] = await Promise.all<any[]>([
    safe(client.from("sits").select("id, slug, title, city, start_date, end_date").eq("status", "published").eq("departement_code", dep).or(`end_date.is.null,end_date.gte.${today}`).order("start_date", { ascending: true }).limit(3)),
    safe(client.from("small_missions").select("id, title, city").eq("status", "open").eq("mission_type", "besoin").neq("category", "projet").like("postal_code", prefix).order("created_at", { ascending: false }).limit(3)),
    safe(client.from("small_missions").select("id, title, city").eq("status", "open").eq("mission_type", "offre").neq("category", "projet").like("postal_code", prefix).order("created_at", { ascending: false }).limit(3)),
    safe(client.from("small_missions").select("id, slug, title, city").eq("status", "open").eq("category", "projet").like("postal_code", prefix).order("created_at", { ascending: false }).limit(3)),
    safe(client.from("animal_associations").select("slug, name, city").eq("status", "published").eq("departement_code", dep).order("name", { ascending: true }).limit(2)),
    questionsP,
  ]);
  inv.gardes = sits.map((s) => ({ titre: s.title, ville: s.city, debut: s.start_date, fin: s.end_date, lien: `/annonces/${s.slug || s.id}`, id: s.id }));
  inv.demandes_entraide = besoins.map((m) => ({ titre: m.title, ville: m.city, lien: `/petites-missions/${m.id}`, id: m.id }));
  inv.offres_entraide = offres.map((m) => ({ titre: m.title, ville: m.city, lien: `/petites-missions/${m.id}`, id: m.id }));
  inv.projets = projets.map((m) => ({ titre: m.title, ville: m.city, lien: `/projets/${m.slug || m.id}`, id: m.id }));
  inv.associations = assos.map((a) => ({ titre: a.name, ville: a.city, lien: `/associations/${a.slug}` }));
  inv.questions_sans_reponse = questions.map((q) => ({ titre: q.title, ville: q.city, lien: `/questions/${q.id}`, id: q.id }));
  return inv;
}
