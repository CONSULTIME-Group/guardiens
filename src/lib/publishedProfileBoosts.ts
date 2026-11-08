/**
 * Lot ONB1 (point 5) : sur l'écran « annonce en ligne », trois compléments
 * rapides proposés au propriétaire, seulement ceux qui manquent, sans rien
 * bloquer. Mêmes seuils que le barème propriétaire (src/lib/profileCompletion.ts) :
 * animal 20 points, photo de soi 10, présentation de 50 caractères 10.
 */
export type ProfileBoostKey = "pet" | "avatar" | "bio";

export interface ProfileBoost {
  key: ProfileBoostKey;
  title: string;
  text: string;
  href: string;
}

export const BIO_MIN_LENGTH = 50;

const BOOSTS: Record<ProfileBoostKey, ProfileBoost> = {
  pet: {
    key: "pet",
    title: "Présentez vos animaux",
    text: "Leur nom, leur caractère, leurs habitudes : les gardiens les lisent avant de postuler.",
    href: "/owner-profile?section=animals",
  },
  avatar: {
    key: "avatar",
    title: "Ajoutez une photo de vous",
    text: "Un visage rassure avant le premier message.",
    href: "/owner-profile?section=identity",
  },
  bio: {
    key: "bio",
    title: "Écrivez quelques lignes sur vous",
    text: "Qui vous êtes, ce que vous aimez chez vous, ce qui compte pour vous.",
    href: "/owner-profile?section=identity",
  },
};

export function publishedProfileBoosts(i: {
  avatarUrl: string | null | undefined;
  bio: string | null | undefined;
  petsCount: number;
}): ProfileBoost[] {
  const out: ProfileBoost[] = [];
  if (i.petsCount === 0) out.push(BOOSTS.pet);
  if (!i.avatarUrl) out.push(BOOSTS.avatar);
  if ((i.bio?.trim().length ?? 0) < BIO_MIN_LENGTH) out.push(BOOSTS.bio);
  return out;
}
