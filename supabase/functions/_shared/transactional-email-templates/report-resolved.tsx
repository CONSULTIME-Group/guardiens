import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface ReportResolvedProps {
  reason?: string
  status?: string
  adminNotes?: string
}

const statusLabels: Record<string, string> = {
  resolved: "traité",
  in_progress: "en cours de traitement",
}

const reasonLabels: Record<string, string> = {
  inappropriate: "Contenu inapproprié",
  fake_profile: "Faux profil",
  harassment: "Harcèlement",
  fraud: "Annonce frauduleuse",
  misleading: "Annonce trompeuse",
  other: "Autre",
}

const ReportResolvedEmail = ({ reason, status, adminNotes }: ReportResolvedProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre signalement a été {statusLabels[status || 'resolved'] || 'traité'}, {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>
          Mise à jour de votre signalement
        </Heading>
        <Text style={text}>
          Bonjour,
        </Text>
        <Text style={text}>
          Nous avons bien examiné votre signalement{reason ? ` pour motif « ${reasonLabels[reason] || reason} »` : ''}.
          Celui-ci est maintenant <strong>{statusLabels[status || 'resolved'] || 'traité'}</strong>.
        </Text>
        {adminNotes ? (
          <>
            <Hr style={hr} />
            <Text style={noteLabel}>Note de l'équipe :</Text>
            <Text style={noteText}>{adminNotes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={text}>
          Merci de contribuer à la sécurité de notre communauté. Si vous avez des questions, n'hésitez pas à nous contacter.
        </Text>
        <LegalFooter
          purpose="la modération de la communauté"
          basis="6.1.f"
        />
      </Container>
      </Body>
      </Html>
)

export const template = {
  component: ReportResolvedEmail,
  subject: 'Votre signalement a été traité',
  displayName: 'Signalement traité',
  previewData: { reason: 'inappropriate', status: 'resolved', adminNotes: 'Le contenu a été retiré.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const noteLabel = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1D1B16', margin: '0 0 6px' }
const noteText = { fontSize: '14px', color: '#1D1B16', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#F1EEE9', borderRadius: '8px' }
const legal = { fontSize: '10px', color: '#A09B92', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#A09B92', margin: '10px 0 0' }
