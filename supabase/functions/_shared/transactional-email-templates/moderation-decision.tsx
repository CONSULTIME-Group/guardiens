import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot A9 : décision de modération envoyée au membre concerné.
// N'affiche que le message rédigé pour le membre (reports.member_message),
// jamais la note interne de l'équipe.

export type ModerationAction = 'warn' | 'hide' | 'suspend' | 'delete'
export type ModerationTarget = 'profile' | 'listing' | 'review' | 'message' | 'small_mission'

interface ModerationDecisionProps {
  firstName?: string
  action?: ModerationAction
  targetType?: ModerationTarget
  memberMessage?: string
}

export function moderationDecisionLine(action?: ModerationAction, target?: ModerationTarget): string {
  const t = target ?? 'profile'
  const hidden: Record<ModerationTarget, string> = {
    profile: 'Votre profil a été masqué par la modération.',
    listing: 'Votre annonce a été masquée par la modération.',
    review: 'Votre avis a été masqué par la modération.',
    message: 'Un de vos messages a été masqué par la modération.',
    small_mission: "Votre demande d'entraide a été masquée par la modération.",
  }
  const deleted: Record<ModerationTarget, string> = {
    profile: 'Votre profil a été retiré par la modération.',
    listing: 'Votre annonce a été supprimée par la modération.',
    review: 'Votre avis a été supprimé par la modération.',
    message: 'Un de vos messages a été supprimé par la modération.',
    small_mission: "Votre demande d'entraide a été supprimée par la modération.",
  }
  const about: Record<ModerationTarget, string> = {
    profile: 'votre profil',
    listing: 'votre annonce',
    review: 'votre avis',
    message: 'un de vos messages',
    small_mission: "votre demande d'entraide",
  }
  switch (action) {
    case 'hide': return hidden[t]
    case 'delete': return deleted[t]
    case 'suspend': return 'Votre compte est suspendu par la modération.'
    default: return `La modération vous adresse un avertissement au sujet de ${about[t]}.`
  }
}

const ModerationDecisionEmail = ({ firstName, action, targetType, memberMessage }: ModerationDecisionProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Décision de modération Guardiens</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Décision de modération</Heading>
        <Text style={text}>{firstName ? `Bonjour ${firstName},` : 'Bonjour,'}</Text>
        <Text style={decision}>{moderationDecisionLine(action, targetType)}</Text>
        {memberMessage ? (
          <>
            <Hr style={hr} />
            <Text style={noteLabel}>Message de l'équipe :</Text>
            <Text style={noteText}>{memberMessage}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={text}>
          Pour toute question sur cette décision, répondez simplement à cet email : Elisa et Jérémie vous lisent.
        </Text>
        <LegalFooter purpose="la modération de la communauté" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ModerationDecisionEmail,
  subject: 'Décision de modération Guardiens',
  displayName: 'Décision de modération',
  previewData: {
    firstName: 'Camille',
    action: 'hide',
    targetType: 'listing',
    memberMessage: 'Votre annonce mentionnait un tarif. Retirez cette mention et nous la remettrons en ligne.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const decision = { fontSize: '15px', color: '#1D1B16', fontWeight: 'bold' as const, lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const noteLabel = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1D1B16', margin: '0 0 6px' }
const noteText = { fontSize: '14px', color: '#1D1B16', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#F1EEE9', borderRadius: '8px', whiteSpace: 'pre-line' as const }
