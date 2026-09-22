import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'
import { NearbySitsBlock, type NearbySitView } from './_nearby-sits.tsx'

const SITE_URL = 'https://guardiens.fr'
const CTA_URL = `${SITE_URL}/recherche?utm_source=email&utm_medium=email&utm_campaign=dormant_sitter`

interface Props {
  firstName?: string
  days?: number
  nearbySits?: NearbySitView[]
  primarySitUrl?: string
}

const DormantSitterNudgeEmail = ({ firstName, nearbySits, primarySitUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Nous avons pensé à vous.</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Section style={hero} className="em-hero">
          <Text style={heroKicker}>Gardes disponibles</Text>
          <Heading style={h1} className="em-h1">De nouvelles annonces vous attendent.</Heading>
        </Section>

        <Text style={text} className="em-text">
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text} className="em-text">
          De nouvelles annonces se sont ouvertes, et nous avons pensé à vous. Voici les plus proches
          de chez vous.
        </Text>

        <NearbySitsBlock sits={nearbySits} />

        <Text style={text} className="em-text">
          Si les dates vous conviennent, un message suffit pour vous présenter. Pour les suivantes,
          vos alertes vous préviennent dès qu'une garde s'ouvre.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={primarySitUrl || CTA_URL}>
            Voir l'annonce
          </Button>
        </Section>

        <Text style={text} className="em-text">Elisa et Jérémie</Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement des gardiens inscrits"
          basis="6.1.f"
          extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const hero = { backgroundColor: '#F1F9F5', padding: '22px 20px', borderRadius: '12px', margin: '0 0 24px', borderLeft: '4px solid #2C6D50' }
const heroKicker = { fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#2C6D50', fontWeight: 600, margin: '0 0 6px' }
const h1 = { fontSize: '24px', lineHeight: '1.25', fontWeight: 'bold' as const, color: '#1E4835', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#44413B', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '32px 0 12px' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }

/** Distance de la première annonce, quand elle est connue. */
function firstDistance(data: Record<string, any>): number | null {
  const first = Array.isArray(data?.nearbySits) ? data.nearbySits[0] : null
  return typeof first?.distanceKm === 'number' ? first.distanceKm : null
}

export const template = {
  component: DormantSitterNudgeEmail,
  subject: (data: Record<string, any>) => {
    const km = firstDistance(data ?? {})
    const body = km === null
      ? 'de nouvelles annonces vous attendent'
      : `une annonce vous attend à ${km} km`
    return data?.firstName
      ? `${data.firstName}, ${body}`
      : body.charAt(0).toUpperCase() + body.slice(1)
  },

  displayName: 'Gardien dormant, relance annonces',
  previewData: {
    firstName: 'Camille',
    days: 34,
    nearbySits: [
      { id: 'demo', title: 'Garde de deux chats', city: 'Lyon', startDate: '3 octobre 2026', endDate: '10 octobre 2026', distanceKm: 12, url: 'https://guardiens.fr/sits/demo' },
    ],
    primarySitUrl: 'https://guardiens.fr/sits/demo',
  },
} satisfies TemplateEntry
