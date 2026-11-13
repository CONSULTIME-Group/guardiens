import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Link, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot SORT4 : alerte « nouvelle sortie », une fois à la publication, au plus
// une par semaine et par membre (budget tenu par la base, outing_alert_log).
// Le lien d'arrêt coupe les seules alertes sorties : il porte le jeton de
// désinscription du destinataire (unsubscribeAllUrl, posé par l'envoi) et mène
// à /sorties/alertes, où l'arrêt se fait d'un geste, sans connexion.

interface Props {
  title?: string
  organizerFirstName?: string | null
  whenLabel?: string
  placeLabel?: string
  placesLeft?: number
  capacity?: number
  participationEur?: number | null
  near?: boolean
  link?: string
  unsubscribeAllUrl?: string
}

const SITE = 'https://guardiens.fr'

/** Adresse d'arrêt des seules alertes sorties, construite sur le jeton du destinataire. */
export function outingAlertStopUrl(unsubscribeAllUrl?: string): string {
  const token = /[?&]token=([A-Za-z0-9]+)/.exec(unsubscribeAllUrl ?? '')?.[1]
  return token ? `${SITE}/sorties/alertes?token=${token}` : `${SITE}/settings?section=alerts`
}

export function outingAlertSubject(data: Record<string, any>): string {
  const title = String(data.title ?? 'Une sortie')
  const left = Number(data.placesLeft ?? 0)
  const places = left > 1 ? `il reste ${left} places` : 'il reste une place'
  return `${title} : ${places}`
}

const fee = (eur?: number | null) =>
  eur && eur > 0 ? `Participation : ${Number.isInteger(eur) ? eur : eur.toFixed(2).replace('.', ',')} €` : 'Gratuit'

const Email = ({
  title = 'Une sortie',
  organizerFirstName,
  whenLabel = '',
  placeLabel = '',
  placesLeft = 1,
  capacity = 2,
  participationEur = null,
  near = false,
  link = `${SITE}/sorties`,
  unsubscribeAllUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{`${title}, ${whenLabel}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Une sortie près de chez vous</Heading>
        <Text style={text}>
          {organizerFirstName ? `${organizerFirstName} propose une sortie` : 'Un membre propose une sortie'}
          {near ? ' dans votre quartier.' : ' près de chez vous.'}
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>{title}</Text>
          <Text style={cardLine}>{[whenLabel, placeLabel].filter(Boolean).join(' · ')}</Text>
          <Text style={cardStrong}>
            {placesLeft > 1 ? `${placesLeft} places` : '1 place'} sur {capacity} · {fee(participationEur)}
          </Text>
        </Section>
        <Section style={ctaWrap}>
          <Link href={link} style={button}>Voir la sortie</Link>
        </Section>
        <Text style={text}>
          Vous prenez une place d'un geste. L'organisateur vous donne ensuite le rendez-vous par message.
        </Text>
        <Text style={small}>
          Vous recevez les sorties publiées près de chez vous, une par semaine au plus. Vous choisissez la distance dans vos paramètres : mon quartier, 5 km ou 15 km.
        </Text>
        <Text style={small}>
          <Link href={outingAlertStopUrl(unsubscribeAllUrl)} style={smallLink}>Arrêter les alertes sorties</Link>
          {' · '}
          <Link href={`${SITE}/settings?section=alerts`} style={smallLink}>Régler mes alertes</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: outingAlertSubject,
  displayName: 'Sortie, alerte « nouvelle sortie »',
  previewData: {
    title: 'Belote à quatre',
    organizerFirstName: 'Martine',
    whenLabel: 'Samedi 12 décembre, 18 h',
    placeLabel: 'Lyon 5e',
    placesLeft: 3,
    capacity: 4,
    participationEur: null,
    near: true,
    link: 'https://guardiens.fr/sorties/belote-a-quatre-1a2b3c4d?via=alerte',
    unsubscribeAllUrl: 'https://guardiens.fr/unsubscribe?token=exemple',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const small = { fontSize: '13px', lineHeight: '19px', color: '#6b7280', margin: '14px 0 0' }
const smallLink = { color: '#2c6d50', fontWeight: 600, textDecoration: 'underline' }
const card = { backgroundColor: '#f8f0e2', padding: '14px 16px', borderRadius: '12px', margin: '14px 0' }
const cardTitle = { fontSize: '18px', fontWeight: 600, color: '#1d1b17', margin: '0 0 4px' }
const cardLine = { fontSize: '14px', lineHeight: '20px', color: '#5e584c', margin: '0 0 4px' }
const cardStrong = { fontSize: '14px', fontWeight: 600, color: '#1f5240', margin: 0 }
const ctaWrap = { margin: '18px 0' }
const button = { backgroundColor: '#2c6d50', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '13px 22px', borderRadius: '12px', display: 'inline-block' }
