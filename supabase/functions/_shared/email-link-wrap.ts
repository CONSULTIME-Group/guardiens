/**
 * Encapsule un lien de destination dans une URL de tracking /go.
 * Le href en entree provient d'un attribut HTML, donc les entites HTML
 * (notamment &amp;) doivent etre decodees AVANT de construire l'URL.
 * Sinon les parametres UTM et les dates sont corrompus en &amp;...
 */

const unescapeHtml = (s: string) =>
  s.replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const b64url = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function wrapEmailLink(
  href: string,
  messageId: string,
  siteUrl: string,
): string {
  try {
    const u = new URL(unescapeHtml(href))
    const allowed = new Set(['guardiens.fr', 'www.guardiens.fr', 'guardiens.lovable.app'])
    if (!allowed.has(u.hostname)) return href
    if (u.pathname.startsWith('/unsubscribe') || u.pathname.startsWith('/email-preferences')) return href
    if (u.pathname.startsWith('/go')) return href
    return `${siteUrl}/go?mid=${messageId}&u=${b64url(u.toString())}`
  } catch {
    return href
  }
}
