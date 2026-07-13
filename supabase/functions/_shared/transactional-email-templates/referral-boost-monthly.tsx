import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = firstName || ''
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Partagez {SITE_NAME}, gagnez un mois offert</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `${name},` : 'Bonjour,'}</Heading>
          <Text style={text}>
            Vous faites vivre {SITE_NAME} au quotidien : merci. Si l'expérience vous plaît,
            une recommandation aux gens du coin nous aide énormément.
          </Text>
          <Text style={text}>
            Pour chaque proche qui s'inscrit et publie une annonce ou une candidature
            avec votre lien, vous recevez un mois d'abonnement gardien offert.
            Aucune limite, cumulable.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/parrainage`}>
              Récupérer mon lien de parrainage
            </Button>
          </Section>
          <Text style={text}>
            Un message tout simple suffit : « Je te recommande {SITE_NAME}, ça change la vie
            quand on a des animaux. Voici mon lien. »
          </Text>
          <Hr style={hr} />
          <LegalFooter purpose="la fidélisation de nos membres actifs" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: `Partagez ${SITE_NAME}, gagnez un mois offert`,
  displayName: 'Boost parrainage mensuel',
  previewData: { firstName: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
