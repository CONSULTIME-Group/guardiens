import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Html, Preview, Text, Hr, Section, Row, Column, Img, Link, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { formatFirstName } from '../format-first-name.ts'
import type { TemplateEntry } from './registry.ts'

// Lettre des fondateurs à tous les membres (17/11/2026), version validée par
// Jérémie (test 2 du 17/11, maquette Claude Design « emails une question pour
// vous »). Réponse directe à l'email : contact@guardiens.fr (gabarit inscrit
// dans FOUNDER_CAMPAIGN_TEMPLATES).

export const LETTRE_MEMBRES_TEMPLATE = 'lettre-membres-novembre'
export const LETTRE_MEMBRES_SUBJECT = 'Guardiens grandit grâce à vous : quoi de neuf ?'
export const LETTRE_MEMBRES_PREVIEW =
  'Entraide, sorties, projets participatifs : Guardiens devient bien plus que la garde de maison. Et nous avons une question pour vous.'

const IMG = 'https://guardiens.fr/email'
const UTM = 'utm_source=email&utm_medium=email&utm_campaign=lettre_membres_novembre'
export const LETTRE_MEMBRES_LINKS = {
  entraide: `https://guardiens.fr/petites-missions?${UTM}&utm_content=entraide`,
  sortie: `https://guardiens.fr/sorties/proposer?${UTM}&utm_content=sortie`,
  projet: `https://guardiens.fr/projets/publier?${UTM}&utm_content=projet`,
  google: 'https://g.page/r/CcG68dHWYoHIEAE/review',
  film: 'https://youtu.be/idfxB9_qqkM',
}

const NEWS: Array<{ dot: string; title: string; text: string; href: string; label: string }> = [
  {
    dot: '#2C6D50',
    title: "L'entraide",
    text: 'Un coup de main au potager, des courses, un trajet en voiture : demandez ou proposez, les membres autour de chez vous sont prévenus.',
    href: LETTRE_MEMBRES_LINKS.entraide,
    label: "Voir l'entraide près de chez moi",
  },
  {
    dot: '#C2703D',
    title: 'Les sorties',
    text: 'Programmez une randonnée entre membres, une partie de belote ou une balade au marché. Les gens du coin intéressés sont prévenus : il suffit ensuite de se retrouver.',
    href: LETTRE_MEMBRES_LINKS.sortie,
    label: 'Proposer une sortie',
  },
  {
    dot: '#3F6E8F',
    title: 'Les projets participatifs',
    text: 'Un jardin partagé, un chantier, une idée pour votre commune : publiez votre projet et réunissez des personnes pour le faire vivre.',
    href: LETTRE_MEMBRES_LINKS.projet,
    label: 'Publier mon projet',
  },
]

interface Props { firstName?: string }

const Eyebrow = ({ label }: { label: string }) => <Text style={eyebrow}>{label}</Text>

const Email = ({ firstName }: Props) => {
  const name = formatFirstName((firstName || '').trim())
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{LETTRE_MEMBRES_PREVIEW}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: '24px 28px 14px' }} className="em-pad">
            <Row style={{ width: 'auto' }}>
              <Column style={{ width: '48px', paddingRight: '8px' }}>
                <Img src={`${IMG}/elisa.jpg`} width="48" height="48" alt="Elisa" style={avatar} />
              </Column>
              <Column style={{ width: '48px', paddingRight: '12px' }}>
                <Img src={`${IMG}/jeremie.jpg`} width="48" height="48" alt="Jérémie" style={avatar} />
              </Column>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={{ fontFamily: serif, fontSize: '17px', color: INK, margin: 0 }}>Elisa et Jérémie</Text>
                <Text style={{ fontSize: '13px', color: MUTED, margin: '2px 0 0' }}>Fondateurs de Guardiens</Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: '0 28px 20px' }} className="em-pad">
            <Text style={h1}>
              Guardiens grandit grâce à vous. <span style={{ fontStyle: 'italic', color: PINE }}>Merci.</span>
            </Text>
          </Section>

          <Img
            src={`${IMG}/entraide-mains-bandeau.jpg`}
            width="600"
            alt="Deux mains se passent un pot de terre et une branche d'herbes, peint à la gouache"
            style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', border: 0 }}
          />

          <Section style={{ padding: '24px 28px 0' }} className="em-pad">
            <Text style={text}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Text>
            <Text style={text}>Depuis le lancement, la communauté grandit chaque semaine, et c'est grâce à vous. Nous en sommes très heureux, et nous voulions vous le dire.</Text>
            <Text style={{ ...text, margin: 0 }}>Guardiens, c'est la garde de maison et d'animaux, et c'est désormais bien plus : de l'entraide, des sorties, des projets à plusieurs. Une façon simple de se retrouver entre gens du coin et d'échanger.</Text>
          </Section>

          <Section style={{ padding: '28px 28px 0' }} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="QUOI DE NEUF" />
            {NEWS.map((n, i) => (
              <Section key={n.title} style={{ ...card, marginTop: i === 0 ? 0 : '12px' }}>
                <Text style={cardTitle}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: n.dot, marginRight: '10px', verticalAlign: 'middle' }} />
                  <span style={{ verticalAlign: 'middle' }}>{n.title}</span>
                </Text>
                <Text style={cardText}>{n.text}</Text>
                <Link href={n.href} style={cardLink}>{n.label}</Link>
              </Section>
            ))}
            <Text style={{ ...small, margin: '14px 0 0' }}>Et toujours la garde de maison et d'animaux, avec des gardiens à proximité. Ces nouveautés sont faites pour vous : essayez-les, et dites-nous ce que vous en pensez.</Text>
          </Section>

          <Section style={{ padding: '28px 28px 0' }} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="VOTRE AVIS COMPTE" />
            <Section style={greenBox}>
              <Text style={question}>Qu'est-ce qu'il vous faudrait pour utiliser Guardiens encore plus ? Qu'est-ce qui vous manque ?</Text>
              <Text style={replyLine}>Répondez simplement à cet email, quelques lignes suffisent.</Text>
            </Section>
            <Text style={{ ...text, margin: '16px 0 0' }}>Nous lisons chaque réponse, Jérémie vous répond personnellement, et nous nous mettons au travail. Vos réponses alimentent notre base de connaissances : elles nous aident à améliorer la plateforme dans les toutes prochaines semaines, pour répondre au mieux à vos besoins.</Text>
          </Section>

          <Section style={{ padding: '24px 28px 0' }} className="em-pad">
            <Section style={{ ...greenBox, padding: '18px' }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: INK, margin: '0 0 8px' }}>Un avis sur Google nous aide énormément</Text>
              <Text style={{ fontSize: '14.5px', lineHeight: '1.55', color: MUTED, margin: '0 0 14px' }}>Il fait connaître Guardiens, il donne confiance à ceux qui découvrent le site, et la communauté s'agrandit. Racontez votre expérience, quelle qu'elle soit.</Text>
              <Section style={{ textAlign: 'center' }}>
                <Button className="em-btn" href={LETTRE_MEMBRES_LINKS.google} style={outlineButton}>Laisser un avis sur Google</Button>
              </Section>
            </Section>
          </Section>

          <Section style={{ padding: '28px 28px 0' }} className="em-pad">
            <Hr style={hr} />
            <Eyebrow label="NOTRE FILM" />
            <Link href={LETTRE_MEMBRES_LINKS.film} style={{ textDecoration: 'none' }}>
              <Img
                src={`${IMG}/tout-au-nord-vignette.jpg`}
                width="544"
                alt="Tout au nord, un conte Guardiens, le film : regarder sur YouTube"
                style={{ display: 'block', width: '100%', maxWidth: '544px', height: 'auto', border: 0, borderRadius: '14px' }}
              />
            </Link>
            <Text style={{ ...cardText, margin: '12px 0 0' }}>
              <strong style={{ color: INK }}>Tout au nord</strong>, notre conte de garde de maison.{' '}
              <Link href={LETTRE_MEMBRES_LINKS.film} style={cardLink}>Regarder le film</Link>
            </Text>
          </Section>

          <Section style={{ padding: '36px 28px 0' }} className="em-pad">
            <Hr style={hr} />
            <Text style={text}>Guardiens est gratuit. À mesure que la communauté grandit, les frais grandissent aussi, et ils commencent à peser lourd pour nous deux. Nous les prenons en charge pour l'instant, parce que nous voulons d'abord faire grandir la communauté. Un jour, cela évoluera avec sa taille, et vous en serez les premiers informés.</Text>
            <Text style={text}>Nous avons besoin de vous : essayez les nouveautés, parlez de Guardiens autour de vous, et écrivez-nous.</Text>
            <Text style={{ ...text, margin: '0 0 6px' }}>Merci d'être là,</Text>
            <Text style={{ fontFamily: serif, fontSize: '19px', color: INK, margin: 0 }}>Elisa et Jérémie</Text>
          </Section>

          <Section style={{ padding: '24px 28px 28px' }} className="em-pad">
            <LegalFooter purpose="l'information des membres inscrits sur la vie de Guardiens" basis="6.1.f" signoff={false} />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: LETTRE_MEMBRES_SUBJECT,
  displayName: 'Lettre des fondateurs aux membres (novembre 2026)',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const serif = "'Playfair Display', Georgia, serif"
const sans = "'Outfit', Arial, sans-serif"
const INK = '#1D1B16'
const PINE = '#2C6D50'
const MUTED = '#5E574D'
const main = { backgroundColor: '#F4F0E9', fontFamily: sans, margin: 0, padding: '24px 0' }
const container = { backgroundColor: '#FFFFFF', borderRadius: '18px', maxWidth: '600px', width: '100%', margin: '0 auto', overflow: 'hidden' as const }
const avatar = { borderRadius: '50%', display: 'block' }
const h1 = { fontFamily: serif, fontSize: '32px', lineHeight: '1.15', color: INK, fontWeight: 600, margin: 0 }
const text = { fontSize: '17px', lineHeight: '1.65', color: '#3A352E', margin: '0 0 16px' }
const small = { fontSize: '15.5px', lineHeight: '1.55', color: MUTED }
const eyebrow = { fontSize: '11.5px', letterSpacing: '2px', color: '#8A5C38', fontWeight: 600, margin: '0 0 14px' }
const hr = { borderColor: '#EDE6DB', margin: '0 0 24px' }
const card = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '18px' }
const cardTitle = { fontFamily: serif, fontSize: '21px', color: INK, margin: '0 0 8px' }
const cardText = { fontSize: '15.5px', lineHeight: '1.55', color: '#3A352E', margin: '0 0 10px' }
const cardLink = { fontSize: '15px', fontWeight: 600, color: PINE, textDecoration: 'underline' }
const greenBox = { backgroundColor: '#EEF5F0', borderRadius: '16px', padding: '20px' }
const question = { fontFamily: serif, fontStyle: 'italic' as const, fontSize: '22px', lineHeight: '1.35', color: INK, margin: '0 0 12px' }
const replyLine = { fontSize: '16.5px', lineHeight: '1.55', color: '#1F5039', fontWeight: 700, margin: 0 }
const outlineButton = {
  backgroundColor: '#FFFFFF', color: PINE, border: `1px solid ${PINE}`, padding: '13px 20px', lineHeight: '20px',
  borderRadius: '999px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
}
