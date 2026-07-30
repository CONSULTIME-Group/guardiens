import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { declineBody } from '../decline-reasons.ts'
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
  const reasonText = declineBody(declineReason, declineVariant, locale || 'fr')
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Le propriétaire a fait un autre choix</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Le propriétaire a fait un autre choix</Heading>
          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>
          {reasonText ? (
            <>
              <Text style={text}>
                {sitTitle ? <>Au sujet de «&nbsp;{sitTitle}&nbsp;» : </> : null}
                {reasonText}
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Le propriétaire a retenu une autre candidature
                {sitTitle ? <> pour «&nbsp;{sitTitle}&nbsp;»</> : null}. Cela ne dit rien de votre
                profil : chaque garde a ses contraintes de dates, de lieu et d'animaux.
              </Text>
              <Text style={text}>
                Votre candidature est libérée, vous êtes de nouveau disponible pour d'autres
                annonces{sitCity ? <>, notamment près de {sitCity}</> : null}.
              </Text>
            </>
          )}
          {reasonText && sitCity ? (
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
  subject: 'Le propriétaire a fait un autre choix',
  displayName: 'Candidature déclinée',
  previewData: {
    sitTitle: 'Garde chat Paris 11e',
    sitterFirstName: 'Camille',
    sitCity: 'Paris',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 18px' }
const text = { fontSize: '15px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '26px 0 8px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }
