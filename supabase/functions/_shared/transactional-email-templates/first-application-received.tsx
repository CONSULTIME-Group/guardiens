import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
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
}

const FirstApplicationEmail = ({
  sitterFirstName,
  sitTitle,
  sitId,
  messagePreview,
  sitterCity,
  sitterExperience,
  sitterAvatarUrl,
}: Props) => {
  const sitter = sitterFirstName || 'Un gardien'
  const ctaHref = sitId
    ? `${SITE_URL}/sits/${sitId}#candidatures`
    : `${SITE_URL}/dashboard`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre toute première candidature vient d'arriver</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Votre première candidature</Heading>
          <Text style={lead}>
            C'est un moment important : <strong>{sitter}</strong> vient de postuler pour
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
            Prenez quelques minutes pour consulter son profil, lire son message et
            répondre. <strong>Une réponse rapide (dans les 24h) augmente fortement
            les chances qu'un échange de confiance s'installe.</strong>
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={ctaHref}>
              Voir la candidature
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={tips}>
            <strong>Nos conseils pour ce premier échange :</strong><br />
            · Répondez même si vous hésitez, un simple «&nbsp;merci&nbsp;» est apprécié.<br />
            · Posez vos questions dès la messagerie, avant toute décision.<br />
            · Proposez une visio ou une rencontre avant de confirmer.
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
  component: FirstApplicationEmail,
  subject: (data: Record<string, any>) =>
    `Votre première candidature, ${data.sitterFirstName || 'un gardien'} a postulé`,
  displayName: 'Première candidature reçue (propriétaire)',
  previewData: {
    sitterFirstName: 'Marie',
    sitTitle: 'Garde chat Paris 11e',
    sitId: '00000000-0000-0000-0000-000000000000',
    messagePreview: 'Bonjour, votre annonce m\'intéresse beaucoup...',
    sitterCity: 'Paris',
    sitterExperience: '3 ans d\'expérience',
    sitterAvatarUrl: null,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 16px' }
const lead = { fontSize: '16px', color: 'hsl(37, 12%, 25%)', lineHeight: '1.6', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { backgroundColor: 'hsl(153, 42%, 97%)', border: '1px solid hsl(153, 42%, 85%)', padding: '14px 18px', margin: '12px 0 16px', borderRadius: '8px' }
const avatarImg = { borderRadius: '50%', objectFit: 'cover' as const, display: 'block' }
const highlightLabel = { fontSize: '11px', color: 'hsl(153, 30%, 40%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const highlightName = { fontSize: '18px', color: 'hsl(153, 42%, 25%)', fontWeight: '600' as const, margin: '0 0 4px' }
const highlightMeta = { fontSize: '13px', color: 'hsl(37, 7%, 50%)', margin: 0 }
const quoteBox = { borderLeft: '3px solid hsl(153, 42%, 30%)', backgroundColor: 'hsl(37, 30%, 97%)', padding: '12px 16px', margin: '16px 0', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: 'hsl(37, 12%, 30%)', lineHeight: '1.5', margin: 0, fontStyle: 'italic' as const }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const tips = { fontSize: '13px', color: 'hsl(37, 7%, 45%)', lineHeight: '1.7', margin: '0 0 16px' }
