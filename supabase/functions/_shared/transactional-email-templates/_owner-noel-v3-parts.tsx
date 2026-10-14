/// <reference types="npm:@types/react@18.3.1" />
// Email de Noël v3 (lot V1, 14/10/2026) : parties communes des gabarits
// owner-noel-v3-pret, owner-noel-v3-photo, owner-noel-v3-logement et de la
// relance owner-noel-v3-relance. Maquettes Claude Design « Guardiens · Email
// Noël v3 » (Main, EmailPhoto, EmailLogement, EmailMobile).
//
// Un email, un geste : chaque variante porte un seul bouton principal vers la
// page à jeton /annonce-noel/:jeton. Aucune coordonnée, aucune adresse.

import * as React from 'npm:react@18.3.1'
import { Button, Column, Img, Link, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import { formatFirstName } from '../format-first-name.ts'
import {
  frList,
  NOEL_V3_FREE_LINE,
  NOEL_V3_PREHEADERS,
  NOEL_V3_PROOF,
  NOEL_V3_SIGNATURE,
  capitalizeName,
  SITE,
  upperFirst,
  type NoelV3EmailData,
  type NoelV3Variant,
} from '../owner-noel-v3.ts'

const IMG = 'https://guardiens.fr/email'
const UTM = 'utm_source=email&utm_medium=email&utm_campaign=owner_noel_v3'
export const NOEL_V3_PROFILE_URL = `${SITE}/owner-profile?${UTM}`

export type NoelV3Props = Partial<NoelV3EmailData>

export const v3Variant = (p: NoelV3Props): NoelV3Variant =>
  p.variant === 'pret' || p.variant === 'photo' ? p.variant : 'logement'

const pageUrl = (p: NoelV3Props, extra = '') => {
  const base = (p.pageUrl || '').trim() || `${SITE}/dashboard?${UTM}`
  return base + extra
}

const greeting = (p: NoelV3Props) => {
  const n = formatFirstName((p.firstName || '').trim())
  return n ? `Bonjour ${n}, ` : 'Bonjour, '
}

/** Prénoms des animaux, première lettre en majuscule, six au plus. */
export const pets = (p: NoelV3Props): string[] => (p.petNames ?? []).map(capitalizeName).filter(Boolean).slice(0, 6)

/** « votre maison à Draveil, Mila et votre photo ». */
export function preparedWith(p: NoelV3Props): string {
  return frList([p.propertyLabel || 'votre logement', ...pets(p), 'votre photo'])
}

/** « votre maison à Draveil et Mila ». */
export function alreadyThere(p: NoelV3Props): string {
  return frList([p.propertyLabel || 'votre logement', ...pets(p)])
}

export function v3Intro(p: NoelV3Props): string {
  const v = v3Variant(p)
  if (v === 'pret') {
    return `${greeting(p)}nous l'avons préparée avec ce que vous avez déjà renseigné : ${preparedWith(p)}. Vous relisez, vous ajustez les dates si besoin, et vous publiez.`
  }
  if (v === 'photo') {
    return `${greeting(p)}votre annonce reprend déjà ${alreadyThere(p)}. Pour Noël, il reste une photo : elle se prend depuis votre téléphone, en une minute.`
  }
  return `${greeting(p)}dites-nous où vous vivez, qui reste à la maison et quand vous partez. Nous préparons votre annonce, vous ajoutez une photo, et les gardiens à proximité la découvrent.`
}

export const V3_TITLES: Record<NoelV3Variant, string> = {
  pret: 'Votre annonce de Noël est prête.',
  photo: 'Une photo de chez vous, et c\'est prêt.',
  logement: 'Votre annonce de Noël, en trois questions.',
}

export const V3_PLACE_CHOICES: Array<{ type: string; label: string }> = [
  { type: 'house', label: 'Une maison' },
  { type: 'apartment', label: 'Un appartement' },
  { type: 'other', label: 'Un autre lieu' },
]

const Eyebrow = ({ label }: { label: string }) => <Text style={eyebrow}>{label}</Text>

const Round = ({ letter, size, bg, color }: { letter: string; size: number; bg: string; color: string }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: `${size}px`, height: `${size}px`, borderCollapse: 'collapse' }}>
    <tbody><tr>
      <td align="center" valign="middle" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: bg, color, fontFamily: serif, fontSize: `${Math.round(size * 0.42)}px`, fontWeight: 600 }}>{letter}</td>
    </tr></tbody>
  </table>
)

/** Point plein, à la place d'une coche (aucun caractère décoratif dans les gabarits). */
const Dot = ({ done }: { done: boolean }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
    <tbody><tr>
      <td style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: done ? '#2C6D50' : '#FFFFFF', border: done ? '0' : '2px solid #8A5C38', fontSize: '1px', lineHeight: '1px' }}>&nbsp;</td>
    </tr></tbody>
  </table>
)

const ReadyCard = ({ p }: { p: NoelV3Props }) => {
  const chips = [upperFirst((p.propertyLabel || 'votre logement').replace(/^votre /, '').replace(/ à .*$/, '')), ...pets(p), 'Dates modifiables']
  return (
    <Link href={pageUrl(p)} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Section style={readyCard}>
        {p.photoUrl ? (
          <Img src={p.photoUrl} width="520" alt="Votre photo du logement"
            style={{ display: 'block', width: '100%', maxWidth: '520px', height: 'auto', borderRadius: '12px', margin: '0 0 14px' }} />
        ) : null}
        <Text style={{ ...eyebrow, margin: '0 0 6px' }}>VOTRE ANNONCE</Text>
        <Text style={readyTitle}>{p.draftTitle || 'Votre garde pendant les fêtes'}</Text>
        <Text style={{ ...text, fontSize: '14.5px', margin: '4px 0 10px' }}>{p.datesLabel}</Text>
        <Text style={{ margin: 0 }}>
          {chips.map((c) => <span key={c} style={chip}>{c}</span>)}
        </Text>
      </Section>
    </Link>
  )
}

const PhotoChecklist = ({ p }: { p: NoelV3Props }) => {
  const done = [upperFirst(p.propertyLabel || 'votre logement'), ...pets(p), `${p.datesLabel}, modifiable`]
  return (
    <Section style={readyCard}>
      <Text style={{ ...eyebrow, margin: '0 0 10px' }}>VOTRE ANNONCE DE NOËL</Text>
      {done.map((d) => (
        <Row key={d} style={{ margin: '0 0 8px' }}>
          <Column style={{ width: '22px', verticalAlign: 'middle' }}><Dot done /></Column>
          <Column style={{ verticalAlign: 'middle' }}><Text style={checkLine}>{d}</Text></Column>
        </Row>
      ))}
      <Row style={{ margin: '4px 0 0' }}>
        <Column style={{ width: '22px', verticalAlign: 'middle' }}><Dot done={false} /></Column>
        <Column style={{ verticalAlign: 'middle' }}><Text style={{ ...checkLine, fontWeight: 700, color: '#8A5C38' }}>Une photo de chez vous</Text></Column>
      </Row>
    </Section>
  )
}

const PlaceChoices = ({ p }: { p: NoelV3Props }) => (
  <Section style={readyCard}>
    <Text style={{ ...text, fontWeight: 600, margin: '0 0 12px' }}>Pour commencer, vous vivez dans :</Text>
    {V3_PLACE_CHOICES.map((c) => (
      <Button key={c.type} href={pageUrl(p, `&type=${c.type}`)} style={placeBtn}>{c.label}</Button>
    ))}
    <Text style={{ ...sub, margin: '10px 0 0' }}>Ensuite : qui reste à la maison, vos dates, une photo. Trois minutes depuis votre téléphone.</Text>
  </Section>
)

/** Gardiens à proximité (nombre et trois visages) et preuve, ou « Ajoutez votre commune ». */
export const NearbyProof = ({ p }: { p: NoelV3Props }) => {
  const faces = (p.faces ?? []).slice(0, 3)
  if (!p.nearbyLabel) {
    return (
      <Section style={{ ...v3Pad, paddingTop: '26px' }} className="em-pad">
        <Section style={softBox}>
          <Text style={{ ...text, fontSize: '15px', margin: '0 0 8px' }}>
            Ajoutez votre commune : votre annonce apparaît aux gardiens qui habitent à proximité.
          </Text>
          <Link href={NOEL_V3_PROFILE_URL} style={linkStrong}>Ajouter ma commune</Link>
          <Text style={{ ...sub, margin: '12px 0 0' }}>{NOEL_V3_PROOF}</Text>
        </Section>
      </Section>
    )
  }
  return (
    <Section style={{ ...v3Pad, paddingTop: '26px' }} className="em-pad">
      <Row>
        {faces.length > 0 ? (
          <Column style={{ width: `${faces.length * 44}px`, verticalAlign: 'middle', paddingRight: '12px' }}>
            <Row style={{ width: 'auto' }}>
              {faces.map((f) => (
                <Column key={f.id} style={{ width: '44px', verticalAlign: 'middle' }}>
                  {f.avatarUrl
                    ? <Img src={f.avatarUrl} width="40" height="40" alt={formatFirstName(f.firstName) || 'Gardien'} style={{ borderRadius: '50%', display: 'block' }} />
                    : <Round letter={(formatFirstName(f.firstName).charAt(0) || 'G').toLocaleUpperCase('fr-FR')} size={40} bg="#DCE9E1" color="#2C6D50" />}
                </Column>
              ))}
            </Row>
          </Column>
        ) : null}
        <Column style={{ verticalAlign: 'middle' }}>
          <Text style={{ ...text, fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
            <strong style={{ color: '#2C6D50' }}>{p.nearbyLabel}.</strong> {NOEL_V3_PROOF}
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

export const FoundersSignature = () => (
  <Section style={{ ...v3Pad, paddingTop: '24px' }} className="em-pad">
    <Row>
      <Column style={{ width: '82px', verticalAlign: 'middle' }}>
        <Row style={{ width: 'auto' }}>
          <Column style={{ width: '44px' }}>
            <Img src={`${IMG}/elisa.jpg`} width="44" height="44" alt="Elisa" style={{ borderRadius: '50%', display: 'block', border: '2px solid #FFFFFF' }} />
          </Column>
          <Column style={{ width: '38px' }}>
            <Img src={`${IMG}/jeremie.jpg`} width="44" height="44" alt="Jérémie" style={{ borderRadius: '50%', display: 'block', border: '2px solid #FFFFFF', marginLeft: '-12px' }} />
          </Column>
        </Row>
      </Column>
      <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
        <Text style={quote}>{NOEL_V3_SIGNATURE} Elisa et Jérémie</Text>
      </Column>
    </Row>
  </Section>
)

/**
 * Corps d'une variante, entre l'en-tête et le pied légal. Chaque gabarit pose
 * lui-même <BrandHeader /> et <LegalFooter /> (verrous de présence). La
 * relance réutilise le même corps.
 */
export const NoelV3Body = (p: NoelV3Props) => {
  const v = v3Variant(p)
  return (
    <>
      <Section style={{ ...v3Pad, paddingTop: '18px' }} className="em-pad">
        <Eyebrow label="NOËL 2026" />
        <Text style={h1}>{V3_TITLES[v]}</Text>
        <Text style={text}>{v3Intro(p)}</Text>
      </Section>

      <Section style={{ ...v3Pad, paddingTop: '6px' }} className="em-pad">
        {v === 'pret' ? <ReadyCard p={p} /> : v === 'photo' ? <PhotoChecklist p={p} /> : <PlaceChoices p={p} />}
      </Section>

      {v !== 'logement' ? (
        <Section style={{ ...v3Pad, paddingTop: '24px', textAlign: 'center' as const }} className="em-pad">
          <Button className="em-btn" style={button} href={v === 'photo' ? pageUrl(p, '&etape=photo') : pageUrl(p)}>
            {v === 'photo' ? 'Prendre la photo' : 'Voir mon annonce'}
          </Button>
          <Text style={{ ...sub, textAlign: 'center' as const, margin: '12px 0 0' }}>
            {v === 'photo' ? 'Le salon, le jardin ou l\'entrée, à la lumière du jour.' : NOEL_V3_FREE_LINE}
          </Text>
        </Section>
      ) : (
        <Section style={{ ...v3Pad, paddingTop: '18px' }} className="em-pad">
          <Text style={{ ...sub, textAlign: 'center' as const, margin: 0 }}>{NOEL_V3_FREE_LINE}</Text>
        </Section>
      )}

      <NearbyProof p={p} />
      <FoundersSignature />

      <Section style={{ ...v3Pad, paddingTop: '22px' }} className="em-pad">
        <Text style={{ ...sub, margin: 0 }}>
          Vous partez à une autre période ?{' '}
          <Link href={p.periodUrl ? `${p.periodUrl}?${UTM}` : `${SITE}/dashboard?${UTM}`} style={linkStrong}>Dites-le-nous en un clic</Link>
        </Text>
      </Section>
    </>
  )
}

export const NOEL_V3_FOOTER_PURPOSE = "l'accompagnement des propriétaires dans la publication de leur annonce"
export const noelV3Preheader = (p: NoelV3Props) => NOEL_V3_PREHEADERS[v3Variant(p)]

export const NOEL_V3_PREVIEW: Record<NoelV3Variant, NoelV3Props> = {
  pret: {
    variant: 'pret', firstName: 'Camille', city: 'Draveil',
    pageUrl: `${SITE}/annonce-noel/0000000000000000000000000000000000000000000000000000000000000000?${UTM}&v=pret`,
    propertyLabel: 'votre maison à Draveil', petNames: ['Mila'],
    draftTitle: 'Garde de Mila pendant les fêtes, à Draveil', datesLabel: 'Du 19 décembre au 3 janvier',
    nearbyCount: 90, nearbyLabel: '90 gardiens à moins de 50 km de Draveil',
    faces: [{ id: '1', firstName: 'Thomas' }, { id: '2', firstName: 'Marie' }, { id: '3', firstName: 'Sofia' }],
  },
  photo: {
    variant: 'photo', firstName: 'Camille', city: 'Draveil',
    pageUrl: `${SITE}/annonce-noel/0000000000000000000000000000000000000000000000000000000000000000?${UTM}&v=photo`,
    propertyLabel: 'votre maison à Draveil', petNames: ['Mila'], datesLabel: 'Du 19 décembre au 3 janvier',
    nearbyCount: 90, nearbyLabel: '90 gardiens à moins de 50 km de Draveil',
    faces: [{ id: '1', firstName: 'Thomas' }, { id: '2', firstName: 'Marie' }, { id: '3', firstName: 'Sofia' }],
  },
  logement: {
    variant: 'logement', firstName: 'Camille', city: 'Lyon',
    pageUrl: `${SITE}/annonce-noel/0000000000000000000000000000000000000000000000000000000000000000?${UTM}&v=logement`,
    petNames: [], datesLabel: 'Du 19 décembre au 3 janvier',
    nearbyCount: 121, nearbyLabel: '121 gardiens à moins de 50 km de Lyon',
    faces: [{ id: '1', firstName: 'Léa' }, { id: '2', firstName: 'Antoine' }, { id: '3', firstName: 'Nina' }],
  },
}

const serif = "'Playfair Display', Georgia, serif"
const sans = "'Outfit', Arial, sans-serif"
export const v3Main = { backgroundColor: '#F4F0E9', fontFamily: sans, margin: 0, padding: '24px 0' }
export const v3Container = { backgroundColor: '#FFFFFF', borderRadius: '18px', maxWidth: '600px', width: '100%', margin: '0 auto', overflow: 'hidden' as const }
export const v3Pad = { padding: '0 40px' }
const h1 = { fontFamily: serif, fontSize: '32px', lineHeight: '1.15', color: '#1D1B16', fontWeight: 600, margin: '6px 0 16px' }
const text = { fontSize: '16.5px', lineHeight: '1.65', color: '#3A352E', margin: '0 0 16px' }
const sub = { fontSize: '14px', lineHeight: '1.5', color: '#5E5850', margin: '0 0 8px' }
const eyebrow = { fontSize: '11.5px', letterSpacing: '0.16em', color: '#8A5C38', fontWeight: 600, margin: '0 0 10px' }
const readyCard = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '20px 22px' }
const readyTitle = { fontFamily: serif, fontSize: '20px', lineHeight: '1.25', color: '#1D1B16', fontWeight: 600, margin: 0 }
const chip = { display: 'inline-block', fontSize: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E6DCCB', borderRadius: '99px', padding: '3px 10px', color: '#5E5850', margin: '0 6px 6px 0' }
const checkLine = { fontSize: '15px', lineHeight: '1.4', color: '#1D1B16', margin: 0 }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '16px 40px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', display: 'inline-block',
}
const placeBtn = {
  backgroundColor: '#FFFFFF', color: '#1D1B16', border: '1px solid #C9D9CF', padding: '13px 20px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', margin: '0 8px 8px 0',
}
const softBox = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '18px 20px' }
const linkStrong = { color: '#2C6D50', fontWeight: 600, textDecoration: 'underline' }
const quote = { fontFamily: serif, fontStyle: 'italic' as const, fontSize: '16px', lineHeight: '1.45', color: '#1D1B16', margin: 0 }
