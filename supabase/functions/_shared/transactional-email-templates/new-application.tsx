import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { QuickActions } from './_quick-actions.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  sitTitle?: string
  sitId?: string
  messagePreview?: string
  sitterCity?: string
  sitterExperience?: string
  sitterAvatarUrl?: string | null
  declineUrl?: string
  thinkingUrl?: string
  /** Lien profond authentifie, depose directement dans le fil concerne. */
  deepLinkUrl?: string
}

const NewApplicationEmail = ({
  sitterFirstName,
  sitTitle,
  sitId,
  messagePreview,
  sitterCity,
  sitterExperience,
  sitterAvatarUrl,
  declineUrl,
  thinkingUrl,
  deepLinkUrl,
}: Props) => {
  const sitter = sitterFirstName || 'Un gardien'
  const ctaHref = deepLinkUrl
    || (sitId ? `${SITE_URL}/sits/${sitId}#candidatures` : `${SITE_URL}/dashboard`)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{sitter} a postulé pour votre garde</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Nouvelle candidature</Heading>
          <Text style={lead}>
            <strong>{sitter}</strong> a postulé pour
            {sitTitle ? <> votre annonce «&nbsp;{sitTitle}&nbsp;»</> : ' votre annonce'}.
          </Text>

          <Section style={highlightBox}>
            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
              <tr>
                {sitterAvatarUrl ? (
                  <td width="64" style={{ verticalAlign: 'top', paddingRight: '14px' }}>
                    <Img
                      src={sitterAvatarUrl}
                      alt=""
                      width="56"
                      height="56"
                      style={avatarImg}
                    />
                  </td>
                ) : null}
                <td style={{ verticalAlign: 'top' }}>
                  <Text style={highlightLabel}>Candidat</Text>
                  <Text style={highlightName}>{sitter}</Text>
                  {(sitterCity || sitterExperience) ? (
                    <Text style={highlightMeta}>
                      {[sitterCity, sitterExperience].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </td>
              </tr>
            </table>
          </Section>

          {messagePreview ? (
            <Section style={quoteBox}>
              <Text style={quoteText}>«&nbsp;{messagePreview}&nbsp;»</Text>
            </Section>
          ) : null}

          <Text style={text}>
            Consultez son profil, lisez son message et répondez-lui. Une réponse
            rapide augmente les chances qu'un échange de confiance s'installe.
          </Text>

          <QuickActions
            primaryHref={ctaHref}
            primaryLabel={`Répondre à ${sitter}`}
            declineUrl={declineUrl}
            thinkingUrl={thinkingUrl}
          />

          <Text style={note}>
            Vous pourrez lire son message et lui répondre directement dans le chat du site. Inutile de répondre à cet email, il n'est pas relevé.
          </Text>

          <LegalFooter
            purpose="la gestion de votre annonce"
            basis="6.1.b"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewApplicationEmail,
  subject: (data: Record<string, any>) =>
    `${data.sitterFirstName || 'Un gardien'} a postulé pour votre garde`,
  displayName: 'Nouvelle candidature reçue',
  previewData: {
    sitterFirstName: 'Marie',
    sitTitle: 'Garde chat Paris 11e',
    sitId: '00000000-0000-0000-0000-000000000000',
    messagePreview: 'Bonjour, je serais ravie de garder vos animaux...',
    sitterCity: 'Paris',
    sitterExperience: '3 ans d\'expérience',
    sitterAvatarUrl: null,
    declineUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-decline',
    thinkingUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-attente',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 16px' }
const lead = { fontSize: '15px', color: '#474238', lineHeight: '1.6', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const note = { ...text, fontSize: '12px' }
const highlightBox = { backgroundColor: '#F4FBF8', border: '1px solid #C9E9DA', padding: '14px 18px', margin: '12px 0 16px', borderRadius: '8px' }
const avatarImg = { borderRadius: '50%', objectFit: 'cover' as const, display: 'block' }
const highlightLabel = { fontSize: '11px', color: '#478569', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const highlightName = { fontSize: '18px', color: '#255B42', fontWeight: '600' as const, margin: '0 0 4px' }
const highlightMeta = { fontSize: '13px', color: '#888277', margin: 0 }
const quoteBox = { borderLeft: '3px solid #2C6D50', backgroundColor: '#FAF8F5', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: '#564F43', lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
