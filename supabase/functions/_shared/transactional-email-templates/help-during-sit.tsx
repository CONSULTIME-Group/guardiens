import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface Props {
  sitTitle?: string
  senderName?: string
  category?: 'animal' | 'logement' | 'urgence'
  messageExcerpt?: string
  conversationHref?: string
}

const categoryLabel: Record<string, string> = {
  animal: "Question sur l'animal",
  logement: 'Question sur le logement',
  urgence: 'URGENCE',
}

const HelpDuringSitEmail = ({
  sitTitle, senderName, category = 'urgence', messageExcerpt, conversationHref,
}: Props) => {
  const isUrgent = category === 'urgence'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {isUrgent
          ? 'Urgence pendant la garde, réponse attendue rapidement.'
          : 'Une question vous a été adressée pendant la garde.'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={isUrgent ? h1Urgent : h1}>
            {isUrgent ? 'Urgence pendant la garde' : 'Une question pendant la garde'}
          </Heading>
          <Text style={text}>
            {senderName || 'La personne concernée'} vous a envoyé un message
            {sitTitle ? ` au sujet de « ${sitTitle} »` : ''}.
          </Text>
          <Text style={text}>
            Catégorie : {categoryLabel[category] || category}
          </Text>
          {messageExcerpt ? (
            <Text style={quote}>« {messageExcerpt} »</Text>
          ) : null}
          <Button style={isUrgent ? buttonUrgent : button} href={conversationHref || `${SITE_URL}/messages`}>
            Ouvrir la conversation
          </Button>
          <LegalFooter
            purpose="l'échange avec votre interlocuteur pendant la garde"
            basis="6.1.b"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: HelpDuringSitEmail,
  subject: (data: Record<string, any>) =>
    data?.category === 'urgence'
      ? '[URGENCE] Message pendant la garde'
      : 'Message pendant la garde',
  displayName: 'Aide pendant la garde',
  previewData: {
    sitTitle: 'Garde chat Paris 11e',
    senderName: 'Julie',
    category: 'urgence',
    messageExcerpt: "Le chat n'a pas mangé depuis ce matin, comportement inhabituel.",
    conversationHref: `${SITE_URL}/messages`,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 18px' }
const h1Urgent = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(0, 72%, 42%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 14px' }
const quote = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 18px', padding: '10px 14px', borderLeft: '3px solid hsl(37, 22%, 80%)', background: 'hsl(37, 22%, 97%)' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const buttonUrgent = { backgroundColor: 'hsl(0, 72%, 42%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
