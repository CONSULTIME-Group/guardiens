import {
  Heart, Leaf, Camera, Wrench, Rocket, Star, PawPrint,
  BookOpen, Coffee, Medal, Mountain, PhoneCall, Handshake, Lightbulb, RotateCcw, HeartHandshake,
  ShieldCheck, Award, Zap, Home,
} from "lucide-react";

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: typeof Heart;
  colorClass: string;
  category: "sitter" | "owner" | "special" | "status";
}

export const SITTER_BADGES: BadgeDef[] = [
  { key: "animals_adopted", label: "Les animaux l'ont adopté", description: "Les bêtes étaient heureux et détendus", icon: PawPrint, colorClass: "text-rose-500", category: "sitter" },
  { key: "house_clean", label: "Maison nickel", description: "Tout était propre et rangé au retour", icon: Home, colorClass: "text-sky-500", category: "sitter" },
  { key: "garden_great", label: "Le potager respire", description: "Jardin, plantes, potager bien entretenus", icon: Leaf, colorClass: "text-emerald-600", category: "sitter" },
  { key: "daily_news", label: "Des nouvelles tous les jours", description: "Photos, messages, on ne s'inquiète pas", icon: Camera, colorClass: "text-blue-500", category: "sitter" },
  { key: "resourceful", label: "Débrouillard(e)", description: "A géré un imprévu avec calme et autonomie", icon: Wrench, colorClass: "text-amber-500", category: "sitter" },
  { key: "beyond_expectations", label: "Au-delà des attentes", description: "A fait plus que ce qui était demandé", icon: Rocket, colorClass: "text-violet-500", category: "sitter" },
  { key: "neighbors_love", label: "Les voisins l'adorent", description: "S'est intégré(e) dans le quartier", icon: Heart, colorClass: "text-orange-500", category: "sitter" },
  { key: "invite_christmas", label: "On l'invite à Noël", description: "C'est devenu un(e) ami(e)", icon: Star, colorClass: "text-yellow-500", category: "sitter" },
];

export const OWNER_BADGES: BadgeDef[] = [
  { key: "great_guide", label: "Guide aux petits oignons", description: "Tout était clair, détaillé, bien préparé", icon: BookOpen, colorClass: "text-emerald-600", category: "owner" },
  { key: "fridge_full", label: "Frigo rempli", description: "Accueil chaleureux, petites attentions", icon: Coffee, colorClass: "text-rose-500", category: "owner" },
  { key: "golden_animals", label: "Animaux en or", description: "Animaux adorables, bien éduqués, faciles", icon: Medal, colorClass: "text-amber-500", category: "owner" },
  { key: "dream_place", label: "Un coin de rêve", description: "Le lieu était magnifique", icon: Mountain, colorClass: "text-sky-500", category: "owner" },
  { key: "always_reachable", label: "Toujours joignable", description: "Répondait vite, rassurant à distance", icon: PhoneCall, colorClass: "text-blue-500", category: "owner" },
  { key: "instant_trust", label: "Confiance immédiate", description: "On s'est sentis chez nous dès le premier jour", icon: Handshake, colorClass: "text-green-600", category: "owner" },
  { key: "learned_something", label: "On a appris quelque chose", description: "Partage de connaissances", icon: Lightbulb, colorClass: "text-yellow-500", category: "owner" },
  { key: "will_return", label: "On reviendra", description: "On veut absolument y retourner", icon: RotateCcw, colorClass: "text-violet-500", category: "owner" },
];

export const SPECIAL_BADGE: BadgeDef = {
  key: "mutual_connection", label: "Le courant passe", description: "Les deux parties se sont mutuellement appréciées", icon: HeartHandshake, colorClass: "text-amber-600", category: "special",
};

export const STATUS_BADGES: BadgeDef[] = [
  { key: "identity_verified", label: "ID vérifiée", description: "Identité vérifiée par Guardiens", icon: ShieldCheck, colorClass: "text-emerald-600", category: "status" },
  { key: "founder", label: "Fondateur", description: "Membre fondateur de Guardiens", icon: Award, colorClass: "text-amber-600", category: "status" },
  { key: "emergency_sitter", label: "Gardien d'urgence", description: "Disponible en cas d'urgence", icon: Zap, colorClass: "text-amber-600", category: "status" },
];

export const ALL_BADGES: BadgeDef[] = [...SITTER_BADGES, ...OWNER_BADGES, SPECIAL_BADGE, ...STATUS_BADGES];

export function getBadgeDef(key: string): BadgeDef | undefined {
  return ALL_BADGES.find(b => b.key === key);
}

export function getBadgeCategory(key: string): "sitter" | "owner" | "special" | "status" | undefined {
  return ALL_BADGES.find(b => b.key === key)?.category;
}
