import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { declareInstalled, installPlatform, requestInstall } from "@/lib/pwa-install";
import { trackEvent } from "@/lib/analytics";

export default function InstallAppSection() {
  const { standalone, knownInstalled, canPrompt } = usePwaInstall();
  const { ios, mobile, embedded } = installPlatform();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void trackEvent("pwa_install_guide_viewed", { source: "settings" }); }, []);

  const install = async () => {
    setBusy(true);
    const outcome = await requestInstall();
    setBusy(false);
    setMessage(outcome === "accepted" ? "Demande acceptée. Suivez les indications de votre appareil."
      : outcome === "dismissed" ? "Vous pourrez réessayer depuis les paramètres."
      : "Installez l'application en suivant les étapes ci-dessous.");
  };

  return <section className="space-y-5" aria-labelledby="install-app-title">
    <div>
      <h2 id="install-app-title" className="font-heading text-xl font-semibold flex items-center gap-2"><Smartphone className="h-5 w-5" /> Installer Guardiens</h2>
      <p className="text-sm text-muted-foreground mt-2">Retrouvez vos échanges et vos gardes depuis une icône sur votre écran d'accueil.</p>
    </div>
    {standalone ? <p className="flex items-center gap-2 rounded-lg border bg-card p-4"><CheckCircle2 className="h-5 w-5 text-primary" /> Vous utilisez déjà Guardiens en mode application.</p> : <>
      {knownInstalled && <p className="text-sm text-muted-foreground">Une installation a déjà été détectée ou indiquée sur ce navigateur. Les rappels restent en pause. Les étapes restent disponibles si besoin.</p>}
      {canPrompt && !embedded && <Button onClick={install} disabled={busy}>{busy ? "Ouverture…" : "Installer Guardiens"}</Button>}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        {embedded ? <>
          <h3 className="font-semibold">Ouvrez Guardiens dans votre navigateur</h3>
          <p className="text-sm">Depuis le menu de cette application, choisissez « Ouvrir dans le navigateur », ou ouvrez guardiens.fr dans Safari ou Chrome. Retrouvez ensuite cette rubrique dans les paramètres.</p>
        </> : ios ? <>
          <h3 className="font-semibold">Sur iPhone ou iPad</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Ouvrez le menu de partage de votre navigateur.</li>
            <li>Choisissez « Sur l'écran d'accueil » ou « Ajouter à l'écran d'accueil ».</li>
            <li>Si « Ouvrir comme app » apparaît, activez cette option, puis touchez « Ajouter ».</li>
          </ol>
          <p className="text-sm text-muted-foreground">Pour retrouver cette option, ouvrez guardiens.fr dans Safari et recommencez.</p>
        </> : mobile ? <>
          <h3 className="font-semibold">Sur Android</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Ouvrez le menu de votre navigateur, généralement en haut à droite.</li>
            <li>Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil », si cette option est proposée.</li>
            <li>Confirmez, puis retrouvez l'icône Guardiens sur votre téléphone.</li>
          </ol>
        </> : <>
          <h3 className="font-semibold">Sur votre téléphone</h3>
          <p className="text-sm">Ouvrez guardiens.fr sur votre téléphone, connectez-vous et retrouvez Paramètres → Installer Guardiens. Sur cet ordinateur, votre navigateur peut aussi proposer une installation dans son menu.</p>
        </>}
      </div>
      {!knownInstalled && mobile && <Button variant="outline" onClick={declareInstalled}>Je l'ai déjà installée</Button>}
    </>}
    <p role="status" className="text-sm">{message}</p>
    <p className="text-sm text-muted-foreground">Une connexion internet reste nécessaire. Les notifications s'activent séparément, dans la rubrique Notifications sur cet appareil.</p>
  </section>;
}
