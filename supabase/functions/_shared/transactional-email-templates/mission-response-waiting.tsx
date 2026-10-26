import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { ResponderList } from './_responder-list.tsx'
import { normalizeResponders, authorMissionUrl } from '../mission-responders.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  responderFirstName?: string
  missionTitle?: string
  missionId?: string
  deepLinkUrl?: string
  /** Lot E17 : répondants en attente, chacun avec un bouton « Choisir {prénom} ». */
  responders?: unknown
}

/**
 * Lot E17 : relance du demandeur, 24 h après une réponse restée en attente,
 * une seule fois par réponse (choose_prompt_sent_at).
 */
const Email = ({ responderFirstName, missionTitle, missionId, deepLinkUrl, responders }: Props) => {
  const list = normalizeResponders(responders)
  const who = list.length > 1 ? null : (list[0]?.firstName || responderFirstName || 'Un membre')
  const authorUrl = authorMissionUrl(missionId, deepLinkUrl)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{who ? `${who} attend votre choix` : 'Des personnes attendent votre choix'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{who ? `${who} attend votre choix` : 'Des personnes attendent votre choix'}</Heading>
          <Text style={text}>
            {who
              ? <><strong>{who}</strong> vous a proposé son aide{missionTitle ? ` pour « ${missionTitle} »` : ''}.</>
              : <>Plusieurs personnes vous ont proposé leur aide{missionTitle ? ` pour « ${missionTitle} »` : ''}.</>}
          </Text>
          {list.length > 0 ? (
            <>
              <ResponderList responders={list} intro={list.length > 1 ? 'Choisissez la personne qui vous convient :' : undefined} />
              <Button style={buttonGhost} href={authorUrl}>
                Voir mon besoin
              </Button>
            </>
          ) : (
            <>
              <Text style={text}>
                Un retour, quel qu'il soit, respecte le temps de la personne qui s'est manifestée
                et fait vivre l'entraide dans votre coin.
              </Text>
              <Button style={button} href={authorUrl}>
                Voir la proposition
              </Button>
            </>
          )}
          <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const list = normalizeResponders(d.responders)
    if (list.length > 1) return 'Des personnes attendent votre choix'
    return `${list[0]?.firstName || d.responderFirstName || 'Un membre'} attend votre choix`
  },
  displayName: 'Entraide, relance du demandeur à 24 h (choisir)',
  previewData: {
    responderFirstName: 'Camille',
    missionTitle: 'Promenade du chien dimanche',
    missionId: 'demo',
    responders: [
      { responseId: 'r1', firstName: 'Camille', distanceKm: 3, helpsWith: 'Promener les chiens', verified: true, exchangeDate: '2026-11-02', chooseToken: 'demo-camille' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const buttonGhost = { ...button, backgroundColor: '#F8F6F1', color: '#2C6D50' }
