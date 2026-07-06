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
    <Preview>Une réponse à votre mission a été retirée</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Réponse retirée</Heading>
        <Text style={text}>
          {responderFirstName || 'Un membre'} a retiré sa réponse
          {missionTitle ? ` à « ${missionTitle} »` : ''}.
        </Text>
        <Text style={text}>
          Votre annonce reste ouverte, d'autres personnes peuvent encore vous proposer leur aide.
        </Text>
        {missionId && (
          <Button style={button} href={`${SITE_URL}/petites-missions/${missionId}`}>
            Voir ma mission
          </Button>
        )}
        <LegalFooter purpose="du bon fonctionnement du service d'entraide" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Réponse retirée sur « ${d.missionTitle || 'votre mission'} »`,
  displayName: 'Petite mission, réponse retirée',
  previewData: { responderFirstName: 'Camille', missionTitle: 'Arroser mes plantes' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
