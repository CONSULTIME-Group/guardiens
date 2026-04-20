import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

type Context = 'sit_application' | 'sitter_inquiry' | 'mission_help' | 'owner_pitch' | 'long_stay' | undefined

interface Props {
  senderFirstName?: string
  conversationId?: string
  contextType?: Context
  contextLabel?: string  // ex: "votre annonce « Garde de Léo »"
  messagePreview?: string
}

const labelByContext = (ctx: Context): { emoji: string; title: string } => {
  switch (ctx) {
    case 'sit_application': return { emoji: '🏡', title: 'Nouvelle candidature' }
    case 'sitter_inquiry':  return { emoji: '💬', title: 'Demande de disponibilité' }
    case 'mission_help':    return { emoji: '🤝', title: 'Proposition d\'entraide' }
    case 'owner_pitch':     return { emoji: '✋', title: 'Un gardien vous contacte' }
    case 'long_stay':       return { emoji: '📆', title: 'Candidature longue durée' }
    default:                return { emoji: '💬', title: 'Nouveau message' }
  }
}

const NewMessageEmail = ({ senderFirstName, conversationId, contextType, contextLabel, messagePreview }: Props) => {
  const { emoji, title } = labelByContext(contextType)
  const link = conversationId ? `${SITE_URL}/messages?c=${conversationId}` : `${SITE_URL}/messages`
  const sender = senderFirstName?.trim() || 'Un membre'

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`${sender} vous a envoyé un message sur ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title} {emoji}</Heading>
          <Text style={text}>
            <strong>{sender}</strong> vous a envoyé un message{contextLabel ? ` concernant ${contextLabel}` : ''}.
          </Text>

          {messagePreview ? (
            <Section style={quoteBox}>
              <Text style={quoteText}>« {messagePreview} »</Text>
            </Section>
          ) : null}

          <Text style={text}>
            Connectez-vous pour lire et répondre. Une réponse rapide augmente fortement vos chances de finaliser un échange.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={link}>Lire et répondre</Button>
          </Section>

          <Hr style={hr} />
          <Text style={legal}>
            Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
            dans le cadre de l'intérêt légitime lié au bon fonctionnement du service de messagerie (art. 6.1.f RGPD).
            Pour exercer vos droits : contact@guardiens.fr.
          </Text>
          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) => {
    const sender = data.senderFirstName || 'Un membre'
    switch (data.contextType) {
      case 'sit_application': return `${sender} candidate à votre garde`
      case 'sitter_inquiry':  return `${sender} vous demande votre disponibilité`
      case 'mission_help':    return `${sender} propose son aide pour votre mission`
      case 'owner_pitch':     return `${sender} souhaite vous proposer ses services`
      case 'long_stay':       return `${sender} candidate à votre garde longue durée`
      default:                return `Vous avez un nouveau message de ${sender}`
    }
  },
  displayName: 'Nouveau message reçu (contextualisé)',
  previewData: {
    senderFirstName: 'Thomas',
    conversationId: 'demo-uuid',
    contextType: 'sit_application',
    contextLabel: 'votre annonce « Garde de Léo, week-end du 12 mai »',
    messagePreview: 'Bonjour, je serais ravi de garder Léo. J\'ai déjà 8 expériences sur Guardiens et je vis à 10 min en voiture.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const quoteBox = { borderLeft: '3px solid hsl(153, 42%, 30%)', backgroundColor: 'hsl(153, 42%, 97%)', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: 'hsl(153, 30%, 25%)', lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
