import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Guardiens'
const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  sitTitle?: string
  city?: string
  startDate?: string
  endDate?: string
  sitId?: string
  ownerFirstName?: string
}

const AvailabilityNudgeEmail = ({
  sitterFirstName, sitTitle, city, startDate, endDate, sitId, ownerFirstName,
}: Props) => {
  const ctaHref = sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/sits`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une garde près de chez vous cherche encore un gardien</Preview>
      <Body style={main}>
        <Container style={container}>
        <BrandHeader />
          <Heading style={h1}>Une garde de votre département cherche un gardien</Heading>

          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>

          <Text style={text}>
            Une annonce publiée près de chez vous n'a encore reçu aucune candidature.
            Si vous êtes disponible, votre profil pourrait vraiment aider cette personne.
          </Text>

          <Section style={card}>
            {sitTitle ? <Text style={cardTitle}>{sitTitle}</Text> : null}
            {ownerFirstName ? <Text style={cardLine}>Proposée par {ownerFirstName}</Text> : null}
            {city ? <Text style={cardLine}>À {city}</Text> : null}
            {startDate && endDate ? (
              <Text style={cardLine}>Du {startDate} au {endDate}</Text>
            ) : null}
          </Section>

          <Button style={button} href={ctaHref}>Voir l'annonce</Button>

          <LegalFooter
            purpose="la bonne marche de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message une seule fois pour cette annonce, parce que vous êtes inscrit comme gardien dans le même département. Vous pouvez ajuster vos préférences d'alerte depuis votre espace personnel."
          />
          </Container>
          </Body>
          </Html>
  )
}

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
const hr = { borderColor: '#e6e6e6', margin: '24px 0' }
const legal = { color: '#777', fontSize: '12px', lineHeight: '18px', marginBottom: '6px' }

export const template: TemplateEntry = {
  component: AvailabilityNudgeEmail,
  subject: (d: Record<string, any>) => `Une garde près de chez vous cherche un gardien${d?.city ? ` — ${d.city}` : ''} — Guardiens`,
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
