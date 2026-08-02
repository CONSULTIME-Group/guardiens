import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName: string
  subject: string
  paragraphs: string[]
  ctaText?: string
  ctaLabel: string
  ctaUrl: string
  closingLine?: string
  signOff?: string
}

const FounderPersonalNoticeEmail = ({
  firstName,
  subject,
  paragraphs,
  ctaText,
  ctaLabel,
  ctaUrl,
  closingLine,
  signOff,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{subject}</Heading>
        <Text style={text}>Bonjour {firstName},</Text>
        {paragraphs.map((p, i) => (
          <Text style={text} key={i}>{p}</Text>
        ))}
        {ctaText ? <Text style={text}>{ctaText}</Text> : null}
        <Section style={ctaSection}>
          <Button style={button} href={ctaUrl}>{ctaLabel}</Button>
        </Section>
        {closingLine ? <Text style={text}>{closingLine}</Text> : null}
        <Text style={text}>{signOff || 'Jérémie, cofondateur Guardiens'}</Text>
        <Hr style={hr} />
        <LegalFooter purpose="du suivi de votre expérience sur Guardiens" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FounderPersonalNoticeEmail,
  subject: (data: Record<string, any>) => data.subject || 'Un point sur votre expérience Guardiens',
  displayName: 'Note personnelle du fondateur (one-off)',
  previewData: {
    firstName: 'Camille',
    subject: 'On a corrigé le bug qui vous a bloquée sur votre annonce',
    paragraphs: [
      "Vous avez commencé une annonce de garde sur Guardiens, sans aller au bout. On a trouvé pourquoi.",
      "À la première étape du formulaire, le bouton \"Ailleurs\" vous a redirigée vers l'espace Entraide sans votre accord.",
    ],
    ctaText: 'Votre annonce vous attend :',
    ctaLabel: 'Reprendre mon annonce',
    ctaUrl: 'https://guardiens.fr/sits/create',
    closingLine: 'Un souci ? Répondez à cet email, je le lis personnellement.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '20px 0 24px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
