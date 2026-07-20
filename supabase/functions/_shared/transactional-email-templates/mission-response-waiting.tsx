import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  responderFirstName?: string
  missionTitle?: string
  missionId?: string
}

const Email = ({ responderFirstName, missionTitle, missionId }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Une proposition attend votre réponse</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Une proposition attend votre réponse</Heading>
        <Text style={text}>
          <strong>{responderFirstName || 'Un membre'}</strong> vous a proposé son aide
          {missionTitle ? ` pour « ${missionTitle} »` : ''} il y a plus de deux jours,
          et vous n'avez pas encore donné suite.
        </Text>
        <Text style={text}>
          Un simple retour, positif ou non, respecte le temps de la personne qui s'est manifestée
          et fait vivre l'entraide dans votre coin.
        </Text>
        <Button
          style={button}
          href={missionId ? `${SITE_URL}/petites-missions/${missionId}` : `${SITE_URL}/petites-missions`}
        >
          Voir la proposition
        </Button>
        <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Une proposition de ${d.responderFirstName || 'un membre'} attend votre réponse`,
  displayName: 'Petite mission, rappel réponse en attente 48h',
  previewData: {
    responderFirstName: 'Camille',
    missionTitle: 'Promenade du chien dimanche',
    missionId: 'demo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
