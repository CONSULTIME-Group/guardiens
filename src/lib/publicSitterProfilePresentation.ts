import { capitalizeFirstName, publicFirstName } from "@/lib/displayName";

interface PublicSitterProfilePresentationInput {
  firstName: string | null | undefined;
  city: string | null | undefined;
  trustSignals?: string[];
}

export function buildPublicSitterProfilePresentation({
  firstName,
  city,
  trustSignals = [],
}: PublicSitterProfilePresentationInput) {
  const displayFirstName = capitalizeFirstName(publicFirstName(firstName));
  const baseTitle = city
    ? `${displayFirstName}, gardien à ${city}`
    : `${displayFirstName}, gardien d'animaux`;
  const trustPart = trustSignals.length ? `, ${trustSignals.join(" · ")}` : "";
  const candidateTitle = `${baseTitle}${trustPart}`;

  return {
    firstName: displayFirstName,
    h1: city ? `${displayFirstName}, gardien à ${city}` : displayFirstName,
    pageTitle: candidateTitle.length <= 60 ? candidateTitle : baseTitle,
  };
}