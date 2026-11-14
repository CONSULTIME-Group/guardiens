import * as React from 'npm:react@18.3.1'
import {
  Body, Column, Container, Heading, Html, Img, Preview, Row, Text, Link, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot SORT3 : un seul gabarit pour les quatre emails de service d'une sortie
// (nouvelle inscription pour l'organisateur, sortie modifiée, sortie annulée,
// rappel de la veille). Les textes viennent de la base (outing_email_enqueue,
// migration 0147) : sujet, titre, corps, ligne de rendez-vous, lien.
// Lot EML1 (14/11/2026) : quand un membre s'inscrit, l'email présente la
// personne (photo, prénom, ville, membre depuis, lien vers sa fiche), données
// posées par la migration 0156 dans `actor`.

interface Actor {
  firstName?: string
  avatarUrl?: string
  city?: string
  memberSince?: string
  verified?: boolean
  profileUrl?: string
}

interface Props {
  subject?: string
  title?: string
  body?: string
  whenWhere?: string
  link?: string
  cta?: string
  actor?: Actor
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « 2026-11 » devient « novembre 2026 ». */
export function memberSinceLabel(value?: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return ''
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : ''
}

const PersonCard = ({ actor }: { actor: Actor }) => {
  const name = actor.firstName || 'Un membre'
  const since = memberSinceLabel(actor.memberSince)
  const facts = [actor.city, since ? `membre depuis ${since}` : ''].filter(Boolean).join(' · ')
  return (
    <Section style={card}>
      <Row>
        <Column style={photoCol}>
          {actor.avatarUrl
            ? <Img src={actor.avatarUrl} width="64" height="64" alt={name} style={photo} />
            : <Text style={initial}>{name.charAt(0).toUpperCase()}</Text>}
        </Column>
        <Column>
          <Text style={personName}>{name}</Text>
          {facts ? <Text style={personFacts}>{facts}</Text> : null}
          {actor.verified ? <Text style={badge}>Identité vérifiée</Text> : null}
          {actor.profileUrl ? <Link href={actor.profileUrl} style={profileLink}>Voir sa fiche</Link> : null}
        </Column>
      </Row>
    </Section>
  )
}

const DEFAULT_SUBJECT = 'Des nouvelles de votre sortie'

const Email = ({
  title = 'Des nouvelles de votre sortie',
  body = '',
  whenWhere = '',
  link = 'https://guardiens.fr/sorties',
  cta = 'Voir la sortie',
  actor,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{title}</Heading>
        {actor ? <PersonCard actor={actor} /> : null}
        {body ? <Text style={text}>{body}</Text> : null}
        {whenWhere ? (
          <Section style={item}>
            <Text style={itemText}>{whenWhere}</Text>
          </Section>
        ) : null}
        <Section style={ctaWrap}>
          <Link href={link} style={button}>{cta}</Link>
        </Section>
        <Text style={small}>
          Vous recevez cet email parce que vous organisez cette sortie ou que vous y avez pris une place.
        </Text>
        <LegalFooter purpose="du suivi de vos sorties" signoff={false} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => data.subject || DEFAULT_SUBJECT,
  displayName: 'Sortie, suivi (inscription, changement, annulation, rappel)',
  previewData: {
    subject: 'Demain : Belote à quatre',
    title: 'C’est demain : Belote à quatre',
    body: 'Votre place est réservée. Martine vous donne le rendez-vous par message.',
    whenWhere: 'Samedi 12 décembre, 18 h · Lyon 5e',
    link: 'https://guardiens.fr/sorties/belote-a-quatre-1a2b3c4d',
    cta: 'Voir la sortie',
  },
} satisfies TemplateEntry

// Aperçu de l'inscription, pour l'écran admin des gabarits.
export const joinedPreviewData = {
  kind: 'joined',
  subject: 'Martine vient à votre sortie',
  title: 'Une place prise : Belote à quatre',
  body: 'Martine vient. Vous lui donnez le rendez-vous par message, depuis la fiche de votre sortie.',
  whenWhere: 'Samedi 12 décembre, 18 h · Lyon 5e',
  link: 'https://guardiens.fr/sorties/belote-a-quatre-1a2b3c4d',
  cta: 'Lui écrire depuis la sortie',
  actor: { firstName: 'Martine', city: 'Lyon', memberSince: '2026-09', verified: true, profileUrl: 'https://guardiens.fr/gardiens/00000000-0000-0000-0000-000000000000' },
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const small = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '16px 0 0' }
const item = { backgroundColor: '#f8f0e2', padding: '12px 14px', borderRadius: '10px', margin: '12px 0' }
const itemText = { fontSize: '15px', lineHeight: '22px', color: '#1d1b17', margin: 0, fontWeight: 600 }
const ctaWrap = { margin: '18px 0' }
const button = { backgroundColor: '#2c6d50', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '13px 22px', borderRadius: '12px', display: 'inline-block' }
const card = { border: '1px solid #e7e1d8', borderRadius: '14px', padding: '14px 16px', margin: '8px 0 16px' }
const photoCol = { width: '76px', verticalAlign: 'top' as const }
const photo = { borderRadius: '50%', display: 'block', objectFit: 'cover' as const }
const initial = { width: '64px', height: '64px', lineHeight: '64px', borderRadius: '50%', backgroundColor: '#e3f1e8', color: '#1f5240', fontSize: '26px', fontWeight: 700, textAlign: 'center' as const, margin: 0 }
const personName = { fontSize: '18px', fontWeight: 700, color: '#1d1b17', margin: '2px 0 2px' }
const personFacts = { fontSize: '14px', lineHeight: '20px', color: '#4b5563', margin: '0 0 4px' }
const badge = { display: 'inline-block', fontSize: '12px', fontWeight: 600, color: '#1f5240', backgroundColor: '#e3f1e8', borderRadius: '999px', padding: '2px 10px', margin: '2px 0 6px' }
const profileLink = { fontSize: '14px', fontWeight: 600, color: '#2c6d50', textDecoration: 'underline' }
