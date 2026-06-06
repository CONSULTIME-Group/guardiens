import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BUILD_ID, BUILD_TIME, BUILD_MODE, getCurrentBundleHash } from "@/lib/buildInfo";

/**
 * /admin/build-info, Affiche le BUILD_ID + date du dernier build figés
 * dans le bundle au moment de la compilation, ainsi que le hash du fichier
 * /assets/index-XXXX.js réellement servi par le navigateur. Permet de
 * confirmer en un coup d'œil que le nouveau bundle est bien en prod après
 * un "Publish".
 */
export default function BuildInfo() {
  const [bundleHash, setBundleHash] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    setBundleHash(getCurrentBundleHash());
    const i = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(i);
  }, []);

  const buildDate = new Date(BUILD_TIME);
  const ageMs = Date.now() - buildDate.getTime();
  const ageMin = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMin / 60);
  const ageDays = Math.floor(ageHours / 24);
  const ageLabel =
    ageDays > 0 ? `${ageDays} j` : ageHours > 0 ? `${ageHours} h` : `${ageMin} min`;

  const rows: Array<{ k: string; v: string; mono?: boolean }> = [
    { k: "BUILD_ID", v: BUILD_ID, mono: true },
    { k: "BUILD_TIME (UTC)", v: BUILD_TIME, mono: true },
    { k: "BUILD_TIME (local)", v: buildDate.toLocaleString("fr-FR") },
    { k: "Âge du build", v: ageLabel },
    { k: "Mode", v: BUILD_MODE },
    { k: "Bundle JS servi", v: bundleHash ? `index-${bundleHash}.js` : "(dev / non hashé)", mono: true },
    { k: "User-Agent", v: typeof navigator !== "undefined" ? navigator.userAgent : "," },
    { k: "URL courante", v: typeof location !== "undefined" ? location.href : ",", mono: true },
    { k: "Maintenant", v: now, mono: true },
  ];

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>Build info, Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-2">État du build frontend</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Page de diagnostic, confirme que le bundle servi correspond bien au
        dernier déploiement. Recharger ({" "}
        <kbd className="px-1.5 py-0.5 border rounded text-xs">Ctrl+Shift+R</kbd>
        ) si une valeur semble obsolète.
      </p>

      <div className="rounded-lg border bg-card divide-y">
        {rows.map((r) => (
          <div key={r.k} className="flex items-start gap-4 px-4 py-3">
            <div className="w-44 shrink-0 text-sm text-muted-foreground">{r.k}</div>
            <div
              className={
                "flex-1 text-sm break-all " +
                (r.mono ? "font-mono" : "")
              }
            >
              {r.v}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const data = Object.fromEntries(rows.map((r) => [r.k, r.v]));
            navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
          }}
          className="text-sm rounded-md border px-3 py-1.5 hover:bg-accent"
        >
          Copier en JSON
        </button>
        <button
          type="button"
          onClick={() => location.reload()}
          className="text-sm rounded-md border px-3 py-1.5 hover:bg-accent"
        >
          Recharger
        </button>
      </div>
    </main>
  );
}
