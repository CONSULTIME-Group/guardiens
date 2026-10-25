/** Gouaches des besoins sans photo (lot P3), 160 px pour les lignes, 480 px pour les cartes. */
import type { MissionSpotKey } from "@/lib/missionSpot";
import chat160 from "@/assets/missions/spot-chat-160.webp";
import chien160 from "@/assets/missions/spot-chien-160.webp";
import poules160 from "@/assets/missions/spot-poules-160.webp";
import jardin160 from "@/assets/missions/spot-jardin-160.webp";
import verger160 from "@/assets/missions/spot-verger-160.webp";
import bricolage160 from "@/assets/missions/spot-bricolage-160.webp";
import bienetre160 from "@/assets/missions/spot-bienetre-160.webp";
import courses160 from "@/assets/missions/spot-courses-160.webp";
import jeux160 from "@/assets/missions/spot-jeux-160.webp";
import trajet160 from "@/assets/missions/spot-trajet-160.webp";
import chat480 from "@/assets/missions/spot-chat-480.webp";
import chien480 from "@/assets/missions/spot-chien-480.webp";
import poules480 from "@/assets/missions/spot-poules-480.webp";
import jardin480 from "@/assets/missions/spot-jardin-480.webp";
import verger480 from "@/assets/missions/spot-verger-480.webp";
import bricolage480 from "@/assets/missions/spot-bricolage-480.webp";
import bienetre480 from "@/assets/missions/spot-bienetre-480.webp";
import courses480 from "@/assets/missions/spot-courses-480.webp";
import jeux480 from "@/assets/missions/spot-jeux-480.webp";
import trajet480 from "@/assets/missions/spot-trajet-480.webp";

export const MISSION_SPOT_SMALL: Record<MissionSpotKey, string> = {
  chat: chat160, chien: chien160, poules: poules160, jardin: jardin160,
  verger: verger160, bricolage: bricolage160, bienetre: bienetre160,
  courses: courses160, jeux: jeux160, trajet: trajet160,
};

export const MISSION_SPOT_LARGE: Record<MissionSpotKey, string> = {
  chat: chat480, chien: chien480, poules: poules480, jardin: jardin480,
  verger: verger480, bricolage: bricolage480, bienetre: bienetre480,
  courses: courses480, jeux: jeux480, trajet: trajet480,
};
