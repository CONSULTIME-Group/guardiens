/**
 * Lot perf 3 (14/10/2026) : les annonces de /annonces lues dès la lecture du
 * HTML, pour un visiteur.
 *
 * Mesure du 14/10/2026 sur mobile ralenti : les lectures des annonces ne
 * partaient qu'après le téléchargement et l'exécution de tout le code de la
 * page (4,9 s), puis deux salves de lectures (1,5 s) précédaient la première
 * carte. Un petit script en ligne lance ces mêmes lectures, avec la même clé
 * publique, pendant que le code se télécharge ; la recherche (SearchSitter,
 * loadSitBase par src/lib/listingsPrefetch.ts) reprend leurs réponses.
 *
 * Seulement : adresse /annonces, aucune date dans l'adresse (les dates
 * filtrent la lecture), aucun jeton de session (un membre lit avec ses
 * droits), au plus 150 propriétaires et logements, aucune lecture à 1 000
 * lignes (pagination). Sinon rien n'est lancé ou la réponse vaut null, et la
 * recherche lit comme avant. Les lectures sont recopiées de loadSitBase,
 * parité verrouillée par src/__tests__/perf3/.
 */
const clean = (s) => s.replace(/\s+/g, "");

export const PREFETCH_GLOBAL = "__GUARDIENS_LISTINGS__";
export const PREFETCH_MAX_IDS = 150;
export const PREFETCH_PAGE = 1000;

/** Lectures de loadSitBase pour un visiteur sans dates (mêmes colonnes, filtres et ordres). */
export const LISTINGS_PREFETCH_SPEC = {
  open: {
    table: "sits",
    select: "id, user_id, property_id, title, slug, status, city, country, departement_code, start_date, end_date, created_at, unpublished_at, environments, is_urgent, cover_photo_url, accepting_applications, max_applications, property:properties!sits_property_id_fkey(type, environment, photos, cover_photo_url)",
    query: "or=(status.eq.published)&order=created_at.desc,id.asc",
  },
  closed: {
    table: "public_closed_sits",
    select: "id, user_id, title, slug, status, city, country, departement_code, cover_photo_url",
    query: "order=id.asc",
  },
  owners: { table: "public_profiles", select: "id, first_name, avatar_url, city, postal_code, departement_code, country, identity_verified, is_founder, latitude_approx, longitude_approx", key: "id", ids: "owner", query: "order=id.asc" },
  gallery: { table: "owner_gallery", select: "id, user_id, photo_url, position, category", key: "user_id", ids: "owner", query: "order=id.asc" },
  pets: { table: "public_pets", select: "id, species, name, special_needs, property_id", key: "property_id", ids: "property", query: "order=id.asc" },
  reviews: { table: "reviews", select: "id, overall_rating, reviewee_id", key: "reviewee_id", ids: "owner", query: "published=eq.true&order=id.asc" },
  badges: { table: "public_badge_attributions", select: "id, badge_id, user_id", key: "user_id", ids: "owner", query: "order=id.asc" },
  ownerProfs: { table: "public_owner_profiles", select: "user_id, environments, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected", key: "user_id", ids: "owner", query: "order=user_id.asc" },
};

const SECOND_WAVE = ["owners", "gallery", "pets", "reviews", "badges", "ownerProfs"];

export function listingsPrefetchScript(supabaseUrl, anonKey, bootSrc = null) {
  if (!supabaseUrl || !anonKey) return "";
  const spec = LISTINGS_PREFETCH_SPEC;
  const page = `&offset=0&limit=${PREFETCH_PAGE}`;
  const first = (k) => `${spec[k].table}?select=${clean(spec[k].select)}&${spec[k].query}${page}`;
  const second = SECOND_WAVE.map((k) => [k, spec[k].table, clean(spec[k].select), spec[k].key, spec[k].ids, spec[k].query]);
  const cfg = {
    u: supabaseUrl.replace(/\/+$/, ""),
    k: anonKey,
    o: first("open"),
    c: first("closed"),
    s: second,
    m: PREFETCH_MAX_IDS,
    n: PREFETCH_PAGE,
    pg: page,
    b: bootSrc,
  };
  // ES5, tout en try/catch : un navigateur sans fetch ou sans stockage ne lance rien.
  return `<script data-listings-prefetch>(function(){try{
var C=${JSON.stringify(cfg)};
if(!/^\\/annonces\\/?$/.test(location.pathname))return;
if(/[?&](debut|fin)=/.test(location.search))return;
try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||"";if(k.indexOf("sb-")===0&&/-auth-token$/.test(k))return;}}catch(e){return;}
if(!window.fetch||!window.Promise)return;
var H={apikey:C.k,Authorization:"Bearer "+C.k,Accept:"application/json"};
var get=function(p){return fetch(C.u+"/rest/v1/"+p,{headers:H}).then(function(r){if(!r.ok)throw new Error("http");return r.json();}).then(function(d){if(!(d instanceof Array)||d.length>=C.n)throw new Error("rows");return d;});};
var uniq=function(a){var s={},o=[];for(var i=0;i<a.length;i++){var v=a[i];if(v&&!s[v]){s[v]=1;o.push(v);}}return o;};
var p=Promise.all([get(C.o),get(C.c)]).then(function(r){
var items=r[0].concat(r[1]);
var ids={owner:uniq(items.map(function(x){return x.user_id;})),property:uniq(items.map(function(x){return x.property_id;}))};
if(ids.owner.length>C.m||ids.property.length>C.m)return null;
return Promise.all(C.s.map(function(w){var l=ids[w[4]];if(!l.length)return [];return get(w[1]+"?select="+w[2]+"&"+w[3]+"=in.("+l.join(",")+")&"+w[5]+C.pg);})).then(function(x){
var out={open:r[0],closed:r[1]};for(var j=0;j<C.s.length;j++)out[C.s[j][0]]=x[j];return out;});
})["catch"](function(){return null;});
window.${PREFETCH_GLOBAL}={at:Date.now(),p:p};
if(C.b){var b=document.createElement("script");b.src=C.b;b.async=true;b.fetchPriority="high";document.head.appendChild(b);}
}catch(e){}})();</script>`;
}


/**
 * Lot perf 5 : fiche publique d'une annonce (/annonces/:slug) lue dès le HTML
 * pour un visiteur, mêmes lectures que PublicSitDetail (parité verrouillée
 * par src/__tests__/perf5/), reprises une fois par takeSitPrefetch
 * (src/lib/sitPrefetch.ts).
 */
export const SIT_PREFETCH_GLOBAL = "__GUARDIENS_SIT__";
export const SIT_PREFETCH_SPEC = {
  owner: { table: "public_profiles", select: "id, first_name, city, postal_code, avatar_url, identity_verified, bio, completed_sits_count, is_founder", by: "id", from: "user_id", query: "limit=1" },
  property: { table: "properties", select: "*", by: "id", from: "property_id", query: "limit=1" },
  reviews: { rpc: "public_profile_reviews", arg: "p_user_id", from: "user_id" },
  badges: { table: "public_badge_attributions", select: "badge_id", by: "user_id", from: "user_id", query: "" },
  gallery: { table: "owner_gallery", select: "photo_url, position, width, height", by: "user_id", from: "user_id", query: "order=position.asc" },
  pets: { table: "public_pets", select: "*", by: "property_id", from: "property_id", query: "" },
  ownerProfile: { table: "public_owner_profiles", select: "presence_expected, welcome_notes, environments, preferred_sitter_types, home_ambiance, languages, interests, life_pace", by: "user_id", from: "user_id", query: "limit=2" },
  houseGuide: { table: "house_guides", select: "id", by: "property_id", from: "property_id", query: "limit=2" },
};

export function sitPrefetchScript(supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey) return "";
  const w = Object.entries(SIT_PREFETCH_SPEC).map(([k, v]) => v.rpc ? [k, 1, v.rpc, v.arg, v.from] : [k, 0, v.table, clean(v.select), v.by, v.from, v.query]);
  const cfg = { u: supabaseUrl.replace(/\/+$/, ""), k: anonKey, w };
  return `<script data-sit-prefetch>(function(){try{
var C=${JSON.stringify(cfg)};
var m=location.pathname.match(/^\\/annonces\\/([^\\/]+)\\/?$/);
if(!m||m[1]==="international"||m[1]==="demo")return;
try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||"";if(k.indexOf("sb-")===0&&/-auth-token$/.test(k))return;}}catch(e){return;}
if(!window.fetch||!window.Promise)return;
var param=decodeURIComponent(m[1]);
var H={apikey:C.k,Authorization:"Bearer "+C.k,Accept:"application/json","Content-Type":"application/json"};
var ok=function(r){if(!r.ok)throw new Error("http");return r.json();};
var rpc=function(f,b){return fetch(C.u+"/rest/v1/rpc/"+f,{method:"POST",headers:H,body:JSON.stringify(b)}).then(ok);};
var get=function(p){return fetch(C.u+"/rest/v1/"+p,{headers:H}).then(ok);};
var p=rpc("get_public_sit",{p_param:param}).then(function(rows){
if(!(rows instanceof Array))throw new Error("rows");
var s=rows[0];if(!s)return {sit:rows};
return Promise.all(C.w.map(function(x){var v=s[x[x[1]?4:5]];
if(x[1]){var b={};b[x[3]]=v;return v?rpc(x[2],b):[];}
if(!v)return [];return get(x[2]+"?select="+x[3]+"&"+x[4]+"=eq."+encodeURIComponent(v)+(x[6]?"&"+x[6]:""));})).then(function(r){
var out={sit:rows};for(var j=0;j<C.w.length;j++)out[C.w[j][0]]=r[j];return out;});
})["catch"](function(){return null;});
window.${SIT_PREFETCH_GLOBAL}={at:Date.now(),param:param,p:p};
}catch(e){}})();</script>`;
}

/** Textes du haut de /annonces, tirés du dictionnaire (mêmes clés que PublicListings). */
export function bootTexts(dict) {
  const p = dict.public_listings, s = dict.search_results;
  return {
    h1: p.h1,
    subtitle: p.subtitle_short,
    eyebrow: p.eyebrow,
    eyebrowStatsOne: p.eyebrow_stats_one,
    eyebrowStatsOther: p.eyebrow_stats_other,
    citiesOne: p.cities_count_one,
    citiesOther: p.cities_count_other,
    allFrance: p.all_france,
    seeAlsoMissions: p.see_also_missions,
    localGuides: p.local_guides,
    pricing: p.pricing,
    intlOne: p.intl_count_one,
    intlOther: p.intl_count_other,
    groupAvailable: s.group_available,
  };
}

/**
 * Lot perf 4 : premier affichage de /annonces (src/boot/bootListingsEntry.ts)
 * empaqueté seul, fichier haché sous assets/, chargé par le script en ligne.
 */
export async function buildBootListings(root) {
  const { build } = await import("esbuild");
  const { readFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const path = await import("node:path");
  const dict = JSON.parse(readFileSync(path.join(root, "src/i18n/locales/fr/common.json"), "utf8"));
  const out = await build({
    entryPoints: [path.join(root, "src/boot/bootListingsEntry.ts")],
    bundle: true,
    write: false,
    minify: true,
    format: "iife",
    target: ["es2019"],
    platform: "browser",
    tsconfig: path.join(root, "tsconfig.app.json"),
    define: { __BOOT_TEXTS__: JSON.stringify(bootTexts(dict)) },
    legalComments: "none",
  });
  const code = out.outputFiles[0].text;
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 10);
  return { code, fileName: `assets/boot-listings-${hash}.js` };
}

/** Premier affichage en ligne, après le script des lectures ; « </ » neutralisé. */
export function bootInlineScript(boot) {
  if (!boot?.code) return "";
  return `<script data-boot-listings>${boot.code.replace(/<\//g, "<\\/")}</script>`;
}

export function listingsPrefetchPlugin() {
  let env = {};
  let root = process.cwd();
  let boot = null;
  return {
    name: "perf3-listings-prefetch",
    apply: "build",
    configResolved(cfg) { env = cfg.env || {}; root = cfg.root || root; },
    async buildStart() {
      boot = await buildBootListings(root);
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        // Lot perf 5 : le premier affichage est écrit dans la page (environ
        // 7 Ko compressés sur chaque page), il ne dépend plus d'un fichier qui
        // partageait le réseau avec le code (2,2 s sur mobile ralenti en
        // production le 15/10/2026, 0,6 s une fois en ligne).
        const script = listingsPrefetchScript(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, null);
        if (!script) return html;
        const at = html.indexOf('<script type="module"');
        if (at === -1) throw new Error("[perf3-listings-prefetch] script d'entrée introuvable");
        // Avant le script d'entrée : les lectures partent pendant son téléchargement.
        const sit = sitPrefetchScript(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY).replace(/\n/g, "");
        return html.slice(0, at) + script.replace(/\n/g, "") + "\n    " + sit + "\n    " + bootInlineScript(boot) + "\n    " + html.slice(at);
      },
    },
  };
}
