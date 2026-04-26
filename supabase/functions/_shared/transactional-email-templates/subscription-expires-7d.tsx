import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface SubscriptionExpires7dProps {
  firstName?: string
  renewalDate?: string
}

const formatFrenchDate = (iso?: string): string | null => {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

const SubscriptionExpires7dEmail = ({ firstName = '', renewalDate }: SubscriptionExpires7dProps) => {
  const dateLabel = formatFrenchDate(renewalDate)
  return (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Plus que 7 jours sur votre abonnement {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Plus que 7 jours ⏳</Heading>
        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>
        <Text style={text}>
          Votre abonnement {SITE_NAME} expire dans <strong>7 jours</strong>
          {dateLabel ? <> (le <strong>{dateLabel}</strong>)</> : null}.
        </Text>
        <Text style={text}>
          Sans renouvellement, vous perdrez l'accès aux fonctionnalités premium. Renouvelez maintenant pour ne rien manquer.
        </Text>
        <Button style={button} href={`${SITE_URL}/mon-abonnement`}>
          Renouveler maintenant
        </Button>
        <Hr style={hr} />
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre de la gestion de votre abonnement (art. 6.1.b RGPD — exécution du contrat).
          Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: SubscriptionExpires7dEmail,
  subject: 'Plus que 7 jours sur votre abonnement',
  displayName: 'Abonnement expire dans 7 jours',
  previewData: { firstName: 'Marie', renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
