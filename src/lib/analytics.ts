/**
 * Lightweight analytics — fire-and-forget.
 * Tous les événements sont insérés dans `analytics_events` sans bloquer l'UI.
 * Échec silencieux (RLS, réseau, etc.) — jamais d'exception remontée.
 */
import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "page_view"
  | "signup_started"
  | "signup_role_selected"
  | "signup_form_submitted"
  | "signup_completed"
  | "signup_failed"
  | "signup_form_blocked"         // Submit cliqué mais bloqué côté client (CGU non cochées, etc.)
  | "signup_form_focused"         // 1er focus sur un champ du formulaire (mesure friction)
  | "signup_email_confirmed"      // Email cliqué + session active
  | "user_activated"
  | "onboarding_started"          // Modale d'onboarding ouverte
  | "onboarding_step_completed"   // Étape terminée (metadata.step: 0|1|2)
  | "onboarding_completed"        // Profil 100% activé
  | "onboarding_dismissed"        // Modale fermée avant la fin
  | "first_action"                // Première vraie action (metadata.kind)
  | "cta_click"
  | "cta_proprio_clicked"
  | "cta_sitter_clicked"
  | "login_completed"
  | "cp_recovered"
  | "search_empty_action"
  | "search_outofzone_impression"
  | "search_outofzone_click"
  | "sit_view"
  | "sit_apply_clicked"
  | "sit_apply_blocked"
  | "sit_share_clicked"
  | "editorial_share_clicked"
  | "referral_link_copied"
  | "page_view_pre_launch"
  | "cta_complete_profile"
  | "advantage_link_click"
  | "fb_referral_landing"      // Visiteur arrivé depuis Facebook (referrer ou utm_source=facebook)
  | "fb_referral_feedback"     // Réaction au prompt de feedback (metadata.reaction)
  | "fb_referral_dismissed"    // Prompt fermé sans feedback
  // Mesure before/after : impact de la mini-bio sur MissionCard --------------
  // Tag de cohorte dans metadata.release (ex: "mission_card_bio_v1_2026_05_17").
  | "exp_mission_bio_exposure" // 1ère impression de la liste missions (release, mission_count)
  | "exp_mission_bio_click"    // Clic sur une MissionCard (release, has_bio, position)
  | "exp_mission_bio_scroll"  // Scroll max atteint sur la liste (release, max_scroll_pct, is_mobile)
  | "affinity_badge_seen"     // Badge d'affinité affiché (context: sit_detail|public_profile|search|favorites, score, total)
  | "interests_focus_click"  // Clic sur l'indicateur de progression OU le CTA cockpit menant au champ Centres d'intérêt (source: indicator|cockpit_cta, count actuel)
  // Workflow acceptation candidature ----------------------------------------
  | "application_accepted"          // RPC accept_application OK (application_id, sit_id)
  | "sit_confirmed"                 // Sit passe à confirmed (sit_id, auto_rejected_count)
  | "application_accept_failed"     // RPC accept_application KO (reason, application_id)
  | "accord_dialog_opened"          // Modale AccordDeGarde ouverte (sit_id, role)
  | "accord_signed_owner"           // Owner signe l'accord (sit_id, garde_id)
  | "accord_signed_gardien"         // Gardien signe l'accord (sit_id, garde_id)
  | "accord_dialog_closed_unsigned" // Modale fermée sans signer (sit_id, role, scroll_completed)
  | "sit_owner_state_viewed"        // État vu côté owner (sit_id, state)
  // Module Questions & conseils -----------------------------------------------
  | "question_create_submit"   // Question publiée (metadata.category)
  | "question_view"            // Vue d'une question (metadata.id)
  | "answer_submit"            // Réponse publiée (metadata.question_id, is_first_answer, is_reply)
  | "answer_helpful_click"     // Vote utile sur une réponse (metadata.answer_id)
  | "question_mark_resolved"   // Auteur marque la question comme résolue
  // Dashboard new-user (Casse A) ---------------------------------------------
  | "dashboard_cta_clicked"           // Clic CTA dashboard (cta, is_first_time, user_role)
  | "dashboard_first_time_view"       // Premier affichage dashboard nouveau (user_role, view_variant)
  | "checklist_item_completed"        // Item checklist coché (item_name, order)
  | "checklist_all_completed"         // Checklist finalisée (user_role, time_seconds_since_signup)
  | "sitter_no_nearby_sit_shown"      // Empty state annonces (radius_km, alert_subscribed)
  | "owner_alert_subscribed"          // Owner s'abonne aux alertes (type)
  // Chantier 4 Casse A : reprise brouillon annonce -----------------------------
  | "dashboard_draft_card_seen"         // Impression de la carte "annonce en cours" (sit_id)
  | "dashboard_draft_card_resume_clicked" // Clic "Reprendre" (sit_id, days_since_created)
  | "dashboard_draft_card_deleted"      // Suppression brouillon depuis dashboard (sit_id, days_since_created)
  | "sit_draft_saved_manually"          // Clic "Reprendre plus tard" dans /sits/create (sit_id)
  | "sit_draft_autosave_failed"         // Auto-save Supabase KO après 3 retries (sit_id, error_code)
  | "sit_draft_resumed"                // Utilisateur atterrit sur /sits/create?resume=xxx et draft chargé (sit_id, days_since_created)
  // Hygiène ré-audit : events émis en prod, désormais typés -------------------
  | "signup_terms_checked"             // CGU cochées (metadata.step: 1 | 2)
  | "dashboard_error"                  // Erreur boundary dashboard (metadata.error_type, component?)
  | "admin_ga4_diag_test"              // Test diagnostic GA4 admin (metadata.result: 'ok' | 'ko', message?)
  // Chantier 2.3 Casse A : NBA nouveau gardien --------------------------------
  | "sitter_first_nba_seen"            // 1×/session (sits_count, avg_affinity_score)
  | "sitter_first_nba_card_clicked"    // Clic sur une des 3 cards (sit_id, affinity_score, position)
  | "see_all_sits_clicked"             // Clic "Voir toutes les annonces" (source)
  | "sitter_no_nearby_empty_state_seen" // 1×/session (total_published, radius_km)
  | "sitter_alert_subscribed"          // Inscription alerte (type, radius_km)
  | "sitter_alert_modify_radius"       // Modification du rayon (old_km, new_km)
  | "sitter_secondary_card_clicked"    // Clic carte secondaire (type: missions|breeds|guides)
  | "sitter_alert_confirmation_seen"   // Toast/message post-inscription alerte (radius_km)
  | "sitter_next_digest_card_seen"     // Carte "prochain digest" sur dashboard gardien
  | "sitter_digest_sent"               // Envoi digest quotidien (sitter_id, sits_count, email_id?)
  | "sitter_digest_opened"             // Ouverture email digest (sitter_id, email_id?)
  | "sitter_digest_cta_clicked"        // Clic CTA "Postuler en 1 clic" (sitter_id, sit_id, position, affinity_score, email_id?)
  | "sitter_digest_apply_from_email"   // Candidature depuis digest (sitter_id, sit_id, email_id?)
  | "sitter_digest_optin_toggled"      // Toggle opt-in dans /email-preferences (enabled)
  // Owner Pass 2 (publish 40 % + nurturing renforcé) -----------------------
  | "owner_incomplete_profile_badge_seen"      // Badge affiché à l'owner sur son annonce (profile_completion, fields_remaining?)
  | "owner_incomplete_profile_badge_clicked"   // Clic sur le badge, redirect /profile
  | "owner_publish_with_incomplete_profile_modal_seen"  // Modale nudge à l'ouverture (profile_completion)
  | "owner_publish_with_incomplete_profile_confirmed"   // Owner confirme la publication malgré profil < 80 %
  | "email_owner_no_sit_j21_sent"              // Envoi step J+21 séquence owner-no-sit-relance
  // Pivot pricing "gratuit sans deadline" -----------------------------------
  | "pricing_baseline_seen"            // Impression du bloc éditorial baseline (surface: tarifs|landing_faq|my_subscription|observatoire)
  | "pricing_faq_expanded"             // Ouverture d'une question de la FAQ tarifs (question_id)
  // Admin refresh IA articles post-pivot -------------------------------------
  | "admin_article_refresh_previewed"       // Aperçu du refresh IA (article_id, slug)
  | "admin_article_refresh_applied"         // Refresh IA appliqué (article_id, slug, changes_count)
  | "admin_article_batch_refresh_started"   // Batch démarré (count)
  | "admin_article_batch_refresh_completed" // Batch fini (success_count, error_count)
  | "admin_article_pillar_validated_manually" // Pilier sorti manuellement du noindex (article_id, slug)
  // Pros vérifiés SIRET (Chantier badge + admin toggle) ---------------------
  | "pro_verified_badge_seen"            // Impression du badge Vérifié (pro_id, surface: 'detail'|'card_annuaire'|'card_listing')
  | "pros_filter_verified_toggled"       // Toggle filtre "Vérifiés uniquement" (enabled, category, ville)
  | "pro_admin_verification_toggled"     // Admin toggle SIRET vérifié (pro_id, verified, admin_id)
  | "pro_verification_request_clicked"    // Pro demande la vérification depuis son espace (pro_id)
  // Landing InventoryStrip (chiffres du réseau) -----------------------------
  | "inventory_strip_seen"                // Impression bandeau chiffres du réseau (1x/session)
  | "inventory_strip_cta_clicked"         // Clic CTA "Voir l'observatoire complet" (destination)
  // Landing sections stratégiques pass 2 ------------------------------------
  | "affinity_showcase_seen"              // Impression vitrine score d'affinité (1x/session)
  | "affinity_showcase_cta_clicked"       // Clic CTA "Comprendre le score" (destination)
  | "international_strip_seen"            // Impression bandeau international (1x/session)
  | "international_strip_card_clicked"    // Clic sur une card international (card_id)
  | "pros_showcase_seen"                  // Impression vitrine pros animaliers (1x/session)
  | "pros_showcase_card_clicked"          // Clic sur une card pros (card_id)
  // Owner Pass 3 (concierge IA + carte 3 gardiens) --------------------------
  | "owner_draft_from_prompt_input_seen"        // Impression du composant "1 phrase" (1×/session)
  | "owner_draft_from_prompt_generated"         // Génération réussie (prompt_length, generated_length, confidence, draft_id)
  | "owner_draft_from_prompt_published"         // Publication d'un sit issu d'un draft généré par prompt (sit_id)
 | "owner_first_nba_gardiens_seen"             // Impression carte 3 gardiens (sitters_count, avg_affinity)
 | "owner_primary_action_publish_draft_click"  // Clic « Reprendre et publier » sur la carte d'activation
 | "owner_primary_action_seen"                 // Impression carte d'activation goulot (action, has_nearby)
  | "owner_first_nba_gardien_card_clicked"      // Clic sur une des 3 cards (sitter_id, affinity_score, distance_km, position)
  | "owner_intent_draft_from_prompt_from_email"// Arrivée sur dashboard depuis email ?intent=draft_from_prompt
  | "owner_dashboard_nba_choice"                // NBA dominante retenue au 1er rendu dashboard owner (variant)
  | "sits_create_alma_bubble_seen"              // Bulle Alma inline vue sur /sits/create (formulaire vierge)
  | "sits_create_alma_intent_clicked"           // Clic "Décrire en une phrase" sur /sits/create
  | "sits_create_alma_dismissed"                // Dismiss définitif de la bulle Alma sur /sits/create
  // EntraideHub Pass 1 (UX + fixes workflow) --------------------------------
  | "mission_created_incomplete_profile"        // Mission publiée avec profil < 60 % (profile_completion)
  | "entraide_empty_state_template_clicked"     // Exemple cliquable empty state (tab, template_key)
  | "entraide_all_status_default_used"          // Fallback filtre status=all car <20 missions (missions_count)
  | "mission_expired_badge_seen"                // Badge "date dépassée" impression (mission_id, days_overdue)
  | "mission_expired_reschedule_clicked"        // Clic "Reporter" sur mission expirée (mission_id)
  // EntraideHub Pass 1, vagues 2-3 (modale réponse + workflow) ---------------
  | "mission_response_modal_opened"             // Ouverture modale de réponse depuis sidebar (mission_id, mission_type)
  | "mission_response_template_used"            // Template rapide sélectionné dans la modale (mission_id, template_key)
  | "mission_response_submitted_from_modal"     // Envoi depuis la modale (mission_id, has_template)
  | "mission_offer_one_click_interest"          // Clic "Je suis intéressé" sur mission offer (mission_id)
  | "mission_accept_response_cascade_choice"    // Mode choisi lors de l'acceptation (mode: keep|decline_others, pending_count)
  | "mission_response_withdrawn"                // Réponse retirée par son auteur (mission_id, response_id)
  // EntraideHub Pass 2 (digest missions + géoloc + attrition composer) --------
  | "entraide_geoloc_banner_shown"              // Banner géoloc EntraideHub affiché (1x/user, localStorage)
  | "entraide_geoloc_banner_accepted"           // Clic "Utiliser ma position" sur le banner
  | "entraide_geoloc_banner_dismissed"          // Fermeture du banner (X ou "Plus tard")
  | "mission_composer_opened"                   // Ouverture de /petites-missions/creer (type: besoin|offre)
  | "mission_composer_step1_completed"          // Passage step 1 → step 2 (has_template)
  | "mission_composer_field_abandoned"          // Blur sans valeur suffisante sur un champ obligatoire (field)
  | "mission_composer_submitted"                // Submit form réussi (mission_id, category, mission_type)
  | "mission_composer_abandoned"                // Unmount avec step >= 1 sans submit (last_step, has_title)
  // Alma Pass 1 (assistant incarné sur 6 moments transactionnels) --------------
  | "alma_message_opener_seen"                  // Bulle brise-glace Messages affichée (audience, has_sit, has_mission)
  | "alma_message_opener_generated"             // Brouillon premier message généré (audience, has_sit, has_mission)
  | "alma_message_opener_sent"                  // Premier message envoyé avec brouillon Alma
  | "alma_bio_bubble_seen"                      // Bulle bio/motivation affichée (field: bio|motivation)
  | "alma_bio_drafts_generated"                 // 3 brouillons bio générés
  | "alma_bio_draft_selected"                   // Brouillon bio choisi (draft_index, tone)
  | "alma_application_bubble_seen"              // Bulle lettre candidature affichée (sit_id)
  | "alma_application_letter_generated"         // Lettre candidature générée (sit_id)
  | "alma_application_sent_with_draft"          // Candidature envoyée avec brouillon Alma (sit_id)
  | "alma_application_sent_without_draft"       // Candidature envoyée sans brouillon Alma (sit_id)
  | "alma_affinity_explain_clicked"             // Clic "Comprendre mon score" (sit_id, score)
  | "alma_affinity_explanation_seen"            // Explication affinité affichée (mode)
  | "alma_affinity_profile_action_clicked"      // Clic CTA "Améliorer mon profil" (target_field)
  | "alma_silent_sit_bubble_seen"               // Bulle relance annonce silencieuse (sit_id, days_since_publish)
  | "alma_silent_sit_action_clicked"            // Action rapide relance annonce (sit_id, action_id)
  | "alma_review_bubble_seen"                   // Bulle brouillon avis affichée (sit_id, role)
  | "alma_review_draft_generated"               // Brouillon avis généré (sit_id, role)
  | "alma_review_submitted_with_draft"          // Avis publié avec brouillon Alma (sit_id, role)
  | "alma_review_submitted_without_draft"       // Avis publié sans brouillon Alma (sit_id, role)
  // Alma Pass 2 : WelcomeBackDigest ----------------------------------------
  | "alma_welcomeback_seen"                     // Digest affiché (variant, audience, signals)
  | "alma_welcomeback_action_clicked"           // Action cliquée depuis digest (variant, action_id)
  | "alma_welcomeback_dismissed"                // Digest fermé (variant)
  // Alma Pass 2 Tour 2 : guide maison génératif ----------------------------
  | "alma_house_guide_bubble_seen"              // Bulle Alma affichée dans le formulaire guide maison
  | "alma_house_guide_generated"                // Génération réussie des 4 trames
  | "alma_house_guide_section_edited"           // 1ère édition d'une section pré-remplie par Alma (section)
  | "alma_house_guide_saved_with_draft"         // Guide finalisé avec au moins une trame Alma conservée
  // Alma Pass 2 Tour 2 : fit gardien sur PublicSitterProfile ---------------
  | "alma_fit_gardien_seen"                     // Bulle fit gardien affichée (sitter_id, sit_id, score)
  | "alma_fit_gardien_reciprocity_shown"        // Bonus reciprocity affiché (sitter_id, sit_id, views)
  | "alma_invite_from_alma_clicked"             // Clic CTA Inviter depuis la bulle Alma (sitter_id, sit_id)
  // Alma Pass 2 Tour 3 : empty search + notif summary ---------------------
  | "alma_empty_search_bubble_seen"             // Bulle empty search affichée (restrictive_filter, radius, zone_mode)
  | "alma_empty_search_action_clicked"          // Action empty search cliquée (action_id, restrictive_filter?)
  | "alma_notif_summary_seen"                   // Résumé notifs affiché (unread, applications, messages, social)
  | "alma_notif_urgent_filter_clicked"          // Filtre "3 urgentes" cliqué (audience)
  // Alma Pass 4 : narratrice cross-page ------------------------------------
  | "alma_whisper_emitted"                      // Whisper narratif affiché (whisper_type, surface, priority)
  | "alma_whisper_dismissed"                    // Whisper fermé (whisper_type, reason)
  | "alma_whisper_action_clicked"               // Action d'un whisper cliquée (whisper_type, action_id)
 | "alma_frequency_changed"                    // Slider fréquence Alma modifié (from, to)
 | "alma_blacklisted_type"                     // Whisper type blacklisté 30j après 3 dismiss (whisper_type)
 // Pass 3 — republish + welcome cross-canal ----------------------------------
 | "alma_republish_bubble_seen"                // Bandeau Alma republication affiché (sit_id)
 | "alma_republish_mode_selected"              // Mode choisi dans la modale republish (mode: copy|adapt, sit_id)
 | "alma_republish_published"                  // Nouvelle annonce publiée à partir d'une republication (original_sit_id, new_sit_id, mode)
 | "alma_republish_adapted"                    // Champs réécrits par Alma en mode adapt (source_sit_id)
  | "alma_welcome_email_sent"                   // Welcome email post-signup signé Alma envoyé
  | "alma_dashboard_first_meeting_seen"         // Dashboard ouvert avec ?welcome=alma (first meeting)
  // EntraideHub Pass 3 : cycle de vie + digest hebdo + badges profil ---------
  | "mission_auto_closed"                       // Mission clôturée automatiquement (mission_id, close_reason, age_days)
  | "mission_nudge_sent"                        // Nudge envoyé (nudge_type: feedback|no_response, mission_id)
  | "mutual_aid_weekly_digest_sent"             // Digest hebdo envoyé (recipient_count)
  | "mutual_aid_weekly_digest_opened"           // Digest hebdo ouvert (pixel)
  | "mutual_aid_weekly_digest_cta_clicked"      // Clic CTA depuis digest hebdo (section, url)
  | "profile_mission_badges_seen"               // Section badges d'entraide impressée sur profil (profile_id, badges_count)
  | "next_mission_digest_card_seen"             // Carte "prochain digest mardi" affichée sur dashboard
  | "entraide_feed_chip_toggled"                // Chip filter mobile toggled (filter_types)
  | "entraide_feed_default_view"                // Vue par défaut du feed unifié mobile (une fois par session)
  | "admin_mutual_aid_dashboard_seen"           // Dashboard admin entraide affiché (1x par montage)
  | "admin_alma_dashboard_seen"                 // Dashboard admin Alma affiché (1x par montage)
  | "admin_alma_export_csv_clicked"             // Export CSV depuis dashboard admin Alma
  // Alma Pass 5 — compagnon culturel -----------------------------------------
  | "alma_cultural_fact_seen"                   // Fait culturel affiché (fact_id, fact_type, surface)
  | "alma_cultural_fact_action_clicked"         // Clic action "En savoir plus" (fact_id, source_url)
  | "alma_cultural_fact_dismissed"              // Fait culturel fermé (fact_id, reason)
  | "admin_alma_cultural_facts_tab_seen"        // Onglet admin cultural facts affiché
  | "admin_alma_cultural_fact_toggled"          // Désactivation/réactivation d'un fait (fact_id, active)
  // Alma évolution étape 1 — usage_nudge + next tip ------------------------
  | "alma_next_tip_delivered"                   // Conseil "un autre" tiré (fact_id, kind, surface)
  | "alma_next_tip_empty"                       // Pool épuisé pour cette surface (surface)
  | "alma_usage_nudge_seen"                     // Usage nudge affiché (fact_id, surface, cta_action)
  | "alma_topbar_button_clicked"                // Bouton persistant Alma cliqué en topbar (surface)
  | "alma_first_meeting_cta_clicked";           // CTA principal du premier contact Alma cliqué (role, cta_action)



interface TrackOptions {
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Track un événement de manière non-bloquante.
 * Fonctionne aussi bien pour les visiteurs anonymes que connectés.
 */
export async function trackEvent(eventType: EventType, opts: TrackOptions = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", eventType, {
        user_id: user?.id ?? null,
        source: opts.source ?? null,
        metadata: opts.metadata ?? null,
      });
    }

    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      source: opts.source ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // silencieux
  }
}

/**
 * Helper dédié aux clics sur les CTAs primaires.
 * Centralise le nom + l'emplacement pour faciliter l'analyse de funnel.
 */
export function trackCtaClick(name: string, location: string, extra?: Record<string, any>) {
  void trackEvent("cta_click", {
    source: location,
    metadata: { name, location, ...(extra ?? {}) },
  });
}

/**
 * Variante qui accepte un user_id explicite (utile juste après signup
 * quand la session n'est pas encore propagée).
 */
export async function trackEventWithUserId(
  userId: string | null,
  eventType: EventType,
  opts: TrackOptions = {}
) {
  try {
    if (!userId) return;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", eventType, {
        user_id: userId,
        source: opts.source ?? null,
        metadata: opts.metadata ?? null,
      });
    }

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: eventType,
      source: opts.source ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // silencieux
  }
}

/**
 * Émet `first_action` une seule fois par utilisateur (déduplication via localStorage).
 * À appeler après une vraie 1ère action métier : création d'annonce, candidature,
 * 1er message, création mission d'entraide, etc.
 */
export async function trackFirstAction(
  kind: "sit_created" | "application_sent" | "message_sent" | "mission_created",
  extraMetadata: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const flagKey = `first_action_tracked_${user.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(flagKey)) return;
    if (typeof window !== "undefined") localStorage.setItem(flagKey, "1");
    await trackEventWithUserId(user.id, "first_action", {
      source: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: { kind, ...extraMetadata },
    });
  } catch {
    // silencieux
  }
}

/**
 * Normalise une erreur de signup Supabase vers un code stable pour le funnel.
 */
export function mapSignupError(message: string | undefined | null): string {
  const m = (message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) {
    return "already_registered";
  }
  if (
    m.includes("password should be at least") ||
    m.includes("weak_password") ||
    m.includes("weak password") ||
    m.includes("password is too weak") ||
    m.includes("password is known to be weak") ||
    m.includes("pwned")
  ) {
    return "weak_password";
  }
  if (m.includes("invalid email") || m.includes("email address") && m.includes("invalid")) {
    return "invalid_email";
  }
  if (m === "timeout") {
    return "timeout";
  }
  return "unknown";
}
