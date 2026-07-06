import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Breach {
  metric: string
  value: number
  threshold: number
  detail?: string
}

interface Props {
  windowDays?: number
  totalSent?: number
  bounceRate?: number
  openRate?: number
  complaintRate?: number
  breaches?: Breach[]
  dashboardUrl?: string
}

const metricLabel = (m: string) => {
  switch (m) {
    case 'bounce': return 'Taux de bounce'
    case 'open': return "Taux d'ouverture"
    case 'complaint': return 'Taux de plainte'
    default: return m
  }
}

const Email = ({
  windowDays = 7,
  totalSent = 0,
  bounceRate = 0,
  openRate = 0,
  complaintRate = 0,
  breaches = [],
  dashboardUrl = 'https://guardiens.fr/admin/emails?tab=delivery',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Alerte délivrabilité : {breaches.length} seuil(s) dépassé(s)</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Alerte délivrabilité emails</Heading>
        <Text style={text}>
          Sur les {windowDays} derniers jours ({totalSent} envois),
          {' '}{breaches.length} seuil(s) de délivrabilité ont été dépassés.
        </Text>

        <Section style={statsBox}>
          <Text style={statLine}><strong>Bounce :</strong> {bounceRate.toFixed(2)} %</Text>
          <Text style={statLine}><strong>Ouverture :</strong> {openRate.toFixed(1)} %</Text>
          <Text style={statLine}><strong>Plainte :</strong> {complaintRate.toFixed(3)} %</Text>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Détails des dépassements</Heading>
        {breaches.map((b, i) => (
          <Text key={i} style={breachLine}>
            <strong>{metricLabel(b.metric)}</strong> : {b.value.toFixed(2)} %
            {' '}(seuil {b.threshold} %){b.detail ? ` , ${b.detail}` : ''}
          </Text>
        ))}

        <Section style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button href={dashboardUrl} style={cta}>Ouvrir le dashboard Delivery</Button>
        </Section>

        <LegalFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Alerte délivrabilité emails Guardiens',
  displayName: 'Admin, alerte délivrabilité',
  previewData: {
    windowDays: 7,
    totalSent: 342,
    bounceRate: 6.4,
    openRate: 12.1,
    complaintRate: 0.15,
    breaches: [
      { metric: 'bounce', value: 6.4, threshold: 5 },
      { metric: 'open', value: 12.1, threshold: 15, detail: '342 envois' },
      { metric: 'complaint', value: 0.15, threshold: 0.1 },
    ],
    dashboardUrl: 'https://guardiens.fr/admin/emails?tab=delivery',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const h2 = { fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: '20px 0 10px' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const statsBox = { backgroundColor: '#f9fafb', padding: '14px 18px', borderRadius: '8px', margin: '16px 0' }
const statLine = { fontSize: '14px', margin: '4px 0', color: '#111827' }
const breachLine = { fontSize: '14px', margin: '6px 0', color: '#991b1b' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const cta = { backgroundColor: '#111827', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
