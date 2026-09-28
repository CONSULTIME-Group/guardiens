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
  ageDays: number
  count: number
  link: string
}

interface Props {
  criticalCount?: number
  warningCount?: number
  staleCount?: number
  coverageLine?: string | null
  lines?: AdminSignalLine[]
}

const fmtDate = (d: string | null) => {
  if (!d) return null
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

const Email = ({
  criticalCount = 0,
  warningCount = 0,
  staleCount = 0,
  coverageLine = null,
  lines = [],
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{criticalCount} action(s) à mener aujourd'hui</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Signaux admin, {criticalCount} action(s) à mener</Heading>

        {staleCount > 0 && (
          <Text style={alert}>
            {staleCount} action(s) attendent depuis plus de 3 jours.
          </Text>
        )}

        <Section>
          {lines.map((l, i) => (
            <Section key={i} style={item}>
              <Text style={itemTitle}>{l.title}</Text>
              <Text style={itemDetail}>
                {fmtDate(l.startDate) ? `Début de garde le ${fmtDate(l.startDate)}` : 'Sans date de garde'}
                {`, ouvert depuis ${l.ageDays} jour${l.ageDays > 1 ? 's' : ''}`}
                {l.count > 1 ? `, ${l.count} signaux regroupés` : ''}
              </Text>
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
          Signaux warning ouverts : {warningCount}.
        </Text>

        <LegalFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Signaux admin critiques ouverts',
  displayName: 'Admin, signaux critiques ouverts',
  to: 'contact@guardiens.fr',
  previewData: {
    criticalCount: 2,
    warningCount: 24,
    staleCount: 1,
    coverageLine: 'Couverture : 5 villes suivies comptent moins de 3 gardiens à 30 km.',
    lines: [
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
