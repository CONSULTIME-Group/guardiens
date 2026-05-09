import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section,
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
    <Preview>Votre première candidature attend toujours</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Prêt pour votre première mission&nbsp;?</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Vous êtes inscrit comme gardien depuis quelques semaines, mais vous n'avez pas encore
          envoyé de candidature. C'est souvent l'étape la plus intimidante — pourtant la plupart
          des propriétaires répondent dans les 48&nbsp;heures.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Comment maximiser vos chances&nbsp;:</Text>
          <Text style={cardLine}>· Postulez sur 2 ou 3 annonces qui vous correspondent</Text>
          <Text style={cardLine}>· Personnalisez votre message en parlant des animaux concernés</Text>
          <Text style={cardLine}>· Précisez vos disponibilités exactes</Text>
        </Section>

        <Button style={button} href={`${SITE_URL}/recherche`}>Trouver une garde</Button>

        <Text style={muted}>
          Une question avant de vous lancer&nbsp;? Notre équipe est joignable depuis la page
          contact.
        </Text>

        <LegalFooter
          purpose="de l'accompagnement de votre activation"
          basis="6.1.f"
          extra="Vous recevez ce message car votre compte gardien n'a pas encore donné lieu à une candidature. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' as const }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, marginBottom: '16px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px', marginBottom: '12px' }
const card = { backgroundColor: '#f7f5ee', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardTitle = { color: '#1a1a1a', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: '#444', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
const button = {
  backgroundColor: '#1a1a1a', color: '#ffffff', padding: '12px 22px', borderRadius: '8px',
  textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '8px',
}
const muted = { color: '#666', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }

export const template: TemplateEntry = {
  component: SitterEncourageCandidatureEmail,
  subject: 'Prêt pour votre première mission — Guardiens',
  displayName: 'Gardien sans candidature — encouragement',
  previewData: { firstName: 'Camille' },
}
