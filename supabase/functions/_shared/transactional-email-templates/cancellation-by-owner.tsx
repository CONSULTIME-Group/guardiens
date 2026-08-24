import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  cancellerFirstName?: string
  sitTitle?: string
  startDate?: string
  reason?: string
}

const CancellationByOwnerEmail = ({ cancellerFirstName, sitTitle, startDate, reason }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre garde {startDate ? `du ${startDate} ` : ''}a été annulée</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Garde annulée</Heading>
        <Text style={text}>
          <strong>{cancellerFirstName || 'Le propriétaire'}</strong> a annulé la garde
          {sitTitle ? ` "${sitTitle}"` : ''}{startDate ? ` prévue le ${startDate}` : ''}.
        </Text>
        <Text style={text}>
          <strong>Raison :</strong> {reason || 'Non précisée'}
        </Text>
        <Text style={text}>
          Un avis d'annulation sera soumis à modération puis publié sur son profil. Vous pourrez y répondre dans les 7 jours.
        </Text>
        <Button style={button} href={`${SITE_URL}/recherche`}>
          Trouver une autre garde
        </Button>
        <LegalFooter
          purpose="l'accompagnement de votre garde"
          basis="6.1.b"
        />
      </Container>
      </Body>
      </Html>
)

export const template = {
  component: CancellationByOwnerEmail,
  subject: (data: Record<string, any>) =>
    `Votre garde${data.startDate ? ` du ${data.startDate}` : ''} a été annulée`,
  displayName: 'Annulation par le propriétaire',
  previewData: { cancellerFirstName: 'Marie', sitTitle: 'Garde chat Paris', startDate: '15 juillet', reason: 'Changement de plans, nous ne partons plus en vacances finalement.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: '#A09B92', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#A09B92', margin: '10px 0 0' }
