import { sitRichnessRejectionReason } from "./sitIndexability.js";
import { isAssociationIndexable } from "./associationIndexability.js";
import { isSitterProfileIndexable } from "./sitterProfileIndexability.js";
import { mergedBreedTarget } from "./breeds/breedFicheMerges.js";
import { isIndexableEntraideMission, isIndexableProjetMission } from "./entraideMissionIndexability.js";
import { normalizeLastmod } from "./sitemap-core.js";

const PRIORITY_MAP = {
  guide_central: "0.9",
  ville: "0.9",
  guide_race: "0.8",
  guide_local: "0.8",
  guide_lieu: "0.8",
  vie_locale: "0.7",
  guide_pratique: "0.6",
  conseil: "0.6",
  conseil_gardien: "0.6",
  conseil_proprio: "0.6",
  saisonnier: "0.6",
  temoignage: "0.6",
  actualite: "0.6",
  thematique: "0.6",
};


const NO_RELIABLE_LASTMOD = null;

export async function collectSitemapData({ readAll, fetchOrCache, maxUpdatedAtWithCount, cache = {}, today = new Date() }) {
  // Slugs volontairement exclus du sitemap (doublons/anciennes URLs).
  // NE PAS confondre avec `noindex` en base : cette liste ne concerne que des
  // contenus redondants dont l'exclusion ne peut pas se déduire d'un champ DB.
  // Toute décision d'indexation par article passe par la colonne `noindex`.
  const excludedSlugs = new Set([
    "guide-house-sitting-lyon", "guide-lieu-meilleurs-parcs-chiens-lyon",
    "pet-sitting-chambery-savoie",
    "pet-sitting-annecy-guide",
    "pet-sitting-grenoble-guide", "pet-sitting-clermont-ferrand-guide",
    "house-sitting-saint-etienne-guide", "border-collie-lyon-guide-race",
    "bouledogue-francais-lyon-guide-race", "malinois-lyon-guide-race",
    "golden-retriever-lyon-guide-race", "berger-australien-guide",
    "conseil-gardien-creer-profil-attractif-lyon", "preparer-maison-avant-vacances",
    "garde-chien-lyon-solutions",
  ]);



  const [articles, seoCity, guides, depts, breeds, profiles, sits, associations, entraideMissions, projetMissions] = await Promise.all([
    fetchOrCache(
      "articles", cache,
      // Sonde composite (date + nombre) : sur une requête filtrée, la sortie
      // d'une ligne (dépublication, bascule de statut) ne change pas la date
      // max des lignes restantes. Sans le compteur, le cache resservait des
      // URL dépubliées (mesuré le 24/08/2026 sur les pages villes).
      () => maxUpdatedAtWithCount("articles", "updated_at", q => q.eq("published", true)),
      () => readAll("articles", "articles", "id, slug, category, updated_at, published_at", "id", q => q.eq("published", true).or("noindex.is.null,noindex.eq.false")),
      rows => rows.filter(a => !excludedSlugs.has(a.slug)).map(a => ({
        loc: `/actualites/${a.slug}`,
        lastmod: NO_RELIABLE_LASTMOD,
        changefreq: "monthly",
        priority: PRIORITY_MAP[a.category] || "0.7",
      }))
    ),
    fetchOrCache(
      "seo_city_pages", cache,
      // Tête de cache sur les pages publiées, SANS le filtre noindex : une
      // bascule noindex met à jour updated_at puis sort la ligne de
      // l'ensemble indexable. Une tête filtrée pourrait ne pas bouger et
      // servirait un sitemap périmé (cf. scripts/lib/sitemapCache.mjs).
      // Le compteur de lignes publiées fait partie de la clé : une
      // dépublication laisse la date max intacte (cas papeete, 24/08/2026).
      () => maxUpdatedAtWithCount("seo_city_pages", "updated_at", q => q.eq("published", true)),
      () => readAll("seo_city_pages", "seo_city_pages", "id, slug, updated_at", "id", q => q.eq("published", true).or("noindex.is.null,noindex.eq.false")),
      rows => rows.map(cp => ({
        loc: `/house-sitting/${cp.slug}`,
        lastmod: NO_RELIABLE_LASTMOD,
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "city_guides", cache,
      () => maxUpdatedAtWithCount("city_guides", "updated_at", q => q.eq("published", true)),
      () => readAll("city_guides", "city_guides", "id, slug, updated_at", "id", q => q.eq("published", true)),
      rows => rows.map(cg => ({
        loc: `/guides/${cg.slug}`,
        lastmod: NO_RELIABLE_LASTMOD,
        changefreq: "weekly",
        priority: "0.7",
      }))
    ),
    fetchOrCache(
      "seo_department_pages", cache,
      () => maxUpdatedAtWithCount("seo_department_pages", "updated_at", q => q.eq("published", true)),
      () => readAll("seo_department_pages", "seo_department_pages", "id, slug, updated_at", "id", q => q.eq("published", true).or("noindex.is.null,noindex.eq.false")),
      rows => rows.map(dp => ({
        loc: `/departement/${dp.slug}`,
        lastmod: NO_RELIABLE_LASTMOD,
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "breed_profiles", cache,
      // Sonde composite (date + nombre) : une suppression ou un renommage de
      // fiche ne change pas la date max des lignes restantes. Sans le compteur,
      // le cache resservait des URLs de races supprimées (même mécanique que
      // les pages villes le 24/08/2026).
      () => maxUpdatedAtWithCount("breed_profiles", "generated_at"),
      () => readAll("breed_profiles", "breed_profiles", "id, breed, species, generated_at", "id"),
      rows => {
        // Slug aligné avec src/lib/normalize.ts → slugify() (sinon soft-404 sur accents)
        const slugifyBreed = (s) =>
          s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/œ/g, "oe").replace(/æ/g, "ae")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        // Fiches fusionnées (doublons : jack russel, gris du gabon) exclues,
        // leur URL redirige vers la fiche conservée (BreedPage).
        return rows
          .filter(bp => !mergedBreedTarget(bp.species, bp.breed))
          .map(bp => ({
            loc: `/races/${bp.species.toLowerCase()}-${slugifyBreed(bp.breed)}`,
            lastmod: normalizeLastmod(bp.generated_at, today),
            changefreq: "monthly",
            priority: "0.6",
          }));
      }
    ),
    // Fiches gardien `/gardiens/:id` : listées si et seulement si elles passent
    // la règle de substance partagée src/lib/sitterProfileIndexability.js
    // (bio ≥ 80 caractères ET signal de confiance), exactement la même règle
    // que celle appliquée par src/pages/PublicSitterProfile.tsx pour décider du
    // `noindex`. Toute fiche non éligible reste crawlable et rend
    // `noindex, follow` : ne pas poser de `Disallow` sur `/gardiens`, il
    // empêcherait Google de voir ce noindex, donc bloquerait la désindexation.
    // Le générateur tourne avec la clé anonyme : `profiles` est fermée par RLS,
    // on lit la vue publique `public_profiles` (exposition anonyme validée).
    fetchOrCache(
      "public_profiles", cache,
      // Aucune clé de contenu complète (bio, motivation, identité, galerie) :
      // relue à chaque build, jamais mise en cache (SEO-3).
      null,
      async () => {
        const [profiles, sitters, galleryRows] = await Promise.all([
          readAll("public_profiles", "public_profiles", "id, bio, identity_verified, role", "id", q => q.in("role", ["sitter", "both"])),
          readAll("public_sitter_profiles", "public_sitter_profiles", "user_id, motivation", "user_id"),
          // `sitter_gallery` est fermée à anon depuis août 2026 (les URLs de
          // photos ne sont jamais servies). On lit la vue publique qui
          // n'expose que le NOMBRE de photos par gardien.
          readAll("public_sitter_gallery_counts", "public_sitter_gallery_counts", "user_id, photo_count", "user_id"),
        ]);
        const motivationById = new Map(sitters.map(s => [s.user_id, s.motivation]));
        const galleryCountById = new Map(galleryRows.map(g => [g.user_id, g.photo_count || 0]));
        console.log(`[sitemap] sources profils : ${profiles.length} profils, ${sitters.length} motivations, ${galleryRows.length} galeries`);
        return profiles.map(p => ({
          ...p,
          motivation: motivationById.get(p.id) || null,
          galleryCount: galleryCountById.get(p.id) || 0,
        }));
      },
      rows => {
        const kept = rows.filter(p => isSitterProfileIndexable({
          role: p.role,
          bio: p.bio,
          motivation: p.motivation,
          identityVerified: p.identity_verified,
          galleryCount: p.galleryCount,
        }));
        console.log(`[sitemap] fiches gardien : ${kept.length} retenues sur ${rows.length}`);
        return kept.map(p => ({
          loc: `/gardiens/${p.id}`,
          // Aucune date de modification de contenu exposée : lastmod omis.
          lastmod: null,
          changefreq: "monthly",
          priority: "0.5",
        }));
      }
    ),

    // Annonces individuelles `/annonces/:id`, filtre qualité aligné avec
    // l'indexabilité côté client (PublicSitDetail) via la règle partagée
    // src/lib/sitIndexability.js : statut publié, candidatures ouvertes,
    // titre ≥10 caractères, cumul de contenu rédigé ≥200 caractères.
    fetchOrCache(
      "public_sits", cache,
      null, // relue à chaque build (SEO-3)
      () => readAll("sits", "sits", "id, slug, title, updated_at, owner_message, daily_routine, specific_expectations", "id", q => q.eq("status", "published").eq("accepting_applications", true)),
      rows => {
        const rejected = { titre_trop_court: 0, contenu_insuffisant: 0 };
        const kept = rows.filter(s => {
          const reason = sitRichnessRejectionReason(s);
          if (reason) { rejected[reason] += 1; return false; }
          return true;
        });
        console.log(
          `[sitemap] annonces : ${kept.length} retenues sur ${rows.length} · recalées : ` +
          `titre trop court ${rejected.titre_trop_court}, contenu insuffisant ${rejected.contenu_insuffisant}`
        );
        if (kept.length === 0 && rows.length > 0) {
          console.warn("[sitemap] ATTENTION : aucune annonce retenue alors que des annonces publiées existent.");
        }
        return kept.map(s => ({
          loc: `/annonces/${s.slug || s.id}`,
          lastmod: NO_RELIABLE_LASTMOD,
          changefreq: "weekly",
          priority: "0.7",
        }));
      }
    ),

    // Fiches associations publiées : /associations/:slug
    fetchOrCache(
      // Clé versionnée : les champs enrichis (nom, accroche, ville) sont
      // apparus après la première mise en cache, la nouvelle clé force un
      // rechargement au lieu de servir des entrées incomplètes.
      "public_animal_associations_v2", cache,
      () => maxUpdatedAtWithCount("public_animal_associations", "updated_at"),
      () => readAll("public_animal_associations", "public_animal_associations", "id, slug, name, tagline, description, city, departement_name, updated_at", "id"),
      rows => rows.filter(a => isAssociationIndexable(a)).map(a => ({
        loc: `/associations/${a.slug}`,
        lastmod: NO_RELIABLE_LASTMOD,
        changefreq: "monthly",
        priority: "0.7",
        _name: a.name,
        _summary: (() => {
          const clean = (a.tagline || a.description || "").trim().replace(/\s+/g, " ");
          if (clean.length <= 140) return clean;
          const cut = clean.slice(0, 140);
          const stop = cut.lastIndexOf(" ");
          return `${(stop > 60 ? cut.slice(0, stop) : cut).replace(/[,;:.]$/, "")}…`;
        })(),
        _city: a.city,
        _dept: a.departement_name,
      }))
    ),
    fetchOrCache(
      "small_missions_entraide_v1", cache,
      null, // contenu et dates dépendent du temps : relue à chaque build
      () => readAll("public_small_missions:entraide", "public_small_missions",
        "id, slug, description, status, mission_type, date_needed, end_date, created_at", "id",
        q => q.eq("status", "open").not("slug", "is", null).neq("category", "projet")),
      rows => rows.filter(m => isIndexableEntraideMission(m, today)).map(m => ({
        loc: `/petites-missions/${m.slug}`,
        lastmod: null, // vue sans updated_at : omis
        changefreq: "weekly",
        priority: "0.5",
      }))
    ),
    // Projets participatifs sous /projets/{slug}. Clé d'invalidation nulle
    // volontaire : rechargement à chaque build, pour qu'un changement de
    // catégorie, de statut ou de date ne laisse jamais une ancienne URL.
    fetchOrCache(
      "small_missions_projets_v1", cache,
      null,
      () => readAll("public_small_missions:projet", "public_small_missions",
        "id, slug, description, status, category, date_needed, end_date, created_at", "id",
        q => q.eq("category", "projet").eq("status", "open").not("slug", "is", null)),
      rows => rows.filter(m => isIndexableProjetMission(m, today)).map(m => ({
        loc: `/projets/${m.slug}`,
        lastmod: null, // vue sans updated_at : omis
        changefreq: "weekly",
        priority: "0.5",
      }))
    ),
  ]);





  return { articles, seoCity, guides, depts, breeds, profiles, sits, associations, entraideMissions, projetMissions };
}
