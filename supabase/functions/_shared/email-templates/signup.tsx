/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { LegalFooter } from './_legal-footer.tsx'
import { BrandedHead } from './_branded-head.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      Plus qu'une étape pour rejoindre {siteName} — confirmez votre adresse email
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Heading style={logo}>
          <span style={{ color: '#3d7a5f' }}>g</span>uardiens
        </Heading>

        {/* Accroche directe et chaleureuse */}
        <Heading style={h1}>Quelle joie de vous accueillir.</Heading>

        <Text style={lead}>
          Vous venez de rejoindre{' '}
          <Link href={siteUrl} style={link}>{siteName}</Link>, une communauté de propriétaires
          et de gardiens qui prennent soin les uns des autres, et de leurs animaux.
          Il ne vous reste qu'une étape pour activer votre compte.
        </Text>

        {/* CTA principal placé HAUT pour conversion immédiate */}
        <Section style={ctaSection}>
          <Button style={button} href={confirmationUrl}>
            Activer mon compte
          </Button>
          <Text style={ctaSubtext}>
            Ce lien est valable 24 heures.
          </Text>
        </Section>

        {/* Fallback lien (anti-Outlook strict / webmails capricieux) */}
        <Text style={fallback}>
          Le bouton ne fonctionne pas ? Copiez-collez ce lien dans votre navigateur :
        </Text>
        <Text style={fallbackUrl}>
          <Link href={confirmationUrl} style={fallbackLink}>
            {confirmationUrl}
          </Link>
        </Text>

        <Hr style={hr} />

        {/* Onboarding — ce qui vous attend */}
        <Heading as="h2" style={h2}>
          Ce qui vous attend ensuite
        </Heading>

        <Text style={stepText}>
          <strong style={stepNum}>1.</strong> Complétez votre profil — prénom, ville, photo et quelques mots sur votre rapport aux animaux.
        </Text>
        <Text style={stepText}>
          <strong style={stepNum}>2.</strong> Découvrez les membres et les annonces près de chez vous.
        </Text>
        <Text style={stepText}>
          <strong style={stepNum}>3.</strong> Échangez en confiance via la messagerie intégrée et organisez votre première garde ou entraide.
        </Text>

        <Hr style={hr} />

        {/* Signature humaine et chaleureuse */}
        <Text style={signature}>
          Au plaisir de faire votre connaissance,<br />
          <span style={signatureName}>Jérémie</span><br />
          <span style={signatureRole}>Fondateur de {siteName}</span>
        </Text>

        {/* Anti-phishing — important */}
        <Section style={securityBox}>
          <Text style={securityText}>
            <strong>Vous n'avez pas créé de compte ?</strong> Ignorez simplement cet email,
            aucun compte ne sera activé sans confirmation de votre part.
          </Text>
          <Text style={securityText}>
            Cet email a été envoyé à{' '}
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>.
          </Text>
        </Section>

        <LegalFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

/* ---------- Styles ---------- */

const main = {
  backgroundColor: '#faf8f4',
  fontFamily: "'Outfit', Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}
const container = {
  backgroundColor: '#ffffff',
  padding: '40px 28px',
  maxWidth: '520px',
  margin: '0 auto',
  borderRadius: '12px',
}
const logo = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  color: '#1a1a1a',
  margin: '0 0 32px',
  textAlign: 'center' as const,
}
const h1 = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const h2 = {
  fontSize: '17px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 18px',
}
const lead = {
  fontSize: '16px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const ctaSection = {
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}
const button = {
  backgroundColor: '#3d7a5f',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  borderRadius: '14px',
  padding: '16px 36px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  letterSpacing: '0.2px',
}
const ctaSubtext = {
  fontSize: '12px',
  color: '#8a8a8a',
  margin: '14px 0 0',
}
const fallback = {
  fontSize: '12px',
  color: '#8a8a8a',
  margin: '20px 0 6px',
  textAlign: 'center' as const,
}
const fallbackUrl = {
  fontSize: '11px',
  color: '#8a8a8a',
  margin: '0 0 8px',
  textAlign: 'center' as const,
  wordBreak: 'break-all' as const,
}
const fallbackLink = {
  color: '#3d7a5f',
  textDecoration: 'underline',
}
const stepText = {
  fontSize: '14px',
  color: '#4a4a4a',
  lineHeight: '1.7',
  margin: '0 0 12px',
}
const stepNum = {
  color: '#3d7a5f',
  marginRight: '6px',
}
const link = { color: '#3d7a5f', textDecoration: 'underline' }
const hr = { borderColor: '#eeeae3', margin: '28px 0' }
const signature = {
  fontSize: '14px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const signatureName = {
  color: '#1a1a1a',
  fontWeight: '600' as const,
}
const signatureRole = {
  color: '#8a8a8a',
  fontSize: '13px',
}
const securityBox = {
  backgroundColor: '#faf8f4',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 8px',
}
const securityText = {
  fontSize: '12px',
  color: '#6b6b6b',
  lineHeight: '1.5',
  margin: '0 0 6px',
}
