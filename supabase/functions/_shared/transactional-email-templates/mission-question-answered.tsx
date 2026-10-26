import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { missionQuestionsUrl } from '../mission-responders.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  authorFirstName?: string
  missionTitle?: string
  missionId?: string
  question?: string
  answer?: string
  deepLinkUrl?: string
}

/** Lot E24 : l'auteur du besoin a répondu à la question posée sur sa fiche. */
const Email = ({ authorFirstName, missionTitle, missionId, question, answer, deepLinkUrl }: Props) => {
  const who = authorFirstName || "L'auteur du besoin"
  const url = missionQuestionsUrl(missionId, deepLinkUrl)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`${who} a répondu à votre question`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{`${who} vous a répondu`}</Heading>
          <Text style={text}>
            Votre question{missionTitle ? ` sur « ${missionTitle} »` : ''} a sa réponse.
          </Text>
          {question && question.trim().length > 0 && (
            <Text style={muted}>Votre question : « {question} »</Text>
          )}
          {answer && answer.trim().length > 0 && (
            <Section style={quote}>
              <Text style={quoteText}>« {answer} »</Text>
            </Section>
          )}
          <Text style={text}>
            Si le coup de main vous tente, « Je peux » sur la fiche arrive chez {who} seul(e), et vous vous
            organisez ensemble dans la messagerie.
          </Text>
          <Button style={button} href={url}>
            Voir la fiche
          </Button>
          <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d.authorFirstName || "L'auteur du besoin"} a répondu à votre question`,
  displayName: 'Entraide, réponse à une question sur un besoin',
  previewData: {
    authorFirstName: 'Martine',
    missionTitle: 'Rempoter deux monsteras en douceur',
    missionId: 'demo',
    question: 'Les plantes vivent dedans ou sur un balcon ?',
    answer: 'Dedans, dans le salon. Une bâche serait parfaite, merci !',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const muted = { fontSize: '13px', color: '#888277', lineHeight: '1.5', margin: '0 0 8px' }
const quote = { backgroundColor: '#F3F7F4', borderRadius: '10px', padding: '12px 16px', margin: '0 0 16px' }
const quoteText = { fontSize: '15px', color: '#2C2A26', lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
