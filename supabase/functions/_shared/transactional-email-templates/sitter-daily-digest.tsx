/// <reference types="npm:@types/react@18.3.1" />
// Digest quotidien envoyé aux gardiens : jusqu'à 3 nouvelles annonces les plus
// compatibles publiées dans les 24 dernières heures et à leur portée.
//
// Aucun tiret cadratin, vouvoiement, ton factuel.
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Img, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface DigestItem {
  sitId: string
  sitTitle?: string
  city?: string
  ownerFirstName?: string
  startDate?: string
  endDate?: string
  animalsSummary?: string
  coverPhotoUrl?: string | null
  affinityScore?: number | null
  affinityTotal?: number | null
  distanceKm?: number | null
}

interface Props {
  sitterFirstName?: string
  items?: DigestItem[]
  /**
   * Passage de rattrapage : les annonces ont plusieurs jours, le gabarit
   * assume le rappel et ne présente rien comme une nouveauté du jour.
   */
  isCatchup?: boolean
  /**
   * false quand le profil est rempli à moins de 60 % : le gardien ne peut
   * pas candidater (useAccessLevel niveau 1). Mêmes annonces, même ordre,
   * seul l'appel à l'action change (doctrine du 20/08/2026).
   */
  canApply?: boolean
  /** Pourcentage actuel de complétude, affiché quand canApply est false. */
  profileCompletion?: number | null
  /**
   * Phrase de complétion, deux variantes (décision du 30/08/2026). Une seule
   * étape restante : on promet le déblocage, il est vrai. Plusieurs étapes :
   * on dit le nombre réel et on nomme un seul geste, sans jamais promettre
   * que ce geste débloque la candidature.
   */
  completionSentence?: string
  /** Nombre réel d'étapes restantes avant de pouvoir candidater. */
  completionSteps?: number
  /**
   * Section du profil qui pose la question du manque principal (même source
   * que completionSentence). Le bouton y mène directement.
   */
  completionHref?: string
}

const buildCtaUrl = (sitId: string) =>
  `${SITE_URL}/annonces/${sitId}?utm_source=email&utm_campaign=sitter_daily_digest&utm_medium=daily`

const buildProfileUrl = (href?: string) => {
  const path = href && href.startsWith('/') ? href : '/sitter-profile'
  const sep = path.includes('?') ? '&' : '?'
  return `${SITE_URL}${path}${sep}utm_source=email&utm_campaign=sitter_daily_digest&utm_medium=daily`
}

const SitterDailyDigestEmail = ({ sitterFirstName, items = [], isCatchup, canApply = true, profileCompletion, completionSentence, completionSteps, completionHref }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      {items.length === 0
        ? 'Votre digest Guardiens'
        : isCatchup
          ? `${items.length} annonce${items.length > 1 ? 's' : ''} publiée${items.length > 1 ? 's' : ''} ces derniers jours, toujours ouverte${items.length > 1 ? 's' : ''}`
          : `${items.length} nouvelle${items.length > 1 ? 's' : ''} annonce${items.length > 1 ? 's' : ''} qui vous correspond${items.length > 1 ? 'ent' : ''}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <AlmaSignature />

        <Heading style={h1}>
          {isCatchup
            ? (items.length > 1
              ? `Rappel, ${items.length} annonces publiées ces derniers jours vous correspondent`
              : 'Rappel, une annonce publiée ces derniers jours vous correspond')
            : (items.length > 1
              ? `${items.length} annonces qui vous correspondent aujourd'hui`
              : 'Une annonce qui vous correspond aujourd\'hui')}
        </Heading>

        <AlmaIntro firstName={sitterFirstName} />

        <Text style={text}>
          {isCatchup
            ? "Ces annonces ont été publiées il y a un à trois jours et ne vous avaient pas encore été signalées. Elles sont toujours ouvertes aux candidatures. Le score d'affinité indique la compatibilité selon vos préférences."
            : "Voici les nouvelles annonces publiées ces dernières 24 heures qui matchent votre profil. Le score d'affinité indique la compatibilité selon vos préférences."}
        </Text>

        {canApply === false && completionSentence ? (
          <Text style={text}>{completionSentence}</Text>
        ) : null}



        {items.map((item, idx) => (
          <Section key={item.sitId} style={{ ...card, marginTop: idx === 0 ? '20px' : '14px' }}>
            {item.coverPhotoUrl ? (
              <Img
                src={item.coverPhotoUrl}
                alt=""
                width="120"
                height="120"
                style={coverImg}
              />
            ) : null}

            {item.sitTitle ? <Text style={cardTitle}>{item.sitTitle}</Text> : null}

            {item.city || (item.startDate && item.endDate) ? (
              <Text style={cardLine}>
                {item.city ? <strong>{item.city}</strong> : null}
                {item.city && item.startDate ? ' · ' : null}
                {item.startDate && item.endDate ? `du ${item.startDate} au ${item.endDate}` : null}
              </Text>
            ) : null}

            {item.ownerFirstName || item.animalsSummary ? (
              <Text style={cardLine}>
                {item.ownerFirstName ? `Proposée par ${item.ownerFirstName}` : ''}
                {item.ownerFirstName && item.animalsSummary ? ' · ' : ''}
                {item.animalsSummary}
              </Text>
            ) : null}

            {typeof item.affinityScore === 'number' || typeof item.distanceKm === 'number' ? (
              <Text style={cardBadge}>
                {typeof item.affinityScore === 'number'
                  ? `Affinité ${item.affinityScore}%${item.affinityTotal ? ` · ${item.affinityTotal}/7` : ''}`
                  : ''}
                {typeof item.affinityScore === 'number' && typeof item.distanceKm === 'number' ? ' · ' : ''}
                {typeof item.distanceKm === 'number' ? `à ${item.distanceKm} km de vous` : ''}
              </Text>
            ) : null}

            {canApply === false ? (
              <Button style={button} href={buildProfileUrl(completionHref)}>
                {(completionSteps ?? 0) > 1 ? 'Compléter mon profil' : 'Complétez votre profil pour candidater'}
              </Button>
            ) : (
              <Button style={button} href={buildCtaUrl(item.sitId)}>
                Postuler en 1 clic
              </Button>
            )}

            <Text style={cardLineSmall}>
              <Link href={buildCtaUrl(item.sitId)} style={linkStyle}>
                Voir l'annonce complète
              </Link>
            </Text>
          </Section>
        ))}

        <Hr style={hr} />

        <Text style={smallText}>
          Vous recevez cet email parce que vous êtes gardien inscrit sur Guardiens
          et actif dans les 90 derniers jours.
        </Text>

        <Text style={smallText}>
          <Link href={`${SITE_URL}/email-preferences`} style={linkStyle}>
            Modifier mes préférences email
          </Link>
        </Text>

        <AlmaSignoff />

        <LegalFooter
          purpose="la bonne marche de votre digest quotidien"
          basis="6.1.f"
        />

      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SitterDailyDigestEmail,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data?.items) ? data.items.length : 0
    if (n === 0) return 'Votre digest Guardiens'
    if (data?.isCatchup) {
      return n === 1
        ? 'Rappel, une annonce publiée ces derniers jours vous correspond'
        : `Rappel, ${n} annonces publiées ces derniers jours vous correspondent`
    }
    return n === 1
      ? 'Une annonce qui vous correspond aujourd\'hui'
      : `${n} annonces qui vous correspondent aujourd'hui`
  },
  displayName: 'Digest quotidien gardien',
  previewData: {
    sitterFirstName: 'Faïza',
    items: [
      {
        sitId: '11111111-1111-1111-1111-111111111111',
        sitTitle: 'Deux chats et un jardin à Lyon 3e',
        city: 'Lyon',
        ownerFirstName: 'Camille',
        startDate: '12 juillet 2026',
        endDate: '22 juillet 2026',
        animalsSummary: '2 chats',
        coverPhotoUrl: null,
        affinityScore: 87,
        affinityTotal: 6,
        distanceKm: 4.2,
      },
      {
        sitId: '22222222-2222-2222-2222-222222222222',
        sitTitle: 'Un labrador très calme, appartement lumineux',
        city: 'Villeurbanne',
        ownerFirstName: 'Thomas',
        startDate: '15 juillet 2026',
        endDate: '20 juillet 2026',
        animalsSummary: '1 chien',
        coverPhotoUrl: null,
        affinityScore: 74,
        affinityTotal: 5,
        distanceKm: 6.5,
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#5A564E', lineHeight: '1.6', margin: '0 0 14px' }
const card = {
  backgroundColor: '#F7F5F3',
  border: '1px solid #E9E4DD',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '14px 0',
}
const coverImg = { borderRadius: '8px', marginBottom: '10px', objectFit: 'cover' as const }
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#255B42', margin: '0 0 8px' }
const cardLine = { fontSize: '13px', color: '#5F5B53', margin: '4px 0' }
const cardLineSmall = { fontSize: '12px', color: '#7B756B', margin: '8px 0 0' }
const cardBadge = {
  fontSize: '12px',
  color: '#2C6D50',
  fontWeight: '600' as const,
  backgroundColor: '#E9F6F0',
  padding: '4px 10px',
  borderRadius: '999px',
  display: 'inline-block',
  margin: '8px 0 12px',
}
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '11px 22px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '4px',
}
const linkStyle = { color: '#2C6D50', textDecoration: 'underline' }
const smallText = { fontSize: '12px', color: '#888277', lineHeight: '1.5', margin: '6px 0' }
const baseline = { fontSize: '12px', color: '#2C6D50', fontWeight: '600' as const, margin: '14px 0 8px' }
const hr = { borderColor: '#E9E4DD', margin: '22px 0 16px' }
