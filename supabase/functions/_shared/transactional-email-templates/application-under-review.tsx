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
  sitterFirstName?: string
  sitTitle?: string
  ownerFirstName?: string
}

const ApplicationUnderReviewEmail = ({ sitterFirstName, sitTitle, ownerFirstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre candidature a bien été vue</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre candidature a bien été vue</Heading>
        <Text style={text}>
          Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
        </Text>
        <Text style={text}>
          {ownerFirstName || 'Le propriétaire'} a lu votre candidature
          {sitTitle ? <> pour «&nbsp;{sitTitle}&nbsp;»</> : null} et prend le temps de décider.
          Votre candidature reste en cours.
        </Text>
        <Text style={text}>
          Rien à faire de votre côté pour le moment. Vous recevrez un message dès que la décision sera prise.
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/recherche`}>
            Voir d'autres annonces
          </Button>
        </Section>
        <Hr style={hr} />
        <LegalFooter purpose="le suivi de votre candidature" basis="6.1.b" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationUnderReviewEmail,
  subject: 'Votre candidature a bien été vue',
  displayName: 'Candidature vue, décision en cours',
  previewData: {
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    ownerFirstName: 'Claire',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 18px' }
const text = { fontSize: '15px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '26px 0 8px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }
