import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'
import { distancePhrase } from '../entraideCopy.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  helperFirstName?: string
  headline?: string
  missionTitle?: string
  missionCity?: string
  missionId?: string
  canHelpToken?: string
  proofLine?: string
  sitModeLine?: string
  distanceKm?: number | null
  /** Lot E18 : deux lignes d'extrait de la description (waveEmailDetails). */
  missionExcerpt?: string | null
  /** Lot E18 : durée lisible (« 1 à 2 heures », « Plusieurs passages »). */
  durationLabel?: string | null
  /** Lot E18 : date lisible (« 8 novembre »). */
  dateLabel?: string | null
}

const MissionHelpNeededEmail = ({
  helperFirstName,
  headline,
  missionTitle,
  missionCity,
  missionId,
  canHelpToken,
  proofLine,
  sitModeLine,
  distanceKm,
  missionExcerpt,
  durationLabel,
  dateLabel,
}: Props) => {
  const metaLine = helpNeededMetaLine(dateLabel, durationLabel, distanceKm)
  const links = helpNeededLinks(missionId, canHelpToken)
  return (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{headline || 'Quelqu\u2019un du coin a besoin d\u2019un coup de main'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{helpNeededHeading(distanceKm)}</Heading>


        <Text style={text}>Bonjour{helperFirstName ? ` ${helperFirstName}` : ''},</Text>

        <Text style={text}>{headline}</Text>

        {missionTitle && (
          <Section style={card}>
            {sitModeLine && <Text style={cardCity}>{sitModeLine}</Text>}
            <Text style={cardLine}>{missionTitle}</Text>
            {missionExcerpt && <Text style={cardExcerpt}>{missionExcerpt}</Text>}
            {metaLine && <Text style={cardMeta}>{metaLine}</Text>}
            {missionCity && <Text style={cardCity}>{missionCity}</Text>}
          </Section>
        )}

        {proofLine && <Text style={proof}>{proofLine}</Text>}

        {links.canHelp && (
          <Section style={ctaSection}>
            <Button style={button} href={links.canHelp}>
              Je peux
            </Button>
          </Section>
        )}

        {links.detail && (
          <Section style={ctaSection}>
            <Button style={buttonGhost} href={links.detail}>
              Voir le détail
            </Button>
          </Section>
        )}

        <Text style={muted}>
          Ce moment tombe mal pour vous : laissez passer, d'autres besoins suivront.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="la mise en relation pour l'entraide entre membres"
          basis="6.1.b"
          extra="Vous recevez ce message car vous vous êtes déclaré disponible pour donner un coup de main près de chez vous."
        />
      </Container>
    </Body>
  </Html>
  )
}

/** Lot E20 : la vague ne part jamais au-delà de 30 km ; au-delà, le titre donne la distance. */
export const FAR_DISTANCE_KM = 30

/** Lot E18 : titre de l'email, qui donne la distance au-delà de 30 km (n° 16). */
export function helpNeededHeading(distanceKm?: number | null): string {
  if (typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > FAR_DISTANCE_KM) {
    return `Un besoin à ${Math.round(distanceKm)} km de chez vous`
  }
  return 'Un besoin près de chez vous'
}

/** Lot E18 : ligne date, durée, distance de la carte du besoin. */
export function helpNeededMetaLine(dateLabel?: string | null, durationLabel?: string | null, distanceKm?: number | null): string | null {
  const parts: string[] = []
  if (dateLabel) parts.push(`Le ${dateLabel}`)
  if (durationLabel) parts.push(durationLabel)
  const where = distancePhrase(distanceKm)
  if (where) parts.push(`${where} de chez vous`)
  return parts.length ? parts.join(' · ') : null
}

/** Lot E18 : jeton et provenance sur les deux liens (n° 17). Paramètre src=vague partagé avec le lot E17. */
export function helpNeededLinks(missionId?: string, canHelpToken?: string): { canHelp: string | null; detail: string | null } {
  const token = canHelpToken ? `t=${encodeURIComponent(canHelpToken)}&` : ''
  return {
    canHelp: canHelpToken ? `${SITE_URL}/entraide/je-peux?t=${encodeURIComponent(canHelpToken)}&src=vague` : null,
    detail: missionId ? `${SITE_URL}/petites-missions/${missionId}?${token}src=vague` : null,
  }
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F8F6F1', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardLine = { color: '#524E47', fontSize: '15px', lineHeight: '22px', fontWeight: 600 as const }
const cardExcerpt = { color: '#524E47', fontSize: '14px', lineHeight: '21px', margin: '6px 0 0' }
const cardMeta = { color: '#524E47', fontSize: '14px', lineHeight: '20px', margin: '8px 0 0', fontWeight: 600 as const }
const cardCity = { color: '#888277', fontSize: '13px', lineHeight: '20px', margin: '6px 0 0' }
const ctaSection = { textAlign: 'center' as const, margin: '16px 0' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const buttonGhost = {
  ...button,
  backgroundColor: '#F8F6F1',
  color: '#2C6D50',
}
const proof = { color: '#2C6D50', fontSize: '13px', lineHeight: '20px', margin: '0 0 16px', fontStyle: 'italic' as const }
const muted = { color: '#888277', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

export const template: TemplateEntry = {
  component: MissionHelpNeededEmail,
  subject: (data: Record<string, any>) =>
    data.missionCity
      ? `Un coup de main demandé à ${data.missionCity}`
      : 'Un coup de main demandé près de chez vous',
  displayName: 'Entraide, un besoin près de chez vous (vague)',
  previewData: {
    helperFirstName: 'Camille',
    headline: 'Marie, à 3\u00A0km, cherche un coup de main\u00A0: «\u00A0Promener Filou samedi après-midi\u00A0», le 4 octobre.',
    missionTitle: 'Promener Filou samedi après-midi',
    missionCity: 'Lyon',
    missionExcerpt: 'Filou est un épagneul calme, une heure au parc de la Tête d\u2019Or suffit.',
    durationLabel: '1 à 2 heures',
    dateLabel: '4 octobre',
    distanceKm: 3,
    missionId: 'demo',
    canHelpToken: 'demo-token',
    proofLine: "La semaine dernière, à 6 km : Laurence a reçu un coup de main de Karim.",
  },
}
