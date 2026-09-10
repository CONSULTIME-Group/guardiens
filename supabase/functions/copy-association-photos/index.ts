import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireAdminOrServiceRole } from '../_shared/require-admin.ts'

const VERSION = 'assoc-photos-v1'
const MAX_BYTES = 8 * 1024 * 1024
const TIMEOUT_MS = 15000
const BUCKET = 'association-photos'

type Photo = {
  url: string
  source_page_url?: string | null
  alt?: string | null
  hosting: 'external' | 'storage'
  original_url?: string | null
}

const extensionFor = (contentType: string, url: string): string => {
  const fromType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
  }
  if (fromType[contentType]) return fromType[contentType]
  const match = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const denied = await requireAdminOrServiceRole(req, corsHeaders)
  if (denied) return denied

  let payload: { association_id?: string } = {}
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Corps de requête invalide', version: VERSION }, 400)
  }
  const associationId = payload.association_id
  if (!associationId || typeof associationId !== 'string') {
    return json({ error: 'association_id requis', version: VERSION }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: association, error } = await supabase
    .from('animal_associations')
    .select('id, slug, photos, consent_status')
    .eq('id', associationId)
    .maybeSingle()

  if (error || !association) {
    return json({ error: 'Association introuvable', version: VERSION }, 404)
  }
  if (association.consent_status !== 'granted') {
    return json({ error: 'Accord de l\'association requis', version: VERSION }, 409)
  }

  const photos: Photo[] = Array.isArray(association.photos) ? (association.photos as Photo[]) : []
  const report: Array<Record<string, unknown>> = []
  const next: Photo[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    if (!photo?.url) continue
    if (photo.hosting === 'storage') {
      next.push(photo)
      report.push({ index: i, url: photo.url, status: 'deja_stockee' })
      continue
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(photo.url, { signal: controller.signal })
      if (!res.ok) {
        next.push(photo)
        report.push({ index: i, url: photo.url, status: 'echec', reason: `HTTP ${res.status}` })
        continue
      }
      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim()
      if (!contentType.startsWith('image/')) {
        next.push(photo)
        report.push({ index: i, url: photo.url, status: 'echec', reason: 'type non image' })
        continue
      }
      const buffer = new Uint8Array(await res.arrayBuffer())
      if (buffer.byteLength > MAX_BYTES) {
        next.push(photo)
        report.push({ index: i, url: photo.url, status: 'echec', reason: 'taille au-dessus de 8 Mo' })
        continue
      }

      const path = `${association.slug}/${Date.now()}-${i}.${extensionFor(contentType, photo.url)}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true })
      if (uploadError) {
        next.push(photo)
        report.push({ index: i, url: photo.url, status: 'echec', reason: uploadError.message })
        continue
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      next.push({
        ...photo,
        url: pub.publicUrl,
        hosting: 'storage',
        original_url: photo.original_url ?? photo.url,
      })
      report.push({ index: i, url: pub.publicUrl, status: 'copiee', path })
    } catch (e) {
      next.push(photo)
      report.push({
        index: i,
        url: photo.url,
        status: 'echec',
        reason: e instanceof Error ? e.message : 'erreur inconnue',
      })
    } finally {
      clearTimeout(timer)
    }
  }

  const { error: updateError } = await supabase
    .from('animal_associations')
    .update({ photos: next })
    .eq('id', association.id)

  if (updateError) {
    return json({ error: updateError.message, report, version: VERSION }, 500)
  }

  return json({
    version: VERSION,
    association_id: association.id,
    copied: report.filter((r) => r.status === 'copiee').length,
    failed: report.filter((r) => r.status === 'echec').length,
    report,
  })
})
