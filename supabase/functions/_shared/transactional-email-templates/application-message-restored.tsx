import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  sitTitle?: string
  ownerFirstName?: string
  conversationId?: string
}

const ApplicationMessageRestoredEmail = ({
  firstName,
  sitTitle,
  ownerFirstName,
  conversationId,
}: Props) => {
  const hello = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const owner = ownerFirstName || 'au propriétaire'
  const title = sitTitle || 'l\'annonce'
  const href = conversationId
    ? `${SITE_URL}/messages?c=${conversationId}`
    : `${SITE_URL}/messages`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Petit couac de notre côté sur votre candidature</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{hello}</Heading>
          <Text style={text}>
            Un incident technique de notre assistant de rédaction a altéré le
            message de votre candidature pour l'annonce «&nbsp;{title}&nbsp;».
            Nous l'avons remplacé par un texte provisoire, mais il ne vous
            ressemble pas. Guardiens démarre et ce genre de couac fait partie
            des débuts&nbsp;: nous sommes désolés.
          </Text>
          <Text style={text}>
            Votre candidature est toujours en attente, rien n'est perdu. Nous
            vous invitons à envoyer un message personnel à {owner} depuis votre
            messagerie pour vous présenter avec vos mots.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={href}>
              Écrire mon message
            </Button>
          </Section>
          <Text style={text}>
            Merci de votre patience,
            <br />
            Jérémie et Elisa
          </Text>
          <LegalFooter
            purpose="la gestion de votre candidature"
            basis="6.1.b"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationMessageRestoredEmail,
  subject: 'Petit couac de notre côté sur votre candidature',
  displayName: 'Candidature, message restauré (excuse)',
  previewData: {
    firstName: 'Iwona',
    sitTitle: 'Cherche personne de confiance pour prendre soin de mes deux Spitz',
    ownerFirstName: 'Rosyne',
    conversationId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(37, 12%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
