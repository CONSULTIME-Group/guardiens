import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr, Link, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface SitCard {
  title: string
  city: string
  distanceLabel: string
  meta: string
  url: string
  imageUrl?: string
}

interface Props {
  firstName: string
  subject: string
  sits: SitCard[]
  googleReviewUrl: string
  allListingsUrl: string
}

// Jetons visuels
const CREAM = '#FAF8F5'
const INK = '#1D1B16'
const PINE = '#2C6D50'
const TERRA = '#9A6A44'
const LINE = '#EDE7DE'
const CARD_BG = '#FBF6EC'

const DISPLAY = "'Playfair Display', Georgia, serif"
const TEXT_FONT = "'Outfit', Arial, sans-serif"

const NUMBER_WORDS: Record<number, string> = {
  1: 'Une', 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq',
  6: 'Six', 7: 'Sept', 8: 'Huit', 9: 'Neuf', 10: 'Dix',
}

const countLabel = (n: number) => NUMBER_WORDS[n] || String(n)

const SectionHeader = ({ label }: { label: string }) => (
  <Section style={{ margin: '0 0 8px' }}>
    <div style={rule} />
    <Text style={kicker}>{label}</Text>
  </Section>
)

// Passe par le point de transformation d'image de Supabase Storage : il
// négocie le format selon l'en-tête Accept (donc du JPEG pour Outlook, qui
// ne sait pas lire le WebP) et sert la vignette à la bonne taille.
// 184px = 2x les 92px affichés, pour les écrans à haute densité.
const THUMB_PX = 184
const toThumbUrl = (url: string) => {
  if (!url) return url
  if (url.includes('/storage/v1/render/image/')) return url
  if (!url.includes('/storage/v1/object/public/')) return url
  const base = url.split('?')[0].replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  return `${base}?width=${THUMB_PX}&height=${THUMB_PX}&resize=cover&quality=80`
}

const thumbAlt = (sit: SitCard) =>
  `Photo du logement à ${sit.city}, ${sit.meta}`

const SitRow = ({ sit }: { sit: SitCard }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={cardTable}>
    <tbody>
      <tr>
        <td width="92" valign="top" bgcolor={LINE} style={thumbCell}>
          {sit.imageUrl ? (
            <Img
              src={toThumbUrl(sit.imageUrl)}
              width="92"
              height="92"
              alt={thumbAlt(sit)}
              style={thumb}
            />
          ) : (
            <div style={thumbFallback} />
          )}
        </td>
        <td valign="top" style={{ paddingLeft: '14px' }}>
          <Text style={cardMetaTop}>
            {sit.city} , {sit.distanceLabel}
          </Text>
          <Text style={cardTitle}>{sit.title}</Text>
          <Text style={cardMeta}>{sit.meta}</Text>
          <Link href={sit.url} style={cardLink}>Voir cette garde</Link>
        </td>
      </tr>
    </tbody>
  </table>
)


const FounderPersonalNoticeEmail = ({
  firstName,
  subject,
  sits = [],
  googleReviewUrl,
  allListingsUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />
        <Text style={tagline}>Proches de chez vous.</Text>

        <Heading style={h1} className="em-h1">Bonjour {firstName},</Heading>

        <Text style={text} className="em-text">
          Guardiens a ouvert il y a trois mois. Vous êtes parmi les premiers inscrits, et c'est pour ça que je vous écris moi-même.
        </Text>
        <Text style={text} className="em-text">
          Deux choses dans cet email. Les gardes qui cherchent encore quelqu'un, et une demande.
        </Text>

        <SectionHeader label="CE QUI EST OUVERT" />
        <Heading as="h2" style={h2}>
          {countLabel(sits.length)} maison{sits.length > 1 ? 's' : ''} cherche{sits.length > 1 ? 'nt' : ''} quelqu'un
        </Heading>
        <Text style={muted}>
          De la plus proche à la plus lointaine. Certaines sont loin, je les montre quand même : on est encore peu nombreux, autant que vous sachiez tout ce qui existe.
        </Text>

        {sits.map((sit, i) => <SitRow sit={sit} key={i} />)}

        <Section style={ctaSection} className="em-cta">
          <Button style={button} href={allListingsUrl} className="em-btn">
            Voir toutes les gardes ouvertes
          </Button>
        </Section>

        <Hr style={hr} />

        {/* Seul bloc sombre de l'email, motif "une seule star" */}
        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" bgcolor="#2C6D50" style={darkBox}>
          <tbody>
            <tr>
              <td style={darkCell} className="em-card">
                <Text style={darkKicker}>UN COUP DE MAIN, DANS L'AUTRE SENS</Text>
                <Text style={darkTitle} className="em-card-title">Deux minutes pour nous faire connaître</Text>
                <Text style={darkText} className="em-card-line">
                  Un avis Google, c'est ce qui fait qu'on remonte quand quelqu'un cherche une garde près de chez lui. Plus de gens qui nous trouvent, c'est plus de maisons à garder pour vous. C'est le levier le plus direct que vous ayez pour faire grossir la plateforme.
                </Text>
                <Button style={whiteButton} href={googleReviewUrl} className="em-btn">
                  Laisser un avis Google
                </Button>
              </td>
            </tr>
          </tbody>
        </table>

        <Hr style={hr} />

        <SectionHeader label="MAINTENANT, LA DEMANDE" />
        <Heading as="h2" style={h2}>C'est gratuit, et ce n'est pas un cadeau</Heading>

        <Text style={text} className="em-text">
          Guardiens est gratuit, sans limite et sans engagement. Ce n'est pas une offre de lancement qui va se refermer sur vous, c'est un échange. Vous avez tout. Ce que j'attends en face, c'est votre avis.
        </Text>
        <Text style={pullQuote}>Surtout quand il est mauvais.</Text>
        <Text style={text} className="em-text">
          Ce qui marche, je le vois dans les chiffres. Ce qui coince, personne ne me le dira à ma place. Une inscription pénible, une page introuvable, un mot mal choisi, une fonction qui manque.
        </Text>
        <Text style={text} className="em-text">
          Répondez à cet email, trois lignes suffisent. Vous avez le droit d'être dur, c'est même le plus utile. Je lis tout et je réponds.
        </Text>


        <Text style={text} className="em-text">Merci d'être là si tôt.</Text>
        <Text style={signName}>Jérémie</Text>
        <Text style={signRole}>Cofondateur de Guardiens, avec Elisa</Text>

        <LegalFooter purpose="du suivi de votre expérience sur Guardiens" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FounderPersonalNoticeEmail,
  subject: (data: Record<string, any>) => data.subject || 'Les gardes ouvertes, et une demande',
  displayName: 'Note personnelle du fondateur (annonces)',
  previewData: {
    firstName: 'Camille',
    subject: 'Sept maisons cherchent quelqu\'un, et une demande',
    sits: [
      {
        title: 'Garder Nala dans une maison au calme',
        city: 'Cogny, Rhône',
        distanceLabel: '33 km',
        meta: '1 chien · 27 août au 30 septembre',
        url: 'https://guardiens.fr/gardes/cogny-nala',
        imageUrl: 'https://guardiens.fr/og/exemple-maison-1.jpg',
      },
      {
        title: 'Deux chats et un jardin à Annecy',
        city: 'Annecy, Haute-Savoie',
        distanceLabel: '118 km',
        meta: '2 chats · 5 au 19 septembre',
        url: 'https://guardiens.fr/gardes/annecy-chats',
      },
      {
        title: 'Une ferme et ses animaux dans le Lot',
        city: 'Cahors, Lot',
        distanceLabel: 'loin, très loin',
        meta: '3 animaux · 1er au 14 octobre',
        url: 'https://guardiens.fr/gardes/cahors-ferme',
      },
    ],
    googleReviewUrl: 'https://g.page/r/guardiens/review',
    allListingsUrl: 'https://guardiens.fr/recherche',
  },
} satisfies TemplateEntry

const main = { backgroundColor: CREAM, fontFamily: TEXT_FONT, margin: 0, padding: '24px 0' }
const container = {
  padding: '28px 28px 24px',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: `1px solid ${LINE}`,
}
const tagline = {
  fontSize: '12px',
  color: '#8C857A',
  textAlign: 'center' as const,
  margin: '0 0 28px',
}
const h1 = {
  fontFamily: DISPLAY,
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: INK,
  margin: '0 0 18px',
}
const h2 = {
  fontFamily: DISPLAY,
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: INK,
  margin: '0 0 10px',
}
const text = { fontSize: '15px', color: INK, lineHeight: '1.65', margin: '0 0 16px' }
const muted = { fontSize: '14px', color: '#6F675C', lineHeight: '1.6', margin: '0 0 20px' }
const rule = {
  width: '20px',
  height: '2px',
  backgroundColor: TERRA,
  margin: '0 0 10px',
  lineHeight: '2px',
  fontSize: '2px',
}
const kicker = {
  fontSize: '11px',
  color: TERRA,
  textTransform: 'uppercase' as const,
  letterSpacing: '.16em',
  margin: '0 0 10px',
  fontWeight: '600' as const,
}
const cardTable = {
  backgroundColor: '#ffffff',
  border: `1px solid ${LINE}`,
  borderRadius: '14px',
  padding: '14px',
  margin: '0 0 12px',
  borderCollapse: 'separate' as const,
}
const thumb = {
  width: '92px',
  height: '92px',
  borderRadius: '10px',
  display: 'block',
  backgroundColor: LINE,
}
const thumbFallback = {
  width: '92px',
  height: '92px',
  borderRadius: '10px',
  backgroundColor: LINE,
}
const thumbCell = {
  width: '92px',
  backgroundColor: LINE,
  borderRadius: '10px',
  lineHeight: '0',
  fontSize: '0',
}

const cardMetaTop = {
  fontSize: '11px',
  color: PINE,
  textTransform: 'uppercase' as const,
  letterSpacing: '.08em',
  margin: '0 0 6px',
  fontWeight: '600' as const,
}
const cardTitle = {
  fontFamily: DISPLAY,
  fontSize: '17px',
  color: INK,
  lineHeight: '1.3',
  margin: '0 0 6px',
}
const cardMeta = { fontSize: '13px', color: '#6F675C', margin: '0 0 8px', lineHeight: '1.5' }
const cardLink = { fontSize: '13px', color: PINE, fontWeight: '600' as const, textDecoration: 'underline' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0 8px' }
const button = {
  backgroundColor: PINE,
  color: '#ffffff',
  padding: '14px 30px',
  borderRadius: '999px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const pullQuote = {
  fontFamily: DISPLAY,
  fontStyle: 'italic' as const,
  fontSize: '20px',
  color: PINE,
  margin: '0 0 18px',
}
const darkBox = {
  backgroundColor: PINE,
  backgroundImage: 'linear-gradient(135deg, #245B42 0%, #2C6D50 100%)',
  borderRadius: '16px',
  margin: '4px 0 8px',
  borderCollapse: 'separate' as const,
}
const darkCell = { padding: '26px 26px 28px' }
const darkKicker = {
  fontSize: '11px',
  color: '#C8A24B',
  textTransform: 'uppercase' as const,
  letterSpacing: '.16em',
  fontWeight: '600' as const,
  margin: '0 0 10px',
}
const darkTitle = {
  fontFamily: DISPLAY,
  fontSize: '21px',
  color: '#ffffff',
  lineHeight: '1.3',
  margin: '0 0 10px',
}
const darkText = {
  fontSize: '14px',
  color: '#E7F0EA',
  lineHeight: '1.65',
  margin: '0 0 20px',
}
const whiteButton = {
  backgroundColor: '#ffffff',
  color: PINE,
  padding: '14px 30px',
  borderRadius: '999px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}

const signName = { fontFamily: DISPLAY, fontSize: '18px', color: INK, margin: '0 0 2px' }
const signRole = { fontSize: '12px', color: '#8C857A', margin: '0 0 8px' }
const hr = { borderColor: LINE, margin: '28px 0 24px' }
