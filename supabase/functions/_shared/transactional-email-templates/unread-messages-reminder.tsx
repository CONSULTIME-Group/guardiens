import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Guardiens'
const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  unreadCount?: number
  conversationsCount?: number
  oldestUnreadDays?: number
  topSenderFirstName?: string
  conversationUrl?: string
  /** Si présent, active le variant "1 conversation" avec le contexte
   *  ("votre annonce X", "l'entraide Y", etc.). */
  contextLabel?: string
}

const UnreadMessagesReminderEmail = ({
  firstName,
  unreadCount = 1,
  conversationsCount = 1,
  oldestUnreadDays = 2,
  topSenderFirstName,
  conversationUrl,
  contextLabel,
}: Props) => {
  const link = conversationUrl || `${SITE_URL}/messages`
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const plural = unreadCount > 1 ? 's' : ''
  const convPlural = conversationsCount > 1 ? 's' : ''
  const senderMention = topSenderFirstName
    ? `Notamment ${topSenderFirstName} attend votre retour.`
    : ''

  // Variant "1 conversation contextualisée" : phrase courte demandée.
  const singleConversationVariant = Boolean(topSenderFirstName && contextLabel && conversationsCount <= 1)
  const singleBody = singleConversationVariant
    ? `${topSenderFirstName} vous a écrit au sujet de ${contextLabel}. Son message attend votre réponse.`
    : null

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`Vous avez ${unreadCount} message${plural} non lu${plural} sur ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Un message attend votre réponse</Heading>

          <Text style={text}>{greeting}</Text>

          {singleBody ? (
            <Text style={text}>{singleBody}</Text>
          ) : (
            <Text style={text}>
              Vous avez <strong>{unreadCount} message{plural} non lu{plural}</strong>
              {conversationsCount > 1 ? ` dans ${conversationsCount} conversation${convPlural}` : ''}
              {oldestUnreadDays >= 2 ? ` depuis ${oldestUnreadDays} jour${oldestUnreadDays > 1 ? 's' : ''}` : ''}.
              {senderMention ? ` ${senderMention}` : ''}
            </Text>
          )}

          <Text style={text}>
            Une réponse rapide augmente fortement vos chances de finaliser un échange.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={link}>Lire et répondre</Button>
          </Section>

          <Text style={hint}>
            Vous recevez ce rappel car ce message est resté non lu depuis plus de 24 heures. Vous pouvez ajuster vos préférences de notifications dans votre compte.
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
  component: UnreadMessagesReminderEmail,
  subject: (data: Record<string, any>) => {
    const n = Number(data?.unreadCount ?? 1)
    return n > 1
      ? `Vous avez ${n} messages non lus sur ${SITE_NAME}`
      : `Vous avez un message non lu sur ${SITE_NAME}`
  },
  displayName: 'Rappel messages non lus (48h)',
  previewData: {
    firstName: 'Patricia',
    unreadCount: 2,
    conversationsCount: 2,
    oldestUnreadDays: 8,
    topSenderFirstName: 'Camille',
    conversationUrl: 'https://guardiens.fr/messages',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '20px 0 0', fontStyle: 'italic' as const }
