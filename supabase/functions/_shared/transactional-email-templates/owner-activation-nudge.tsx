import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Section, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const UTM = 'utm_source=email&utm_campaign=owner_activation&utm_medium=nudge'

interface Props {
  firstName?: string
}

const toTitleCase = (s: string) => {
  const clean = (s ?? '').trim()
  if (!clean) return ''
  return clean
    .split(/(\s|-)/)
    .map((part) => (/\s|-/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join('')
}

const CARDS: Array<{ title: string; body: string }> = [
  { title: 'Arroser vos plantes', body: "Quand vous partez trois jours et qu'il fait chaud." },
  { title: 'Un œil sur la maison', body: "Le temps d'un week-end à la campagne." },
  { title: 'Rentrer les volets', body: "Un soir d'orage, pendant que vous êtes coincé au bureau." },
  { title: 'Sortir votre chien', body: "Une heure quand la journée s'étire." },
]

const OwnerActivationNudgeEmail = ({ firstName }: Props) => {
  const greeting = firstName
    ? `Bonjour ${toTitleCase(firstName)},`
    : 'Bonjour,'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Guardiens, ce n'est pas que pour partir 15 jours</Preview>
      <Body style={main}>
        <Section style={topStripe}>&nbsp;</Section>
        <Container style={container}>
          <BrandHeader />

          <Heading style={h1}>Guardiens, ce n'est pas que pour partir 15 jours</Heading>

          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Vous vous êtes inscrit sur Guardiens il y a quelques temps, sans encore publier votre première annonce. Peut-être parce que vous attendez le grand départ, celui où vous confiez votre maison quinze jours. C'est une belle raison, mais ce n'est pas la seule.
          </Text>

          <Text style={subTitle}>Sur Guardiens, on couvre aussi tout ce qui vient avant :</Text>

          {CARDS.map((c) => (
            <Section key={c.title} style={card}>
              <Text style={cardTitle}>{c.title}</Text>
              <Text style={cardBody}>{c.body}</Text>
            </Section>
          ))}

          <Text style={text}>
            Ce sont ces petits services qui construisent votre réseau de confiance, celui que vous serez heureux de trouver le jour où vous partirez vraiment loin. Vous n'engagez rien, vous ne payez rien, ni pour la garde complète ni pour les coups de main.
          </Text>

          <Section style={ctaWrap}>
            <Button style={primaryCta} href={`${SITE_URL}/sits/create?${UTM}`}>
              Publier ma première annonce
            </Button>
          </Section>
          <Section style={ctaWrapSecondary}>
            <Button style={secondaryCta} href={`${SITE_URL}/petites-missions/creer?${UTM}`}>
              Découvrir les petites missions
            </Button>
          </Section>

          <Text style={signOff}>À bientôt sur la plateforme,</Text>
          <Text style={signName}>Jérémie et Elisa</Text>

          <LegalFooter
            purpose="l'accompagnement de votre activation en tant que propriétaire"
            basis="6.1.f"
            extra="Vous recevez ce message parce que vous êtes inscrit sur Guardiens sans avoir publié d'annonce. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OwnerActivationNudgeEmail,
  subject: "Guardiens, ce n'est pas que pour partir 15 jours",
  displayName: 'Réveil propriétaires dormants (activation)',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const topStripe = {
  background: 'linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%)',
  height: '6px',
  lineHeight: '6px',
  fontSize: '0',
}
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '24px',
  lineHeight: '1.35',
  color: '#1a1a1a',
  margin: '8px 0 20px',
  fontWeight: 700 as const,
}
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.7', margin: '0 0 14px' }
const subTitle = { fontSize: '15px', color: '#1a1a1a', lineHeight: '1.6', margin: '18px 0 12px', fontWeight: 600 as const }
const card = {
  borderLeft: '3px solid #2C6E49',
  backgroundColor: '#FAF9F6',
  padding: '14px',
  borderRadius: '8px',
  marginBottom: '10px',
}
const cardTitle = { fontSize: '15px', color: '#1a1a1a', fontWeight: 600 as const, margin: '0 0 4px' }
const cardBody = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0' }
const ctaWrap = { textAlign: 'center' as const, padding: '32px 0 10px' }
const ctaWrapSecondary = { textAlign: 'center' as const, padding: '0 0 40px' }
const primaryCta = {
  backgroundColor: '#2C6E49',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontWeight: 600 as const,
  fontSize: '16px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(44,110,73,0.25)',
}
const secondaryCta = {
  backgroundColor: 'transparent',
  color: '#2C6E49',
  padding: '12px 30px',
  border: '2px solid #2C6E49',
  borderRadius: '10px',
  fontWeight: 600 as const,
  fontSize: '16px',
  textDecoration: 'none',
  display: 'inline-block',
}
const signOff = { fontSize: '15px', color: '#3a3a3a', margin: '0 0 4px' }
const signName = { fontSize: '15px', color: '#3a3a3a', margin: '0 0 14px' }
