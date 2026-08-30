import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  ownerFirstName?: string
  sitTitle?: string
  city?: string
  distanceKm?: number
  startDate?: string
  endDate?: string
  sitId?: string
  animalsSummary?: string
  coverPhotoUrl?: string | null
  /**
   * Faux quand le gardien est sous le seuil de candidature. Meme contrat que
   * `sitter-daily-digest` : l'appel a l'action doit dire la verite, un
   * gardien qui ne peut pas candidater ne voit pas un bouton de candidature.
   */
  canApply?: boolean
  /** Phrase de completion calculee sur le bareme reel, cote fonction. */
  completionSentence?: string
  /** Nombre d'etapes restantes, pilote le libelle du bouton. */
  completionSteps?: number
  /** Ancre du profil qui porte le geste nomme dans la phrase. */
  completionHref?: string
}

const buildProfileUrl = (href?: string) => {
  const path = href && href.startsWith('/') ? href : '/sitter-profile'
  return `${SITE_URL}${path}`
}

const NearbySitAlertEmail = ({
  sitterFirstName,
  ownerFirstName,
  sitTitle,
  city,
  distanceKm,
  startDate,
  endDate,
  sitId,
  animalsSummary,
  coverPhotoUrl,
  canApply = true,
  completionSentence,
  completionSteps,
  completionHref,
}: Props) => {
  const ctaHref = sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/sits`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        Une nouvelle annonce près de chez vous{city ? ` à ${city}` : ''}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Une annonce près de chez vous</Heading>

          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>

          <Text style={text}>
            Une nouvelle garde vient d'être publiée dans votre secteur
            {city ? <> à <strong>{city}</strong></> : null}
            {typeof distanceKm === 'number' ? <> (à environ {distanceKm} km de chez vous)</> : null}.
          </Text>

          <Section style={card}>
            {coverPhotoUrl ? (
              <Img
                src={coverPhotoUrl}
                alt=""
                width="504"
                height="220"
                style={coverImg}
              />
            ) : null}
            {sitTitle ? <Text style={cardTitle}>{sitTitle}</Text> : null}
            {ownerFirstName ? (
              <Text style={cardLine}>Proposée par {ownerFirstName}</Text>
            ) : null}
            {animalsSummary ? (
              <Text style={cardLine}>{animalsSummary}</Text>
            ) : null}
            {startDate && endDate ? (
              <Text style={cardLine}>Du {startDate} au {endDate}</Text>
            ) : null}
          </Section>

          <Text style={text}>
            Le secteur compte encore peu de gardiens disponibles : votre profil
            peut vraiment faire la différence pour cette famille.
          </Text>

          {canApply === false && completionSentence ? (
            <Text style={text}>{completionSentence}</Text>
          ) : null}

          <Section style={{ textAlign: 'center', margin: '20px 0' }}>
            {canApply === false ? (
              <Button style={button} href={buildProfileUrl(completionHref)}>
                {(completionSteps ?? 0) > 1 ? 'Compléter mon profil' : 'Complétez votre profil pour candidater'}
              </Button>
            ) : (
              <Button style={button} href={ctaHref}>
                Voir l'annonce
              </Button>
            )}
          </Section>

          {canApply === false ? (
            <Text style={{ ...text, textAlign: 'center' as const }}>
              <Link href={ctaHref} style={linkStyle}>
                Voir l'annonce complète
              </Link>
            </Text>
          ) : null}

          <LegalFooter
            purpose="la bonne marche de votre alerte"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NearbySitAlertEmail,
  subject: (data: Record<string, any>) =>
    data.city
      ? `Nouvelle annonce à ${data.city}`
      : 'Nouvelle annonce près de chez vous',
  displayName: 'Alerte annonce locale (gardien)',
  previewData: {
    sitterFirstName: 'Faïza',
    ownerFirstName: 'Patricia',
    sitTitle: 'Tribu de 4 chats, 2 perroquets et un chien',
    city: 'Schweighouse-sur-Moder',
    distanceKm: 35,
    startDate: '21 juin 2026',
    endDate: '5 juillet 2026',
    sitId: '293fab2e-b32d-45a0-9c04-36a4f43c484f',
    animalsSummary: '4 chats, 2 perroquets, 1 chien',
    coverPhotoUrl: null,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#F7F5F3',
  border: '1px solid #E9E4DD',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '12px 0 20px',
}
const coverImg = {
  width: '100%',
  maxWidth: '504px',
  height: 'auto',
  borderRadius: '8px',
  marginBottom: '12px',
  objectFit: 'cover' as const,
  display: 'block',
}
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#255B42', margin: '0 0 8px' }
const cardLine = { fontSize: '13px', color: '#5F5B53', margin: '4px 0' }
const linkStyle = { color: '#2C6D50', textDecoration: 'underline' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
