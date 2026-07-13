import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const ESSENTIAL_COOKIES: Array<{ name: string; issuer: string; purpose: string; duration: string }> = [
  { name: "sb-access-token", issuer: "Supabase", purpose: "Authentification de session", duration: "1 heure" },
  { name: "sb-refresh-token", issuer: "Supabase", purpose: "Renouvellement de session", duration: "7 jours" },
  { name: "__cf_bm", issuer: "Cloudflare", purpose: "Protection anti-bot", duration: "30 minutes" },
  { name: "cf_clearance", issuer: "Cloudflare", purpose: "Vérification challenge", duration: "30 jours" },
  { name: "__lovable_anonymous_id", issuer: "Lovable", purpose: "Identifiant technique anonyme pour le fonctionnement de l'interface", duration: "Session" },
  { name: "guardiens_lang", issuer: "Guardiens", purpose: "Préférence de langue", duration: "12 mois" },
  { name: "guardiens_cookie_consent_v1", issuer: "Guardiens", purpose: "Mémorisation du choix cookies", duration: "6 mois" },
];

const ANALYTICS_COOKIES: Array<{ name: string; issuer: string; purpose: string; duration: string }> = [
  { name: "_ga", issuer: "Google Analytics 4", purpose: "Identification anonyme du visiteur", duration: "13 mois" },
  { name: "_ga_XXXXX", issuer: "Google Analytics 4", purpose: "État de session", duration: "13 mois" },
];

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Politique cookies | Guardiens"
        description="Politique cookies Guardiens : cookies strictement nécessaires, mesure d'audience sous consentement, absence de cookies publicitaires."
        path="/cookies"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Politique cookies</h1>
        <p className="text-sm text-muted-foreground mb-8">Version 1, dernière mise à jour : 13 juillet 2026</p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Qu'est-ce qu'un cookie ?</h2>
          <p>
            Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lorsque vous consultez un site web. Il permet au site de reconnaître votre navigateur et de conserver certaines informations utiles à votre navigation.
          </p>
          <p>
            Certains cookies sont indispensables au fonctionnement du site. D'autres, comme les cookies de mesure d'audience, sont soumis à votre consentement préalable.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Cookies utilisés par Guardiens</h2>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">2.1 Cookies strictement nécessaires (sans consentement)</h3>
          <div className="not-prose overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Émetteur</TableHead>
                  <TableHead>Finalité</TableHead>
                  <TableHead>Durée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ESSENTIAL_COOKIES.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-mono text-xs">{c.name}</TableCell>
                    <TableCell>{c.issuer}</TableCell>
                    <TableCell>{c.purpose}</TableCell>
                    <TableCell>{c.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">2.2 Cookies de mesure d'audience (avec consentement)</h3>
          <div className="not-prose overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Émetteur</TableHead>
                  <TableHead>Finalité</TableHead>
                  <TableHead>Durée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ANALYTICS_COOKIES.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-mono text-xs">{c.name}</TableCell>
                    <TableCell>{c.issuer}</TableCell>
                    <TableCell>{c.purpose}</TableCell>
                    <TableCell>{c.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p>
            Ces cookies ne sont déposés qu'après recueil de votre consentement explicite via le bandeau affiché à votre première visite. Anonymisation IP activée. Aucun partage à des fins publicitaires.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Gérer votre consentement</h2>
          <p>Vous pouvez à tout moment modifier votre choix par les moyens suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cliquer sur "Gérer mes cookies" dans le pied de page du site</li>
            <li>Modifier les préférences de votre navigateur</li>
            <li>Activer le signal Global Privacy Control (GPC) que Guardiens respecte</li>
          </ul>
          <p>
            Le refus des cookies de mesure d'audience n'affecte pas votre expérience de navigation ni l'accès à l'ensemble des fonctionnalités du service.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Cookies publicitaires</h2>
          <p>
            Guardiens n'utilise aucun cookie publicitaire, aucun cookie de retargeting, aucun cookie de profilage commercial. Aucune donnée personnelle n'est vendue ni partagée à des fins publicitaires.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Contact</h2>
          <p>
            Pour toute question relative aux cookies : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a>.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Cookies;
