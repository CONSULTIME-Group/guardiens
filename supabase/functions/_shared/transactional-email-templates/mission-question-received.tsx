import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { authorMissionUrl } from '../mission-responders.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  askerFirstName?: string
  missionTitle?: string
  missionId?: string
  question?: string
  deepLinkUrl?: string
}

/**
 * Lot E24 : une question a été posée sur la fiche du besoin. L'auteur y répond
 * sous la question, sur la fiche ; sa réponse se lit par tous.
 */
const Email = ({ askerFirstName, missionTitle, missionId, question, deepLinkUrl }: Props) => {
  const who = askerFirstName || 'Un membre'
  const url = authorMissionUrl(missionId, deepLinkUrl)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`${who} a une question sur votre besoin`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une question sur votre besoin</Heading>
          <Text style={text}>
            <strong>{who}</strong> a posé une question{missionTitle ? ` sur « ${missionTitle} »` : ''}.
          </Text>
          {question && question.trim().length > 0 && (
            <Section style={quote}>
              <Text style={quoteText}>« {question} »</Text>
            </Section>
          )}
          <Text style={text}>
            Votre réponse s'affiche sous la question, sur la fiche. Elle aide aussi les autres personnes
            prévenues à se décider.
          </Text>
          <Button style={button} href={url}>
            Répondre sur la fiche
          </Button>
          <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d.askerFirstName || 'Un membre'} a une question sur votre besoin`,
  displayName: 'Entraide, question reçue sur un besoin',
  previewData: {
    askerFirstName: 'Karim',
    missionTitle: 'Rempoter deux monsteras en douceur',
    missionId: 'demo',
    question: "Les plantes vivent dedans ou sur un balcon ? J'apporte une bâche si c'est à l'intérieur.",
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { backgroundColor: '#FBF6EC', borderRadius: '10px', padding: '12px 16px', margin: '0 0 16px' }
const quoteText = { fontSize: '15px', color: '#2C2A26', lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
