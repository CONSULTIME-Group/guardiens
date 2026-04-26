import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface SubscriptionExpires30dProps {
  firstName?: string
  renewalDate?: string // ISO date string
}

const formatFrenchDate = (iso?: string): string => {
  if (!iso) return 'votre prochaine échéance'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'votre prochaine échéance'
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return 'votre prochaine échéance'
  }
}

const SubscriptionExpires30dEmail = ({ firstName = '', renewalDate }: SubscriptionExpires30dProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre abonnement {SITE_NAME} se renouvelle dans 30 jours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Renouvellement dans 30 jours</Heading>
        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>
        <Text style={text}>
          Votre abonnement {SITE_NAME} sera renouvelé automatiquement le{' '}
          <strong>{formatFrenchDate(renewalDate)}</strong> au tarif de <strong>9€/mois</strong>.
        </Text>
        <Text style={text}>
          Si vous souhaitez résilier avant cette date, c'est simple :
        </Text>
        <Button style={button} href={`${SITE_URL}/mon-abonnement`}>
          Gérer mon abonnement
        </Button>
        <Hr style={hr} />
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre de la gestion de votre abonnement (art. 6.1.b RGPD — exécution du contrat).
          Conformément à l'article L. 215-1 du Code de la consommation, vous êtes informé(e) du renouvellement
          automatique de votre abonnement. Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionExpires30dEmail,
  subject: 'Votre abonnement Guardiens se renouvelle dans 30 jours',
  displayName: 'Renouvellement abonnement dans 30 jours',
  previewData: { firstName: 'Marie', renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
