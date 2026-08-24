import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
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
  /** Lien profond authentifie, depose directement dans le fil concerne. */
  deepLinkUrl?: string
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
  deepLinkUrl,
}: Props) => {
  const { emoji, title } = labelByContext(contextType, recipientRole)
  const link = deepLinkUrl
    || (conversationId ? `${SITE_URL}/messages/${conversationId}` : `${SITE_URL}/messages`)
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
        <BrandHeader />
          <Heading style={h1}>{title} {emoji}</Heading>
          <Text style={text}>
            <strong>{sender}</strong>, {lead.replace(`${sender} `, '')}
          </Text>

          {hasDetails ? (
            <Section style={detailsBox}>
              {contextCity ? (
                <Text style={detailLine}><strong>Lieu :</strong> {contextCity}</Text>
              ) : null}
              {contextDates ? (
                <Text style={detailLine}><strong>Dates :</strong> {contextDates}</Text>
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
            <Button style={button} href={link}>Répondre à {sender}</Button>
          </Section>

          <Text style={note}>
            Toute la conversation se passe dans la messagerie Guardiens. Cliquez sur le bouton pour répondre directement dans le chat du site. Inutile de répondre à cet email, il n'est pas relevé.
          </Text>

        <LegalFooter
          purpose="la bonne marche du service de messagerie"
          basis="6.1.f"
        />
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
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const note = { ...text, fontSize: '12px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const detailsBox = { backgroundColor: '#F8F6F2', border: '1px solid #E9E4DD', padding: '12px 16px', margin: '8px 0 16px', borderRadius: '6px' }
const detailLine = { fontSize: '13px', color: '#564F43', lineHeight: '1.5', margin: '2px 0' }
const quoteBox = { borderLeft: '3px solid #2C6D50', backgroundColor: '#F4FBF8', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: '#2D5342', lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }
const legal = { fontSize: '10px', color: '#A09B92', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#A09B92', margin: '10px 0 0' }
