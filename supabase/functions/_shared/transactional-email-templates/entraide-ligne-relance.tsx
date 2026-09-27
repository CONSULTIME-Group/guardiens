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

const QUOTES: Array<{ text: string; city: string }> = [
  { text: '« Aider et rendre service. Rencontrer des gens et discuter. »', city: 'Champs-sur-Yonne' },
  { text: '« Aide administrative et informatique »', city: 'Lyon' },
  { text: "« M'occuper des animaux, des plantes, des cultures, du jardin... »", city: 'Fontvieille' },
]

const Email = ({ firstName, lineUrl }: Props) => {
  const name = formatFirstName((firstName || '').trim())
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une phrase suffit, et elle fait du bien des deux côtés.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une chose que vous aimez faire pour les gens du coin ?</Heading>
          <Text style={text}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Text>
          <Text style={text}>Se rendre utile, c'est aussi se faire du bien. Une heure pour quelqu'un d'ici, quelques mots échangés, une rencontre, et l'on repart souvent content de sa journée.</Text>
          <Text style={text}>D'autres membres ont déjà écrit la leur :</Text>
          {QUOTES.map((q) => (
            <Section key={q.city} style={quoteBlock}>
              <Text style={quoteText}>{q.text}</Text>
              <Text style={quoteCity}>{q.city}</Text>
            </Section>
          ))}
          <Text style={text}>Écrivez la vôtre, en une phrase. Elle apparaît avec votre prénom et votre ville sur la page Entraide, et les personnes près de chez vous savent à qui demander.</Text>
          <Section style={ctaSection}>
            <Button style={button} href={lineUrl || FALLBACK_URL}>J'écris ma ligne</Button>
          </Section>
          <Text style={text}>Ensuite, c'est vous qui choisissez quand aider.</Text>
          <Text style={text}>Elisa et Jérémie</Text>
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

export const ENTRAIDE_LIGNE_RELANCE_FALLBACK_URL = FALLBACK_URL

export const template = {
  component: Email,
  subject: 'Se rendre utile, ça fait du bien',
  displayName: 'Entraide, relance de la ligne',
  previewData: { firstName: 'Jérémie' },
} satisfies TemplateEntry

const quoteBlock = { borderLeft: '2px solid #E9E4DD', padding: '0 0 0 12px', margin: '0 0 14px' }
const quoteText = { fontSize: '15px', color: '#756F66', lineHeight: '1.5', margin: '0', fontStyle: 'italic' as const }
const quoteCity = { fontSize: '13px', color: '#756F66', lineHeight: '1.4', margin: '2px 0 0' }
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
