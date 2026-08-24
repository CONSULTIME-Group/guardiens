import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  sitTitle?: string
  sitCity?: string
  sitStatus?: string
}

const ApplicationClosedListingWithdrawnEmail = ({
  sitterFirstName,
  sitTitle,
  sitCity,
  sitStatus,
}: Props) => {
  const searchHref = sitCity
    ? `${SITE_URL}/recherche?ville=${encodeURIComponent(sitCity)}`
    : `${SITE_URL}/recherche`
  const cause =
    sitStatus === 'archived'
      ? "l'annonce a été retirée par la personne qui l'avait publiée"
      : sitStatus === 'expired'
        ? "les dates de la garde sont passées et l'annonce s'est refermée d'elle-même"
        : "la garde a été annulée par la personne qui l'avait publiée"
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre candidature a été close, l'annonce n'est plus ouverte</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Cette annonce n'est plus ouverte</Heading>
          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>
          <Text style={text}>
            Votre candidature{sitTitle ? <> pour «&nbsp;{sitTitle}&nbsp;»</> : null} vient d'être
            close, {cause}. Vous n'avez rien à faire, et cette clôture ne dit rien
            de votre profil.
          </Text>
          <Text style={text}>
            Nous préférons vous le dire plutôt que de vous laisser attendre une
            réponse qui ne viendra pas.
            {sitCity ? ` D'autres annonces sont ouvertes près de ${sitCity}.` : ''}
          </Text>
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
  component: ApplicationClosedListingWithdrawnEmail,
  subject: 'Votre candidature a été close, l\u2019annonce n\u2019est plus ouverte',
  displayName: 'Candidature close, annonce retirée',
  previewData: {
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    sitCity: 'Annecy',
    sitStatus: 'cancelled',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#524E47', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '26px 0 8px' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }
