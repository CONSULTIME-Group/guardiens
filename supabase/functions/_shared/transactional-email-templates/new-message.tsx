import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'
import {
  buildLeadSentence,
  buildSubject,
  labelByContext,
  type Context,
  type RecipientRole,
} from './new-message.logic.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  senderFirstName?: string
  conversationId?: string
  contextType?: Context
  contextLabel?: string  // ex: "votre annonce « Garde de Léo »" / "l'annonce « ... »"
  contextCity?: string   // ex: "Lyon"
  contextDates?: string  // ex: "14 juin → 28 juin 2026"
  recipientRole?: RecipientRole
  messagePreview?: string
}


const NewMessageEmail = ({
  senderFirstName,
  conversationId,
  contextType,
  contextLabel,
  contextCity,
  contextDates,
  recipientRole,
  messagePreview,
}: Props) => {
  const { emoji, title } = labelByContext(contextType, recipientRole)
  const link = conversationId ? `${SITE_URL}/messages?c=${conversationId}` : `${SITE_URL}/messages`
  const sender = senderFirstName?.trim() || 'Un membre'
  const lead = buildLeadSentence(sender, contextType, recipientRole, contextLabel)

  // Bloc détails (ville + dates) — uniquement si on a des infos
  const hasDetails = Boolean(contextCity || contextDates)

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`${sender} vous a envoyé un message sur ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title} {emoji}</Heading>
          <Text style={text}>
            <strong>{sender}</strong> — {lead.replace(`${sender} `, '')}
          </Text>

          {hasDetails ? (
            <Section style={detailsBox}>
              {contextCity ? (
                <Text style={detailLine}><strong>📍 Lieu :</strong> {contextCity}</Text>
              ) : null}
              {contextDates ? (
                <Text style={detailLine}><strong>📅 Dates :</strong> {contextDates}</Text>
              ) : null}
            </Section>
          ) : null}

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
  subject: (data: Record<string, any>) => buildSubject(data),
  displayName: 'Nouveau message reçu (contextualisé)',
  previewData: {
    senderFirstName: 'Patricia',
    conversationId: 'demo-uuid',
    contextType: 'sit_application',
    contextLabel: 'l\'annonce « Tribu de 4 chats et 2 perroquets »',
    contextCity: 'Schweighouse-sur-Moder',
    contextDates: '14 juin → 28 juin 2026',
    recipientRole: 'sitter',
    messagePreview: 'Bonjour, seriez-vous disponible pour une rencontre avant la garde ?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const detailsBox = { backgroundColor: 'hsl(37, 30%, 96%)', border: '1px solid hsl(37, 22%, 89%)', padding: '12px 16px', margin: '8px 0 16px', borderRadius: '6px' }
const detailLine = { fontSize: '13px', color: 'hsl(37, 12%, 30%)', lineHeight: '1.5', margin: '2px 0' }
const quoteBox = { borderLeft: '3px solid hsl(153, 42%, 30%)', backgroundColor: 'hsl(153, 42%, 97%)', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: 'hsl(153, 30%, 25%)', lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
