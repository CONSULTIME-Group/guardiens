// Test en lecture seule : admin_menu_badges() refuse tout appel non admin.
// Appel anonyme (clé publique) : aucune écriture, aucun envoi.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) { console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY manquants"); process.exit(1); }

const res = await fetch(`${url}/rest/v1/rpc/admin_menu_badges`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: "{}",
});
const body = await res.text();
if (res.ok) { console.error("ÉCHEC : appel non admin accepté", res.status, body); process.exit(1); }
console.log(`OK : appel non admin refusé (HTTP ${res.status}) ${body.slice(0, 160)}`);
