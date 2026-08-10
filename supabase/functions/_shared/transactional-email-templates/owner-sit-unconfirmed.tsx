import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  ownerFirstName?: string
  sitTitle?: string
  dateRange?: string
  sitterNames?: string[]
  lastExchange?: string
  daysUntilStart?: number
  urgency?: 'imminent' | 'stale'
  ctaUrl?: string
  unpublishUrl?: string
}

function joinNames(names: string[]): string {
  if (names.length === 0) return 'votre gardien'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

const OwnerSitUnconfirmedEmail = ({
  ownerFirstName,
  sitTitle,
  dateRange,
  sitterNames,
  lastExchange,
  daysUntilStart,
  urgency,
  ctaUrl,
  unpublishUrl,
}: Props) => {
  const names = Array.isArray(sitterNames) ? sitterNames.filter(Boolean) : []
  const who = joinNames(names)
  const plural = names.length > 1
  const imminent = urgency === 'imminent'
  const days = typeof daysUntilStart === 'number' ? daysUntilStart : null

  const heading = imminent
    ? days !== null && days > 0
      ? `Votre garde commence dans ${days} jour${days > 1 ? 's' : ''}`
      : 'Votre garde commence bientôt'
    : `Votre échange avec ${who} est resté en suspens`

  const preview = imminent
    ? 'Il reste une étape pour que tout soit en place.'
    : 'Il reste une étape pour officialiser cette garde.'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />

          <Heading style={h1} className="em-h1">{heading}</Heading>

          <Text style={text} className="em-text">
            Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},
          </Text>

          <Text style={text} className="em-text">
            Votre annonce «&nbsp;{sitTitle || 'votre annonce'}&nbsp;»
            {dateRange ? ` (${dateRange})` : ''} est toujours publiée, et vous
            échangez avec {who}. Tout est presque bouclé, il ne manque qu'un
            geste : confirmer la garde.
          </Text>

          {lastExchange ? (
            <Text style={meta} className="em-text">
              Dernier échange : {lastExchange}.
              {plural ? ` Gardiens en discussion : ${who}.` : ''}
            </Text>
          ) : null}

          <Section style={ctaSection}>
            <Button href={ctaUrl || 'https://guardiens.fr/sits'} style={button}>
              Confirmer la garde
            </Button>
          </Section>

          <Text style={text} className="em-text">
            Vous vous êtes peut-être déjà mis d'accord par téléphone ou par
            message, et vous pensez que c'est réglé. Tant que la garde n'est pas
            confirmée sur Guardiens, {plural ? 'vos gardiens n\u2019ont' : 'votre gardien n\u2019a'} pas
            accès au Guide de la maison, {plural ? 'ils ne reçoivent' : 'il ne reçoit'} aucun
            rappel avant la garde, et aucun avis ne pourra être échangé après.
          </Text>

          <Text style={secondary} className="em-text">
            <Link href={unpublishUrl || 'https://guardiens.fr/sits'} style={secondaryLink}>
              J'ai finalement trouvé autrement
            </Link>
          </Text>

          <Hr style={hr} />

          <LegalFooter
            purpose="le suivi des gardes que vous organisez sur Guardiens"
            basis="6.1.b"
            extra="Cet email est envoyé depuis une adresse qui ne reçoit pas de réponse."
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: 'hsl(37, 7%, 25%)', lineHeight: '1.65', margin: '0 0 16px' }
const meta = { fontSize: '14px', color: 'hsl(37, 7%, 42%)', lineHeight: '1.6', margin: '0 0 16px' }
const secondary = { fontSize: '13px', color: 'hsl(37, 7%, 50%)', margin: '18px 0 0' }
const secondaryLink = { color: 'hsl(37, 7%, 50%)', textDecoration: 'underline' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 12px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }

export const template = {
  component: OwnerSitUnconfirmedEmail,
  subject: (data: Record<string, any>) => {
    const names = Array.isArray(data?.sitterNames) ? data.sitterNames.filter(Boolean) : []
    if (data?.urgency === 'imminent') {
      const d = typeof data?.daysUntilStart === 'number' ? data.daysUntilStart : null
      return d !== null && d > 0
        ? `Votre garde commence dans ${d} jour${d > 1 ? 's' : ''}, il reste une étape`
        : 'Votre garde commence bientôt, il reste une étape'
    }
    return `Vous discutez avec ${joinNames(names)}, prêt à confirmer ?`
  },
  displayName: 'Garde non confirmée, relance propriétaire',
  previewData: {
    ownerFirstName: 'Claire',
    sitTitle: 'Garde de deux chats à Annecy',
    dateRange: 'du 20 au 27 août 2026',
    sitterNames: ['Camille'],
    lastExchange: 'le 2 août 2026',
    daysUntilStart: 9,
    urgency: 'imminent',
    ctaUrl: 'https://guardiens.fr/sits/exemple#candidatures',
    unpublishUrl: 'https://guardiens.fr/sits/exemple#depublier',
  },
} satisfies TemplateEntry
