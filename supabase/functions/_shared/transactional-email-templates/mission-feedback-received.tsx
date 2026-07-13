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
  metadata?: { positive?: boolean; comment?: string }
}

const Email = ({ actorName, missionTitle, missionId, metadata }: Props) => {
  const positive = metadata?.positive === true
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {positive ? 'Vous avez reçu un retour positif' : 'Vous avez reçu un retour'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>
            {positive ? 'Un retour positif vous attend' : 'Vous avez reçu un retour'}
          </Heading>
          <Text style={text}>
            {actorName || 'Un membre'} vous a laissé un feedback
            {missionTitle ? ` sur « ${missionTitle} »` : ''}.
          </Text>
          {metadata?.comment && (
            <Text style={quote}>« {metadata.comment} »</Text>
          )}
          <Text style={text}>
            Ces retours renforcent votre réputation sur Guardiens et rassurent les prochaines personnes qui souhaiteront vous aider.
          </Text>
          <Button style={button} href={`${SITE_URL}/profil`}>
            Voir mon profil
          </Button>
          <LegalFooter purpose="le bon fonctionnement du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d?.metadata?.positive
      ? `Retour positif reçu sur « ${d.missionTitle || 'une mission'} »`
      : `Nouveau retour reçu sur « ${d.missionTitle || 'une mission'} »`,
  displayName: 'Petite mission, retour reçu',
  previewData: {
    actorName: 'Camille',
    missionTitle: 'Arroser mes plantes',
    metadata: { positive: true, comment: 'Super moment, personne très fiable !' },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { fontSize: '15px', color: 'hsl(37, 7%, 25%)', lineHeight: '1.6', margin: '0 0 16px', padding: '12px 16px', borderLeft: '3px solid hsl(153, 42%, 30%)', backgroundColor: 'hsl(153, 42%, 96%)', fontStyle: 'italic' as const }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
