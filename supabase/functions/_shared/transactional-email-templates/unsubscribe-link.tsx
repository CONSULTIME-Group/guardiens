import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  unsubscribeUrl?: string
}

const UnsubscribeLinkEmail = ({ unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre lien de désinscription Guardiens</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Heading style={h1} className="em-h1">Votre lien de désinscription</Heading>

        <Text style={text} className="em-text">
          Vous avez demandé à ne plus recevoir nos emails. Confirmez votre choix en ouvrant le
          lien ci-dessous. Vous pourrez couper l'ensemble des envois, ou seulement certaines
          catégories.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={unsubscribeUrl || 'https://guardiens.fr/unsubscribe'}>
            Confirmer ma désinscription
          </Button>
        </Section>

        <Text style={hint} className="em-hint">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message, aucune
          modification ne sera appliquée.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'exercice de votre droit d'opposition aux emails"
          basis="6.1.c"
          extra="Cet email est envoyé depuis une adresse qui ne reçoit pas de réponse."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#255B42', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#44413B', lineHeight: '1.65', margin: '0 0 16px' }
const hint = { fontSize: '13px', color: '#888277', lineHeight: '1.6', margin: '8px 0 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 12px' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }

export const template = {
  component: UnsubscribeLinkEmail,
  subject: 'Votre lien de désinscription Guardiens',
  displayName: 'Désinscription, lien de confirmation',
  previewData: { unsubscribeUrl: 'https://guardiens.fr/unsubscribe?token=exemple' },
} satisfies TemplateEntry
