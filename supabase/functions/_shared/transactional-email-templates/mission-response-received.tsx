import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { ResponderList } from './_responder-list.tsx'
import { normalizeResponders } from '../mission-responders.ts'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  responderFirstName?: string
  missionTitle?: string
  missionId?: string
  messagePreview?: string
  /** Lot E17 : répondants en attente, chacun avec son jeton de choix (mission_pending_responders). */
  responders?: unknown
}

const Email = ({ responderFirstName, missionTitle, missionId, messagePreview, responders }: Props) => {
  const list = normalizeResponders(responders)
  const pageUrl = missionId ? `${SITE_URL}/petites-missions/${missionId}` : `${SITE_URL}/petites-missions`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {responderFirstName || 'Un membre'} vous propose son aide pour « {missionTitle || 'votre besoin'} »
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une personne vous propose son aide</Heading>
          {list.length > 0 ? (
            <>
              <Text style={text}>
                <strong>{responderFirstName || 'Un membre'}</strong> vient de répondre à votre besoin
                {missionTitle ? ` « ${missionTitle} »` : ''}.
              </Text>
              {messagePreview && messagePreview.trim().length > 0 && (
                <Section style={quote}>
                  <Text style={quoteText}>« {messagePreview} »</Text>
                </Section>
              )}
              <ResponderList
                responders={list}
                intro={list.length > 1 ? 'Les personnes prêtes à vous aider :' : undefined}
              />
              <Button style={buttonGhost} href={pageUrl}>
                Voir mon besoin
              </Button>
            </>
          ) : (
            <>
              <Text style={text}>
                <strong>{responderFirstName || 'Un membre'}</strong> vient de répondre à votre annonce
                {missionTitle ? ` « ${missionTitle} »` : ''}.
              </Text>
              {messagePreview && messagePreview.trim().length > 0 && (
                <Section style={quote}>
                  <Text style={quoteText}>« {messagePreview} »</Text>
                </Section>
              )}
              <Text style={text}>
                Cette proposition n'est visible que par vous. Prenez le temps de la lire, puis retenez
                la personne qui vous convient pour organiser les détails par messagerie.
              </Text>
              <Button style={button} href={pageUrl}>
                Voir la proposition
              </Button>
            </>
          )}
          <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d.responderFirstName || 'Un membre'} vous propose son aide`,
  displayName: 'Petite mission, réponse reçue (auteur prévenu)',
  previewData: {
    responderFirstName: 'Camille',
    missionTitle: 'Promenade du chien dimanche',
    missionId: 'demo',
    messagePreview: 'Bonjour, je peux passer dimanche vers 10h, j\'habite juste à côté.',
    responders: [
      { responseId: 'r1', firstName: 'Camille', distanceKm: 3, helpsWith: 'Promener les chiens, arroser le potager', verified: true, exchangeDate: '2026-11-02', chooseToken: 'demo-camille' },
      { responseId: 'r2', firstName: 'Karim', distanceKm: 11, helpsWith: null, verified: false, exchangeDate: null, chooseToken: 'demo-karim' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { backgroundColor: '#F7F5F3', borderLeft: '3px solid #2C6D50', padding: '12px 16px', borderRadius: '6px', margin: '0 0 20px' }
const quoteText = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', fontStyle: 'italic' as const, margin: 0 }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const buttonGhost = { ...button, backgroundColor: '#F8F6F1', color: '#2C6D50' }
