
-- Combien coûte l'accès gardien ?
UPDATE public.faq_entries SET answer = $$Trois formules sont disponibles — choisissez celle qui correspond à votre rythme.

**Accès un mois — 12 €**
Paiement immédiat, aucun renouvellement automatique. Idéal pour découvrir la plateforme avant de vous engager sur la durée.

**Mensuel — 6,99 €/mois**
7 jours d'essai offerts — aucun débit avant le 8ᵉ jour. Annulez quand vous voulez, sans frais ni justification.

**Formule 2026 — tarif réduit (5,59 €/mois équivalent)**
Un paiement unique calculé sur les mois restants jusqu'au 31 décembre 2026, avec 20 % de remise sur le tarif mensuel. Aucun renouvellement automatique en 2027.

Jusqu'au 14 juillet 2026, l'accès gardien est offert à toutes et tous — aucun paiement requis. À partir du 15 juillet 2026, l'une de ces trois formules devient nécessaire pour postuler aux gardes.

Les propriétaires accèdent à Guardiens gratuitement. Aucune commission sur les gardes — l'échange entre gardien et propriétaire se décide entre eux.

Comparer les formules : [page tarifs](/tarifs)$$, updated_at = now()
WHERE id = 'fa66ab85-fe69-49b5-87e0-dba9741b268f';

-- Y a-t-il une période d'essai ?
UPDATE public.faq_entries SET answer = $$Oui, sur l'abonnement mensuel à 6,99 €/mois uniquement.

7 jours d'essai offerts. Votre carte bancaire est enregistrée, mais aucun débit n'est effectué pendant ces 7 jours. Annulez avant le 8ᵉ jour : aucun frais, aucune condition.

Les deux autres formules — accès un mois (12 €) et formule 2026 — sont des paiements immédiats sans période d'essai. Elles sont non remboursables une fois activées.

À noter : jusqu'au 14 juillet 2026, l'accès gardien est entièrement gratuit pour toutes et tous, sans carte bancaire. L'essai 7 jours s'applique à partir du 15 juillet 2026.

Si vous hésitez entre les formules, la page [tarifs](/tarifs) détaille les différences.$$, updated_at = now()
WHERE id = '9c55da82-ae0d-48e9-bada-7f4302a231a3';

-- Puis-je annuler mon abonnement à tout moment ?
UPDATE public.faq_entries SET answer = $$Oui, sur l'abonnement mensuel à 6,99 €/mois.

Annulez depuis votre espace abonnement en quelques clics — aucune condition, aucun préavis, aucun frais. Votre accès reste actif jusqu'à la fin de la période en cours, puis s'arrête. Aucun débit supplémentaire.

Les formules accès un mois (12 €) et formule 2026 sont des paiements ponctuels — rien à résilier, elles s'arrêtent automatiquement à leur terme.$$, updated_at = now()
WHERE id = '7aa32f60-6145-4b70-89b5-0e03c415197b';

-- Que se passe-t-il à la fin d'un accès un mois ?
UPDATE public.faq_entries SET answer = $$L'accès s'arrête au terme des 30 jours — aucun débit automatique, aucune surprise.

Votre profil, vos avis et votre historique sont conservés. Vous pouvez choisir une nouvelle formule depuis votre espace abonnement quand vous le souhaitez : mensuel à 6,99 €/mois avec 7 jours d'essai, ou formule 2026 si elle est encore disponible.

Si vous avez des gardes en cours au moment de l'expiration, elles ne sont pas interrompues — elles vont jusqu'à leur terme normalement.$$, updated_at = now()
WHERE id = '2dd854e3-fce1-4f40-b67b-fb8149e28ecb';

-- Y a-t-il des frais cachés ?
UPDATE public.faq_entries SET answer = $$Non. Le modèle est simple par conviction, pas par hasard.

L'accès gardien : 6,99 €/mois, 12 € pour un mois, ou la formule 2026 à −20 % (5,59 €/mois équivalent). L'accès propriétaire : gratuit. Aucune commission prélevée sur les gardes — l'échange entre les deux parties se décide entre eux, sans que Guardiens ne touche quoi que ce soit.

Pas d'assurance obligatoire. Pas de frais de mise en relation. Pas de booking fee. Un prix. Transparent.

Et jusqu'au 14 juillet 2026, l'accès gardien est totalement offert : aucun paiement, aucune carte bancaire demandée.$$, updated_at = now()
WHERE id = 'c159e147-1178-4d85-a1a7-b0a4f7d3c7a8';

-- Pourquoi le 13 mai ? -> Pourquoi le 14 juillet 2026 ?
UPDATE public.faq_entries SET
  question = 'Pourquoi le 14 juillet 2026 ?',
  answer = $$Il fallait une date après plusieurs mois de gratuité — un repère simple, partagé par toutes et tous. Le **14 juillet 2026, fête nationale**, s'est imposé naturellement.

Jusqu'au 14 juillet 2026 inclus, **l'accès complet à Guardiens est gratuit pour toutes et tous** — gardiens comme propriétaires, sans carte bancaire. À partir du 15 juillet 2026, l'abonnement gardien à 6,99 €/mois devient nécessaire pour postuler aux gardes. L'espace propriétaire, lui, reste gratuit.

À ne pas confondre avec le **badge Fondateur** : il est attribué aux personnes inscrites **avant le 13 juillet 2026**, et reste affiché à vie sur leur profil — qu'elles s'abonnent ensuite ou non.$$,
  updated_at = now()
WHERE id = 'e1219f55-2e94-49ad-ba66-fce829a16583';

-- Que se passe-t-il quand mon accès gratuit expire ?
UPDATE public.faq_entries SET answer = $$Vous recevez un rappel par email avant la fin de votre accès gratuit, le 14 juillet 2026.

Rien ne démarre automatiquement. Vous choisissez une formule depuis votre espace abonnement quand vous êtes prêt : accès un mois à 12 €, mensuel à 6,99 €/mois avec 7 jours d'essai, ou formule 2026 à tarif réduit (5,59 €/mois équivalent).

Votre profil, vos avis, vos écussons et votre historique sont conservés intégralement — que vous souscriviez immédiatement ou dans quelques semaines. Les gardes en cours au moment de l'expiration ne sont pas interrompues.

Si vous êtes Fondateur (inscrit avant le 13 juillet 2026), votre badge Fondateur reste acquis à vie, quelle que soit la formule choisie ensuite.$$, updated_at = now()
WHERE id = 'e78d7af7-4876-4a57-a277-c462b2f90a95';

-- Je suis Fondateur — quand mon abonnement démarre-t-il ?
UPDATE public.faq_entries SET answer = $$Votre accès est gratuit jusqu'au 14 juillet 2026 inclus. Rien ne démarre avant.

Si vous souscrivez une formule avant le 14 juillet, elle démarre le 15 juillet — vous ne perdez pas un seul jour de votre période gratuite. Si vous attendez après le 14 juillet pour choisir, votre accès gardien s'interrompt temporairement jusqu'à la souscription (l'espace propriétaire, lui, reste gratuit).

Votre badge Fondateur reste affiché à vie sur votre profil, quelle que soit la formule choisie ensuite — et même si vous interrompez votre abonnement.

Un rappel par email vous sera envoyé avant le 14 juillet 2026.$$, updated_at = now()
WHERE id = '113dcc7a-b8fa-483c-8da3-bb2d4a9dfe6b';

-- Quelle zone géographique couvrez-vous ?
UPDATE public.faq_entries SET answer = $$Guardiens est ouvert partout en France. Vous pouvez créer une annonce ou un profil de gardien dans n'importe quelle commune — métropole, ville moyenne, village, bord de mer ou montagne.

Certains territoires bénéficient d'une communauté déjà active et de guides locaux dédiés : Lyon, Annecy et Grenoble notamment, où nos cofondateurs Jérémie et Elisa pratiquent le house-sitting depuis plusieurs années. Ailleurs, la communauté se construit jour après jour avec les nouveaux membres qui s'inscrivent.

Si vous êtes dans une zone encore peu peuplée, vos chances de trouver un gardien augmentent en élargissant le rayon de recherche et en publiant votre annonce suffisamment à l'avance.

Nos guides locaux : [Lyon](/actualites/parcs-chiens-lyon-guide-complet) · [Annecy](/actualites/parcs-balades-chiens-annecy-guide) · [Grenoble](/actualites/parcs-balades-chiens-grenoble-guide)$$, updated_at = now()
WHERE id = '46828aed-011a-41ac-8a14-2bf48f76caed';
