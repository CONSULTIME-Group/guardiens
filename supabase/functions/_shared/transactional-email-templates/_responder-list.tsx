/// <reference types="npm:@types/react@18.3.1" />
//
// Lot E17 « La boucle tenue » : liste des répondants en attente, partagée par
// mission-response-received, mission-response-waiting et mission-wave-status.
// Chaque personne : prénom, distance, ligne « ce que je propose volontiers »,
// écusson Identité vérifiée, date proposée, bouton « Choisir {prénom} ».

import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  chooseHint,
  chooseLabel,
  chooseUrl,
  exchangeDateLabel,
  normalizeResponders,
  responderDistanceLabel,
} from '../mission-responders.ts'

export const ResponderList = ({ responders, intro }: { responders?: unknown; intro?: string }) => {
  const list = normalizeResponders(responders)
  if (list.length === 0) return null
  return (
    <Section style={wrap}>
      {intro && <Text style={introText}>{intro}</Text>}
      {list.map((r) => {
        const date = exchangeDateLabel(r.exchangeDate)
        const distance = responderDistanceLabel(r.distanceKm)
        return (
          <Section key={r.chooseToken} style={card}>
            <Text style={nameLine}>
              <strong>{r.firstName || 'Une personne'}</strong>
              {distance ? <span style={muted}>{` · ${distance}`}</span> : null}
              {r.verified ? <>{' '}<span style={badge}>Identité vérifiée</span></> : null}
            </Text>
            {r.helpsWith && (
              <Text style={line}>
                <span style={muted}>Ce que je propose volontiers : </span>
                {r.helpsWith}
              </Text>
            )}
            {date && (
              <Text style={line}>
                <span style={muted}>Date proposée : </span>
                {date}
              </Text>
            )}
            <Section style={ctaSection}>
              <Button style={button} href={chooseUrl(r.chooseToken)}>
                {chooseLabel(r)}
              </Button>
            </Section>
          </Section>
        )
      })}
      <Text style={hint}>{chooseHint(list.length)}</Text>
    </Section>
  )
}

export default ResponderList

const wrap = { margin: '8px 0 16px' }
const introText = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 12px', fontWeight: 600 as const }
const card = { backgroundColor: '#F8F6F1', padding: '14px 16px', borderRadius: '10px', margin: '0 0 12px' }
const nameLine = { fontSize: '15px', color: '#2C2A26', lineHeight: '22px', margin: '0 0 6px' }
const line = { fontSize: '14px', color: '#524E47', lineHeight: '20px', margin: '0 0 6px' }
const muted = { color: '#888277' }
const badge = {
  display: 'inline-block',
  marginLeft: '8px',
  padding: '2px 8px',
  borderRadius: '999px',
  backgroundColor: '#E6F0EA',
  color: '#2C6D50',
  fontSize: '12px',
  fontWeight: 600 as const,
}
const ctaSection = { textAlign: 'left' as const, margin: '10px 0 0' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '10px 22px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hint = { color: '#888277', fontSize: '13px', lineHeight: '20px', margin: '4px 0 0' }
