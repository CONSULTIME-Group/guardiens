import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Html, Preview, Text, Button, Hr, Section, Row, Column, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { ProofCard } from './_proof-card.tsx'
import { formatFirstName } from '../format-first-name.ts'
import type { TemplateEntry } from './registry.ts'

/**
 * Noël 2026, propriétaires qui n'ont jamais publié (lot N3).
 * Variante A : gardiens proches connus (compte et trois cartes).
 * Variante B : pas de coordonnées ou aucun gardien à moins de 50 km.
 * Les cartes ne portent que prénom, commune, photo, distance arrondie et
 * pastille : jamais de coordonnées.
 */

const IMG = 'https://guardiens.fr/email'
const SITE = 'https://guardiens.fr'

export const OWNER_NOEL_CREATE_URL =
  'https://guardiens.fr/sits/create?utm_source=email&utm_medium=email&utm_campaign=owner_noel_2026'
export const OWNER_NOEL_PROFILE_URL =
  'https://guardiens.fr/profile?focus=postal_code&utm_source=email&utm_medium=email&utm_campaign=owner_noel_2026'

/** Image d'en-tête : aucune pour l'instant. Renseigner une URL https l'affiche pleine largeur. */
export const HERO_IMAGE_URL: string | null = null
const HERO_ALT = "Une maison en hiver, fenêtre éclairée, un chien endormi près du sapin, peint à la gouache"

export const OWNER_NOEL_SUBJECT = 'Pour Noël, votre maison entre de bonnes mains'

export interface NoelSitterCard {
  id: string
  firstName?: string | null
  city?: string | null
  avatarUrl?: string | null
  distanceKm?: number | null
  chip?: string | null
}

export interface OwnerNoelProps {
  firstName?: string
  city?: string
  nearbyCount?: number
  sitters?: NoelSitterCard[]
  variant?: 'A' | 'B'
  createUrl?: string
  profileUrl?: string
  /** Lot N6 : « responder » si la dernière réponse de départ vaut noel ou hiver. */
  mode?: 'responder' | 'default'
  period?: 'noel' | 'hiver'
  /** Pourcentage ownerReadiness (lot N4). */
  percent?: number
  /** Déjà renseigné, ex. « votre maison, Mila et Rex, votre commune ». */
  done?: string
  /** Éléments à faire, ex. « une photo de chez vous et vos dates ». */
  todo?: string
  /** https://guardiens.fr/ma-periode/{jeton} (non-répondants). */
  periodBaseUrl?: string
}

const UTM = 'utm_source=email&utm_medium=email&utm_campaign=owner_noel_2026'

export const isResponder = (p: OwnerNoelProps) => p.mode === 'responder' && (p.period === 'noel' || p.period === 'hiver')

/** Bouton « Terminer mon annonce » du mode répondant. */
export function responderFinishUrl(period: 'noel' | 'hiver'): string {
  const dates = period === 'noel' ? '&debut=2026-12-19&fin=2027-01-03' : ''
  return `${SITE}/sits/create?express=1&periode=${period}${dates}&${UTM}`
}

const ofPeriod = (p: OwnerNoelProps) => (p.period === 'hiver' ? 'de cet hiver' : 'de Noël')
const pct = (p: OwnerNoelProps) => Math.max(0, Math.min(100, Math.round(p.percent ?? 0)))
const todoOf = (p: OwnerNoelProps) => (p.todo || '').trim() || 'à la publier'

export function ownerNoelSubject(p: OwnerNoelProps): string {
  if (!isResponder(p)) return OWNER_NOEL_SUBJECT
  if (resolveVariant(p) === 'A') {
    return `${p.period === 'hiver' ? 'Cet hiver' : 'Pour Noël'}, ${p.nearbyCount} gardiens près de chez vous`
  }
  return `Votre annonce ${ofPeriod(p)} est prête à ${pct(p)} %`
}

export const PERIOD_BUTTONS_NOEL: Array<{ p: string; label: string }> = [
  { p: 'noel', label: 'Pour Noël' },
  { p: 'hiver', label: 'Cet hiver' },
  { p: 'printemps', label: 'Au printemps' },
  { p: 'ete', label: 'Cet été' },
  { p: 'plus_tard', label: 'Je verrai plus tard' },
]

export const noelPeriodHref = (base: string | undefined, p: string) =>
  `${(base || `${SITE}/ma-periode`).replace(/\/+$/, '')}?p=${p}&${UTM}`

export function ownerNoelPreheader(p: OwnerNoelProps): string {
  if (isResponder(p)) return `Votre annonce est prête à ${pct(p)} %, il reste ${todoOf(p)}`
  if (resolveVariant(p) === 'A') {
    return `${p.nearbyCount} gardiens à moins de 50 km de ${(p.city || '').trim()}, et c'est vous qui choisissez`
  }
  return 'Vos dates, votre commune, et les gardiens proches vous écrivent'
}

/** A seulement si les données de la variante A sont réellement présentes. */
/** « En voici trois / deux / un », adapté au nombre de cartes réellement affichées. */
export function ownerNoelSubtitle(n: number): string {
  const tail = "Ils vous envoient leur candidature, et c'est vous qui choisissez."
  const lead = n >= 3 ? 'En voici trois. ' : n === 2 ? 'En voici deux. ' : n === 1 ? 'En voici un. ' : ''
  return lead + tail
}

export function resolveVariant(p: OwnerNoelProps): 'A' | 'B' {
  return p.variant === 'A' && (p.nearbyCount ?? 0) > 0 && !!(p.city || '').trim() ? 'A' : 'B'
}

const PROMISES: Array<{ mark: string; title: string; text: string }> = [
  {
    mark: '1',
    title: 'Vous décrivez qui vous voulez chez vous.',
    text: "Votre rythme, l'ambiance de la maison, la présence que vous attendez : les gardiens qui vous correspondent le mieux remontent en tête. Quand vous choisissez, les autres candidats sont prévenus pour vous.",
  },
  {
    mark: '2',
    title: 'La confiance, écrite noir sur blanc.',
    text: "Des profils détaillés, le badge d'identité vérifiée, des avis publiés en même temps des deux côtés, et un accord de garde que vous signez tous les deux.",
  },
  {
    mark: '3',
    title: 'Vos consignes et vos nouvelles, au bon moment.',
    text: "Votre guide de la maison (codes, routines, habitudes des animaux) s'ouvre à votre gardien une fois choisi. Pendant la garde : des photos, des nouvelles, et un bouton d'aide qui vous prévient aussitôt.",
  },
]

const Eyebrow = ({ label }: { label: string }) => (
  <Row style={{ margin: '0 0 10px' }}>
    <Column style={{ width: '20px', verticalAlign: 'middle' }}>
      <div style={{ borderTop: '1.5px solid #8A5C38', width: '20px', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</div>
    </Column>
    <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
      <Text style={eyebrow}>{label}</Text>
    </Column>
  </Row>
)

const Round = ({ letter, size, bg, color }: { letter: string; size: number; bg: string; color: string }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: `${size}px`, height: `${size}px`, borderCollapse: 'collapse' }}>
    <tbody><tr>
      <td align="center" valign="middle" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: bg, color, fontFamily: serif, fontSize: `${Math.round(size * 0.4)}px`, fontWeight: 600 }}>{letter}</td>
    </tr></tbody>
  </table>
)

const SitterCard = ({ s }: { s: NoelSitterCard }) => {
  const name = formatFirstName((s.firstName || '').trim())
  const town = (s.city || '').trim()
  const km = typeof s.distanceKm === 'number' ? Math.max(0, Math.round(s.distanceKm)) : null
  const where = [town, km !== null ? `${km} km` : ''].filter(Boolean).join(', ')
  const chip = (s.chip || '').trim()
  return (
    <Link href={`${SITE}/gardiens/${s.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Section style={sitterCard}>
        {s.avatarUrl
          ? <Img src={s.avatarUrl} width="56" height="56" alt={name} style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }} />
          : <div style={{ margin: '0 auto', width: '56px' }}><Round letter={(name.charAt(0) || 'G').toLocaleUpperCase('fr-FR')} size={56} bg="#DCE9E1" color="#2C6D50" /></div>}
        <Text style={sitterName}>{name || 'Gardien'}</Text>
        {where ? <Text style={sitterWhere}>{where}</Text> : null}
        {chip ? <Text style={{ margin: '8px 0 0' }}><span style={chipStyle}>{chip}</span></Text> : null}
      </Section>
    </Link>
  )
}

const PeopleBlock = ({ props, profileUrl }: { props: OwnerNoelProps; profileUrl: string }) => {
  const town = (props.city || '').trim()
  const sitters = (props.sitters ?? []).slice(0, 3)
  return (
    <Section style={card}>
      <Eyebrow label="PRÈS DE CHEZ VOUS" />
      {resolveVariant(props) === 'A' ? (
        <>
          <Text style={h2}>{props.nearbyCount} gardiens à moins de 50 km de {town}</Text>
          <Text style={sub}>{ownerNoelSubtitle(sitters.length)}</Text>
          {sitters.length > 0 ? (
            <Row style={{ marginTop: '14px' }}>
              {sitters.map((s, i) => (
                <Column key={s.id} className="em-stack"
                  style={{ width: '33%', verticalAlign: 'top', padding: i === 0 ? '0 6px 0 0' : i === sitters.length - 1 ? '0 0 0 6px' : '0 6px' }}>
                  <SitterCard s={s} />
                </Column>
              ))}
            </Row>
          ) : null}
        </>
      ) : (
        <>
          <Text style={h2}>Montrez votre annonce aux gardiens proches</Text>
          <Text style={{ ...text, fontSize: '15.5px' }}>Ajoutez votre commune sur votre profil : votre annonce apparaît aux gardiens qui habitent près de chez vous, et vous découvrez qui ils sont.</Text>
          <Button style={buttonSecondary} href={profileUrl}>Ajouter ma commune</Button>
        </>
      )}
    </Section>
  )
}

/** Mode répondant (lot N6) : dernière réponse noel ou hiver. */
const ResponderEmail = (props: OwnerNoelProps) => {
  const name = formatFirstName((props.firstName || '').trim())
  const period = props.period === 'hiver' ? 'hiver' : 'noel'
  const done = (props.done || '').trim()
  const profileUrl = props.profileUrl || OWNER_NOEL_PROFILE_URL
  const intro = `${name ? `Bonjour ${name}, ` : 'Bonjour, '}vous nous avez dit partir ${period === 'hiver' ? 'cet hiver' : 'à Noël'}.`
  const prepared = done ? ` On a préparé votre annonce avec ${done}.` : ' On a préparé votre annonce.'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{ownerNoelPreheader(props)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: '28px 40px 8px' }} className="em-pad"><BrandHeader /></Section>
          {HERO_IMAGE_URL ? (
            <Img src={HERO_IMAGE_URL} width="600" alt={HERO_ALT}
              style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', border: 0 }} />
          ) : null}
          <Section style={{ ...pad, paddingTop: '20px' }} className="em-pad">
            <Eyebrow label={period === 'hiver' ? 'CET HIVER' : 'NOËL 2026'} />
            <Text style={h1}>Votre annonce {ofPeriod(props)} est prête à {pct(props)} %.</Text>
            <Text style={text}>{intro}{prepared} Il reste {todoOf(props)}.</Text>
          </Section>

          <Section style={pad} className="em-pad"><PeopleBlock props={props} profileUrl={profileUrl} /></Section>

          <Section style={{ ...pad, paddingTop: '28px' }} className="em-pad">
            <Section style={{ textAlign: 'center' }}>
              <Button className="em-btn" style={button} href={responderFinishUrl(period)}>Terminer mon annonce</Button>
            </Section>
            <Text style={{ ...sub, textAlign: 'center', margin: '12px 0 0' }}>Publier et choisir votre gardien : c'est gratuit.</Text>
          </Section>

          <Section style={{ ...pad, paddingTop: '24px' }} className="em-pad"><ProofCard /></Section>

          <Section style={{ ...pad, paddingTop: '24px' }} className="em-pad">
            <Row style={{ width: 'auto' }}>
              <Column style={{ width: '48px' }}>
                <Img src={`${IMG}/elisa.jpg`} width="48" height="48" alt="Elisa" style={{ borderRadius: '50%', display: 'block', border: '2px solid #F3E8DD' }} />
              </Column>
              <Column style={{ width: '48px' }}>
                <Img src={`${IMG}/jeremie.jpg`} width="48" height="48" alt="Jérémie" style={{ borderRadius: '50%', display: 'block', border: '2px solid #F3E8DD', marginLeft: '-12px' }} />
              </Column>
              <Column>&nbsp;</Column>
            </Row>
            <Text style={foundersQuote}>On lit chaque nouvelle annonce, et on répond à chaque message.</Text>
            <Text style={{ fontFamily: serif, fontSize: '17px', color: '#1D1B16', margin: '10px 0 0' }}>Elisa et Jérémie</Text>
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

const Email = (props: OwnerNoelProps) => {
  if (isResponder(props)) return <ResponderEmail {...props} />
  const name = formatFirstName((props.firstName || '').trim())
  const town = (props.city || '').trim()
  const variant = resolveVariant(props)
  const sitters = (props.sitters ?? []).slice(0, 3)
  const createUrl = props.createUrl || OWNER_NOEL_CREATE_URL
  const profileUrl = props.profileUrl || OWNER_NOEL_PROFILE_URL
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{ownerNoelPreheader(props)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: '28px 40px 8px' }} className="em-pad"><BrandHeader /></Section>

          {HERO_IMAGE_URL ? (
            <Img src={HERO_IMAGE_URL} width="600" alt={HERO_ALT}
              style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', border: 0 }} />
          ) : null}

          <Section style={{ ...pad, paddingTop: '20px' }} className="em-pad">
            <Eyebrow label="NOËL 2026" />
            <Text style={h1}>Partez l'esprit léger, quelqu'un du coin garde la maison.</Text>
            <Text style={text}>
              {name ? `Bonjour ${name}, ` : 'Bonjour, '}les départs de fin d'année se décident maintenant. Votre annonce est en ligne en quelques minutes, et les gardiens proches de chez vous vous écrivent directement.
            </Text>
          </Section>

          <Section style={pad} className="em-pad">
            <Section style={card}>
              <Eyebrow label="PRÈS DE CHEZ VOUS" />
              {variant === 'A' ? (
                <>
                  <Text style={h2}>{props.nearbyCount} gardiens à moins de 50 km de {town}</Text>
                  <Text style={sub}>{ownerNoelSubtitle(sitters.length)}</Text>
                  {sitters.length > 0 ? (
                    <Row style={{ marginTop: '14px' }}>
                      {sitters.map((s, i) => (
                        <Column key={s.id} className="em-stack"
                          style={{ width: '33%', verticalAlign: 'top', padding: i === 0 ? '0 6px 0 0' : i === sitters.length - 1 ? '0 0 0 6px' : '0 6px' }}>
                          <SitterCard s={s} />
                        </Column>
                      ))}
                    </Row>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={h2}>Montrez votre annonce aux gardiens proches</Text>
                  <Text style={{ ...text, fontSize: '15.5px' }}>Ajoutez votre commune sur votre profil : votre annonce apparaît aux gardiens qui habitent près de chez vous, et vous découvrez qui ils sont.</Text>
                  <Button style={buttonSecondary} href={profileUrl}>Ajouter ma commune</Button>
                </>
              )}
            </Section>
          </Section>

          <Section style={{ ...pad, paddingTop: '28px' }} className="em-pad">
            <Section style={{ textAlign: 'center' }}>
              <Button className="em-btn" style={button} href={createUrl}>Je prépare ma garde de Noël</Button>
            </Section>
            <Text style={{ ...sub, textAlign: 'center', margin: '12px 0 0' }}>Publier et choisir votre gardien : c'est gratuit.</Text>
          </Section>

          <Section style={pad} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="CE QUE GUARDIENS FAIT POUR VOUS" />
            <Text style={h2}>Une garde qui se passe bien, de l'annonce au retour</Text>
            {PROMISES.map((p) => (
              <Row key={p.mark} style={{ marginTop: '14px' }}>
                <Column style={{ width: '40px', verticalAlign: 'top' }}>
                  <Round letter={p.mark} size={36} bg="#F3E8DD" color="#2C6D50" />
                </Column>
                <Column style={{ verticalAlign: 'top', paddingLeft: '14px' }}>
                  <Text style={promise}><strong style={{ color: '#1D1B16' }}>{p.title}</strong> {p.text}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section style={{ ...pad, paddingTop: '28px' }} className="em-pad">
            <Section style={founders}>
              <Row style={{ width: 'auto' }}>
                <Column style={{ width: '48px' }}>
                  <Img src={`${IMG}/elisa.jpg`} width="48" height="48" alt="Elisa" style={{ borderRadius: '50%', display: 'block', border: '2px solid #F3E8DD' }} />
                </Column>
                <Column style={{ width: '48px' }}>
                  <Img src={`${IMG}/jeremie.jpg`} width="48" height="48" alt="Jérémie" style={{ borderRadius: '50%', display: 'block', border: '2px solid #F3E8DD', marginLeft: '-12px' }} />
                </Column>
                <Column>&nbsp;</Column>
              </Row>
              <Text style={foundersQuote}>« On a gardé 37 maisons et 234 animaux avant de créer Guardiens. On lit chaque nouvelle annonce, et on répond à chaque message. »</Text>
              <Text style={{ fontFamily: serif, fontSize: '17px', color: '#1D1B16', margin: '10px 0 0' }}>Elisa et Jérémie</Text>
            </Section>
          </Section>

          <Section style={{ ...pad, paddingTop: '24px' }} className="em-pad">
            <Section style={periodBox}>
              <Text style={{ ...text, margin: '0 0 12px' }}>Vous partez à une autre période ? Dites-le-nous en un clic :</Text>
              {PERIOD_BUTTONS_NOEL.map((b) => (
                <Button key={b.p} href={noelPeriodHref(props.periodBaseUrl, b.p)} style={periodBtn}>{b.label}</Button>
              ))}
            </Section>
          </Section>

          <Section style={{ ...pad, paddingBottom: '28px' }} className="em-pad">
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
  subject: (d: Record<string, unknown>) => ownerNoelSubject(d as OwnerNoelProps),
  displayName: 'Propriétaires, Noël 2026',
  previewData: {
    firstName: 'Camille', city: 'Lyon', nearbyCount: 42, variant: 'A',
    sitters: [
      { id: '00000000-0000-0000-0000-000000000001', firstName: 'Julie', city: 'Villeurbanne', distanceKm: 4, chip: 'Identité vérifiée' },
      { id: '00000000-0000-0000-0000-000000000002', firstName: 'Marc', city: 'Bron', distanceKm: 7 },
      { id: '00000000-0000-0000-0000-000000000003', firstName: 'Sofia', city: 'Caluire-et-Cuire', distanceKm: 9, chip: 'Maison nickel' },
    ],
  },
} satisfies TemplateEntry

const serif = "'Playfair Display', Georgia, serif"
const sans = "'Outfit', Arial, sans-serif"
const main = { backgroundColor: '#F4F0E9', fontFamily: sans, margin: 0, padding: '24px 0' }
const container = { backgroundColor: '#FFFFFF', borderRadius: '18px', maxWidth: '600px', width: '100%', margin: '0 auto', overflow: 'hidden' as const }
const pad = { padding: '0 40px' }
const h1 = { fontFamily: serif, fontSize: '32px', lineHeight: '1.15', color: '#1D1B16', fontWeight: 600, margin: '6px 0 20px' }
const h2 = { fontFamily: serif, fontSize: '22px', lineHeight: '1.25', color: '#1D1B16', fontWeight: 600, margin: '0 0 6px' }
const text = { fontSize: '16.5px', lineHeight: '1.65', color: '#3A352E', margin: '0 0 16px' }
const sub = { fontSize: '14px', lineHeight: '1.5', color: '#6B645A', margin: '0 0 8px' }
const eyebrow = { fontSize: '11.5px', letterSpacing: '0.16em', color: '#8A5C38', fontWeight: 600, margin: 0 }
const promise = { fontSize: '15px', lineHeight: '1.6', color: '#3A352E', margin: '6px 0 0' }
const hr = { borderColor: '#EDE6DB', margin: '28px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '16px 32px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '16px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
}
const buttonSecondary = {
  backgroundColor: '#FFFFFF', color: '#2C6D50', border: '1px solid #C9D9CF', padding: '12px 24px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
}
const card = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '22px 22px' }
const sitterCard = { backgroundColor: '#FFFFFF', border: '1px solid #EDE6DB', borderRadius: '14px', padding: '16px 10px', textAlign: 'center' as const }
const sitterName = { fontSize: '15px', fontWeight: 700, color: '#1D1B16', margin: '10px 0 0', lineHeight: '1.3' }
const sitterWhere = { fontSize: '13px', color: '#6B645A', margin: '2px 0 0', lineHeight: '1.4' }
const chipStyle = { backgroundColor: '#F1E4CF', color: '#7A5A2E', fontSize: '11.5px', padding: '3px 9px', borderRadius: '99px', display: 'inline-block' }
const founders = { backgroundColor: '#F3E8DD', borderRadius: '16px', padding: '22px 24px' }
const foundersQuote = { fontFamily: serif, fontStyle: 'italic' as const, fontSize: '18px', lineHeight: '1.45', color: '#1D1B16', margin: '14px 0 0' }
const periodBox = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '18px 20px' }
const periodBtn = {
  backgroundColor: '#FFFFFF', color: '#1D1B16', border: '1px solid #D9CFBF', padding: '9px 14px', lineHeight: '18px',
  borderRadius: '999px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', margin: '0 6px 8px 0',
}
