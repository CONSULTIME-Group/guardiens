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

export function listingsPrefetchScript(supabaseUrl, anonKey) {
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
}catch(e){}})();</script>`;
}

export function listingsPrefetchPlugin() {
  let env = {};
  return {
    name: "perf3-listings-prefetch",
    apply: "build",
    configResolved(cfg) { env = cfg.env || {}; },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const script = listingsPrefetchScript(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
        if (!script) return html;
        const at = html.indexOf('<script type="module"');
        if (at === -1) throw new Error("[perf3-listings-prefetch] script d'entrée introuvable");
        // Avant le script d'entrée : les lectures partent pendant son téléchargement.
        return html.slice(0, at) + script.replace(/\n/g, "") + "\n    " + html.slice(at);
      },
    },
  };
}
