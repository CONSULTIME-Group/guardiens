import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { ALMOST_READY_SUBJECT, almostReadyCopy } from '../rel1-copy.ts'
import type { TemplateEntry } from './registry.ts'

// Lot REL1 : textes validés par Jérémie le 12/11/2026, tenus dans rel1-copy.ts.
interface Props {
  firstName?: string
  sitId?: string
  title?: string
  city?: string
  startDate?: string
  endDate?: string
  missingItems?: Array<{ label: string }>
  resumeUrl?: string
}

const SitDraftAlmostReadyEmail = ({
  firstName = '', title = '', city = '', startDate, endDate, missingItems,
  resumeUrl = 'https://guardiens.fr/sits',
}: Props) => {
  const copy = almostReadyCopy({ firstName, title, city, startDate, endDate, missing: missingItems })
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{copy.subject}</Heading>
          <Text style={text}>{copy.hello}</Text>
          <Text style={text}>{copy.intro}</Text>
          <Text style={text}>{copy.step}</Text>
          <Text style={text}>{copy.body}</Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={resumeUrl} style={btn}>{copy.button}</Button>
          </Section>
          <Text style={textSmall}>{copy.closing}</Text>
          <AlmaSignoff />
          <LegalFooter purpose="l'accompagnement de votre brouillon d'annonce" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SitDraftAlmostReadyEmail,
  subject: ALMOST_READY_SUBJECT,
  displayName: 'Brouillon presque prêt',
  previewData: {
    firstName: 'Camille',
    sitId: 'demo-sit-id',
    title: 'Garde de notre maison à Lyon',
    city: 'Lyon',
    startDate: '2026-12-19',
    endDate: '2027-01-03',
    missingItems: [{ label: 'Une photo de votre logement ou de votre galerie' }],
    resumeUrl: 'https://guardiens.fr/sits/create?resume=demo-sit-id',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#44413B', lineHeight: '1.6', margin: '0 0 14px' }
const textSmall = { fontSize: '13px', color: '#756F66', lineHeight: '1.5', margin: '0 0 14px' }
const btn = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
