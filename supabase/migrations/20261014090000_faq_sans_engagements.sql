-- FAQ : retrait des engagements que Guardiens ne tient pas, et des
-- affirmations devenues fausses (audit du 14/10/2026).
-- 1. Assurance : la couverture d'un tiers logé dépend du contrat, jamais acquise.
-- 2. Annulation : le réseau de gardiens d'urgence est « bientôt disponible ».
-- 3. Vérification d'identité : signal de tri depuis le 21/08/2026, jamais un filtre.
-- 4. Documents : effacement 30 jours après la décision, aucun délai promis.

UPDATE public.faq_entries
SET question = $q$Qui assure la maison pendant une garde ?$q$,
    answer = $a$Guardiens met en relation des particuliers : la garde se conclut entre vous, et chacun reste couvert par ses propres contrats.

Avant une garde, le propriétaire vérifie auprès de son assureur que son contrat multirisque habitation couvre la présence d'une personne logée à titre gratuit, et demande une extension si besoin. Le gardien vérifie de son côté sa responsabilité civile.

Guardiens met à votre disposition la vérification d'identité facultative signalée par un écusson, les avis croisés après chaque garde, la messagerie pour tout caler par écrit, et l'accord de garde, à remplir ensemble si vous le souhaitez.$a$
WHERE id = 'c8ce280f-478d-4b57-9971-b468b524dec9';

UPDATE public.faq_entries
SET answer = $a$Le propriétaire garde la main pour retrouver un gardien rapidement : il peut republier son annonce, relancer les candidats qui avaient postulé, et inviter les gardiens à proximité depuis son tableau de bord.

Les avis croisés publiés après chaque garde aident à choisir un gardien fiable.

Le réseau des [gardiens d'urgence](/gardien-urgence) est en préparation : des gardiens expérimentés, alertés en priorité quand une garde se libère.

Pour préparer votre garde : [Que faire si quelque chose se passe mal](/actualites/gerer-imprevu-pendant-garde)$a$
WHERE id = 'ada4b38c-2e73-4801-a6be-79fc66859a45';

UPDATE public.faq_entries
SET answer = $a$La vérification d'identité est facultative, et toutes les fonctionnalités restent ouvertes sans elle.

Elle affiche l'écusson « Identité vérifiée » partout où votre profil apparaît (résultats de recherche, carte de candidature, en-tête de profil) et fait passer l'anneau de confiance autour de votre photo au niveau « Vérifié ». C'est aussi un signal de confiance pris en compte dans l'ordre des profils suggérés aux propriétaires.

Pour décrocher vos premières gardes, c'est une bonne étape après avoir complété votre profil. Notre guide [créer un profil gardien attractif](/actualites/creer-profil-gardien-attractif) détaille les étapes dans l'ordre.$a$
WHERE id = '0b2c6df9-26c8-4f1c-ab27-b55388c3b712';

UPDATE public.faq_entries
SET answer = $a$Vos documents servent uniquement à la vérification d'identité. Ils sont analysés automatiquement puis, si besoin, relus par l'équipe Guardiens, et effacés automatiquement 30 jours après la décision de vérification.

Vous pouvez demander leur suppression plus tôt, à tout moment et indépendamment de votre compte, via la page [contact](/contact).

Votre profil public affiche seulement l'écusson « Identité vérifiée », qui confirme que la vérification a eu lieu.$a$
WHERE id = 'f5821dc2-1764-4c24-acf0-bde2c4d5f07b';
