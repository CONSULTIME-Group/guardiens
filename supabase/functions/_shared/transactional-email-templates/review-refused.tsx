import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot A9 : motif de refus d'un avis, envoyé à son auteur.

interface ReviewRefusedProps {
  firstName?: string
  reason?: string
}

const ReviewRefusedEmail = ({ firstName, reason }: ReviewRefusedProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre avis reste en attente de modification</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre avis attend une modification</Heading>
        <Text style={text}>{firstName ? `Bonjour ${firstName},` : 'Bonjour,'}</Text>
        <Text style={text}>
          Merci d'avoir pris le temps de partager votre expérience. Après relecture, votre avis reste hors ligne pour la raison suivante :
        </Text>
        {reason ? <Text style={noteText}>{reason}</Text> : null}
        <Hr style={hr} />
        <Text style={text}>
          Pour toute question, répondez simplement à cet email : Elisa et Jérémie vous lisent.
        </Text>
        <LegalFooter purpose="la modération de la communauté" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewRefusedEmail,
  subject: 'Votre avis reste hors ligne',
  displayName: 'Avis refusé',
  previewData: { firstName: 'Camille', reason: "L'avis cite le nom de famille d'un tiers." },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const noteText = { fontSize: '14px', color: '#1D1B16', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#F1EEE9', borderRadius: '8px', whiteSpace: 'pre-line' as const }
