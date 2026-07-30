import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Link, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

export interface AdminSignalItem {
  signalType: string
  ageDays: number
  detail?: string
  link: string
}

interface Props {
  criticalCount?: number
  warningCount?: number
  staleCount?: number
  signals?: AdminSignalItem[]
}

const Email = ({
  criticalCount = 0,
  warningCount = 0,
  staleCount = 0,
  signals = [],
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{criticalCount} signal(aux) critique(s) ouvert(s)</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Signaux admin, {criticalCount} critique(s) ouvert(s)</Heading>

        {staleCount > 0 && (
          <Text style={alert}>
            {staleCount} signal(aux) critique(s) sont ouverts depuis plus de 3 jours.
          </Text>
        )}

        <Section>
          {signals.map((s, i) => (
            <Section key={i} style={item}>
              <Text style={itemTitle}>
                {s.signalType} , ouvert depuis {s.ageDays} jour{s.ageDays > 1 ? 's' : ''}
                {s.ageDays > 3 ? ' (non traité)' : ''}
              </Text>
              {s.detail ? <Text style={itemDetail}>{s.detail}</Text> : null}
              <Text style={itemDetail}>
                <Link href={s.link} style={link}>Ouvrir dans l'administration</Link>
              </Text>
            </Section>
          ))}
        </Section>

        <Hr style={hr} />

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
    signals: [
      {
        signalType: 'pending_application',
        ageDays: 5,
        detail: 'Annonce : Garde de deux chats, propriétaire : o.etcheverry@outlook.fr',
        link: 'https://guardiens.fr/admin/listings',
      },
      {
        signalType: 'nurturing_run_anomaly',
        ageDays: 2,
        detail: 'Nurturing anormal, errors=198',
        link: 'https://guardiens.fr/admin/emails',
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
