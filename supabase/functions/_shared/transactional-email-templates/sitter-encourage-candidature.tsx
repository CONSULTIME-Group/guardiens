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

interface Props {
  firstName?: string
  nearbySits?: NearbySitView[]
  primarySitUrl?: string
}

const SitterEncourageCandidatureEmail = ({ firstName, nearbySits, primarySitUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre profil est prêt, voici les annonces les plus proches.</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Les annonces les plus proches de chez vous</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Votre profil de gardien est prêt, et des maisons cherchent leur gardien. Voici les plus
          proches de chez vous.
        </Text>

        <NearbySitsBlock sits={nearbySits} />

        <Text style={text}>
          Une première candidature se prépare en quelques minutes. Trois choses font la différence&nbsp;:
        </Text>
        <Section style={card}>
          <Text style={cardLine}>appeler les animaux par leur nom, tel qu'il figure dans l'annonce&nbsp;;</Text>
          <Text style={cardLine}>donner vos dates exactes&nbsp;;</Text>
          <Text style={cardLine}>dire en une phrase ce qui vous plaît dans cette maison.</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={button} href={primarySitUrl || `${SITE_URL}/recherche`}>Voir l'annonce</Button>
        </Section>

        <Text style={text}>
          Le propriétaire lit votre message, puis vous échangez directement, et vous vous rencontrez
          avant de vous engager.
        </Text>

        <Text style={text}>Elisa et Jérémie</Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement de votre activation"
          basis="6.1.f"
          extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F8F6F1', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardLine = { color: '#524E47', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

/** Distance de la première annonce, quand elle est connue. */
function firstDistance(data: Record<string, any>): number | null {
  const first = Array.isArray(data?.nearbySits) ? data.nearbySits[0] : null
  return typeof first?.distanceKm === 'number' ? first.distanceKm : null
}

export const template: TemplateEntry = {
  component: SitterEncourageCandidatureEmail,
  subject: (data: Record<string, any>) => {
    const km = firstDistance(data ?? {})
    const body = km === null
      ? 'des maisons cherchent leur gardien'
      : `une maison cherche son gardien à ${km} km de chez vous`
    return data?.firstName
      ? `${data.firstName}, ${body}`
      : body.charAt(0).toUpperCase() + body.slice(1)
  },

  displayName: 'Gardien sans candidature, encouragement',
  previewData: {
    firstName: 'Camille',
    nearbySits: [
      { id: 'demo', title: 'Garde d\u2019un chien', city: 'Annecy', startDate: '3 octobre 2026', endDate: '10 octobre 2026', distanceKm: 18, url: 'https://guardiens.fr/sits/demo' },
    ],
    primarySitUrl: 'https://guardiens.fr/sits/demo',
  },
}
