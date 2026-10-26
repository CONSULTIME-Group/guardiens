import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { ResponderList } from './_responder-list.tsx'
import type { TemplateEntry } from './registry.ts'
import { authorMissionUrl } from '../mission-responders.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  ownerFirstName?: string
  missionTitle?: string
  missionId?: string
  deepLinkUrl?: string
  message?: string
  /**
   * Lot E20 : variante « vivier épuisé ». Nombre de personnes disponibles à
   * 30 km au plus qui ont reçu le besoin ; le lien du besoin suit le message,
   * pour le partager.
   */
  exhaustedCount?: number
  /** Lot E17 : répondants en attente, chacun avec un bouton « Choisir {prénom} ». */
  responders?: unknown
}

const MissionWaveStatusEmail = ({ ownerFirstName, missionTitle, missionId, deepLinkUrl, message, exhaustedCount, responders }: Props) => {
  const pageUrl = missionId ? `${SITE_URL}/petites-missions/${missionId}` : null
  const authorUrl = authorMissionUrl(missionId, deepLinkUrl)
  const exhausted = typeof exhaustedCount === 'number' && exhaustedCount > 0
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Des nouvelles de votre demande d'entraide</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Des nouvelles de votre demande</Heading>

          <Text style={text}>Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},</Text>

          {missionTitle && <Text style={cardLine}>{missionTitle}</Text>}

          <Text style={text}>{message}</Text>

          {exhausted && pageUrl && (
            <Text style={shareLine}>
              <Link href={pageUrl} style={link}>{pageUrl}</Link>
            </Text>
          )}

          <ResponderList responders={responders} intro="Ces personnes vous ont répondu :" />

          {pageUrl && (
            <Section style={ctaSection}>
              <Button style={button} href={authorUrl}>
                Voir ma demande
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <LegalFooter
            purpose="le suivi de votre demande d'entraide"
            basis="6.1.b"
            extra="Vous recevez ce message car vous avez publié une demande d'entraide sur Guardiens."
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const cardLine = { color: '#2C6D50', fontSize: '15px', lineHeight: '22px', fontWeight: 600 as const }
const shareLine = { fontSize: '14px', lineHeight: '1.6', margin: '-8px 0 16px', wordBreak: 'break-all' as const }
const link = { color: '#2C6D50', textDecoration: 'underline' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
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

export const template: TemplateEntry = {
  component: MissionWaveStatusEmail,
  subject: 'Des nouvelles de votre demande d’entraide',
  displayName: 'Entraide, suivi des vagues (demandeur)',
  previewData: {
    ownerFirstName: 'Marie',
    missionTitle: 'Promener Filou samedi après-midi',
    missionId: 'demo',
    message: "On prévient 3 autres personnes du coin.",
    responders: [
      { responseId: 'r1', firstName: 'Camille', distanceKm: 6, helpsWith: 'Promener les chiens', verified: true, exchangeDate: null, chooseToken: 'demo-camille' },
    ],
  },
}
