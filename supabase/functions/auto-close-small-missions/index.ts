// auto-close-small-missions
// -----------------------------------------------------------------------------
// Deux phases enchaînées, idempotentes :
//
// 1) AUTO-COMPLETE (vague 32) : les missions BESOIN avec une réponse acceptée
//    dont la date de référence (end_date, sinon date_needed) est passée d'au moins
//    1 jour passent en 'completed'. Si aucune date n'est fournie, on retombe sur
//    accepted_at + 7 jours (approximé par la plus récente réponse acceptée).
//    Les deux parties reçoivent une notification les invitant à remercier /
//    laisser un retour. L'email de nudge feedback est laissé au cron dédié.
//
// 2) AUTO-CLOSE : les missions BESOIN 'open' dormantes passent en 'cancelled'
//    selon les mêmes règles qu'avant. Les OFFRES ne périment jamais par date.
//
// Body accepté : { dry_run?: boolean, mission_id?: string }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { dry_run?: boolean; mission_id?: string } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const run = await startCronRun('auto-close-small-missions')
  const now = new Date()
  const nowIso = now.toISOString()
  const today = nowIso.slice(0, 10)
  const yesterday = new Date(now.getTime() - 86400_000).toISOString().slice(0, 10)
  const dateNeededCutoff = new Date(now.getTime() - 3 * 86400_000).toISOString().slice(0, 10)
  const createdAtCutoff = new Date(now.getTime() - 45 * 86400_000).toISOString()
  const acceptedFallbackCutoff = new Date(now.getTime() - 7 * 86400_000).toISOString()

  try {
    // -----------------------------------------------------------------
    // Phase 1 — Auto-complete missions acceptées dont la date est passée
    // -----------------------------------------------------------------
    const { data: acceptedCandidates } = await admin
      .from('small_missions')
      .select('id, user_id, title, mission_type, date_needed, end_date, status')
      .eq('mission_type', 'besoin')
      .in('status', ['open', 'in_progress'])
      .limit(500)

    let completedCount = 0
    const completeErrors: Array<{ mission_id: string; reason: string }> = []
    const toComplete: Array<{ id: string; user_id: string; title: string; helper_id: string }> = []

    for (const m of (acceptedCandidates ?? [])) {
      if (body.mission_id && m.id !== body.mission_id) continue

      // Trouver au moins une réponse acceptée
      const { data: accepted } = await admin
        .from('small_mission_responses')
        .select('id, responder_id, created_at')
        .eq('mission_id', m.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)

      const acc = (accepted ?? [])[0]
      if (!acc) continue

      // Date de référence
      let isPast = false
      if (m.end_date) {
        isPast = m.end_date <= yesterday
      } else if (m.date_needed) {
        isPast = m.date_needed <= yesterday
      } else {
        isPast = acc.created_at < acceptedFallbackCutoff
      }
      if (!isPast) continue

      toComplete.push({
        id: m.id,
        user_id: m.user_id,
        title: m.title || 'Votre coup de main',
        helper_id: acc.responder_id,
      })
    }

    if (!body.dry_run) {
      for (const m of toComplete) {
        const { error: updErr } = await admin
          .from('small_missions')
          .update({ status: 'completed', closed_at: nowIso, close_reason: 'auto_completed_after_date' })
          .eq('id', m.id)
          .in('status', ['open', 'in_progress'])
        if (updErr) { completeErrors.push({ mission_id: m.id, reason: updErr.message }); continue }
        completedCount++

        // Notifications idempotentes (une par couple mission_id + type)
        try {
          const { data: existingAuthor } = await admin
            .from('notifications')
            .select('id')
            .eq('user_id', m.user_id)
            .eq('type', 'mission_auto_completed')
            .eq('link', `/petites-missions/${m.id}`)
            .maybeSingle()
          if (!existingAuthor) {
            await admin.from('notifications').insert({
              user_id: m.user_id,
              type: 'mission_auto_completed',
              title: 'Votre coup de main est terminé',
              body: `« ${m.title} » vient d'être marqué comme terminé. Prenez un instant pour laisser un retour à la personne qui vous a aidé.`,
              link: `/petites-missions/${m.id}`,
              actor_name: 'Système',
            })
          }

          const { data: existingHelper } = await admin
            .from('notifications')
            .select('id')
            .eq('user_id', m.helper_id)
            .eq('type', 'mission_auto_completed')
            .eq('link', `/petites-missions/${m.id}`)
            .maybeSingle()
          if (!existingHelper) {
            await admin.from('notifications').insert({
              user_id: m.helper_id,
              type: 'mission_auto_completed',
              title: 'Mission terminée, merci pour votre aide',
              body: `Le coup de main « ${m.title} » vient de se clore. Vous recevrez peut-être un mot de remerciement, et la personne peut vous décerner un écusson.`,
              link: `/petites-missions/${m.id}`,
              actor_name: 'Système',
            })
          }
        } catch (e) {
          console.warn('[auto-complete] notify failed', m.id, e)
        }
      }
    }

    // -----------------------------------------------------------------
    // Phase 2 — Auto-close missions dormantes (comportement historique)
    // -----------------------------------------------------------------
    const { data: candidates, error } = await admin
      .from('small_missions')
      .select('id, user_id, title, mission_type, date_needed, end_date, created_at')
      .eq('status', 'open')
      .or(`end_date.lt.${today},date_needed.lt.${dateNeededCutoff},created_at.lt.${createdAtCutoff}`)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    let filtered = candidates ?? []
    if (body.mission_id) filtered = filtered.filter((m) => m.id === body.mission_id)

    const toClose: Array<{ id: string; user_id: string; title: string; ageDays: number; reason: string }> = []

    for (const m of filtered) {
      if (m.mission_type === 'offre') continue

      const ageDays = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400_000)
      const push = (reason: string) => toClose.push({
        id: m.id, user_id: m.user_id, title: m.title || 'Votre mission', ageDays, reason,
      })

      if (m.end_date && m.end_date < today) { push('end_date_past'); continue }
      if (!m.end_date && m.date_needed && m.date_needed < dateNeededCutoff) { push('date_needed_past'); continue }

      if (m.created_at < createdAtCutoff) {
        const { count } = await admin
          .from('small_mission_responses')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', m.id)
          .eq('status', 'pending')
        if ((count ?? 0) === 0) push('dormant_45d')
      }
    }

    if (body.dry_run) {
      await run.finish('success', {
        dry_run: true,
        auto_complete_candidates: toComplete.length,
        auto_close_candidates: toClose.length,
      })
      return json({
        ok: true, dry_run: true,
        auto_complete: { candidates: toComplete.length, missions: toComplete },
        auto_close: { candidates: toClose.length, missions: toClose },
      })
    }

    let closedCount = 0
    const errors: Array<{ mission_id: string; reason: string }> = []
    for (const m of toClose) {
      const { error: updErr } = await admin
        .from('small_missions')
        .update({ status: 'cancelled', closed_at: nowIso, close_reason: 'expired' })
        .eq('id', m.id)
        .eq('status', 'open')
      if (updErr) { errors.push({ mission_id: m.id, reason: updErr.message }); continue }
      closedCount++

      try {
        await admin.from('notifications').insert({
          user_id: m.user_id,
          type: 'mission_auto_closed',
          title: 'Votre mission a été clôturée automatiquement',
          body: `« ${m.title} » a été clôturée après ${m.ageDays} jours sans activité. Vous pouvez la republier.`,
          link: `/petites-missions/${m.id}`,
          actor_name: 'Système',
        })

        const { data: profile } = await admin
          .from('profiles')
          .select('email, first_name, account_status')
          .eq('id', m.user_id)
          .maybeSingle()
        let email = (profile?.email as string | undefined)?.trim() || null
        if (!email) {
          const { data: authData } = await admin.auth.admin.getUserById(m.user_id)
          email = authData?.user?.email ?? null
        }
        if (!email || profile?.account_status !== 'active') continue

        const { data: prefs } = await admin
          .from('email_preferences')
          .select('product_emails')
          .eq('user_id', m.user_id)
          .maybeSingle()
        if (prefs && prefs.product_emails === false) continue

        const { data: sup } = await admin
          .from('suppressed_emails')
          .select('email')
          .ilike('email', email)
          .maybeSingle()
        if (sup) continue

        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'mission-auto-closed',
            recipientEmail: email,
            idempotencyKey: `mission-auto-closed-${m.id}`,
            templateData: {
              firstName: profile?.first_name ?? undefined,
              missionTitle: m.title,
              missionId: m.id,
              ageDays: m.ageDays,
            },
            metadata: { mission_id: m.id, close_reason: 'expired', age_days: m.ageDays, reason: m.reason },
          },
        })
      } catch (e) {
        console.warn('[auto-close] notify/email failed', m.id, e)
      }
    }

    await run.finish('success', {
      completed: completedCount,
      complete_errors: completeErrors.length,
      closed: closedCount,
      close_errors: errors.length,
      examined: filtered.length,
    })
    return json({
      ok: true,
      completed: completedCount,
      complete_errors: completeErrors,
      closed: closedCount,
      errors,
      examined: filtered.length,
    })
  } catch (err) {
    console.error('[auto-close-small-missions] fatal', err)
    await run.fail(err)
    return json({ error: String(err) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
