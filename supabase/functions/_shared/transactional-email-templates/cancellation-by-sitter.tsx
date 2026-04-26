import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  cancellerFirstName?: string
  sitTitle?: string
  startDate?: string
  reason?: string
}

const CancellationBySitterEmail = ({ cancellerFirstName, sitTitle, startDate, reason }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{cancellerFirstName || 'Le gardien'} a annulé la garde</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Garde annulée par le gardien</Heading>
        <Text style={text}>
          <strong>{cancellerFirstName || 'Le gardien'}</strong> a annulé la garde
          {sitTitle ? ` "${sitTitle}"` : ''}{startDate ? ` prévue le ${startDate}` : ''}.
        </Text>
        <Text style={text}>
          <strong>Raison :</strong> {reason || 'Non précisée'}
        </Text>
        <Text style={text}>
          Votre annonce a été automatiquement remise en ligne. Un avis d'annulation sera soumis à modération.
        </Text>
        <Button style={button} href={`${SITE_URL}/recherche-gardiens`}>
          Trouver un autre gardien
        </Button>
        <Hr style={hr} />
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre du suivi de votre garde (art. 6.1.b RGPD — exécution du contrat).
          Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CancellationBySitterEmail,
  subject: (data: Record<string, any>) =>
    `${data.cancellerFirstName || 'Le gardien'} a annulé la garde`,
  displayName: 'Annulation par le gardien',
  previewData: { cancellerFirstName: 'Lucas', sitTitle: 'Garde chiens Lyon', startDate: '20 août', reason: 'Un imprévu personnel m\'empêche de me rendre disponible pour cette garde.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
