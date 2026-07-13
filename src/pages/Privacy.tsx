import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Politique de confidentialité | Guardiens"
        description="Comment Guardiens protège vos données personnelles : collecte, conservation, sous-traitants, cookies et exercice de vos droits RGPD."
        path="/confidentialite"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground mb-8">Version 3, dernière mise à jour : 13 juillet 2026</p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            La présente Politique de confidentialité décrit les modalités de collecte, d'utilisation, de conservation et de protection des données personnelles des utilisateurs de la plateforme Guardiens (<a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>). Elle s'applique conjointement aux <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>, dont elle fait partie intégrante.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Responsable du traitement</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
            <li><strong className="text-foreground">SIRET</strong> : 894 864 040 00015</li>
            <li><strong className="text-foreground">Contact général</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Point de contact protection des données</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a></li>
          </ul>
          <p>
            Conformément à l'article 37 du RGPD, la désignation d'un Délégué à la Protection des Données au sens formel du Règlement n'est pas obligatoire compte tenu de la taille de la structure. Les missions équivalentes sont assurées par le responsable du traitement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Données collectées</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">3.1 Identification</strong> : nom, prénom, email, mot de passe haché (bcrypt).</li>
            <li><strong className="text-foreground">3.2 Profil</strong> : photo, biographie, ville, code postal, rôle, préférences, mode de vie, photos de logement et d'animaux.</li>
            <li><strong className="text-foreground">3.3 Animaux et propriétés</strong> : espèce, race, âge, caractère, type de logement, surface, équipements.</li>
            <li><strong className="text-foreground">3.4 Communication</strong> : messages internes, candidatures, avis, écussons.</li>
            <li><strong className="text-foreground">3.5 Géolocalisation</strong> : coordonnées approximatives via code postal, adresse précise uniquement après confirmation d'une garde.</li>
            <li><strong className="text-foreground">3.6 Paiement</strong> : aucune donnée bancaire complète conservée, traitement délégué à Stripe Payments Europe Limited (Dublin).</li>
            <li><strong className="text-foreground">3.7 Technique</strong> : IP, navigateur, système d'exploitation, logs, pages visitées (sous consentement).</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Finalités et bases légales (art. 6 RGPD)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Création et gestion du compte : exécution du contrat (art. 6.1.b)</li>
            <li>Mise en relation propriétaires/gardiens : exécution du contrat</li>
            <li>Messagerie interne : exécution du contrat</li>
            <li>Notifications transactionnelles : exécution du contrat</li>
            <li>Notifications marketing : consentement (art. 6.1.a)</li>
            <li>Mesure d'audience : consentement</li>
            <li>Modération et lutte contre la fraude : intérêt légitime (art. 6.1.f)</li>
            <li>Amélioration du service, statistiques anonymisées : intérêt légitime</li>
            <li>Obligations comptables et fiscales : obligation légale (art. 6.1.c)</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Données de compte actif : durée de l'inscription</li>
            <li>Données après suppression : effacement sous 7 jours, sauf obligations légales</li>
            <li>Messages : durée du compte, anonymisés à la suppression</li>
            <li>Avis publiés : anonymisés après suppression du compte (intérêt légitime)</li>
            <li>Logs de connexion : 12 mois (art. L. 34-1 CPCE)</li>
            <li>Facturation : 10 ans (art. L. 123-22 C. com.)</li>
            <li>Cookies de mesure d'audience : 13 mois maximum</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Sous-traitants et destinataires</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Supabase Inc.</strong> : hébergement BDD, authentification, stockage. Localisation Union européenne (Francfort, Allemagne). Aucun transfert hors UE.</li>
            <li><strong className="text-foreground">Cloudflare Ireland Limited</strong> : DNS, CDN, protection anti-DDoS. Entité contractante Union européenne (Dublin). Réseau technique mondial encadré par SCC UE + EU-US Data Privacy Framework.</li>
            <li><strong className="text-foreground">Stripe Payments Europe Ltd.</strong> : traitement des paiements. Union européenne (Dublin).</li>
            <li><strong className="text-foreground">Lovable Labs Incorporated</strong> : interface de développement et déploiement. Société d'origine suédoise, représentant UE Lovable Labs AB (Stockholm). Clauses contractuelles types (SCC) Module 2, décision UE 2021/914.</li>
            <li><strong className="text-foreground">Resend Inc.</strong> : envoi d'emails transactionnels. États-Unis. SCC UE + EU-US Data Privacy Framework.</li>
            <li><strong className="text-foreground">Prerender LLC</strong> : pré-rendu SEO. États-Unis. SCC UE + EU-US Data Privacy Framework.</li>
            <li><strong className="text-foreground">Google LLC</strong> (via Google Ireland Ltd.) : mesure d'audience Google Analytics 4, uniquement sous consentement. Union européenne (Dublin), transferts US encadrés SCC UE + EU-US Data Privacy Framework.</li>
          </ul>
          <p>
            <strong className="text-foreground">Aucune donnée n'est vendue à des tiers.</strong> Les données ne sont communiquées à des autorités publiques qu'en cas de réquisition légale.
          </p>
          <p>
            <strong className="text-foreground">Opt-out spécifique Lovable</strong> : Guardiens a notifié par écrit à Lovable Labs Incorporated son opposition à l'utilisation des données de ses utilisateurs pour l'entraînement de modèles d'intelligence artificielle.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Transferts hors Union européenne</h2>
          <p>
            La majorité des données sont hébergées au sein de l'Union européenne. Certains sous-traitants secondaires (Resend, Prerender, Google Analytics) sont susceptibles de traiter les données depuis les États-Unis. Ces transferts sont encadrés par le EU-US Data Privacy Framework (décision UE 2023/1795) ou par les clauses contractuelles types Module 2 (décision UE 2021/914). Ces mécanismes garantissent un niveau de protection équivalent au RGPD.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Vos droits (art. 15 à 22 RGPD)</h2>
          <p>
            Droit d'accès, de rectification, à l'effacement, à la limitation, à la portabilité, d'opposition, retrait du consentement à tout moment, directives post-mortem (art. 85 LIL).
          </p>
          <p>
            <strong className="text-foreground">Exercice</strong> : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a>. Délai de réponse : 30 jours, prolongeable à 60 jours pour les demandes complexes.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Cookies et traceurs</h2>
          <p>
            <strong className="text-foreground">Cookies strictement nécessaires</strong> (sans consentement) : authentification Supabase, préférences d'affichage, sécurité anti-bot Cloudflare, identifiant technique Lovable.
          </p>
          <p>
            <strong className="text-foreground">Cookies de mesure d'audience</strong> (avec consentement) : Google Analytics 4, anonymisation IP activée, refus aussi simple que l'acceptation, retrait possible via "Gérer mes cookies" dans le pied de page.
          </p>
          <p>
            Aucun cookie publicitaire, aucun cookie de retargeting. Détail complet sur la page <a href="/cookies" className="text-primary hover:underline">/cookies</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Sécurité</h2>
          <p>
            Chiffrement HTTPS/TLS 1.3, mots de passe bcrypt, Row Level Security Supabase, authentification à deux facteurs admin, accès restreint prod, journalisation, sauvegardes chiffrées quotidiennes, audits réguliers.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Violation de données</h2>
          <p>
            Conformément aux articles 33 et 34 du RGPD : notification CNIL sous 72 heures, information directe des utilisateurs concernés en cas de risque élevé, registre interne des violations.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. AIPD</h2>
          <p>
            Une analyse d'impact relative à la protection des données a été réalisée compte tenu de la nature de certains traitements (géolocalisation, communications entre membres). Elle est mise à jour à chaque évolution majeure du service, notamment avant l'activation d'un modèle payant.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Mineurs</h2>
          <p>
            Plateforme strictement réservée aux personnes majeures (18 ans révolus). La création de compte par un mineur entraîne suppression immédiate. Interdiction de publier des photographies de mineurs identifiables sans consentement écrit des représentants légaux.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Modification</h2>
          <p>
            Toute modification substantielle est notifiée par email et sur la Plateforme 30 jours avant entrée en vigueur.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Réclamation CNIL</h2>
          <p>
            CNIL : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr/fr/plaintes</a>, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, tél. 01 53 73 22 22.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
