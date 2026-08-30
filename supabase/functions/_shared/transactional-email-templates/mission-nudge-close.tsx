/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  missionTitle?: string
  missionId?: string
  helperFirstName?: string
}

const Email = ({ firstName, missionTitle = 'Votre publication', missionId, helperFirstName }: Props) => {
  const url = missionId
    ? `${SITE_URL}/petites-missions/${missionId}?utm_source=email&utm_campaign=mission_nudge_close`
    : `${SITE_URL}/petites-missions`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Ce coup de main a-t-il eu lieu ?</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} />
          <Heading style={h1}>Ce coup de main a-t-il eu lieu ?</Heading>
          <Text style={p}>
            La date prévue pour « {missionTitle} » est passée.
            {helperFirstName ? ` ${helperFirstName} avait accepté de vous aider.` : ''}
          </Text>
          <Text style={p}>
            Si tout s'est bien passé, marquez la publication comme terminée. C'est ce qui permet à
            chacun de laisser un mot à l'autre, et de faire vivre la réputation d'entraide.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={url} style={btn}>Marquer terminée</Button>
          </Section>
          <Hr style={hr} />
          <AlmaSignoff />
          <LegalFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Ce coup de main a-t-il eu lieu ?',
  displayName: 'Nudge clôture mission',
  previewData: { firstName: 'Marie', missionTitle: 'Sortir mon chien mardi soir', missionId: 'demo', helperFirstName: 'Julien' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '20px 0 12px 0' }
const p = { color: '#333', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px 0' }
const btn = { backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
