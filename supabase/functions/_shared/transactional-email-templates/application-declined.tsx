import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { declineBody, declineSubject, declineTitle, declineReassurance } from '../decline-reasons.ts'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitTitle?: string
  sitterFirstName?: string
  sitCity?: string
  declineReason?: string
  declineVariant?: number
  locale?: string
}

const ApplicationDeclinedEmail = ({
  sitTitle,
  sitterFirstName,
  sitCity,
  declineReason,
  declineVariant,
  locale,
}: Props) => {
  const searchHref = sitCity
    ? `${SITE_URL}/recherche?ville=${encodeURIComponent(sitCity)}`
    : `${SITE_URL}/recherche`
  const loc = locale || 'fr'
  const reasonText = declineBody(declineReason, declineVariant, loc)
    ?? declineBody('other_chosen', declineVariant, loc)!
  const heading = declineTitle(declineReason, loc)
  const reassurance = declineReassurance(declineReason, loc)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>
          <Text style={text}>
            {sitTitle ? <>Au sujet de «&nbsp;{sitTitle}&nbsp;» : </> : null}
            {reasonText}
          </Text>
          {reassurance ? <Text style={text}>{reassurance}</Text> : null}
          {sitCity ? (
            <Text style={text}>
              D'autres annonces sont ouvertes près de {sitCity}.
            </Text>
          ) : null}
          <Section style={ctaSection}>
            <Button style={button} href={searchHref}>
              Voir d'autres annonces
            </Button>
          </Section>

          <Hr style={hr} />
          <LegalFooter purpose="la gestion de votre candidature" basis="6.1.b" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationDeclinedEmail,
  subject: (data: Record<string, unknown>) =>
    declineSubject(
      typeof data?.declineReason === 'string' ? data.declineReason : null,
      typeof data?.locale === 'string' ? data.locale : 'fr',
    ),
  displayName: 'Candidature déclinée',
  previewData: {
    sitTitle: 'Garde chat Paris 11e',
    sitterFirstName: 'Camille',
    sitCity: 'Paris',
    declineReason: 'dates_changed',
    declineVariant: 0,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#524E47', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '26px 0 8px' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }
