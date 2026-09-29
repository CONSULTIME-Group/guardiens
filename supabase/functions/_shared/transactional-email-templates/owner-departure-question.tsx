import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Html, Preview, Text, Button, Section, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { formatFirstName } from '../format-first-name.ts'
import type { TemplateEntry } from './registry.ts'

/**
 * Nurturing propriétaire v2, J0 : « Vous partez quand, cette année ? » (lot N4).
 * Cinq boutons vers /ma-periode/{jeton}?p=… Le jeton est transmis par
 * l'appelant via `periodBaseUrl` (sans jeton : repli vers la page connectée).
 */

const IMG = 'https://guardiens.fr/email'
export const OWNER_DEPARTURE_SUBJECT = 'Vous partez quand, cette année ?'
export const OWNER_DEPARTURE_PREHEADER = 'Un clic, et on prépare votre annonce avec vous'
export const OWNER_DEPARTURE_FALLBACK_BASE = 'https://guardiens.fr/ma-periode'
const UTM = 'utm_source=email&utm_medium=email&utm_campaign=owner_departure_question'

export interface OwnerDepartureProps {
  firstName?: string
  /** https://guardiens.fr/ma-periode/{jeton} */
  periodBaseUrl?: string
}

export const DEPARTURE_EMAIL_BUTTONS: Array<{ p: string; label: string; kind: 'primary' | 'secondary' | 'later' }> = [
  { p: 'noel', label: 'Pour Noël', kind: 'primary' },
  { p: 'hiver', label: 'Cet hiver', kind: 'secondary' },
  { p: 'printemps', label: 'Au printemps', kind: 'secondary' },
  { p: 'ete', label: 'Cet été', kind: 'secondary' },
  { p: 'plus_tard', label: 'Je verrai plus tard', kind: 'later' },
]

export const periodHref = (base: string | undefined, p: string) =>
  `${(base || OWNER_DEPARTURE_FALLBACK_BASE).replace(/\/+$/, '')}?p=${p}&${UTM}`

const Email = ({ firstName, periodBaseUrl }: OwnerDepartureProps) => {
  const name = formatFirstName((firstName || '').trim())
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{OWNER_DEPARTURE_PREHEADER}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: '28px 40px 8px' }} className="em-pad"><BrandHeader /></Section>

          <Section style={{ ...pad, paddingTop: '20px' }} className="em-pad">
            <Row style={{ margin: '0 0 10px' }}>
              <Column style={{ width: '20px', verticalAlign: 'middle' }}>
                <div style={{ borderTop: '1.5px solid #8A5C38', width: '20px', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</div>
              </Column>
              <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
                <Text style={eyebrow}>UNE SEULE QUESTION</Text>
              </Column>
            </Row>
            <Text style={h1}>Vous partez quand, cette année ?</Text>
            <Text style={text}>
              {name ? `Bonjour ${name}, ` : 'Bonjour, '}un clic suffit. On prépare votre annonce avec ce que vous avez déjà renseigné, et on revient vers vous au bon moment, avec les gardiens qui habitent près de chez vous.
            </Text>
          </Section>

          <Section style={pad} className="em-pad">
            {DEPARTURE_EMAIL_BUTTONS.map((b) => (
              <Section key={b.p} style={{ margin: '0 0 10px' }}>
                <Button
                  href={periodHref(periodBaseUrl, b.p)}
                  style={b.kind === 'primary' ? btnPrimary : b.kind === 'secondary' ? btnSecondary : btnLater}
                >
                  {b.label}
                </Button>
              </Section>
            ))}
            <Text style={{ ...sub, margin: '8px 0 0' }}>
              Votre réponse sert seulement à vous écrire au bon moment. Vous la changez quand vous voulez, depuis votre tableau de bord.
            </Text>
          </Section>

          <Section style={{ ...pad, paddingTop: '24px' }} className="em-pad">
            <Row style={{ width: 'auto' }}>
              <Column style={{ width: '44px' }}>
                <Img src={`${IMG}/elisa.jpg`} width="44" height="44" alt="Elisa" style={{ borderRadius: '50%', display: 'block', border: '2px solid #FFFFFF' }} />
              </Column>
              <Column style={{ width: '44px' }}>
                <Img src={`${IMG}/jeremie.jpg`} width="44" height="44" alt="Jérémie" style={{ borderRadius: '50%', display: 'block', border: '2px solid #FFFFFF', marginLeft: '-12px' }} />
              </Column>
              <Column style={{ paddingLeft: '8px', verticalAlign: 'middle' }}>
                <Text style={{ fontFamily: serif, fontSize: '17px', color: '#1D1B16', margin: 0 }}>Elisa et Jérémie</Text>
                <Text style={{ ...sub, margin: 0 }}>Fondateurs de Guardiens</Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ ...pad, paddingTop: '16px', paddingBottom: '28px' }} className="em-pad">
            <LegalFooter
              purpose="l'accompagnement des propriétaires dans la publication de leur annonce"
              basis="6.1.f"
              signoff={false}
            />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: OWNER_DEPARTURE_SUBJECT,
  displayName: 'Propriétaires, question de départ',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const serif = "'Playfair Display', Georgia, serif"
const sans = "'Outfit', Arial, sans-serif"
const main = { backgroundColor: '#F4F0E9', fontFamily: sans, margin: 0, padding: '24px 0' }
const container = { backgroundColor: '#FFFFFF', borderRadius: '18px', maxWidth: '600px', width: '100%', margin: '0 auto', overflow: 'hidden' as const }
const pad = { padding: '0 40px' }
const h1 = { fontFamily: serif, fontSize: '32px', lineHeight: '1.15', color: '#1D1B16', fontWeight: 600, margin: '6px 0 20px' }
const text = { fontSize: '16.5px', lineHeight: '1.65', color: '#3A352E', margin: '0 0 16px' }
const sub = { fontSize: '14px', lineHeight: '1.5', color: '#6B645A', margin: '0 0 8px' }
const eyebrow = { fontSize: '11.5px', letterSpacing: '0.16em', color: '#8A5C38', fontWeight: 600, margin: 0 }
const btnBase = { display: 'block', width: '100%', boxSizing: 'border-box' as const, textAlign: 'center' as const, padding: '15px 20px', borderRadius: '999px', fontSize: '16px', fontWeight: 600, textDecoration: 'none' }
const btnPrimary = { ...btnBase, backgroundColor: '#2C6D50', color: '#FFFFFF', border: '1.5px solid #2C6D50' }
const btnSecondary = { ...btnBase, backgroundColor: '#FFFFFF', color: '#1D1B16', border: '1.5px solid #D9CFBF' }
const btnLater = { ...btnBase, backgroundColor: '#FFFFFF', color: '#6B645A', border: '1.5px dashed #C9BFAE', fontWeight: 500 }
