import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface ContactReplyProps {
  firstName?: string
  originalMessage?: string
  replyBody?: string
}

const ContactReplyEmail = ({ firstName, originalMessage, replyBody }: ContactReplyProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réponse de l'équipe {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
        </Heading>
        <Text style={text}>Merci pour votre message.</Text>
        {originalMessage ? (
          <Text style={blockquote}>{originalMessage}</Text>
        ) : null}
        {replyBody ? (
          <Text style={text}>{replyBody}</Text>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          L'équipe {SITE_NAME} —{' '}
          <Link href="https://guardiens.fr" style={link}>guardiens.fr</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactReplyEmail,
  subject: (data: Record<string, any>) =>
    data.subject || `Re: Votre message à ${SITE_NAME}`,
  displayName: 'Réponse message contact',
  previewData: {
    firstName: 'Marie',
    originalMessage: 'Bonjour, je souhaite en savoir plus sur votre service.',
    replyBody: 'Merci pour votre intérêt ! Nous serions ravis de vous aider.',
    subject: 'Re: Demande d\'information',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#1a1a1a', lineHeight: '1.6', margin: '0 0 16px' }
const blockquote = {
  fontSize: '14px', color: '#6b7280', lineHeight: '1.5',
  borderLeft: '3px solid #e5e7eb', padding: '8px 16px', margin: '16px 0',
}
const hr = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#6b7280', margin: '0' }
const link = { color: '#2D6A4F', textDecoration: 'none' }
