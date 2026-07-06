/// <reference types="npm:@types/react@18.3.1" />
//
// `<AlmaSignature />` — bloc identité Alma (avatar SVG 32px + prénom + baseline),
// rendu sous le wordmark <BrandHeader /> pour incarner l'assistante Guardiens.
//
// `<AlmaIntro firstName={...} />` — phrase d'ouverture personnalisée standardisée
// pour les digests signés Alma. Vouvoiement absolu (mem://style/editorial-tone-mapping).
//
// Garde-fou : aucun tiret cadratin, aucun emoji (mem://style/no-em-dash + no-icons).

import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'

const wrap = {
  display: 'block' as const,
  textAlign: 'center' as const,
  margin: '0 0 18px',
}
const row = {
  fontSize: '0',
  lineHeight: '0',
  margin: '0 0 4px',
}
const avatarCell = {
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
  marginRight: '10px',
}
const nameCell = {
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '17px',
  fontWeight: 600 as const,
  color: 'hsl(153, 42%, 25%)',
  lineHeight: '1.2',
}
const baseline = {
  fontSize: '12px',
  color: 'hsl(37, 7%, 45%)',
  lineHeight: '1.4',
  margin: '2px 0 0',
  textAlign: 'center' as const,
  letterSpacing: '0.02em',
}

// Avatar Alma : rond vert olive avec initiale « A » stylisée Playfair.
// SVG inline (32x32) pour rendu email fiable sans image externe.
const AlmaAvatarSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    role="img"
    aria-label="Alma"
  >
    <circle cx="16" cy="16" r="16" fill="#3d7a5f" />
    <text
      x="16"
      y="22"
      textAnchor="middle"
      fontFamily="'Playfair Display', Georgia, serif"
      fontSize="18"
      fontWeight="700"
      fill="#ffffff"
    >
      A
    </text>
  </svg>
)

export const AlmaSignature = () => (
  <Section style={wrap}>
    <div style={row}>
      <span style={avatarCell}>
        <AlmaAvatarSvg />
      </span>
      <span style={nameCell}>Alma</span>
    </div>
    <Text style={baseline}>Votre assistante Guardiens</Text>
  </Section>
)

const introStyle = {
  fontSize: '14px',
  color: 'hsl(37, 7%, 33%)',
  lineHeight: '1.6',
  margin: '0 0 14px',
  fontStyle: 'italic' as const,
}

export interface AlmaIntroProps {
  firstName?: string
  /**
   * Phrase adaptable au canal. Par défaut : « Voici ce que j'ai vu pour vous
   * depuis hier. ». Utilisez une variante pour un digest hebdomadaire ou
   * un rappel spécifique.
   */
  seen?: string
}

export const AlmaIntro = ({
  firstName,
  seen = "Voici ce que j'ai vu pour vous depuis hier.",
}: AlmaIntroProps) => (
  <Text style={introStyle}>
    Bonjour{firstName ? ` ${firstName}` : ''}, c'est Alma. {seen}
  </Text>
)

export default AlmaSignature
