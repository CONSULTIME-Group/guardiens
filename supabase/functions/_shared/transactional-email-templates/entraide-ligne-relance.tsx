import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { formatFirstName } from '../format-first-name.ts'
import type { TemplateEntry } from './registry.ts'

// Repli sans jeton : l'écran /ma-ligne demande alors la connexion.
const FALLBACK_URL =
  'https://guardiens.fr/ma-ligne?utm_source=email&utm_medium=email&utm_campaign=entraide_ligne_relance'

interface Props { firstName?: string; lineUrl?: string }

const Email = ({ firstName, lineUrl }: Props) => {
  const name = formatFirstName((firstName || '').trim())
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Un champ, trente secondes, et les gens du coin vous voient.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une chose que vous aimez faire pour les gens du coin ?</Heading>
          <Text style={text}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Text>
          <Text style={text}>C'est la saison des pommes. Dans les jardins à quelques rues d'ici, des personnes âgées regardent les fruits du haut de l'arbre en espérant une échelle et un bras jeune. D'autres cherchent quelqu'un pour un formulaire en ligne, un carton à porter, un chien à sortir un samedi.</Text>
          <Text style={text}>Elles vous trouveront le jour où votre ligne existera. Écrivez ce que vous aimez faire, en une phrase.</Text>
          <Section style={ctaSection}>
            <Button style={button} href={lineUrl || FALLBACK_URL}>J'écris ma ligne</Button>
          </Section>
          <Text style={text}>Elle apparaît avec votre prénom et votre ville sur la page Entraide.</Text>
          <Hr style={hr} />
          <LegalFooter
            purpose="l'animation de l'entraide entre membres inscrits"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Votre ligne, en une phrase',
  displayName: 'Entraide, relance de la ligne',
  previewData: { firstName: 'Jérémie', lineUrl: FALLBACK_URL },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '999px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
