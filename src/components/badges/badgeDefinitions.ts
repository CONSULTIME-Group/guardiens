import {
  Heart, Sparkles, Leaf, MessageCircle, Zap, Rocket, Home, Star,
  BookOpen, Coffee, Medal, Mountain, PhoneCall, Handshake, Lightbulb, RotateCcw, HeartHandshake,
} from "lucide-react";

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: typeof Heart;
  colorClass: string;
}

export const SITTER_BADGES: BadgeDef[] = [
  { key: "animals_adopted", label: "Les animaux l'ont adopté", description: "Les bêtes étaient heureux et détendus", icon: Heart, colorClass: "text-rose-500" },
  { key: "house_clean", label: "Maison nickel", description: "Tout était propre et rangé au retour", icon: Sparkles, colorClass: "text-sky-500" },
  { key: "garden_great", label: "Le potager respire", description: "Jardin, plantes, potager bien entretenus", icon: Leaf, colorClass: "text-emerald-600" },
  { key: "daily_news", label: "Des nouvelles tous les jours", description: "Photos, messages, on ne s'inquiète pas", icon: MessageCircle, colorClass: "text-blue-500" },
  { key: "resourceful", label: "Débrouillard(e)", description: "A géré un imprévu avec calme et autonomie", icon: Zap, colorClass: "text-amber-500" },
  { key: "beyond_expectations", label: "Au-delà des attentes", description: "A fait plus que ce qui était demandé", icon: Rocket, colorClass: "text-violet-500" },
  { key: "neighbors_love", label: "Les voisins l'adorent", description: "S'est intégré(e) dans le quartier", icon: Home, colorClass: "text-orange-500" },
  { key: "invite_christmas", label: "On l'invite à Noël", description: "C'est devenu un(e) ami(e)", icon: Star, colorClass: "text-yellow-500" },
];

export const OWNER_BADGES: BadgeDef[] = [
  { key: "great_guide", label: "Guide aux petits oignons", description: "Tout était clair, détaillé, bien préparé", icon: BookOpen, colorClass: "text-emerald-600" },
  { key: "fridge_full", label: "Frigo rempli", description: "Accueil chaleureux, petites attentions", icon: Coffee, colorClass: "text-rose-500" },
  { key: "golden_animals", label: "Animaux en or", description: "Animaux adorables, bien éduqués, faciles", icon: Medal, colorClass: "text-amber-500" },
  { key: "dream_place", label: "Un coin de rêve", description: "Le lieu était magnifique", icon: Mountain, colorClass: "text-sky-500" },
  { key: "always_reachable", label: "Toujours joignable", description: "Répondait vite, rassurant à distance", icon: PhoneCall, colorClass: "text-blue-500" },
  { key: "instant_trust", label: "Confiance immédiate", description: "On s'est sentis chez nous dès le premier jour", icon: Handshake, colorClass: "text-green-600" },
  { key: "learned_something", label: "On a appris quelque chose", description: "Partage de connaissances", icon: Lightbulb, colorClass: "text-yellow-500" },
  { key: "will_return", label: "On reviendra", description: "On veut absolument y retourner", icon: RotateCcw, colorClass: "text-violet-500" },
];

export const SPECIAL_BADGE: BadgeDef = {
  key: "mutual_connection", label: "Le courant passe", description: "Les deux parties se sont mutuellement appréciées", icon: HeartHandshake, colorClass: "text-amber-600",
};

export const ALL_BADGES: BadgeDef[] = [...SITTER_BADGES, ...OWNER_BADGES, SPECIAL_BADGE];

export function getBadgeDef(key: string): BadgeDef | undefined {
  return ALL_BADGES.find(b => b.key === key);
}
