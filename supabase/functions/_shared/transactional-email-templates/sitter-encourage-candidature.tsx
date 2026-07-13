import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
}

const SitterEncourageCandidatureEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Lancez-vous, la première candidature est la plus dure</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Prêt pour votre première mission&nbsp;?</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Vous êtes inscrit comme gardien depuis quelques jours, mais vous n'avez pas encore
          envoyé de candidature. C'est souvent l'étape la plus intimidante — pourtant la plupart
          des propriétaires répondent dans les 48&nbsp;heures.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Comment maximiser vos chances&nbsp;:</Text>
          <Text style={cardLine}>· Postulez sur 2 ou 3 annonces qui vous correspondent</Text>
          <Text style={cardLine}>· Personnalisez votre message en parlant des animaux concernés</Text>
          <Text style={cardLine}>· Précisez vos disponibilités exactes</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/recherche`}>Trouver une garde</Button>
        </Section>

        <Text style={muted}>
          Une question avant de vous lancer&nbsp;? Notre équipe est joignable depuis la page contact.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement de votre activation"
          basis="6.1.f"
          extra="Vous recevez ce message car votre compte gardien n'a pas encore donné lieu à une candidature. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: 'hsl(40, 33%, 96%)', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardTitle = { color: 'hsl(153, 42%, 30%)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: 'hsl(37, 7%, 30%)', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
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
const muted = { color: 'hsl(37, 7%, 50%)', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }

export const template: TemplateEntry = {
  component: SitterEncourageCandidatureEmail,
  subject: 'Prêt pour votre première mission — Guardiens',
  displayName: 'Gardien sans candidature — encouragement',
  previewData: { firstName: 'Camille' },
}
