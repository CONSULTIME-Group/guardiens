import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const FALLBACK = 'https://guardiens.fr'

function decodeBase64Url(b64: string): string | null {
  try {
    const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

function safeTarget(raw: string | null): string {
  if (!raw) return FALLBACK
  try {
    const u = new URL(raw)
    const allowed = new Set(['guardiens.fr', 'www.guardiens.fr', 'guardiens.lovable.app'])
    if (!allowed.has(u.hostname)) return FALLBACK
    return u.toString()
  } catch {
    return FALLBACK
  }
}

export default function EmailClickRedirect() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const mid = searchParams.get('mid') ?? ''
    const u = searchParams.get('u')
    const decoded = u ? decodeBase64Url(u) : null
    const target = safeTarget(decoded)

    // Log du clic en tâche de fond, best-effort : un échec de log ne doit
    // jamais empêcher l'utilisateur d'arriver à destination.
    if (mid && u) {
      fetch(
        `${SUPABASE_URL}/functions/v1/track-email-click?mid=${encodeURIComponent(mid)}&u=${encodeURIComponent(u)}`,
        { mode: 'no-cors', keepalive: true },
      ).catch(() => {})
    }

    window.location.replace(target)
  }, [searchParams])

  return null
}
