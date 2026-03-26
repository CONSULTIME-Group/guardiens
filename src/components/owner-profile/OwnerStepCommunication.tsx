import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "../profile/ChipSelect";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";

const MEETING = ["Dîner/apéro avant", "Visite du logement la veille", "Passage le jour même", "Visio avant", "Échange messagerie suffit"];
const HANDOVER = ["La veille avec nuit commune", "Le jour du départ", "À distance — clés chez un voisin ou boîte à clé"];
const FREQUENCY = ["Tous les jours", "Tous les 2-3 jours", "Une fois par semaine", "Selon les événements", "Pas besoin"];
const FORMAT = ["Photos + texte court", "Simple message texte", "Appel vidéo ponctuel"];
const TIME = ["Matin", "Soir", "Pas de préférence"];

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
}

const OwnerStepCommunication = ({ data, onChange }: Props) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl font-bold">Accueil & communication</h2>

    <h3 className="font-heading text-lg font-semibold">Comment j'aime accueillir</h3>

    <div className="space-y-2">
      <Label>Rencontre souhaitée avant la garde</Label>
      <ChipSelect options={MEETING} selected={data.meeting_preference} onChange={v => onChange({ meeting_preference: v })} />
      <HintBubble>La rencontre avant la garde est souvent le moment où la confiance se crée. Dites comment vous aimez faire.</HintBubble>
    </div>

    <div className="space-y-2">
      <Label>Passage de relais</Label>
      <Select value={data.handover_preference} onValueChange={v => onChange({ handover_preference: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{HANDOVER.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Précisions accueil</Label>
        <AiSuggestButton field="welcome_notes" currentValue={data.welcome_notes} onSuggestion={text => onChange({ welcome_notes: text })} />
      </div>
      <Textarea value={data.welcome_notes} onChange={e => onChange({ welcome_notes: e.target.value })}
        placeholder="Ex : On aime bien inviter le gardien à dîner quelques jours avant pour se connaître et présenter les animaux"
        className="rounded-lg min-h-[80px]" maxLength={2000} />
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Pendant la garde — communication</h3>

    <div className="space-y-2">
      <Label>Fréquence des nouvelles souhaitée</Label>
      <Select value={data.news_frequency} onValueChange={v => onChange({ news_frequency: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{FREQUENCY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Format souhaité</Label>
      <ChipSelect options={FORMAT} selected={data.news_format} onChange={v => onChange({ news_format: v })} />
    </div>

    <div className="space-y-2">
      <Label>Moment privilégié</Label>
      <Select value={data.preferred_time} onValueChange={v => onChange({ preferred_time: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>{TIME.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Précisions</Label>
        <AiSuggestButton field="communication_notes" currentValue={data.communication_notes} onSuggestion={text => onChange({ communication_notes: text })} />
      </div>
      <Textarea value={data.communication_notes} onChange={e => onChange({ communication_notes: e.target.value })}
        placeholder="Ex : On adore recevoir des photos en balade, pas besoin de roman !"
        className="rounded-lg min-h-[80px]" maxLength={1000} />
      <HintBubble>Chaque propriétaire est différent. Certains veulent des photos tous les jours, d'autres juste un message si problème. Soyez clair, le gardien s'adaptera.</HintBubble>
    </div>
  </div>
);

export default OwnerStepCommunication;
