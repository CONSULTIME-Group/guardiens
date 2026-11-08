import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { NearbySitsBlock, type NearbySitView } from './_nearby-sits.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot NUR1 bloc B (08/11/2026) : deux versions selon le rôle du destinataire
// (isOwner, posé par evaluate-journeys). Gardien et double rôle : annonces
// ouvertes réelles (nearbySits), chaque affirmation vient des données.
// Propriétaire (la séquence est réservée aux propriétaires ayant publié une
// annonce) : prochaine absence, gardiens à proximité réels.

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  daysSinceLastSeen?: number
  isOwner?: boolean
  nearbySits?: NearbySitView[]
  primarySitUrl?: string
  nearbySittersLabel?: string | null
}

function lastVisitLine(days?: number): string {
  return typeof days === 'number' && days > 0
    ? `Votre dernière visite sur Guardiens remonte à ${days} jours.`
    : 'Votre dernière visite sur Guardiens remonte à quelques semaines.'
}

function firstDistance(sits?: NearbySitView[]): number | null {
  const first = Array.isArray(sits) ? sits[0] : null
  return typeof first?.distanceKm === 'number' ? first.distanceKm : null
}

const ReactivationD30Email = ({
  firstName, daysSinceLastSeen, isOwner, nearbySits, primarySitUrl, nearbySittersLabel,
}: Props) => {
  const hello = `Bonjour${firstName ? ` ${firstName}` : ''},`
  const footer = (
    <>
      <Text style={muted}>
        Envie de faire une pause&nbsp;? Votre compte reste ouvert, à retrouver quand vous le
        souhaitez.
      </Text>
      <LegalFooter
        purpose="la réactivation de votre compte"
        basis="6.1.f"
        extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
      />
    </>
  )

  if (isOwner) {
    const label = typeof nearbySittersLabel === 'string' && nearbySittersLabel.trim() ? nearbySittersLabel.trim() : null
    return (
      <Html lang="fr" dir="ltr">
        <BrandedHead />
        <Preview>Votre prochaine absence se prépare depuis votre compte.</Preview>
        <Body style={main}>
          <Container style={container} className="em-container">
            <BrandHeader />
            <Heading style={h1} className="em-h1">Une absence en vue&nbsp;?</Heading>
            <Text style={text} className="em-text">{hello}</Text>
            <Text style={text} className="em-text">
              {lastVisitLine(daysSinceLastSeen)} Pour vos prochaines vacances, un week-end ou un
              déplacement, votre logement et vos animaux restent enregistrés sur votre compte&nbsp;:
              il reste à choisir les dates.
            </Text>
            {label ? (
              <Section style={card}>
                <Text style={cardLine}>Aujourd'hui, {label}.</Text>
              </Section>
            ) : null}
            <Section style={ctaSection} className="em-cta">
              <Button style={button} className="em-btn" href={`${SITE_URL}/sits/create`}>
                Préparer ma prochaine annonce
              </Button>
            </Section>
            <Text style={textCenter} className="em-text">
              <Link href={`${SITE_URL}/sits`} style={link}>Retrouver mes annonces</Link>
            </Text>
            {footer}
          </Container>
        </Body>
      </Html>
    )
  }

  const hasSits = Array.isArray(nearbySits) && nearbySits.length > 0
  const located = firstDistance(nearbySits) !== null
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {hasSits ? 'Les annonces ouvertes les plus proches de chez vous.' : 'Les annonces ouvertes vous attendent sur Guardiens.'}
      </Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />
          <Heading style={h1} className="em-h1">
            {hasSits
              ? (located ? 'Des gardes ouvertes près de chez vous' : 'Des gardes ouvertes sur Guardiens')
              : 'Les gardes continuent sur Guardiens'}
          </Heading>
          <Text style={text} className="em-text">{hello}</Text>
          <Text style={text} className="em-text">
            {lastVisitLine(daysSinceLastSeen)}{' '}
            {hasSits
              ? (located ? 'Voici les annonces ouvertes les plus proches de chez vous.' : 'Voici les dernières annonces ouvertes.')
              : 'Les annonces ouvertes sont à consulter quand vous le souhaitez.'}
          </Text>

          <NearbySitsBlock sits={nearbySits} />

          <Text style={text} className="em-text">
            {hasSits ? 'Si des dates vous conviennent, un message suffit pour vous présenter. ' : ''}
            Vos disponibilités à jour aident les propriétaires à penser à vous.
          </Text>

          <Section style={ctaSection} className="em-cta">
            <Button style={button} className="em-btn" href={hasSits && primarySitUrl ? primarySitUrl : `${SITE_URL}/recherche`}>
              {hasSits ? "Voir l'annonce" : 'Voir les annonces'}
            </Button>
          </Section>
          <Text style={textCenter} className="em-text">
            <Link href={`${SITE_URL}/profile?focus=availability`} style={link}>Mettre à jour mes disponibilités</Link>
          </Text>
          {footer}
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const textCenter = { ...text, textAlign: 'center' as const }
const card = { backgroundColor: '#F8F6F1', padding: '14px 16px', borderRadius: '10px', margin: '16px 0' }
const cardLine = { color: '#524E47', fontSize: '14px', lineHeight: '22px', margin: 0 }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 12px' }
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
const link = { color: '#2C6D50', textDecoration: 'underline' }
const muted = { color: '#888277', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }

export const template: TemplateEntry = {
  component: ReactivationD30Email,
  subject: (data: Record<string, any>) => {
    const name = typeof data?.firstName === 'string' && data.firstName.trim() ? data.firstName.trim() : null
    if (data?.isOwner) return name ? `${name}, une absence en vue ?` : 'Une absence en vue ?'
    const km = firstDistance(data?.nearbySits)
    const body = km === null ? 'des gardes ouvertes vous attendent' : `une garde ouverte à ${km} km de chez vous`
    return name ? `${name}, ${body}` : body.charAt(0).toUpperCase() + body.slice(1)
  },
  displayName: 'Réactivation à 30 jours d\'inactivité',
  previewData: {
    firstName: 'Camille',
    daysSinceLastSeen: 32,
    isOwner: false,
    nearbySits: [
      { id: 'demo', title: 'Garde de deux chats', city: 'Lyon', startDate: '3 décembre 2026', endDate: '10 décembre 2026', distanceKm: 12, url: 'https://guardiens.fr/sits/demo' },
    ],
    primarySitUrl: 'https://guardiens.fr/sits/demo',
  },
}
