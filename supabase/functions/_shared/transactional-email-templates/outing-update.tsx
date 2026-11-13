import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Link, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot SORT3 : un seul gabarit pour les quatre emails de service d'une sortie
// (nouvelle inscription pour l'organisateur, sortie modifiée, sortie annulée,
// rappel de la veille). Les textes viennent de la base (outing_email_enqueue,
// migration 0147) : sujet, titre, corps, ligne de rendez-vous, lien.

interface Props {
  subject?: string
  title?: string
  body?: string
  whenWhere?: string
  link?: string
  cta?: string
}

const DEFAULT_SUBJECT = 'Des nouvelles de votre sortie'

const Email = ({
  title = 'Des nouvelles de votre sortie',
  body = '',
  whenWhere = '',
  link = 'https://guardiens.fr/sorties',
  cta = 'Voir la sortie',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{title}</Heading>
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const small = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '16px 0 0' }
const item = { backgroundColor: '#f8f0e2', padding: '12px 14px', borderRadius: '10px', margin: '12px 0' }
const itemText = { fontSize: '15px', lineHeight: '22px', color: '#1d1b17', margin: 0, fontWeight: 600 }
const ctaWrap = { margin: '18px 0' }
const button = { backgroundColor: '#2c6d50', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '13px 22px', borderRadius: '12px', display: 'inline-block' }
