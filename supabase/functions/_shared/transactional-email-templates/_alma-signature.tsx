/// <reference types="npm:@types/react@18.3.1" />
//
// `<AlmaSignature />` — bloc identité Alma (avatar PNG 56px + prénom + baseline),
// rendu sous le wordmark <BrandHeader /> pour incarner l'assistante Guardiens.
//
// Le passage du SVG inline au PNG externe est volontaire : Gmail ne rend pas
// le SVG, ni inline ni en <img src="...svg">. Sans PNG, Alma est invisible
// pour une grande partie des destinataires.
// L'image est servie a https://guardiens.fr/alma.png, generee par
// scripts/generate-alma-png.mjs.
//
// `<AlmaIntro firstName={...} />` — phrase d'ouverture personnalisée standardisée
// pour les digests signés Alma. Vouvoiement absolu (mem://style/editorial-tone-mapping).
//
// Garde-fou : aucun tiret cadratin, aucun emoji (mem://style/no-em-dash + no-icons).

import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'

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
const nameCell = {
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '17px',
  fontWeight: 600 as const,
  color: '#255B42',
  lineHeight: '1.2',
}
const baseline = {
  fontSize: '12px',
  color: '#7B756B',
  lineHeight: '1.4',
  margin: '2px 0 0',
  textAlign: 'center' as const,
  letterSpacing: '0.02em',
}

export const AlmaSignature = () => (
  <Section style={wrap}>
    <div style={row}>
      <Img
        src="https://guardiens.fr/alma.png"
        alt="Alma"
        width="56"
        height="56"
        style={{
          borderRadius: '50%',
          display: 'inline-block',
          verticalAlign: 'middle',
          marginRight: '10px',
        }}
      />
      <span style={nameCell}>Alma</span>
    </div>
    <Text style={baseline}>Votre assistante Guardiens</Text>
  </Section>
)

const introStyle = {
  fontSize: '14px',
  color: '#5A564E',
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
