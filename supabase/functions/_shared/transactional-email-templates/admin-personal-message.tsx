import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { splitParagraphs } from '../admin-personal-message.ts'
import type { TemplateEntry } from './registry.ts'

// Message personnel écrit par un admin à un seul membre (lot M1).
// Texte libre, signé à la main, lien optionnel.

interface Props {
  subject?: string
  body?: string
  linkLabel?: string
  linkUrl?: string
}

const CREAM = '#FAF8F5'
const INK = '#1D1B16'
const PINE = '#2C6D50'
const LINE = '#EDE7DE'
const TEXT_FONT = "'Outfit', Arial, sans-serif"
const DISPLAY = "'Playfair Display', Georgia, serif"

const AdminPersonalMessageEmail = ({ subject, body = '', linkLabel, linkUrl }: Props) => {
  const paragraphs = splitParagraphs(body)
  const preview = paragraphs[0]?.join(' ') || subject || 'Un message de Guardiens'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />
          {paragraphs.map((lines, i) => (
            <Text key={i} style={text} className="em-text">
              {lines.map((line, j) => (
                <React.Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  {line}
                </React.Fragment>
              ))}
            </Text>
          ))}
          {linkLabel && linkUrl ? (
            <Section style={ctaSection} className="em-cta">
              <Button style={button} href={linkUrl} className="em-btn">{linkLabel}</Button>
            </Section>
          ) : null}
          <Text style={signName}>Jérémie, Guardiens</Text>
          <LegalFooter purpose="du suivi de votre compte Guardiens" signoff={false} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminPersonalMessageEmail,
  subject: (data: Record<string, any>) => data.subject || 'Un message de Guardiens',
  displayName: 'Message personnel à un membre',
  previewData: {
    subject: 'Votre annonce est en ligne',
    body: 'Bonjour Camille,\n\nVotre annonce est en ligne depuis ce matin.\nLes gardiens de votre secteur sont prévenus.\n\nBelle journée à vous,',
    linkLabel: 'Voir mon annonce',
    linkUrl: 'https://guardiens.fr/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: CREAM, fontFamily: TEXT_FONT, margin: 0, padding: '24px 0' }
const container = {
  padding: '28px 28px 24px',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: `1px solid ${LINE}`,
}
const text = { fontSize: '15px', color: INK, lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: PINE,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '13px 26px',
  textDecoration: 'none',
}
const signName = { fontFamily: DISPLAY, fontSize: '17px', color: INK, margin: '8px 0 0' }
