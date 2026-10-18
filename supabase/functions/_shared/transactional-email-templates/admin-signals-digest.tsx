import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Link, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

export interface AdminSignalLine {
  title: string
  action: string
  startDate: string | null
  ageDays: number | null
  count: number
  link: string
}

interface Props {
  criticalCount?: number
  warningCount?: number
  staleCount?: number
  coverageLine?: string | null
  /** Lot ADM2 : lectures en échec ou signaux coupés, écrits en tête. */
  notices?: string[]
  lines?: AdminSignalLine[]
}

const fmtDate = (d: string | null) => {
  if (!d) return null
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

const ageText = (d: number | null) =>
  d === null ? null : `ouvert depuis ${d} jour${d > 1 ? 's' : ''}`

/** « Début de garde le 31/10/2026, ouvert depuis 9 jours », sans morceau vide. */
const itemWhen = (l: AdminSignalLine): string | null => {
  const parts = [
    fmtDate(l.startDate) ? `Début de garde le ${fmtDate(l.startDate)}` : null,
    ageText(l.ageDays),
  ].filter((x): x is string => !!x)
  if (!parts.length) return null
  const t = parts.join(', ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const Email = ({
  criticalCount = 0,
  warningCount = 0,
  staleCount = 0,
  coverageLine = null,
  notices = [],
  lines = [],
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{criticalCount > 0 ? `${criticalCount} action(s) à mener aujourd'hui` : 'Rien à traiter ce matin'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>
          {criticalCount > 0 ? `Le point du matin, ${criticalCount} action(s) à mener` : 'Le point du matin, rien à traiter'}
        </Heading>
        {notices.map((n, i) => (
          <Text key={`n${i}`} style={alert}>{n}</Text>
        ))}

        {criticalCount === 0 && notices.length === 0 && (
          <Text style={text}>
            Files humaines vides, annonces sans urgence. Cet email arrive chaque matin : son arrivée confirme que la surveillance tourne.
          </Text>
        )}

        {staleCount > 0 && (
          <Text style={alert}>
            {staleCount} action(s) attendent depuis plus de 3 jours.
          </Text>
        )}

        <Section>
          {lines.map((l, i) => (
            <Section key={i} style={item}>
              <Text style={itemTitle}>{l.title}</Text>
              {itemWhen(l) ? <Text style={itemDetail}>{itemWhen(l)}</Text> : null}
              <Text style={itemDetail}>{l.action}</Text>
              <Text style={itemDetail}>
                <Link href={l.link} style={link}>Ouvrir dans l'administration</Link>
              </Text>
            </Section>
          ))}
        </Section>

        <Hr style={hr} />

        {coverageLine ? <Text style={text}>{coverageLine}</Text> : null}
        <Text style={text}>
          Autres signaux ouverts, sur l'accueil admin : {warningCount}.
        </Text>

        <LegalFooter purpose="le suivi opérationnel de la plateforme" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Guardiens admin, le point du matin',
  displayName: 'Admin, le point du matin',
  to: 'contact@guardiens.fr',
  previewData: {
    criticalCount: 2,
    warningCount: 24,
    staleCount: 1,
    coverageLine: 'Couverture : 5 villes suivies comptent moins de 3 gardiens à 30 km.',
    lines: [
      {
        title: '2 messages de contact',
        action: 'Répondre depuis Messages contact : le bouton Répondre envoie l\'email et le trace.',
        startDate: null,
        ageDays: 2,
        count: 2,
        link: 'https://guardiens.fr/admin/contact-messages',
      },
      {
        title: 'Garde 2 chats centre ville de Marseille',
        action: 'Relancer le propriétaire : 4 candidatures attendent sa réponse.',
        startDate: '2026-10-31',
        ageDays: 9,
        count: 4,
        link: 'https://guardiens.fr/admin/listings',
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '14px', lineHeight: '20px', color: '#374151' }
const alert = { fontSize: '14px', lineHeight: '20px', color: '#991b1b', fontWeight: 600 }
const item = { backgroundColor: '#f9fafb', padding: '12px 14px', borderRadius: '8px', margin: '10px 0' }
const itemTitle = { fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }
const itemDetail = { fontSize: '13px', color: '#374151', margin: '2px 0' }
const link = { color: '#111827', textDecoration: 'underline' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
