import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Html, Preview, Text, Button, Hr, Section, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { formatFirstName } from '../format-first-name.ts'
import type { TemplateEntry } from './registry.ts'

// Repli sans jeton : l'écran /ma-ligne demande alors la connexion.
const FALLBACK_URL =
  'https://guardiens.fr/ma-ligne?utm_source=email&utm_medium=email&utm_campaign=entraide_ligne_relance'

const IMG = 'https://guardiens.fr/email'

interface Props { firstName?: string; lineUrl?: string; city?: string; avatarUrl?: string }

const EXAMPLES: Array<{ text: string; who: string; img?: string; initial?: string }> = [
  { text: "« Une partie de Scrabble, d'échecs ou de belote, le dimanche après-midi. »", who: 'Bernard, 71 ans', initial: 'B' },
  { text: '« Un coup de main au potager, et on cueille les légumes ensemble. »', who: 'Nadia, 34 ans', img: `${IMG}/exemple-nadia.jpg` },
  { text: '« Je fais le marché le samedi matin, je peux prendre vos courses. »', who: 'Giulia, 29 ans', img: `${IMG}/exemple-giulia.jpg` },
  { text: '« Je peux vous déposer en voiture à un rendez-vous. »', who: 'Rania, 41 ans', img: `${IMG}/exemple-rania.jpg` },
]

const STEPS = [
  'Vous écrivez une phrase : ce que vous aimez faire.',
  'Elle apparaît sur votre carte, avec votre prénom et votre ville.',
  "Quelqu'un près de chez vous vous écrit. Vous choisissez quand aider.",
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

const Initial = ({ letter, size, fontSize }: { letter: string; size: number; fontSize: number }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: `${size}px`, height: `${size}px`, borderCollapse: 'collapse' }}>
    <tbody><tr>
      <td align="center" valign="middle" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: '#F1E4CF', color: '#7A5A2E', fontFamily: serif, fontSize: `${fontSize}px`, fontWeight: 600 }}>{letter}</td>
    </tr></tbody>
  </table>
)

const Cta = ({ href }: { href: string }) => (
  <Section style={{ textAlign: 'center', margin: '8px 0 4px' }}>
    <Button className="em-btn" style={button} href={href}>Je complète ma carte</Button>
  </Section>
)

const Email = ({ firstName, lineUrl, city, avatarUrl }: Props) => {
  const name = formatFirstName((firstName || '').trim())
  const town = (city || '').trim()
  const href = lineUrl || FALLBACK_URL
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une partie de belote, un coup de main au potager : dites en une phrase ce que vous aimez faire.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: '28px 40px 8px' }} className="em-pad"><BrandHeader /></Section>

          <Section style={pad} className="em-pad">
            <Text style={h1}>Rendre service fait du bien.<br /><span style={{ fontStyle: 'italic', color: '#2C6D50' }}>À vous aussi.</span></Text>
          </Section>

          <Img
            src={`${IMG}/entraide-mains.jpg`}
            width="600"
            alt="Deux mains se passent un pot de terre et une branche d'herbes, peint à la gouache"
            style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', border: 0 }}
          />

          <Section style={{ ...pad, paddingTop: '28px' }} className="em-pad">
            <Text style={text}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Text>
            <Text style={text}>Une partie de cartes, un panier de légumes, un trajet en voiture : pour quelqu'un près de chez vous, c'est un vrai coup de main. Pour vous, c'est souvent un bon moment.</Text>
            <Text style={{ ...text, fontWeight: 700, color: '#1D1B16' }}>Dites en une phrase ce que vous aimez faire. Les gens du coin vous trouveront.</Text>
            <Cta href={href} />
          </Section>

          <Section style={pad} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="DES IDÉES" />
            <Text style={h2}>Une phrase suffit.</Text>
            <Text style={sub}>Quatre exemples imaginés, pour vous donner des idées.</Text>
            {EXAMPLES.map((e, i) => (
              <Row key={e.who} style={{ borderTop: i === 0 ? 'none' : '1px solid #F0EAE0' }}>
                <Column style={{ width: '48px', verticalAlign: 'top', padding: '16px 0' }}>
                  {e.img
                    ? <Img src={e.img} width="48" height="48" alt="" style={{ borderRadius: '50%', display: 'block' }} />
                    : <Initial letter={e.initial!} size={48} fontSize={20} />}
                </Column>
                <Column style={{ verticalAlign: 'top', padding: '16px 0 16px 16px' }}>
                  <Text style={quote}>{e.text}</Text>
                  <Text style={who}>{e.who}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section style={pad} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="COMMENT ÇA MARCHE" />
            {STEPS.map((s, i) => (
              <Row key={s}>
                <Column style={{ width: '32px', verticalAlign: 'top', padding: '8px 0' }}>
                  <Text style={stepNum}>{i + 1}</Text>
                </Column>
                <Column style={{ verticalAlign: 'top', padding: '8px 0' }}>
                  <Text style={stepText}>{s}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section style={pad} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="VOTRE CARTE" />
            <Text style={{ ...text, fontSize: '15px' }}>Voici ce que voient les personnes près de chez vous, sur la page Entraide.</Text>
            <Section style={card}>
              <Row>
                <Column style={{ width: '56px', verticalAlign: 'top' }}>
                  {avatarUrl
                    ? <Img src={avatarUrl} width="56" height="56" alt="" style={{ borderRadius: '50%', display: 'block' }} />
                    : <Initial letter={(name.charAt(0) || '·').toLocaleUpperCase('fr-FR')} size={56} fontSize={22} />}
                </Column>
                <Column style={{ verticalAlign: 'middle', paddingLeft: '14px' }}>
                  <Text style={cardName}>
                    {name || 'Vous'}{' '}
                    <span style={badge}>VOUS</span>
                  </Text>
                  {town ? <Text style={cardCity}>{town}</Text> : null}
                </Column>
              </Row>
              <Section style={dashed}>
                <Text style={dashedText}>Ce que vous aimez faire, en une phrase</Text>
              </Section>
              <Text style={{ margin: '14px 0 0' }}>
                <span style={pill}>{name ? `Écrire à ${name}` : 'Écrire'}</span>
              </Text>
            </Section>
            <Text style={{ ...sub, margin: '14px 0 16px' }}>Une phrase, et votre carte est complète.</Text>
            <Cta href={href} />
          </Section>

          <Section style={{ ...pad, paddingBottom: '8px' }} className="em-pad">
            <Hr style={hr} />
            <Text style={text}>Merci d'être là. À très vite,</Text>
            <Row style={{ width: 'auto' }}>
              <Column style={{ width: '48px', paddingRight: '8px' }}>
                <Img src={`${IMG}/elisa.jpg`} width="48" height="48" alt="Elisa" style={{ borderRadius: '50%', display: 'block' }} />
              </Column>
              <Column style={{ width: '48px', paddingRight: '14px' }}>
                <Img src={`${IMG}/jeremie.jpg`} width="48" height="48" alt="Jérémie" style={{ borderRadius: '50%', display: 'block' }} />
              </Column>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={{ fontFamily: serif, fontSize: '17px', color: '#1D1B16', margin: 0 }}>Elisa et Jérémie</Text>
                <Text style={{ fontSize: '13px', color: '#6B645A', margin: '2px 0 0' }}>Fondateurs de Guardiens</Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ ...pad, paddingBottom: '28px' }} className="em-pad">
            <Hr style={hr} />
            <LegalFooter
              purpose="l'animation de l'entraide entre membres inscrits"
              basis="6.1.f"
            />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const ENTRAIDE_LIGNE_RELANCE_FALLBACK_URL = FALLBACK_URL

export const template = {
  component: Email,
  subject: 'Rendre service fait du bien. À vous aussi.',
  displayName: 'Entraide, relance de la ligne',
  previewData: { firstName: 'Camille', city: 'Lyon' },
} satisfies TemplateEntry

const serif = "'Playfair Display', Georgia, serif"
const sans = "'Outfit', Arial, sans-serif"
const main = { backgroundColor: '#F4F0E9', fontFamily: sans, margin: 0, padding: '24px 0' }
const container = { backgroundColor: '#FFFFFF', borderRadius: '18px', maxWidth: '600px', width: '100%', margin: '0 auto', overflow: 'hidden' as const }
const pad = { padding: '0 24px' }
const h1 = { fontFamily: serif, fontSize: '38px', lineHeight: '1.12', color: '#1D1B16', fontWeight: 600, margin: '12px 0 24px' }
const h2 = { fontFamily: serif, fontSize: '26px', lineHeight: '1.2', color: '#1D1B16', fontWeight: 600, margin: '0 0 6px' }
const text = { fontSize: '16.5px', lineHeight: '1.65', color: '#3A352E', margin: '0 0 16px' }
const sub = { fontSize: '14px', lineHeight: '1.5', color: '#6B645A', margin: '0 0 8px' }
const eyebrow = { fontSize: '11.5px', letterSpacing: '0.16em', color: '#8A5C38', fontWeight: 600, margin: 0 }
const quote = { fontFamily: serif, fontStyle: 'italic' as const, fontSize: '19px', lineHeight: '1.4', color: '#1D1B16', margin: 0 }
const who = { fontSize: '13px', color: '#6B645A', margin: '6px 0 0' }
const stepNum = { fontFamily: serif, fontSize: '22px', lineHeight: '1.2', color: '#2C6D50', margin: 0 }
const stepText = { fontSize: '15.5px', lineHeight: '1.55', color: '#3A352E', margin: '3px 0 0' }
const hr = { borderColor: '#EDE6DB', margin: '28px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '16px 32px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '16px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
}
const card = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '20px 22px' }
const cardName = { fontFamily: serif, fontSize: '20px', color: '#1D1B16', margin: 0, lineHeight: '1.3' }
const badge = { backgroundColor: '#F1E4CF', color: '#7A5A2E', fontFamily: sans, fontSize: '10.5px', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '99px', verticalAlign: 'middle' }
const cardCity = { fontSize: '13.5px', color: '#6B645A', margin: '2px 0 0' }
const dashed = { border: '1.5px dashed #A9C4B5', backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '12px 14px', marginTop: '16px' }
const dashedText = { fontFamily: serif, fontStyle: 'italic' as const, fontSize: '17px', color: '#4F6F5F', margin: 0 }
const pill = { backgroundColor: '#DCE8E1', color: '#2C6D50', fontSize: '13px', padding: '6px 14px', borderRadius: '99px', display: 'inline-block' }
