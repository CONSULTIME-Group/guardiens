import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.lovable.app"

interface Props { senderFirstName?: string }

const NewMessageEmail = ({ senderFirstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous avez un nouveau message de {senderFirstName || 'un membre'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau message 💬</Heading>
        <Text style={text}>
          <strong>{senderFirstName || 'Un membre'}</strong> vous a envoyé un message sur {SITE_NAME}.
        </Text>
        <Text style={text}>
          Connectez-vous pour lire et répondre à ce message.
        </Text>
        <Button style={button} href={`${SITE_URL}/messages`}>
          Lire le message
        </Button>
        <Hr style={hr} />
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) =>
    `Vous avez un nouveau message de ${data.senderFirstName || 'un membre'}`,
  displayName: 'Nouveau message non lu',
  previewData: { senderFirstName: 'Thomas' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '30px 0 0' }
