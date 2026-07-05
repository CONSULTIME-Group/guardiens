import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface DigestItem {
  request_type: string
  subject: string
  email?: string | null
  created_at: string
}

interface Props {
  total?: number
  since?: string
  items?: DigestItem[]
  adminUrl?: string
}

const TYPE_LABELS: Record<string, string> = {
  city: 'Ville',
  breed: 'Race',
  places: 'Lieux',
  pros: 'Pros',
  other: 'Autre',
}

const AnalysisRequestsDigestEmail = ({
  total = 0,
  since = '',
  items = [],
  adminUrl = 'https://guardiens.fr/admin/analysis-requests',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{total} demande(s) d'analyse reçue(s)</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Nouvelles demandes d'analyse</Heading>
        <Text style={text}>
          {total} demande{total > 1 ? 's' : ''} reçue{total > 1 ? 's' : ''} depuis {since}.
        </Text>
        <Section style={list}>
          {items.map((it, i) => (
            <Section key={i} style={row}>
              <Text style={rowLabel}>{TYPE_LABELS[it.request_type] || it.request_type}</Text>
              <Text style={rowSubject}>{it.subject}</Text>
              {it.email ? <Text style={rowMeta}>{it.email}</Text> : null}
            </Section>
          ))}
        </Section>
        <Text style={text}>
          <Link href={adminUrl} style={link}>Ouvrir le kanban admin</Link>
        </Text>
        <LegalFooter purpose="de la notification administrative" basis="6.1.f" />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AnalysisRequestsDigestEmail,
  subject: (data: Record<string, any>) =>
    `${data.total || 0} demande(s) d'analyse — Guardiens`,
  displayName: "Digest demandes d'analyse (admin)",
  previewData: {
    total: 3,
    since: 'hier 8h',
    items: [
      { request_type: 'city', subject: 'Bordeaux', email: 'test@x.fr', created_at: new Date().toISOString() },
      { request_type: 'breed', subject: 'Cavalier King Charles', created_at: new Date().toISOString() },
      { request_type: 'pros', subject: 'Vétos de garde Toulouse', email: 'a@b.fr', created_at: new Date().toISOString() },
    ],
    adminUrl: 'https://guardiens.fr/admin/analysis-requests',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const list = { margin: '12px 0 20px' }
const row = { borderLeft: '3px solid hsl(37, 22%, 89%)', padding: '6px 12px', margin: '0 0 10px' }
const rowLabel = { fontSize: '11px', color: 'hsl(153, 42%, 30%)', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px' }
const rowSubject = { fontSize: '14px', color: 'hsl(37, 7%, 25%)', margin: '0 0 2px', fontWeight: '600' as const }
const rowMeta = { fontSize: '12px', color: 'hsl(37, 7%, 55%)', margin: 0 }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
