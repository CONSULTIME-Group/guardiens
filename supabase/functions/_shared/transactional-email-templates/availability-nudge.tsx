import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'
import { NearbySitsBlock, type NearbySitView } from './_nearby-sits.tsx'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  sitTitle?: string
  city?: string
  startDate?: string
  endDate?: string
  sitId?: string
  ownerFirstName?: string
  nearbySits?: NearbySitView[]
  primarySitUrl?: string
}

const AvailabilityNudgeEmail = ({
  sitterFirstName, sitTitle, city, startDate, endDate, sitId, ownerFirstName, nearbySits, primarySitUrl,
}: Props) => {
  const hasNearby = Array.isArray(nearbySits) && nearbySits.length > 0
  const ctaHref = primarySitUrl || (sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/sits`)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre profil peut faire la différence.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une garde attend sa première candidature</Heading>

          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>

          <Text style={text}>
            Une annonce attend sa première candidature. Pour ce propriétaire, votre message peut
            tout changer.
          </Text>

          {hasNearby ? <NearbySitsBlock sits={nearbySits} /> : null}

          <Section style={hasNearby ? hiddenCard : card}>
            {sitTitle ? <Text style={cardTitle}>{sitTitle}</Text> : null}
            {ownerFirstName ? <Text style={cardLine}>Proposée par {ownerFirstName}</Text> : null}
            {city ? <Text style={cardLine}>À {city}</Text> : null}
            {startDate && endDate ? (
              <Text style={cardLine}>Du {startDate} au {endDate}</Text>
            ) : null}
          </Section>

          <Button style={button} href={ctaHref}>Voir l'annonce</Button>

          <Text style={text}>Elisa et Jérémie</Text>

          <LegalFooter
            purpose="la bonne marche de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

const hiddenCard = { display: 'none' as const }
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' as const }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, marginBottom: '16px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px', marginBottom: '12px' }
const card = { backgroundColor: '#f7f5ee', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardTitle = { color: '#1a1a1a', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: '#444', fontSize: '14px', lineHeight: '20px', marginBottom: '4px' }
const button = {
  backgroundColor: '#1a1a1a', color: '#ffffff', padding: '12px 22px', borderRadius: '8px',
  textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '8px',
}

export const template: TemplateEntry = {
  component: AvailabilityNudgeEmail,
  subject: (d: Record<string, any>) => {
    const city = d?.city
      ?? (Array.isArray(d?.nearbySits) ? d.nearbySits[0]?.city : null)
    return city
      ? `Une garde à ${city} attend sa première candidature`
      : 'Une garde attend sa première candidature'
  },
  displayName: 'Garde sans candidature (alerte département)',
  previewData: {
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de 2 chats à Lyon',
    city: 'Lyon',
    startDate: '15 mai 2026',
    endDate: '22 mai 2026',
    sitId: 'demo',
    ownerFirstName: 'Julie',
  },
}
