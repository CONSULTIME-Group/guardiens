import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.lovable.app"

const SubscriptionExpires30dEmail = () => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre abonnement {SITE_NAME} expire dans 30 jours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Votre abonnement expire bientôt</Heading>
        <Text style={text}>
          Votre abonnement {SITE_NAME} expirera dans <strong>30 jours</strong>.
        </Text>
        <Text style={text}>
          Pour continuer à profiter de toutes les fonctionnalités (messagerie, candidatures, gardes longue durée), pensez à le renouveler.
        </Text>
        <Button style={button} href={`${SITE_URL}/mon-abonnement`}>
          Gérer mon abonnement
        </Button>
        <Hr style={hr} />
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionExpires30dEmail,
  subject: 'Votre abonnement Guardiens expire dans 30 jours',
  displayName: 'Abonnement expire dans 30 jours',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '30px 0 0' }
