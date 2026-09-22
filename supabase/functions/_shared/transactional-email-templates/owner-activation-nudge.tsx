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


const OwnerActivationNudgeEmail = ({ firstName }: Props) => {
  const greeting = firstName
    ? `Bonjour ${toTitleCase(firstName)},`
    : 'Bonjour,'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Le chat à nourrir un soir de retard, le jardin à arroser pendant un week-end.</Preview>
      <Body style={main}>
        <Section style={topStripe}>&nbsp;</Section>
        <Container style={container}>
          <BrandHeader />

          <Heading style={h1}>Guardiens sert aussi pour un soir, un week-end, un coup de main</Heading>

          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Un grand départ se prépare longtemps à l'avance. D'ici là, la vie apporte ses petits
            besoins&nbsp;: le chat à nourrir un soir de retard, les tomates à arroser pendant un
            week-end, un colis à réceptionner.
          </Text>

          <Text style={text}>
            Sur Guardiens, ces coups de main se demandent en une phrase. Les dix personnes
            disponibles les plus proches de chez vous reçoivent votre besoin, et celles qui peuvent
            vous répondre.
          </Text>

          <Text style={text}>
            C'est souvent ainsi que la confiance commence, celle qui vous fera partir l'esprit
            tranquille le jour du grand départ.
          </Text>

          <Section style={ctaWrap}>
            <Button style={primaryCta} href={`${SITE_URL}/petites-missions/creer`}>
              Demander un coup de main
            </Button>
          </Section>
          <Section style={ctaWrapSecondary}>
            <Button style={secondaryCta} href={`${SITE_URL}/sits/create?${UTM}`}>
              Publier une annonce de garde
            </Button>
          </Section>

          <Text style={signName}>Elisa et Jérémie</Text>

          <LegalFooter
            purpose="l'accompagnement de votre activation en tant que propriétaire"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}


export const template = {
  component: OwnerActivationNudgeEmail,
  subject: "Guardiens sert aussi pour un soir, un week-end, un coup de main",
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
