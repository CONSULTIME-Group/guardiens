type AccordDeGardeData = {
  gardeId: string;
  dateDebut: string;
  dateFin: string;
  adresse: string;
  proprio: {
    prenom: string;
    telephone: string;
    plagesDisponibilite?: string;
  };
  gardien: {
    prenom: string;
  };
  animaux: Array<{
    prenom: string;
    espece: string;
    race?: string;
    age?: string;
  }>;
  reglesVie: {
    animauxPartout?: boolean | null;
    invites?: boolean | null;
    tabac?: boolean | null;
    autresPrecisions?: string | null;
  };
  voisinConfiance?: {
    prenom: string;
    telephone: string;
  } | null;
  urgences?: {
    vetNom?: string;
    vetTel?: string;
    vetAdresse?: string;
    urgences24h?: string;
  } | null;
  montantVetMax?: number | null;
  montantLogementMax?: number | null;
  estLongueDuree?: boolean;
  contributionCharges?: string | null;
};

interface AccordDeGardeProps {
  garde: AccordDeGardeData;
  onClose?: () => void;
}

function BoolDisplay({ value }: { value: boolean | null | undefined }) {
  if (value === true) return <span>Oui</span>;
  if (value === false) return <span>Non</span>;
  return <span className="italic text-muted-foreground">À confirmer</span>;
}

export default function AccordDeGarde({ garde, onClose }: AccordDeGardeProps) {
  const p = garde.proprio.prenom;
  const g = garde.gardien.prenom;

  return (
    <div className="max-w-2xl mx-auto bg-card border rounded-xl shadow-sm flex flex-col max-h-[90vh] overflow-hidden">
      {/* EN-TÊTE */}
      <div className="shrink-0 px-6 py-4 border-b flex items-start gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-lg">Notre accord de garde</p>
          <p className="text-sm text-muted-foreground">
            Garde du {garde.dateDebut} au {garde.dateFin} · {garde.adresse}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xl text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {/* CORPS */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {/* Intro */}
        <p className="italic text-sm text-muted-foreground">
          Ce document résume ce que {p} et {g} ont prévu ensemble. Il sert de référence commune si une question se pose pendant ou après la garde.
        </p>

        {/* Animaux */}
        <div>
          <p className="font-semibold text-sm mb-2">Les animaux concernés</p>
          {garde.animaux.map((a, i) => (
            <p key={i} className="text-sm">
              {a.prenom} · {a.espece}
              {a.race ? ` · ${a.race}` : ""}
              {a.age ? ` · ${a.age}` : ""}
            </p>
          ))}
          <p className="text-xs text-muted-foreground mt-1">
            La fiche complète de chaque animal se trouve dans le guide de la maison.
          </p>
        </div>

        {/* Gardien prend en charge */}
        <div>
          <p className="font-semibold text-sm mb-2">Ce que {g} prend en charge</p>
          <ul className="space-y-1">
            <li className="text-sm pl-3 border-l-2 border-primary/30">Prendre soin des animaux selon les habitudes décrites dans le guide de la maison, du premier au dernier jour.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Donner des nouvelles régulièrement — une photo ou un message court suffit.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Prévenir {p} sans attendre en cas d'imprévu — animal, logement, question.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Laisser le logement propre et en bon état au départ.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Ne pas donner accès au logement à une tierce personne sans accord explicite de {p}.</li>
          </ul>
        </div>

        {/* Proprio prend en charge */}
        <div>
          <p className="font-semibold text-sm mb-2">Ce que {p} prend en charge</p>
          <ul className="space-y-1">
            <li className="text-sm pl-3 border-l-2 border-primary/30">Transmettre un guide de la maison clair et complet avant le début de la garde.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Rester joignable. Si {g} a une question urgente, une réponse dans la journée est attendue.</li>
            <li className="text-sm pl-3 border-l-2 border-primary/30">Prévoir la nourriture et les fournitures nécessaires aux animaux.</li>
          </ul>
        </div>

        {/* Règles de vie */}
        <div>
          <p className="font-semibold text-sm mb-2">Règles de vie dans le logement</p>
          <p className="text-xs text-muted-foreground mb-3">
            Ces informations viennent du guide de la maison de {p}. Si un champ est vide, à confirmer directement avec {p} avant la garde.
          </p>
          <div className="flex justify-between border-b py-2 text-sm">
            <span>Animaux dans toutes les pièces</span>
            <BoolDisplay value={garde.reglesVie.animauxPartout} />
          </div>
          <div className="flex justify-between border-b py-2 text-sm">
            <span>Invités</span>
            <BoolDisplay value={garde.reglesVie.invites} />
          </div>
          <div className="flex justify-between border-b py-2 text-sm">
            <span>Tabac</span>
            <BoolDisplay value={garde.reglesVie.tabac} />
          </div>
          {garde.reglesVie.autresPrecisions != null && (
            <p className="text-sm mt-3">Autres précisions : {garde.reglesVie.autresPrecisions}</p>
          )}
        </div>

        {/* Animal malade */}
        <div>
          <p className="font-semibold text-sm mb-2">Si un animal ne va pas bien</p>
          <p className="text-sm mb-3">
            Même avec les meilleurs soins, ça arrive. Ce qui a été convenu ici évite d'avoir à improviser au mauvais moment.
          </p>
          <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
            <p>Joindre {p} en premier : {garde.proprio.telephone}</p>
            {garde.urgences?.vetNom ? (
              <p>Vétérinaire habituel : {garde.urgences.vetNom} · {garde.urgences.vetTel} · {garde.urgences.vetAdresse}</p>
            ) : (
              <p className="italic text-muted-foreground">Vétérinaire non renseigné — à compléter dans le guide.</p>
            )}
            {garde.urgences?.urgences24h && (
              <p>Urgences 24h/24 : {garde.urgences.urgences24h}</p>
            )}
          </div>
          {garde.montantVetMax != null ? (
            <p className="text-sm mt-3">
              {g} peut engager des soins jusqu'à {garde.montantVetMax}€ sans attendre. Au-delà, {g} tente de joindre {p} avant d'agir. Si {p} est injoignable et que l'état de l'animal l'exige, {g} agit dans l'intérêt de l'animal et conserve tous les justificatifs. Les frais sont remboursés par {p} sur présentation de la facture.
            </p>
          ) : (
            <p className="italic text-muted-foreground text-sm mt-3">
              Montant non renseigné — à convenir entre les parties. 150€ est une base courante.
            </p>
          )}
        </div>

        {/* Logement */}
        <div>
          <p className="font-semibold text-sm mb-2">Si quelque chose se passe dans le logement</p>
          <p className="text-sm">
            La première chose à faire est de prévenir {p}. {g} ne contacte aucun artisan sans accord préalable, sauf urgence manifeste — fuite d'eau active ou panne de chauffage en hiver.
          </p>
          {garde.montantLogementMax != null && (
            <p className="text-sm mt-2">
              Dans ce cas, {g} peut engager des frais jusqu'à {garde.montantLogementMax}€ et conserve tous les justificatifs pour remboursement.
            </p>
          )}
          {garde.voisinConfiance != null && (
            <p className="text-sm mt-2">
              Voisin de confiance : {garde.voisinConfiance.prenom} · {garde.voisinConfiance.telephone}
            </p>
          )}
        </div>

        {/* Longue durée */}
        {garde.estLongueDuree && (
          <div>
            <p className="font-semibold text-sm mb-2">Pour cette garde de plus de 30 jours</p>
            <p className="text-sm">
              Une contribution aux charges courantes peut avoir été convenue entre les parties en dehors de la plateforme. Cette contribution ne constitue pas un loyer au sens juridique et ne crée aucune relation locative.
            </p>
            {garde.contributionCharges != null && (
              <p className="text-sm mt-1">Contribution convenue : {garde.contributionCharges}</p>
            )}
          </div>
        )}

        {/* Nature de la garde */}
        <div>
          <p className="font-semibold text-sm mb-2">Ce que cette garde est vraiment</p>
          <p className="text-sm">
            Cette garde est réalisée dans un esprit d'échange et de confiance mutuelle. {g} ne reçoit aucune rémunération. Ce n'est ni un contrat de travail, ni un bail d'habitation.
          </p>
          <p className="italic text-xs text-muted-foreground mt-2">
            Ces précisions définissent la relation entre les deux parties — et c'est ce cadre qui rend le house-sitting possible.
          </p>
        </div>

        {/* Assurance */}
        <div>
          <p className="font-semibold text-sm mb-2">L'assurance</p>
          <p className="text-sm">
            Le logement de {p} est couvert par son assurance habitation pour les sinistres liés au bâtiment. {g} vérifie que sa responsabilité civile personnelle est active avant la garde. En cas de doute, un appel à son assureur avant le départ règle la question.
          </p>
          <p className="italic text-xs text-muted-foreground mt-2">
            Guardiens ne peut pas se substituer aux assurances des parties.
          </p>
        </div>

        {/* Contacts */}
        <div>
          <p className="font-semibold text-sm mb-2">Contacts pendant la garde</p>
          <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
            <p>
              {p} · {garde.proprio.telephone}
              {garde.proprio.plagesDisponibilite ? ` · disponible ${garde.proprio.plagesDisponibilite}` : ""}
            </p>
            {garde.voisinConfiance != null && (
              <p>{garde.voisinConfiance.prenom} · {garde.voisinConfiance.telephone}</p>
            )}
            <p>Urgences : 15 (SAMU) · 17 (Police) · 18 (Pompiers)</p>
          </div>
        </div>

        <hr className="border-border my-2" />
        <p className="text-center text-xs text-muted-foreground">
          Accord généré par Guardiens — en attente de confirmation des deux parties.
        </p>
        <a
          href="/aide/accord-de-garde"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary text-center block mt-1"
        >
          En savoir plus sur l'accord de garde →
        </a>
      </div>

      {/* PIED */}
      <div className="shrink-0 border-t px-6 py-4">
        <p className="text-center text-sm text-muted-foreground mb-3">
          J'ai lu cet accord et je confirme que son contenu correspond à ce que nous avons prévu.
        </p>
        <button
          disabled
          className="w-full py-2 rounded-md text-sm font-medium bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
        >
          C'est bon pour moi →
        </button>
        <button
          onClick={onClose ?? undefined}
          className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Passer cette étape
        </button>
      </div>
    </div>
  );
}

// --- Mock data & preview export ---

const mockGarde: AccordDeGardeData = {
  gardeId: "mock-123",
  dateDebut: "14 mai 2026",
  dateFin: "21 mai 2026",
  adresse: "12 rue de la République, Lyon 69001",
  proprio: {
    prenom: "Claire",
    telephone: "06 12 34 56 78",
    plagesDisponibilite: "9h-20h",
  },
  gardien: { prenom: "Julien" },
  animaux: [
    { prenom: "Milo", espece: "Chien", race: "Berger Australien", age: "3 ans" },
    { prenom: "Luna", espece: "Chat", race: "Bengal" },
  ],
  reglesVie: {
    animauxPartout: true,
    invites: false,
    tabac: null,
    autresPrecisions: "Merci de sortir Milo deux fois par jour minimum.",
  },
  voisinConfiance: { prenom: "Sophie", telephone: "06 98 76 54 32" },
  urgences: {
    vetNom: "Dr. Martin",
    vetTel: "04 78 12 34 56",
    vetAdresse: "8 rue Garibaldi, Lyon 69006",
    urgences24h: "04 78 59 00 00",
  },
  montantVetMax: 150,
  montantLogementMax: 100,
  estLongueDuree: false,
  contributionCharges: null,
};

export function AccordDeGardePreview() {
  return <AccordDeGarde garde={mockGarde} onClose={() => alert("Fermé")} />;
}
