import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
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
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          en réponse à votre demande de contact (art. 6.1.b RGPD — exécution d'une mesure précontractuelle).
          Pour exercer vos droits (accès, rectification, suppression) : contact@guardiens.fr.
        </Text>
        <Text style={footer}>
          L'équipe {SITE_NAME} 🐾 —{' '}
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

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const blockquote = {
  fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5',
  borderLeft: '3px solid hsl(37, 22%, 89%)', padding: '8px 16px', margin: '16px 0',
}
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'none' }
