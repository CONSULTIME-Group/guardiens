import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  sitId?: string
  fieldsRemaining?: number
  nearbySittersCount?: number
  resumeUrl?: string
}

const SitDraftReminderEmail = ({
  firstName = '',
  fieldsRemaining = 3,
  nearbySittersCount = 0,
  resumeUrl = 'https://guardiens.fr/dashboard',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre annonce vous attend en brouillon</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Vous avez commencé une annonce chez Guardiens</Heading>
        <Text style={text}>Bonjour{firstName ? ` ${firstName}` : ''},</Text>
        <Text style={text}>
          Hier, vous avez commencé à rédiger une annonce pour faire garder vos
          animaux et votre maison. Elle vous attend en brouillon dans votre espace.
        </Text>
        <Text style={text}>
          Il vous reste environ {fieldsRemaining} champ{fieldsRemaining > 1 ? 's' : ''} à
          remplir pour la publier.
          {nearbySittersCount > 0
            ? ` ${nearbySittersCount} gardien${nearbySittersCount > 1 ? 's' : ''} vérifié${nearbySittersCount > 1 ? 's' : ''} dans un rayon de 30 km attendent une annonce comme la vôtre.`
            : ''}
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={resumeUrl} style={btn}>
            Reprendre mon annonce
          </Button>
        </Section>
        <Text style={textSmall}>
          Vous pouvez aussi supprimer ce brouillon depuis votre dashboard si vous
          préférez.
        </Text>
        <Text style={text}>À bientôt sur Guardiens,<br />Jérémie &amp; Elisa</Text>
        <LegalFooter purpose="du rappel de brouillon d'annonce" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SitDraftReminderEmail,
  subject: 'Vous avez commencé une annonce chez Guardiens',
  displayName: 'Rappel brouillon annonce (J+1)',
  previewData: {
    firstName: 'Camille',
    sitId: 'demo-sit-id',
    fieldsRemaining: 3,
    nearbySittersCount: 12,
    resumeUrl: 'https://guardiens.fr/sits/create?resume=demo-sit-id',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 25%)', lineHeight: '1.6', margin: '0 0 14px' }
const textSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.5', margin: '0 0 14px' }
const btn = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
