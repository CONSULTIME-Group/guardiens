import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  responderFirstName?: string
  profileUrl?: string
}

const CancellationResponsePublishedEmail = ({ responderFirstName, profileUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{responderFirstName || 'Un membre'} a répondu à votre avis</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Réponse à votre avis</Heading>
        <Text style={text}>
          <strong>{responderFirstName || 'Un membre'}</strong> a répondu à votre avis d'annulation. La réponse a été validée et est désormais visible sur son profil.
        </Text>
        <Button style={button} href={profileUrl || `${SITE_URL}/dashboard`}>
          Voir la réponse
        </Button>
        <Hr style={hr} />
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre de la gestion des avis (art. 6.1.f RGPD — intérêt légitime).
          Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CancellationResponsePublishedEmail,
  subject: (data: Record<string, any>) =>
    `${data.responderFirstName || 'Un membre'} a répondu à votre avis`,
  displayName: 'Réponse à avis d\'annulation publiée',
  previewData: { responderFirstName: 'Lucas', profileUrl: 'https://guardiens.fr/gardiens/456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
