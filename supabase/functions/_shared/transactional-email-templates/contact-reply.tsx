import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface ContactReplyProps {
  firstName?: string
  originalMessage?: string
  replyBody?: string
}

const ContactReplyEmail = ({ firstName, originalMessage, replyBody }: ContactReplyProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Réponse de l'équipe {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
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
        <LegalFooter
          purpose="la réponse à votre demande de contact"
          basis="6.1.b"
        />
        </Container>
        </Body>
        </Html>
)

export const template = {
  component: ContactReplyEmail,
  subject: (data: Record<string, any>) =>
    data.subject || `Re : Votre message`,
  displayName: 'Réponse message contact',
  previewData: {
    firstName: 'Marie',
    originalMessage: 'Bonjour, je souhaite en savoir plus sur votre service.',
    replyBody: 'Merci pour votre intérêt ! Nous serions ravis de vous aider.',
    subject: 'Re : Demande d’information',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const blockquote = {
  fontSize: '13px', color: '#948E84', lineHeight: '1.5',
  borderLeft: '3px solid #E9E4DD', padding: '8px 16px', margin: '16px 0',
}
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const legal = { fontSize: '10px', color: '#A09B92', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#A09B92', margin: '10px 0 0' }
const link = { color: '#2C6D50', textDecoration: 'none' }
