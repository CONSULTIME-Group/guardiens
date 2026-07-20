import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  answererFirstName?: string
  questionTitle?: string
  questionId?: string
  bodyPreview?: string
}

const Email = ({ answererFirstName, questionTitle, questionId, bodyPreview }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      {answererFirstName || 'Un membre'} a répondu à « {questionTitle || 'votre question'} »
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Une nouvelle réponse à votre question</Heading>
        <Text style={text}>
          <strong>{answererFirstName || 'Un membre'}</strong> vient de répondre à votre question
          {questionTitle ? ` « ${questionTitle} »` : ''}.
        </Text>
        {bodyPreview && bodyPreview.trim().length > 0 && (
          <Section style={quote}>
            <Text style={quoteText}>« {bodyPreview} »</Text>
          </Section>
        )}
        <Text style={text}>
          Lisez la réponse complète, remerciez la personne, et si elle vous aide, marquez sa
          contribution comme utile.
        </Text>
        <Button
          style={button}
          href={questionId ? `${SITE_URL}/questions/${questionId}` : `${SITE_URL}/petites-missions?tab=questions`}
        >
          Voir la réponse
        </Button>
        <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d.answererFirstName || 'Un membre'} a répondu à votre question`,
  displayName: 'Question communauté, nouvelle réponse (auteur prévenu)',
  previewData: {
    answererFirstName: 'Camille',
    questionTitle: 'Comment rassurer mon chat avec un gardien inconnu ?',
    questionId: 'demo',
    bodyPreview: "Chez nous, une visite préalable de 30 minutes suffit à créer un premier repère.",
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { backgroundColor: 'hsl(37, 22%, 96%)', borderLeft: '3px solid hsl(153, 42%, 30%)', padding: '12px 16px', borderRadius: '6px', margin: '0 0 20px' }
const quoteText = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', fontStyle: 'italic' as const, margin: 0 }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
