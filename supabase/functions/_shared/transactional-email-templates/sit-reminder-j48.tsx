import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  role?: 'owner' | 'sitter'
  counterpartFirstName?: string
  sitTitle?: string
  sitId?: string
}

const SitReminderJ48 = ({ firstName, role, counterpartFirstName, sitTitle, sitId }: Props) => {
  const isOwner = role === 'owner'
  const lead = isOwner
    ? `Plus que 48 heures avant l'arrivée de ${counterpartFirstName || 'votre gardien'}${sitTitle ? ` pour la garde « ${sitTitle} »` : ''}.`
    : `Plus que 48 heures avant votre garde${sitTitle ? ` « ${sitTitle} »` : ''} chez ${counterpartFirstName || 'votre propriétaire'}.`
  const advice = isOwner
    ? 'Assurez-vous que le guide de la maison est complet, accessible et à jour.'
    : 'Vérifiez les dernières consignes dans le guide de la maison et confirmez votre heure d\'arrivée.'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre garde commence dans 48 heures</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Votre garde commence dans 48 heures</Heading>
          <Text style={text}>Bonjour {firstName || ''},</Text>
          <Text style={text}>{lead}</Text>
          <Section style={card}>
            <Text style={cardLine}>{advice}</Text>
          </Section>
          <Button style={button} href={`${SITE_URL}/sits/${sitId || ''}`}>Voir la garde</Button>
          <LegalFooter purpose="le suivi de votre garde imminente" basis="6.1.b" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SitReminderJ48,
  subject: 'Votre garde commence dans 48 heures',
  displayName: 'Rappel garde J-2',
  previewData: {
    firstName: 'Camille',
    role: 'sitter',
    counterpartFirstName: 'Alex',
    sitTitle: 'Garde de Mistigri',
    sitId: 'demo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 14px' }
const card = { backgroundColor: 'hsl(37, 35%, 96%)', borderRadius: '8px', padding: '14px 16px', margin: '12px 0 20px' }
const cardLine = { fontSize: '13px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: 0 }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
