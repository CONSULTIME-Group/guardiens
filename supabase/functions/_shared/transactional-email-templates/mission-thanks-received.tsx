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
  actorName?: string
  missionTitle?: string
  missionId?: string
}

const Email = ({ actorName, missionTitle, missionId }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Quelqu'un vous a remercié pour votre proposition</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Un merci vient d'arriver</Heading>
        <Text style={text}>
          {actorName || 'Un membre'} vous a remercié pour votre proposition
          {missionTitle ? ` sur « ${missionTitle} »` : ''}.
        </Text>
        <Text style={text}>
          Vos gestes d'entraide sont visibles par le reste de la communauté et renforcent votre réputation.
        </Text>
        {missionId && (
          <Button style={button} href={`${SITE_URL}/petites-missions/${missionId}`}>
            Voir la mission
          </Button>
        )}
        <LegalFooter purpose="le bon fonctionnement du service d'entraide" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Merci reçu sur « ${d.missionTitle || 'une mission'} »`,
  displayName: 'Petite mission, merci reçu',
  previewData: { actorName: 'Camille', missionTitle: 'Arroser mes plantes' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
