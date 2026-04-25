export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          id: string
          requested_at: string
          scheduled_deletion_at: string
          status: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_message_logs: {
        Row: {
          admin_id: string
          content: string
          conversation_id: string | null
          error_message: string | null
          id: string
          message_id: string | null
          recipient_email: string | null
          recipient_id: string
          recipient_name: string | null
          sent_at: string
          status: string
        }
        Insert: {
          admin_id: string
          content: string
          conversation_id?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string | null
          recipient_id: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          admin_id?: string
          content?: string
          conversation_id?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string | null
          recipient_id?: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      admin_subscription_logs: {
        Row: {
          action: string
          id: string
          note: string
          params: Json | null
          performed_at: string | null
          performed_by: string | null
          result: Json | null
          stripe_called: boolean | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          note: string
          params?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          result?: Json | null
          stripe_called?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          note?: string
          params?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          result?: Json | null
          stripe_called?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_subscription_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_subscription_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscription_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscription_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_subscription_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_subscription_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_preferences: {
        Row: {
          active: boolean
          alert_types: string[]
          city: string | null
          created_at: string
          departement: string | null
          frequence: string
          heure_envoi: string
          id: string
          label: string
          postal_code: string | null
          radius_km: number | null
          region_code: string | null
          user_id: string
          zone_type: string
        }
        Insert: {
          active?: boolean
          alert_types?: string[]
          city?: string | null
          created_at?: string
          departement?: string | null
          frequence?: string
          heure_envoi?: string
          id?: string
          label?: string
          postal_code?: string | null
          radius_km?: number | null
          region_code?: string | null
          user_id: string
          zone_type: string
        }
        Update: {
          active?: boolean
          alert_types?: string[]
          city?: string | null
          created_at?: string
          departement?: string | null
          frequence?: string
          heure_envoi?: string
          id?: string
          label?: string
          postal_code?: string | null
          radius_km?: number | null
          region_code?: string | null
          user_id?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "alert_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          sit_id: string
          sitter_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          sit_id: string
          sitter_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          sit_id?: string
          sitter_id?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_name: string
          canonical_url: string | null
          category: string
          city: string | null
          content: string
          cover_image_url: string | null
          cover_image_url_backup: string | null
          created_at: string
          excerpt: string
          hero_image_alt: string | null
          id: string
          internal_links: Json | null
          meta_description: string | null
          meta_title: string | null
          noindex: boolean | null
          published: boolean
          published_at: string | null
          region: string | null
          related_breed: string | null
          related_city: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          canonical_url?: string | null
          category?: string
          city?: string | null
          content?: string
          cover_image_url?: string | null
          cover_image_url_backup?: string | null
          created_at?: string
          excerpt?: string
          hero_image_alt?: string | null
          id?: string
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean | null
          published?: boolean
          published_at?: string | null
          region?: string | null
          related_breed?: string | null
          related_city?: string | null
          slug: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          canonical_url?: string | null
          category?: string
          city?: string | null
          content?: string
          cover_image_url?: string | null
          cover_image_url_backup?: string | null
          created_at?: string
          excerpt?: string
          hero_image_alt?: string | null
          id?: string
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean | null
          published?: boolean
          published_at?: string | null
          region?: string | null
          related_breed?: string | null
          related_city?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      badge_attributions: {
        Row: {
          badge_id: string
          created_at: string | null
          giver_id: string | null
          id: string
          is_manual: boolean | null
          sit_id: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string | null
          giver_id?: string | null
          id?: string
          is_manual?: boolean | null
          sit_id?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string | null
          giver_id?: string | null
          id?: string
          is_manual?: boolean | null
          sit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_attributions_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "badge_attributions_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_attributions_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_attributions_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_attributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "badge_attributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_attributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      breed_profiles: {
        Row: {
          alimentation: string
          breed: string
          compatibility: string
          difficulty_level: string
          exercise_needs: string
          generated_at: string
          grooming: string
          health_notes: string
          id: string
          ideal_for: string
          sitter_tips: string
          species: string
          stranger_behavior: string
          temperament: string
        }
        Insert: {
          alimentation?: string
          breed: string
          compatibility?: string
          difficulty_level?: string
          exercise_needs?: string
          generated_at?: string
          grooming?: string
          health_notes?: string
          id?: string
          ideal_for?: string
          sitter_tips?: string
          species: string
          stranger_behavior?: string
          temperament?: string
        }
        Update: {
          alimentation?: string
          breed?: string
          compatibility?: string
          difficulty_level?: string
          exercise_needs?: string
          generated_at?: string
          grooming?: string
          health_notes?: string
          id?: string
          ideal_for?: string
          sitter_tips?: string
          species?: string
          stranger_behavior?: string
          temperament?: string
        }
        Relationships: []
      }
      city_guide_places: {
        Row: {
          address: string
          category: Database["public"]["Enums"]["guide_place_category"]
          city_guide_id: string
          created_at: string
          description: string
          dogs_welcome: boolean
          google_place_id: string | null
          google_rating: number | null
          id: string
          latitude: number | null
          leash_required: boolean | null
          longitude: number | null
          name: string
          photo_url: string | null
          tips: string | null
        }
        Insert: {
          address?: string
          category: Database["public"]["Enums"]["guide_place_category"]
          city_guide_id: string
          created_at?: string
          description?: string
          dogs_welcome?: boolean
          google_place_id?: string | null
          google_rating?: number | null
          id?: string
          latitude?: number | null
          leash_required?: boolean | null
          longitude?: number | null
          name: string
          photo_url?: string | null
          tips?: string | null
        }
        Update: {
          address?: string
          category?: Database["public"]["Enums"]["guide_place_category"]
          city_guide_id?: string
          created_at?: string
          description?: string
          dogs_welcome?: boolean
          google_place_id?: string | null
          google_rating?: number | null
          id?: string
          latitude?: number | null
          leash_required?: boolean | null
          longitude?: number | null
          name?: string
          photo_url?: string | null
          tips?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_guide_places_city_guide_id_fkey"
            columns: ["city_guide_id"]
            isOneToOne: false
            referencedRelation: "city_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      city_guides: {
        Row: {
          city: string
          created_at: string
          department: string
          generated_at: string
          id: string
          ideal_for: string
          intro: string
          postal_code: string
          published: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          department?: string
          generated_at?: string
          id?: string
          ideal_for?: string
          intro?: string
          postal_code?: string
          published?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          department?: string
          generated_at?: string
          id?: string
          ideal_for?: string
          intro?: string
          postal_code?: string
          published?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      competences_validees: {
        Row: {
          categorie: string
          created_at: string | null
          id: string
          label: string
          usage_count: number | null
        }
        Insert: {
          categorie: string
          created_at?: string | null
          id?: string
          label: string
          usage_count?: number | null
        }
        Update: {
          categorie?: string
          created_at?: string | null
          id?: string
          label?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          resolved_at: string | null
          source: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          resolved_at?: string | null
          source?: string | null
          status?: string
          subject?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          resolved_at?: string | null
          source?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived_by: string[] | null
          context_type:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at: string
          first_message_sent: boolean
          id: string
          last_message_at: string | null
          long_stay_id: string | null
          owner_id: string
          reminder_sent_at: string | null
          sit_id: string | null
          sitter_id: string
          small_mission_id: string | null
          updated_at: string
        }
        Insert: {
          archived_by?: string[] | null
          context_type?:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at?: string
          first_message_sent?: boolean
          id?: string
          last_message_at?: string | null
          long_stay_id?: string | null
          owner_id: string
          reminder_sent_at?: string | null
          sit_id?: string | null
          sitter_id: string
          small_mission_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_by?: string[] | null
          context_type?:
            | Database["public"]["Enums"]["conversation_context"]
            | null
          created_at?: string
          first_message_sent?: boolean
          id?: string
          last_message_at?: string | null
          long_stay_id?: string | null
          owner_id?: string
          reminder_sent_at?: string | null
          sit_id?: string | null
          sitter_id?: string
          small_mission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_long_stay_id_fkey"
            columns: ["long_stay_id"]
            isOneToOne: false
            referencedRelation: "long_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_small_mission_id_fkey"
            columns: ["small_mission_id"]
            isOneToOne: false
            referencedRelation: "small_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emergency_sitter_profiles: {
        Row: {
          animal_types: string[]
          blocked_until: string | null
          created_at: string
          id: string
          interventions_count: number
          is_active: boolean
          radius_km: number
          refusal_count: number
          sms_alerts: boolean
          updated_at: string
          user_id: string
          weekly_availability: Json | null
        }
        Insert: {
          animal_types?: string[]
          blocked_until?: string | null
          created_at?: string
          id?: string
          interventions_count?: number
          is_active?: boolean
          radius_km?: number
          refusal_count?: number
          sms_alerts?: boolean
          updated_at?: string
          user_id: string
          weekly_availability?: Json | null
        }
        Update: {
          animal_types?: string[]
          blocked_until?: string | null
          created_at?: string
          id?: string
          interventions_count?: number
          is_active?: boolean
          radius_km?: number
          refusal_count?: number
          sms_alerts?: boolean
          updated_at?: string
          user_id?: string
          weekly_availability?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "emergency_sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          admin_notes: string | null
          col_no: number | null
          context: Json | null
          created_at: string
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          line_no: number | null
          message: string
          occurrences: number
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          col_no?: number | null
          context?: Json | null
          created_at?: string
          fingerprint: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_no?: number | null
          message: string
          occurrences?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          col_no?: number | null
          context?: Json | null
          created_at?: string
          fingerprint?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_no?: number | null
          message?: string
          occurrences?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      external_experiences: {
        Row: {
          admin_note: string | null
          animal_types: string
          city: string | null
          country: string | null
          created_at: string
          duration: string
          experience_date: string
          id: string
          platform_name: string
          screenshot_urls: string[]
          summary: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          admin_note?: string | null
          animal_types?: string
          city?: string | null
          country?: string | null
          created_at?: string
          duration?: string
          experience_date?: string
          id?: string
          platform_name?: string
          screenshot_urls?: string[]
          summary?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          admin_note?: string | null
          animal_types?: string
          city?: string | null
          country?: string | null
          created_at?: string
          duration?: string
          experience_date?: string
          id?: string
          platform_name?: string
          screenshot_urls?: string[]
          summary?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "external_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "external_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      garde_accords: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          created_at: string
          document_content: Json | null
          document_hash: string
          garde_id: string
          id: string
          ip_address: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          document_content?: Json | null
          document_hash: string
          garde_id: string
          id?: string
          ip_address?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          document_content?: Json | null
          document_hash?: string
          garde_id?: string
          id?: string
          ip_address?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garde_accords_garde_id_fkey"
            columns: ["garde_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garde_accords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "garde_accords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garde_accords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_cache: {
        Row: {
          city_name: string
          created_at: string
          id: string
          lat: number
          lng: number
          normalized_name: string
        }
        Insert: {
          city_name: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          normalized_name: string
        }
        Update: {
          city_name?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          normalized_name?: string
        }
        Relationships: []
      }
      hero_weights: {
        Row: {
          id: number
          updated_at: string
          updated_by: string | null
          weight_animals: number
          weight_home: number
          weight_mutual_aid: number
          weight_village: number
        }
        Insert: {
          id?: number
          updated_at?: string
          updated_by?: string | null
          weight_animals?: number
          weight_home?: number
          weight_mutual_aid?: number
          weight_village?: number
        }
        Update: {
          id?: number
          updated_at?: string
          updated_by?: string | null
          weight_animals?: number
          weight_home?: number
          weight_mutual_aid?: number
          weight_village?: number
        }
        Relationships: []
      }
      house_guides: {
        Row: {
          access_codes: string | null
          appliance_notes: string | null
          created_at: string
          detailed_instructions: string | null
          electrician_phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          exact_address: string | null
          forbidden_zones: string | null
          heating_instructions: string | null
          id: string
          key_instructions: string | null
          mail_instructions: string | null
          neighbor_name: string | null
          neighbor_phone: string | null
          owner_message: string | null
          parking_instructions: string | null
          plants_watering: string | null
          plumber_phone: string | null
          property_id: string
          published: boolean | null
          trash_days: string | null
          updated_at: string
          user_id: string
          vet_address: string | null
          vet_name: string | null
          vet_phone: string | null
          wifi_instructions: string | null
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          access_codes?: string | null
          appliance_notes?: string | null
          created_at?: string
          detailed_instructions?: string | null
          electrician_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          exact_address?: string | null
          forbidden_zones?: string | null
          heating_instructions?: string | null
          id?: string
          key_instructions?: string | null
          mail_instructions?: string | null
          neighbor_name?: string | null
          neighbor_phone?: string | null
          owner_message?: string | null
          parking_instructions?: string | null
          plants_watering?: string | null
          plumber_phone?: string | null
          property_id: string
          published?: boolean | null
          trash_days?: string | null
          updated_at?: string
          user_id: string
          vet_address?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          wifi_instructions?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          access_codes?: string | null
          appliance_notes?: string | null
          created_at?: string
          detailed_instructions?: string | null
          electrician_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          exact_address?: string | null
          forbidden_zones?: string | null
          heating_instructions?: string | null
          id?: string
          key_instructions?: string | null
          mail_instructions?: string | null
          neighbor_name?: string | null
          neighbor_phone?: string | null
          owner_message?: string | null
          parking_instructions?: string | null
          plants_watering?: string | null
          plumber_phone?: string | null
          property_id?: string
          published?: boolean | null
          trash_days?: string | null
          updated_at?: string
          user_id?: string
          vet_address?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          wifi_instructions?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "house_guides_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "house_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification_logs: {
        Row: {
          created_at: string
          document_type: string | null
          id: string
          rejection_reason: string | null
          result: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          id?: string
          rejection_reason?: string | null
          result?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          id?: string
          rejection_reason?: string | null
          result?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "identity_verification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_profiles: {
        Row: {
          activities: string
          amenities: string
          city: string
          generated_at: string
          id: string
          ideal_for: string
          nature_access: string
          neighborhood_type: string
          postal_code: string
          transport: string
        }
        Insert: {
          activities?: string
          amenities?: string
          city: string
          generated_at?: string
          id?: string
          ideal_for?: string
          nature_access?: string
          neighborhood_type?: string
          postal_code: string
          transport?: string
        }
        Update: {
          activities?: string
          amenities?: string
          city?: string
          generated_at?: string
          id?: string
          ideal_for?: string
          nature_access?: string
          neighborhood_type?: string
          postal_code?: string
          transport?: string
        }
        Relationships: []
      }
      long_stay_applications: {
        Row: {
          created_at: string
          id: string
          long_stay_id: string
          message: string | null
          sitter_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          long_stay_id: string
          message?: string | null
          sitter_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          created_at?: string
          id?: string
          long_stay_id?: string
          message?: string | null
          sitter_id?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "long_stay_applications_long_stay_id_fkey"
            columns: ["long_stay_id"]
            isOneToOne: false
            referencedRelation: "long_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_stay_applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "long_stay_applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_stay_applications_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      long_stays: {
        Row: {
          access_level: Database["public"]["Enums"]["long_stay_access_level"]
          conditions: string | null
          created_at: string
          end_date: string | null
          estimated_contribution: string | null
          id: string
          owner_fee_paid: boolean
          property_id: string
          sitter_fee_paid: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["long_stay_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["long_stay_access_level"]
          conditions?: string | null
          created_at?: string
          end_date?: string | null
          estimated_contribution?: string | null
          id?: string
          owner_fee_paid?: boolean
          property_id: string
          sitter_fee_paid?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["long_stay_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["long_stay_access_level"]
          conditions?: string | null
          created_at?: string
          end_date?: string | null
          estimated_contribution?: string | null
          id?: string
          owner_fee_paid?: boolean
          property_id?: string
          sitter_fee_paid?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["long_stay_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_stays_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_stays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "long_stays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_stays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_emails: {
        Row: {
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          filters: Json | null
          id: string
          recipients_count: number
          segment: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          filters?: Json | null
          id?: string
          recipients_count?: number
          segment: string
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          filters?: Json | null
          id?: string
          recipients_count?: number
          segment?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "mass_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mass_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mass_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_system: boolean
          metadata: Json | null
          photo_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          metadata?: Json | null
          photo_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          metadata?: Json | null
          photo_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_feedbacks: {
        Row: {
          badge_key: string | null
          comment: string | null
          created_at: string
          giver_id: string
          id: string
          mission_id: string
          positive: boolean
          receiver_id: string
        }
        Insert: {
          badge_key?: string | null
          comment?: string | null
          created_at?: string
          giver_id: string
          id?: string
          mission_id: string
          positive: boolean
          receiver_id: string
        }
        Update: {
          badge_key?: string | null
          comment?: string | null
          created_at?: string
          giver_id?: string
          id?: string
          mission_id?: string
          positive?: boolean
          receiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_feedbacks_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mission_feedbacks_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_feedbacks_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_feedbacks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "small_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_feedbacks_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mission_feedbacks_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_feedbacks_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_messages: boolean
          email_new_application: boolean
          email_reminders: boolean
          email_review_prompts: boolean
          email_sitter_suggestions: boolean
          id: string
          message_email_delay: string
          profile_visibility: string
          show_last_seen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_messages?: boolean
          email_new_application?: boolean
          email_reminders?: boolean
          email_review_prompts?: boolean
          email_sitter_suggestions?: boolean
          id?: string
          message_email_delay?: string
          profile_visibility?: string
          show_last_seen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_messages?: boolean
          email_new_application?: boolean
          email_reminders?: boolean
          email_review_prompts?: boolean
          email_sitter_suggestions?: boolean
          id?: string
          message_email_delay?: string
          profile_visibility?: string
          show_last_seen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_avatar_url: string | null
          actor_name: string | null
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_avatar_url?: string | null
          actor_name?: string | null
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          actor_avatar_url?: string | null
          actor_name?: string | null
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      owner_gallery: {
        Row: {
          caption: string
          category: Database["public"]["Enums"]["owner_gallery_category"]
          created_at: string
          id: string
          photo_url: string
          season: string | null
          user_id: string
        }
        Insert: {
          caption?: string
          category?: Database["public"]["Enums"]["owner_gallery_category"]
          created_at?: string
          id?: string
          photo_url: string
          season?: string | null
          user_id: string
        }
        Update: {
          caption?: string
          category?: Database["public"]["Enums"]["owner_gallery_category"]
          created_at?: string
          id?: string
          photo_url?: string
          season?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_highlights: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          owner_id: string
          photo_url: string | null
          sit_id: string
          sitter_id: string
          text: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          owner_id: string
          photo_url?: string | null
          sit_id: string
          sitter_id: string
          text?: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          owner_id?: string
          photo_url?: string | null
          sit_id?: string
          sitter_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_highlights_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_highlights_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_highlights_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_highlights_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_highlights_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_highlights_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_highlights_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          accept_unsolicited_pitches: boolean
          communication_notes: string | null
          competences: string[] | null
          competences_disponible: boolean | null
          created_at: string
          environments: string[]
          experience_required: boolean | null
          handover_preference: string | null
          id: string
          meeting_preference: string[] | null
          news_format: string[] | null
          news_frequency: string | null
          overnight_guest: string | null
          preferred_sitter_types: string[] | null
          preferred_time: string | null
          presence_expected: string | null
          rules_notes: string | null
          smoker_accepted: string | null
          space_usage: string[] | null
          specific_expectations: string | null
          updated_at: string
          user_id: string
          visits_allowed: string | null
          welcome_notes: string | null
        }
        Insert: {
          accept_unsolicited_pitches?: boolean
          communication_notes?: string | null
          competences?: string[] | null
          competences_disponible?: boolean | null
          created_at?: string
          environments?: string[]
          experience_required?: boolean | null
          handover_preference?: string | null
          id?: string
          meeting_preference?: string[] | null
          news_format?: string[] | null
          news_frequency?: string | null
          overnight_guest?: string | null
          preferred_sitter_types?: string[] | null
          preferred_time?: string | null
          presence_expected?: string | null
          rules_notes?: string | null
          smoker_accepted?: string | null
          space_usage?: string[] | null
          specific_expectations?: string | null
          updated_at?: string
          user_id: string
          visits_allowed?: string | null
          welcome_notes?: string | null
        }
        Update: {
          accept_unsolicited_pitches?: boolean
          communication_notes?: string | null
          competences?: string[] | null
          competences_disponible?: boolean | null
          created_at?: string
          environments?: string[]
          experience_required?: boolean | null
          handover_preference?: string | null
          id?: string
          meeting_preference?: string[] | null
          news_format?: string[] | null
          news_frequency?: string | null
          overnight_guest?: string | null
          preferred_sitter_types?: string[] | null
          preferred_time?: string | null
          presence_expected?: string | null
          rules_notes?: string | null
          smoker_accepted?: string | null
          space_usage?: string[] | null
          specific_expectations?: string | null
          updated_at?: string
          user_id?: string
          visits_allowed?: string | null
          welcome_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_animals: {
        Row: {
          breed: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          sitter_profile_id: string
          species: string
        }
        Insert: {
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sitter_profile_id: string
          species?: string
        }
        Update: {
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sitter_profile_id?: string
          species?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_animals_sitter_profile_id_fkey"
            columns: ["sitter_profile_id"]
            isOneToOne: false
            referencedRelation: "sitter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          age: number | null
          alone_duration: Database["public"]["Enums"]["alone_duration"] | null
          breed: string | null
          character: string | null
          food: string | null
          id: string
          medication: string | null
          name: string
          owner_breed_note: string | null
          photo_url: string | null
          property_id: string
          special_needs: string | null
          species: Database["public"]["Enums"]["pet_species"]
          walk_duration: Database["public"]["Enums"]["walk_duration"] | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alone_duration?: Database["public"]["Enums"]["alone_duration"] | null
          breed?: string | null
          character?: string | null
          food?: string | null
          id?: string
          medication?: string | null
          name?: string
          owner_breed_note?: string | null
          photo_url?: string | null
          property_id: string
          special_needs?: string | null
          species?: Database["public"]["Enums"]["pet_species"]
          walk_duration?: Database["public"]["Enums"]["walk_duration"] | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alone_duration?: Database["public"]["Enums"]["alone_duration"] | null
          breed?: string | null
          character?: string | null
          food?: string | null
          id?: string
          medication?: string | null
          name?: string
          owner_breed_note?: string | null
          photo_url?: string | null
          property_id?: string
          special_needs?: string | null
          species?: Database["public"]["Enums"]["pet_species"]
          walk_duration?: Database["public"]["Enums"]["walk_duration"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_moderation: {
        Row: {
          admin_notes: string | null
          created_at: string
          is_manual_super: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          is_manual_super?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          is_manual_super?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_moderation_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_moderation_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_moderation_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          animal_experience: string
          available_for_help: boolean | null
          avatar_url: string | null
          bio: string | null
          cancellation_count: number
          cancellations_as_proprio: number
          city: string | null
          completed_sits_count: number
          cp_relance_count: number | null
          created_at: string
          custom_skills: Json | null
          date_of_birth: string | null
          email: string | null
          email_preferences: Json
          first_name: string | null
          free_months_credit: number | null
          hero_image_index: number | null
          id: string
          identity_document_url: string | null
          identity_selfie_url: string | null
          identity_verification_status: string | null
          identity_verified: boolean
          is_founder: boolean
          last_cp_relance_at: string | null
          last_name: string | null
          last_seen_at: string | null
          onboarding_completed: boolean
          onboarding_dismissed_at: string | null
          onboarding_minimal_completed: boolean
          postal_code: string | null
          profile_completion: number | null
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          skill_categories: string[] | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          animal_experience?: string
          available_for_help?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          cancellation_count?: number
          cancellations_as_proprio?: number
          city?: string | null
          completed_sits_count?: number
          cp_relance_count?: number | null
          created_at?: string
          custom_skills?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_preferences?: Json
          first_name?: string | null
          free_months_credit?: number | null
          hero_image_index?: number | null
          id: string
          identity_document_url?: string | null
          identity_selfie_url?: string | null
          identity_verification_status?: string | null
          identity_verified?: boolean
          is_founder?: boolean
          last_cp_relance_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean
          onboarding_dismissed_at?: string | null
          onboarding_minimal_completed?: boolean
          postal_code?: string | null
          profile_completion?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          animal_experience?: string
          available_for_help?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          cancellation_count?: number
          cancellations_as_proprio?: number
          city?: string | null
          completed_sits_count?: number
          cp_relance_count?: number | null
          created_at?: string
          custom_skills?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_preferences?: Json
          first_name?: string | null
          free_months_credit?: number | null
          hero_image_index?: number | null
          id?: string
          identity_document_url?: string | null
          identity_selfie_url?: string | null
          identity_verification_status?: string | null
          identity_verified?: boolean
          is_founder?: boolean
          last_cp_relance_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean
          onboarding_dismissed_at?: string | null
          onboarding_minimal_completed?: boolean
          postal_code?: string | null
          profile_completion?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_categories?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          accessible: boolean | null
          bedrooms_count: number | null
          car_required: boolean | null
          created_at: string
          description: string | null
          environment:
            | Database["public"]["Enums"]["property_environment"]
            | null
          equipments: string[] | null
          id: string
          photos: string[] | null
          region_highlights: string | null
          rooms_count: number | null
          type: Database["public"]["Enums"]["property_type"]
          user_id: string
        }
        Insert: {
          accessible?: boolean | null
          bedrooms_count?: number | null
          car_required?: boolean | null
          created_at?: string
          description?: string | null
          environment?:
            | Database["public"]["Enums"]["property_environment"]
            | null
          equipments?: string[] | null
          id?: string
          photos?: string[] | null
          region_highlights?: string | null
          rooms_count?: number | null
          type?: Database["public"]["Enums"]["property_type"]
          user_id: string
        }
        Update: {
          accessible?: boolean | null
          bedrooms_count?: number | null
          car_required?: boolean | null
          created_at?: string
          description?: string | null
          environment?:
            | Database["public"]["Enums"]["property_environment"]
            | null
          equipments?: string[] | null
          id?: string
          photos?: string[] | null
          region_highlights?: string | null
          rooms_count?: number | null
          type?: Database["public"]["Enums"]["property_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string | null
          referrer_id: string | null
          reward_applied_referred: boolean | null
          reward_applied_referrer: boolean | null
          status: string | null
          triggered_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          reward_applied_referred?: boolean | null
          reward_applied_referrer?: boolean | null
          status?: string | null
          triggered_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referrer_id?: string | null
          reward_applied_referred?: boolean | null
          reward_applied_referrer?: boolean | null
          status?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          report_type: string
          reporter_id: string
          resolved_at: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          report_type?: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
          target_id: string
          target_type?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          report_type?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reputation_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      review_disputes: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          disputer_id: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          category: string
          created_at?: string
          disputer_id: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          disputer_id?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_disputes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "avis_publics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_disputes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          animal_care_rating: number | null
          cancellation_reason: string | null
          cancellation_response: string | null
          cancelled_by_role: string | null
          comment: string | null
          communication_rating: number | null
          created_at: string
          housing_condition_rating: number | null
          housing_respect_rating: number | null
          id: string
          instructions_clarity_rating: number | null
          listing_accuracy_rating: number | null
          mission_id: string | null
          moderation_status: string
          overall_rating: number
          published: boolean | null
          reliability_rating: number | null
          response_status: string | null
          response_submitted_at: string | null
          review_type: string | null
          reviewee_id: string
          reviewer_id: string
          sit_id: string | null
          welcome_rating: number | null
          would_recommend: boolean | null
        }
        Insert: {
          animal_care_rating?: number | null
          cancellation_reason?: string | null
          cancellation_response?: string | null
          cancelled_by_role?: string | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          mission_id?: string | null
          moderation_status?: string
          overall_rating: number
          published?: boolean | null
          reliability_rating?: number | null
          response_status?: string | null
          response_submitted_at?: string | null
          review_type?: string | null
          reviewee_id: string
          reviewer_id: string
          sit_id?: string | null
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          animal_care_rating?: number | null
          cancellation_reason?: string | null
          cancellation_response?: string | null
          cancelled_by_role?: string | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          mission_id?: string | null
          moderation_status?: string
          overall_rating?: number
          published?: boolean | null
          reliability_rating?: number | null
          response_status?: string | null
          response_submitted_at?: string | null
          review_type?: string | null
          reviewee_id?: string
          reviewer_id?: string
          sit_id?: string | null
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "small_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_cache: {
        Row: {
          cache_key: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_city_pages: {
        Row: {
          active_sits_count: number
          city: string
          created_at: string
          department: string
          h1_title: string
          id: string
          intro_text: string
          meta_description: string
          meta_title: string
          published: boolean
          sitter_count: number
          slug: string
          updated_at: string
        }
        Insert: {
          active_sits_count?: number
          city: string
          created_at?: string
          department: string
          h1_title?: string
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          sitter_count?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active_sits_count?: number
          city?: string
          created_at?: string
          department?: string
          h1_title?: string
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          sitter_count?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_department_pages: {
        Row: {
          active_sits_count: number
          created_at: string
          department: string
          h1_title: string
          highlights: string
          id: string
          intro_text: string
          meta_description: string
          meta_title: string
          published: boolean
          region: string
          sitter_count: number
          slug: string
          updated_at: string
        }
        Insert: {
          active_sits_count?: number
          created_at?: string
          department: string
          h1_title?: string
          highlights?: string
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          region?: string
          sitter_count?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active_sits_count?: number
          created_at?: string
          department?: string
          h1_title?: string
          highlights?: string
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          region?: string
          sitter_count?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sit_date_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_role: string | null
          id: string
          new_end_date: string | null
          new_start_date: string | null
          old_end_date: string | null
          old_start_date: string | null
          sit_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_role?: string | null
          id?: string
          new_end_date?: string | null
          new_start_date?: string | null
          old_end_date?: string | null
          old_start_date?: string | null
          sit_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_role?: string | null
          id?: string
          new_end_date?: string | null
          new_start_date?: string | null
          old_end_date?: string | null
          old_start_date?: string | null
          sit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sit_date_changes_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
        ]
      }
      sits: {
        Row: {
          accepting_applications: boolean
          animaux_override: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          end_date: string | null
          environments: string[]
          flexible_dates: boolean | null
          id: string
          is_urgent: boolean
          logement_override: string | null
          max_applications: number | null
          min_gardien_sits: number
          open_to: string[] | null
          property_id: string
          reminder_j48_sent: boolean | null
          reminder_j7_sent: boolean | null
          review_j1_sent: boolean | null
          review_j5_sent: boolean | null
          specific_expectations: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["sit_status"]
          title: string
          user_id: string
        }
        Insert: {
          accepting_applications?: boolean
          animaux_override?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_date?: string | null
          environments?: string[]
          flexible_dates?: boolean | null
          id?: string
          is_urgent?: boolean
          logement_override?: string | null
          max_applications?: number | null
          min_gardien_sits?: number
          open_to?: string[] | null
          property_id: string
          reminder_j48_sent?: boolean | null
          reminder_j7_sent?: boolean | null
          review_j1_sent?: boolean | null
          review_j5_sent?: boolean | null
          specific_expectations?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sit_status"]
          title?: string
          user_id: string
        }
        Update: {
          accepting_applications?: boolean
          animaux_override?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_date?: string | null
          environments?: string[]
          flexible_dates?: boolean | null
          id?: string
          is_urgent?: boolean
          logement_override?: string | null
          max_applications?: number | null
          min_gardien_sits?: number
          open_to?: string[] | null
          property_id?: string
          reminder_j48_sent?: boolean | null
          reminder_j7_sent?: boolean | null
          review_j1_sent?: boolean | null
          review_j5_sent?: boolean | null
          specific_expectations?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sit_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sitter_gallery: {
        Row: {
          animal_breed: string | null
          animal_type: string | null
          caption: string
          city: string | null
          created_at: string
          id: string
          photo_date: string | null
          photo_url: string
          sit_id: string | null
          source: Database["public"]["Enums"]["gallery_source"]
          user_id: string
        }
        Insert: {
          animal_breed?: string | null
          animal_type?: string | null
          caption?: string
          city?: string | null
          created_at?: string
          id?: string
          photo_date?: string | null
          photo_url: string
          sit_id?: string | null
          source?: Database["public"]["Enums"]["gallery_source"]
          user_id: string
        }
        Update: {
          animal_breed?: string | null
          animal_type?: string | null
          caption?: string
          city?: string | null
          created_at?: string
          id?: string
          photo_date?: string | null
          photo_url?: string
          sit_id?: string | null
          source?: Database["public"]["Enums"]["gallery_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitter_gallery_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitter_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sitter_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitter_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sitter_profiles: {
        Row: {
          accompanied_by: string | null
          animal_types: string[] | null
          availability_dates: Json | null
          availability_during: string | null
          bonus_skills: string[] | null
          competences: string[] | null
          created_at: string
          experience_years: string | null
          farm_animals_ok: boolean | null
          geographic_radius: number | null
          handover_preference: string | null
          has_license: boolean | null
          has_vehicle: boolean | null
          id: string
          interests: string[] | null
          is_available: boolean
          languages: string[] | null
          lifestyle: string[] | null
          max_duration: number | null
          meeting_preference: string[] | null
          min_duration: number | null
          min_notice: string | null
          min_stay_duration: string | null
          motivation: string | null
          prefer_visitors: boolean | null
          preferences_notes: string | null
          preferred_environments: string[] | null
          preferred_frequency: string | null
          preferred_periods: string[] | null
          references_text: string | null
          sitter_type: string | null
          smoker: boolean | null
          strict_rules_ok: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accompanied_by?: string | null
          animal_types?: string[] | null
          availability_dates?: Json | null
          availability_during?: string | null
          bonus_skills?: string[] | null
          competences?: string[] | null
          created_at?: string
          experience_years?: string | null
          farm_animals_ok?: boolean | null
          geographic_radius?: number | null
          handover_preference?: string | null
          has_license?: boolean | null
          has_vehicle?: boolean | null
          id?: string
          interests?: string[] | null
          is_available?: boolean
          languages?: string[] | null
          lifestyle?: string[] | null
          max_duration?: number | null
          meeting_preference?: string[] | null
          min_duration?: number | null
          min_notice?: string | null
          min_stay_duration?: string | null
          motivation?: string | null
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
          preferred_environments?: string[] | null
          preferred_frequency?: string | null
          preferred_periods?: string[] | null
          references_text?: string | null
          sitter_type?: string | null
          smoker?: boolean | null
          strict_rules_ok?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accompanied_by?: string | null
          animal_types?: string[] | null
          availability_dates?: Json | null
          availability_during?: string | null
          bonus_skills?: string[] | null
          competences?: string[] | null
          created_at?: string
          experience_years?: string | null
          farm_animals_ok?: boolean | null
          geographic_radius?: number | null
          handover_preference?: string | null
          has_license?: boolean | null
          has_vehicle?: boolean | null
          id?: string
          interests?: string[] | null
          is_available?: boolean
          languages?: string[] | null
          lifestyle?: string[] | null
          max_duration?: number | null
          meeting_preference?: string[] | null
          min_duration?: number | null
          min_notice?: string | null
          min_stay_duration?: string | null
          motivation?: string | null
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
          preferred_environments?: string[] | null
          preferred_frequency?: string | null
          preferred_periods?: string[] | null
          references_text?: string | null
          sitter_type?: string | null
          smoker?: boolean | null
          strict_rules_ok?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitter_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_library: {
        Row: {
          category: string | null
          created_at: string
          first_submitted_by: string | null
          id: string
          label: string
          merged_into: string | null
          normalized_label: string
          status: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          first_submitted_by?: string | null
          id?: string
          label: string
          merged_into?: string | null
          normalized_label: string
          status?: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          first_submitted_by?: string | null
          id?: string
          label?: string
          merged_into?: string | null
          normalized_label?: string
          status?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "skills_library_first_submitted_by_fkey"
            columns: ["first_submitted_by"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skills_library_first_submitted_by_fkey"
            columns: ["first_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_library_first_submitted_by_fkey"
            columns: ["first_submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_library_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "skills_library"
            referencedColumns: ["id"]
          },
        ]
      }
      small_mission_responses: {
        Row: {
          conversation_id: string | null
          created_at: string
          exchange_date: string | null
          exchange_offer: string | null
          id: string
          message: string
          mission_id: string
          need_description: string | null
          responder_id: string
          status: Database["public"]["Enums"]["small_mission_response_status"]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          exchange_date?: string | null
          exchange_offer?: string | null
          id?: string
          message?: string
          mission_id: string
          need_description?: string | null
          responder_id: string
          status?: Database["public"]["Enums"]["small_mission_response_status"]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          exchange_date?: string | null
          exchange_offer?: string | null
          id?: string
          message?: string
          mission_id?: string
          need_description?: string | null
          responder_id?: string
          status?: Database["public"]["Enums"]["small_mission_response_status"]
        }
        Relationships: [
          {
            foreignKeyName: "small_mission_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_responses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "small_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      small_missions: {
        Row: {
          category: Database["public"]["Enums"]["small_mission_category"]
          city: string
          created_at: string
          date_needed: string | null
          description: string
          duration_estimate: string
          exchange_offer: string
          id: string
          latitude: number | null
          longitude: number | null
          photos: string[]
          postal_code: string
          status: Database["public"]["Enums"]["small_mission_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["small_mission_category"]
          city?: string
          created_at?: string
          date_needed?: string | null
          description?: string
          duration_estimate?: string
          exchange_offer?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos?: string[]
          postal_code?: string
          status?: Database["public"]["Enums"]["small_mission_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["small_mission_category"]
          city?: string
          created_at?: string
          date_needed?: string | null
          description?: string
          duration_estimate?: string
          exchange_offer?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos?: string[]
          postal_code?: string
          status?: Database["public"]["Enums"]["small_mission_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "small_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "small_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_override: boolean | null
          admin_override_note: string | null
          created_at: string
          current_period_start: string | null
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string | null
          trial_end: string | null
          user_id: string
        }
        Insert: {
          admin_override?: boolean | null
          admin_override_note?: string | null
          created_at?: string
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
          trial_end?: string | null
          user_id: string
        }
        Update: {
          admin_override?: boolean | null
          admin_override_note?: string | null
          created_at?: string
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
          trial_end?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      avis_publics: {
        Row: {
          animal_care_rating: number | null
          comment: string | null
          communication_rating: number | null
          created_at: string | null
          housing_condition_rating: number | null
          housing_respect_rating: number | null
          id: string | null
          instructions_clarity_rating: number | null
          listing_accuracy_rating: number | null
          moderation_status: string | null
          overall_rating: number | null
          published: boolean | null
          reliability_rating: number | null
          review_type: string | null
          reviewee_id: string | null
          reviewer_id: string | null
          sit_id: string | null
          welcome_rating: number | null
          would_recommend: boolean | null
        }
        Insert: {
          animal_care_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string | null
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          moderation_status?: string | null
          overall_rating?: number | null
          published?: boolean | null
          reliability_rating?: number | null
          review_type?: string | null
          reviewee_id?: string | null
          reviewer_id?: string | null
          sit_id?: string | null
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          animal_care_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string | null
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          moderation_status?: string | null
          overall_rating?: number | null
          published?: boolean | null
          reliability_rating?: number | null
          review_type?: string | null
          reviewee_id?: string | null
          reviewer_id?: string | null
          sit_id?: string | null
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_reputation: {
        Row: {
          active_badges: number | null
          completed_sits: number | null
          note_moyenne: number | null
          statut_gardien: string | null
          user_id: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          completed_sits_count: number | null
          first_name: string | null
          id: string | null
          identity_verified: boolean | null
          is_founder: boolean | null
          postal_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_sits_count?: number | null
          first_name?: string | null
          id?: string | null
          identity_verified?: boolean | null
          is_founder?: boolean | null
          postal_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_sits_count?: number | null
          first_name?: string | null
          id?: string | null
          identity_verified?: boolean | null
          is_founder?: boolean | null
          postal_code?: string | null
        }
        Relationships: []
      }
      public_stats: {
        Row: {
          animaux_accompagnes: number | null
          maisons_gardees: number | null
          missions_entraide: number | null
          total_inscrits: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_garde_accord: {
        Args: {
          p_document_content: Json
          p_document_hash: string
          p_garde_id: string
          p_ip_address?: string
        }
        Returns: undefined
      }
      admin_get_accepted_sitters: {
        Args: { p_sit_ids: string[] }
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          sit_id: string
          sitter_id: string
        }[]
      }
      admin_get_application_counts: {
        Args: { p_sit_ids: string[] }
        Returns: {
          accepted: number
          pending: number
          sit_id: string
          total: number
        }[]
      }
      admin_get_applications_diagnostic: {
        Args: never
        Returns: {
          created_at: string
          id: string
          owner_first_name: string
          owner_last_name: string
          sit_id: string
          sit_status: string
          sit_title: string
          sit_user_id: string
          sitter_first_name: string
          sitter_id: string
          sitter_last_name: string
          status: string
        }[]
      }
      admin_get_sit_applications: {
        Args: { p_sit_id: string }
        Returns: {
          created_at: string
          id: string
          sitter_avatar_url: string
          sitter_first_name: string
          sitter_id: string
          status: string
        }[]
      }
      admin_get_user_email: { Args: { p_user_id: string }; Returns: string }
      admin_log_message_failure: {
        Args: {
          p_content: string
          p_error_message: string
          p_target_user_id: string
        }
        Returns: string
      }
      admin_send_message_to_user: {
        Args: { p_content: string; p_target_user_id: string }
        Returns: string
      }
      apply_referral_reward: {
        Args: { p_referred_id: string }
        Returns: undefined
      }
      award_badge: {
        Args: {
          p_badge_id: string
          p_giver_id: string
          p_is_manual?: boolean
          p_sit_id?: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      complete_onboarding: {
        Args: {
          p_animal_experience?: string
          p_avatar_url: string
          p_bio?: string
          p_city: string
          p_date_of_birth?: string
          p_first_name: string
          p_postal_code: string
        }
        Returns: boolean
      }
      create_alert_from_search: {
        Args: { p_city: string; p_postal_code: string; p_radius_km: number }
        Returns: string
      }
      create_alert_preference: {
        Args: {
          p_alert_types?: string[]
          p_city?: string
          p_departement?: string
          p_frequence?: string
          p_heure_envoi?: string
          p_label: string
          p_postal_code?: string
          p_radius_km?: number
          p_region_code?: string
          p_zone_type: string
        }
        Returns: string
      }
      create_avis_annulation: {
        Args: {
          p_cancelled_by_role: string
          p_reason: string
          p_reviewee_id: string
          p_reviewer_id: string
          p_sit_id: string
        }
        Returns: string
      }
      create_review_dispute: {
        Args: { p_category: string; p_reason: string; p_review_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_garde_environments: {
        Args: { p_garde_id: string }
        Returns: string[]
      }
      get_or_create_conversation: {
        Args: {
          p_context_type: Database["public"]["Enums"]["conversation_context"]
          p_long_stay_id?: string
          p_other_user_id: string
          p_sit_id?: string
          p_small_mission_id?: string
        }
        Returns: string
      }
      get_own_email: { Args: never; Returns: string }
      get_sit_application_counts: {
        Args: { p_sit_id: string }
        Returns: {
          app_count: number
          pending_app_count: number
        }[]
      }
      get_user_email_for_notification: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_user_emails_admin: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cp_relance: { Args: { user_ids: string[] }; Returns: undefined }
      is_profile_ready_for_action: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      log_client_error: {
        Args: {
          _col_no?: number
          _context?: Json
          _fingerprint: string
          _line_no?: number
          _message: string
          _severity?: string
          _source?: string
          _stack?: string
          _url?: string
          _user_agent?: string
          _user_email?: string
        }
        Returns: string
      }
      mark_user_seen: { Args: never; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_cancellations: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      recalculate_completed_sits: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reinvite_candidat: {
        Args: {
          p_application_id: string
          p_sit_id: string
          p_sitter_id: string
        }
        Returns: undefined
      }
      repondre_avis_annulation: {
        Args: {
          p_respondent_id: string
          p_response: string
          p_review_id: string
        }
        Returns: undefined
      }
      resolve_review_dispute: {
        Args: {
          p_admin_note?: string
          p_decision: string
          p_dispute_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "calm" | "moderate" | "sportive"
      alone_duration: "never" | "2h" | "6h" | "all_day"
      app_role: "admin" | "moderator" | "user"
      application_status:
        | "pending"
        | "viewed"
        | "discussing"
        | "accepted"
        | "rejected"
        | "cancelled"
      conversation_context:
        | "sit_application"
        | "sitter_inquiry"
        | "mission_help"
        | "owner_pitch"
        | "long_stay"
        | "helper_inquiry"
      gallery_source: "guardiens" | "external"
      guide_place_category:
        | "dog_park"
        | "walk_trail"
        | "vet"
        | "dog_friendly_cafe"
        | "dog_friendly_restaurant"
        | "pet_shop"
        | "water_point"
        | "general_park"
      long_stay_access_level: "eligible" | "past_sitters" | "invite_only"
      long_stay_status:
        | "draft"
        | "published"
        | "confirmed"
        | "completed"
        | "cancelled"
      owner_gallery_category:
        | "home_life"
        | "animals_life"
        | "garden"
        | "neighborhood"
        | "seasonal"
      pet_species:
        | "dog"
        | "cat"
        | "horse"
        | "bird"
        | "rodent"
        | "fish"
        | "reptile"
        | "farm_animal"
        | "nac"
      property_environment:
        | "city_center"
        | "suburban"
        | "countryside"
        | "mountain"
        | "seaside"
        | "forest"
      property_type: "apartment" | "house" | "farm" | "chalet" | "other"
      sit_status:
        | "draft"
        | "published"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      small_mission_category: "animals" | "garden" | "house" | "skills"
      small_mission_response_status: "pending" | "accepted" | "declined"
      small_mission_status: "open" | "in_progress" | "completed" | "cancelled"
      subscription_plan:
        | "free_launch"
        | "founder_free"
        | "annual_sitter"
        | "owner_free"
        | "monthly"
        | "one_shot"
        | "prorata"
      subscription_status:
        | "active"
        | "expired"
        | "cancelled"
        | "trial"
        | "past_due"
      user_role: "owner" | "sitter" | "both"
      verification_status: "pending" | "verified" | "rejected"
      walk_duration: "none" | "30min" | "1h" | "2h_plus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_level: ["calm", "moderate", "sportive"],
      alone_duration: ["never", "2h", "6h", "all_day"],
      app_role: ["admin", "moderator", "user"],
      application_status: [
        "pending",
        "viewed",
        "discussing",
        "accepted",
        "rejected",
        "cancelled",
      ],
      conversation_context: [
        "sit_application",
        "sitter_inquiry",
        "mission_help",
        "owner_pitch",
        "long_stay",
        "helper_inquiry",
      ],
      gallery_source: ["guardiens", "external"],
      guide_place_category: [
        "dog_park",
        "walk_trail",
        "vet",
        "dog_friendly_cafe",
        "dog_friendly_restaurant",
        "pet_shop",
        "water_point",
        "general_park",
      ],
      long_stay_access_level: ["eligible", "past_sitters", "invite_only"],
      long_stay_status: [
        "draft",
        "published",
        "confirmed",
        "completed",
        "cancelled",
      ],
      owner_gallery_category: [
        "home_life",
        "animals_life",
        "garden",
        "neighborhood",
        "seasonal",
      ],
      pet_species: [
        "dog",
        "cat",
        "horse",
        "bird",
        "rodent",
        "fish",
        "reptile",
        "farm_animal",
        "nac",
      ],
      property_environment: [
        "city_center",
        "suburban",
        "countryside",
        "mountain",
        "seaside",
        "forest",
      ],
      property_type: ["apartment", "house", "farm", "chalet", "other"],
      sit_status: [
        "draft",
        "published",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      small_mission_category: ["animals", "garden", "house", "skills"],
      small_mission_response_status: ["pending", "accepted", "declined"],
      small_mission_status: ["open", "in_progress", "completed", "cancelled"],
      subscription_plan: [
        "free_launch",
        "founder_free",
        "annual_sitter",
        "owner_free",
        "monthly",
        "one_shot",
        "prorata",
      ],
      subscription_status: [
        "active",
        "expired",
        "cancelled",
        "trial",
        "past_due",
      ],
      user_role: ["owner", "sitter", "both"],
      verification_status: ["pending", "verified", "rejected"],
      walk_duration: ["none", "30min", "1h", "2h_plus"],
    },
  },
} as const
