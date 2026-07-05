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
      ai_photo_analysis_quota: {
        Row: {
          count: number
          day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      analysis_requests: {
        Row: {
          admin_notes: string | null
          city_context: string | null
          created_at: string
          delivered_at: string | null
          delivered_url: string | null
          details: string | null
          email: string | null
          id: string
          ip_hash: string | null
          request_type: Database["public"]["Enums"]["analysis_request_type"]
          status: Database["public"]["Enums"]["analysis_request_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          city_context?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_url?: string | null
          details?: string | null
          email?: string | null
          id?: string
          ip_hash?: string | null
          request_type: Database["public"]["Enums"]["analysis_request_type"]
          status?: Database["public"]["Enums"]["analysis_request_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          city_context?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_url?: string | null
          details?: string | null
          email?: string | null
          id?: string
          ip_hash?: string | null
          request_type?: Database["public"]["Enums"]["analysis_request_type"]
          status?: Database["public"]["Enums"]["analysis_request_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: []
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
      article_translations: {
        Row: {
          article_id: string
          content: string
          created_at: string
          excerpt: string
          hero_image_alt: string | null
          id: string
          lang: string
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          article_id: string
          content?: string
          created_at?: string
          excerpt?: string
          hero_image_alt?: string | null
          id?: string
          lang: string
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          excerpt?: string
          hero_image_alt?: string | null
          id?: string
          lang?: string
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          admin_notes: string | null
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
          seo_dirty_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
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
          seo_dirty_at?: string | null
          slug: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
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
          seo_dirty_at?: string | null
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
          image_alt: string | null
          image_credit: string | null
          image_url: string | null
          rich_content: string | null
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
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          rich_content?: string | null
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
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          rich_content?: string | null
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
          seo_dirty_at: string | null
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
          seo_dirty_at?: string | null
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
          seo_dirty_at?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_answer_votes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_answer_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "community_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_answers: {
        Row: {
          author_id: string
          body: string
          created_at: string
          helpful_count: number
          id: string
          is_author_pick: boolean
          is_hidden: boolean
          parent_answer_id: string | null
          question_id: string
          reports_count: number
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_author_pick?: boolean
          is_hidden?: boolean
          parent_answer_id?: string | null
          question_id: string
          reports_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_author_pick?: boolean
          is_hidden?: boolean
          parent_answer_id?: string | null
          question_id?: string
          reports_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_answers_parent_answer_id_fkey"
            columns: ["parent_answer_id"]
            isOneToOne: false
            referencedRelation: "community_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_questions: {
        Row: {
          accepted_answer_id: string | null
          answers_count: number
          author_id: string
          body: string
          category: Database["public"]["Enums"]["community_question_category"]
          city: string | null
          created_at: string
          helpful_count: number
          id: string
          is_hidden: boolean
          is_pinned: boolean
          latitude: number | null
          longitude: number | null
          reports_count: number
          status: Database["public"]["Enums"]["community_question_status"]
          tags: string[]
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          accepted_answer_id?: string | null
          answers_count?: number
          author_id: string
          body: string
          category: Database["public"]["Enums"]["community_question_category"]
          city?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          latitude?: number | null
          longitude?: number | null
          reports_count?: number
          status?: Database["public"]["Enums"]["community_question_status"]
          tags?: string[]
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          accepted_answer_id?: string | null
          answers_count?: number
          author_id?: string
          body?: string
          category?: Database["public"]["Enums"]["community_question_category"]
          city?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          latitude?: number | null
          longitude?: number | null
          reports_count?: number
          status?: Database["public"]["Enums"]["community_question_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_accepted_answer"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "community_answers"
            referencedColumns: ["id"]
          },
        ]
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
          owner_id: string
          reminder_sent_at: string | null
          sit_id: string | null
          sitter_id: string
          small_mission_id: string | null
          unread_reminder_sent_at: string | null
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
          owner_id: string
          reminder_sent_at?: string | null
          sit_id?: string | null
          sitter_id: string
          small_mission_id?: string | null
          unread_reminder_sent_at?: string | null
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
          owner_id?: string
          reminder_sent_at?: string | null
          sit_id?: string | null
          sitter_id?: string
          small_mission_id?: string | null
          unread_reminder_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
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
      email_campaign_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          mission_id: string | null
          path: string | null
          user_id: string | null
          utm_campaign: string
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          mission_id?: string | null
          path?: string | null
          user_id?: string | null
          utm_campaign: string
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          mission_id?: string | null
          path?: string | null
          user_id?: string | null
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      email_deferred_queue: {
        Row: {
          attempts: number
          created_at: string
          defer_reason: string
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          last_error: string | null
          recipient_email: string
          scheduled_for: string
          status: string
          template_data: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          defer_reason: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          recipient_email: string
          scheduled_for: string
          status?: string
          template_data?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          defer_reason?: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          recipient_email?: string
          scheduled_for?: string
          status?: string
          template_data?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_prefix: string | null
          message_id: string
          target_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_prefix?: string | null
          message_id: string
          target_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_prefix?: string | null
          message_id?: string
          target_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_idempotency_hits: {
        Row: {
          created_at: string
          hit_type: string
          id: string
          idempotency_key: string
          metadata: Json | null
          recipient_email: string
          template_name: string
        }
        Insert: {
          created_at?: string
          hit_type: string
          id?: string
          idempotency_key: string
          metadata?: Json | null
          recipient_email: string
          template_name: string
        }
        Update: {
          created_at?: string
          hit_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          recipient_email?: string
          template_name?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          alert_emails: boolean
          created_at: string
          digest_emails: boolean
          product_emails: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_emails?: boolean
          created_at?: string
          digest_emails?: boolean
          product_emails?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_emails?: boolean
          created_at?: string
          digest_emails?: boolean
          product_emails?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          bounced_at: string | null
          click_count: number
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          last_clicked_at: string | null
          last_clicked_url: string | null
          last_opened_at: string | null
          message_id: string | null
          metadata: Json | null
          open_count: number
          recipient_email: string
          resend_id: string | null
          status: string
          template_name: string
        }
        Insert: {
          bounced_at?: string | null
          click_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_clicked_url?: string | null
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          open_count?: number
          recipient_email: string
          resend_id?: string | null
          status: string
          template_name: string
        }
        Update: {
          bounced_at?: string | null
          click_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_clicked_url?: string | null
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          open_count?: number
          recipient_email?: string
          resend_id?: string | null
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
      guide_requests: {
        Row: {
          active_sits_count: number
          admin_notes: string | null
          city: string
          city_guide_id: string | null
          created_at: string
          department: string | null
          first_requested_at: string
          id: string
          last_seen_at: string
          postal_code: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          active_sits_count?: number
          admin_notes?: string | null
          city: string
          city_guide_id?: string | null
          created_at?: string
          department?: string | null
          first_requested_at?: string
          id?: string
          last_seen_at?: string
          postal_code?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_sits_count?: number
          admin_notes?: string | null
          city?: string
          city_guide_id?: string | null
          created_at?: string
          department?: string | null
          first_requested_at?: string
          id?: string
          last_seen_at?: string
          postal_code?: string | null
          slug?: string
          status?: string
          updated_at?: string
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
      indexnow_submissions: {
        Row: {
          id: string
          ok: boolean
          response_snippet: string | null
          sample_urls: string[]
          source: string | null
          status_code: number | null
          submitted_at: string
          triggered_by: string | null
          url_count: number
        }
        Insert: {
          id?: string
          ok?: boolean
          response_snippet?: string | null
          sample_urls?: string[]
          source?: string | null
          status_code?: number | null
          submitted_at?: string
          triggered_by?: string | null
          url_count: number
        }
        Update: {
          id?: string
          ok?: boolean
          response_snippet?: string | null
          sample_urls?: string[]
          source?: string | null
          status_code?: number | null
          submitted_at?: string
          triggered_by?: string | null
          url_count?: number
        }
        Relationships: []
      }
      journey_step_log: {
        Row: {
          created_at: string
          error_detail: Json | null
          id: string
          journey_id: string
          message_id: string | null
          reason: string | null
          sent: boolean
          step_order: number
          template_name: string
        }
        Insert: {
          created_at?: string
          error_detail?: Json | null
          id?: string
          journey_id: string
          message_id?: string | null
          reason?: string | null
          sent: boolean
          step_order: number
          template_name: string
        }
        Update: {
          created_at?: string
          error_detail?: Json | null
          id?: string
          journey_id?: string
          message_id?: string | null
          reason?: string | null
          sent?: boolean
          step_order?: number
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_step_log_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "user_journeys"
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
      mass_email_sends: {
        Row: {
          bounced_at: string | null
          click_count: number
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          last_clicked_at: string | null
          last_clicked_url: string | null
          last_opened_at: string | null
          mass_email_id: string
          open_count: number
          recipient_email: string
          resend_id: string | null
          sent_at: string
          status: string
          updated_at: string
        }
        Insert: {
          bounced_at?: string | null
          click_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_clicked_url?: string | null
          last_opened_at?: string | null
          mass_email_id: string
          open_count?: number
          recipient_email: string
          resend_id?: string | null
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bounced_at?: string | null
          click_count?: number
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_clicked_url?: string | null
          last_opened_at?: string | null
          mass_email_id?: string
          open_count?: number
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mass_email_sends_mass_email_id_fkey"
            columns: ["mass_email_id"]
            isOneToOne: false
            referencedRelation: "mass_email_stats"
            referencedColumns: ["mass_email_id"]
          },
          {
            foreignKeyName: "mass_email_sends_mass_email_id_fkey"
            columns: ["mass_email_id"]
            isOneToOne: false
            referencedRelation: "mass_emails"
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
      moderation_logs: {
        Row: {
          content_type: string
          created_at: string
          excerpt: string | null
          id: string
          reasons: Json
          status: string
          user_id: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          excerpt?: string | null
          id?: string
          reasons?: Json
          status: string
          user_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          reasons?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
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
      nurturing_sequences: {
        Row: {
          active: boolean
          anchor_field: string
          audience: string
          created_at: string
          description: string | null
          enrollment_rule: Json
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          anchor_field?: string
          audience: string
          created_at?: string
          description?: string | null
          enrollment_rule?: Json
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          anchor_field?: string
          audience?: string
          created_at?: string
          description?: string | null
          enrollment_rule?: Json
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      nurturing_steps: {
        Row: {
          created_at: string
          delay_hours: number
          exit_condition: Json | null
          id: string
          send_condition: Json | null
          sequence_id: string
          step_order: number
          template_name: string
        }
        Insert: {
          created_at?: string
          delay_hours: number
          exit_condition?: Json | null
          id?: string
          send_condition?: Json | null
          sequence_id: string
          step_order: number
          template_name: string
        }
        Update: {
          created_at?: string
          delay_hours?: number
          exit_condition?: Json | null
          id?: string
          send_condition?: Json | null
          sequence_id?: string
          step_order?: number
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurturing_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurturing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_gallery: {
        Row: {
          caption: string
          category: Database["public"]["Enums"]["owner_gallery_category"]
          created_at: string
          height: number | null
          id: string
          photo_url: string
          position: number
          season: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string
          category?: Database["public"]["Enums"]["owner_gallery_category"]
          created_at?: string
          height?: number | null
          id?: string
          photo_url: string
          position?: number
          season?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          caption?: string
          category?: Database["public"]["Enums"]["owner_gallery_category"]
          created_at?: string
          height?: number | null
          id?: string
          photo_url?: string
          position?: number
          season?: string | null
          user_id?: string
          width?: number | null
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
          home_ambiance: string[]
          household_composition: string[] | null
          id: string
          interests: string[] | null
          languages: string[] | null
          life_pace: string | null
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
          home_ambiance?: string[]
          household_composition?: string[] | null
          id?: string
          interests?: string[] | null
          languages?: string[] | null
          life_pace?: string | null
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
          home_ambiance?: string[]
          household_composition?: string[] | null
          id?: string
          interests?: string[] | null
          languages?: string[] | null
          life_pace?: string | null
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
      pro_google_reviews_cache: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          place_id: string
          pro_id: string
          rating_avg: number | null
          rating_count: number | null
          reviews: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          place_id: string
          pro_id: string
          rating_avg?: number | null
          rating_count?: number | null
          reviews?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          place_id?: string
          pro_id?: string
          rating_avg?: number | null
          rating_count?: number | null
          reviews?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_google_reviews_cache_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: true
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["pro_category"]
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          diplomes: string[]
          email_contact: string | null
          google_place_id: string | null
          horaires: Json
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          ordre_number: string | null
          phone: string | null
          postal_code: string | null
          raison_sociale: string
          rating_avg: number | null
          rating_count: number
          rejection_reason: string | null
          siret: string | null
          siret_verified: boolean
          slug: string
          social_links: Json
          status: Database["public"]["Enums"]["pro_moderation_status"]
          sub_categories: string[]
          tarif_max: number | null
          tarif_min: number | null
          tarif_note: string | null
          updated_at: string
          urgences_24_7: boolean
          user_id: string
          view_count: number
          website: string | null
          zone_cities: string[]
          zone_radius_km: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["pro_category"]
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          diplomes?: string[]
          email_contact?: string | null
          google_place_id?: string | null
          horaires?: Json
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          ordre_number?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale: string
          rating_avg?: number | null
          rating_count?: number
          rejection_reason?: string | null
          siret?: string | null
          siret_verified?: boolean
          slug: string
          social_links?: Json
          status?: Database["public"]["Enums"]["pro_moderation_status"]
          sub_categories?: string[]
          tarif_max?: number | null
          tarif_min?: number | null
          tarif_note?: string | null
          updated_at?: string
          urgences_24_7?: boolean
          user_id: string
          view_count?: number
          website?: string | null
          zone_cities?: string[]
          zone_radius_km?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["pro_category"]
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          diplomes?: string[]
          email_contact?: string | null
          google_place_id?: string | null
          horaires?: Json
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          ordre_number?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale?: string
          rating_avg?: number | null
          rating_count?: number
          rejection_reason?: string | null
          siret?: string | null
          siret_verified?: boolean
          slug?: string
          social_links?: Json
          status?: Database["public"]["Enums"]["pro_moderation_status"]
          sub_categories?: string[]
          tarif_max?: number | null
          tarif_min?: number | null
          tarif_note?: string | null
          updated_at?: string
          urgences_24_7?: boolean
          user_id?: string
          view_count?: number
          website?: string | null
          zone_cities?: string[]
          zone_radius_km?: number | null
        }
        Relationships: []
      }
      pro_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          pro_id: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          pro_id: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          pro_id?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_reviews_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_verifications: {
        Row: {
          admin_decision: string | null
          admin_notes: string | null
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_confidence: number | null
          ai_red_flags: Json | null
          ai_status: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          declared_business_name: string | null
          declared_siret: string | null
          declared_specialty: string | null
          doc_type: Database["public"]["Enums"]["pro_doc_type_enum"]
          file_name: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          status: Database["public"]["Enums"]["pro_verification_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_decision?: string | null
          admin_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_red_flags?: Json | null
          ai_status?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          declared_business_name?: string | null
          declared_siret?: string | null
          declared_specialty?: string | null
          doc_type: Database["public"]["Enums"]["pro_doc_type_enum"]
          file_name?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          status?: Database["public"]["Enums"]["pro_verification_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_decision?: string | null
          admin_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_red_flags?: Json | null
          ai_status?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          declared_business_name?: string | null
          declared_siret?: string | null
          declared_specialty?: string | null
          doc_type?: Database["public"]["Enums"]["pro_doc_type_enum"]
          file_name?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          status?: Database["public"]["Enums"]["pro_verification_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          country: string
          cp_relance_count: number | null
          created_at: string
          custom_skills: Json | null
          date_of_birth: string | null
          email: string | null
          email_preferences: Json
          first_name: string | null
          first_sit_email_sent_at: string | null
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
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean
          onboarding_dismissed_at: string | null
          onboarding_minimal_completed: boolean
          postal_code: string | null
          pro_approved_at: string | null
          pro_business_name: string | null
          pro_pricing_note: string | null
          pro_siret: string | null
          pro_specialty: string | null
          pro_status: Database["public"]["Enums"]["pro_profile_status_enum"]
          pro_tagline: string | null
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
          country?: string
          cp_relance_count?: number | null
          created_at?: string
          custom_skills?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_preferences?: Json
          first_name?: string | null
          first_sit_email_sent_at?: string | null
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
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          onboarding_dismissed_at?: string | null
          onboarding_minimal_completed?: boolean
          postal_code?: string | null
          pro_approved_at?: string | null
          pro_business_name?: string | null
          pro_pricing_note?: string | null
          pro_siret?: string | null
          pro_specialty?: string | null
          pro_status?: Database["public"]["Enums"]["pro_profile_status_enum"]
          pro_tagline?: string | null
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
          country?: string
          cp_relance_count?: number | null
          created_at?: string
          custom_skills?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_preferences?: Json
          first_name?: string | null
          first_sit_email_sent_at?: string | null
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
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          onboarding_dismissed_at?: string | null
          onboarding_minimal_completed?: boolean
          postal_code?: string | null
          pro_approved_at?: string | null
          pro_business_name?: string | null
          pro_pricing_note?: string | null
          pro_siret?: string | null
          pro_specialty?: string | null
          pro_status?: Database["public"]["Enums"]["pro_profile_status_enum"]
          pro_tagline?: string | null
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
          cover_photo_url: string | null
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
          cover_photo_url?: string | null
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
          cover_photo_url?: string | null
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
      redirects: {
        Row: {
          created_at: string
          hit_count: number
          last_hit_at: string | null
          notes: string | null
          redirect_type: number
          slug_from: string
          slug_to: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          last_hit_at?: string | null
          notes?: string | null
          redirect_type?: number
          slug_from: string
          slug_to: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          last_hit_at?: string | null
          notes?: string | null
          redirect_type?: number
          slug_from?: string
          slug_to?: string
          updated_at?: string
        }
        Relationships: []
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
          canonical_url: string | null
          city: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          department: string
          excerpt: string | null
          h1_title: string
          hero_image_alt: string | null
          id: string
          intro_text: string
          meta_description: string
          meta_title: string
          noindex: boolean | null
          published: boolean
          seo_dirty_at: string | null
          sitter_count: number
          slug: string
          updated_at: string
        }
        Insert: {
          active_sits_count?: number
          canonical_url?: string | null
          city: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          department: string
          excerpt?: string | null
          h1_title?: string
          hero_image_alt?: string | null
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          noindex?: boolean | null
          published?: boolean
          seo_dirty_at?: string | null
          sitter_count?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active_sits_count?: number
          canonical_url?: string | null
          city?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          department?: string
          excerpt?: string | null
          h1_title?: string
          hero_image_alt?: string | null
          id?: string
          intro_text?: string
          meta_description?: string
          meta_title?: string
          noindex?: boolean | null
          published?: boolean
          seo_dirty_at?: string | null
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
      sit_invitations: {
        Row: {
          created_at: string
          id: string
          message: string | null
          owner_id: string
          responded_at: string | null
          sit_id: string
          sitter_id: string
          status: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          owner_id: string
          responded_at?: string | null
          sit_id: string
          sitter_id: string
          status?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          responded_at?: string | null
          sit_id?: string
          sitter_id?: string
          status?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sit_invitations_sit_id_fkey"
            columns: ["sit_id"]
            isOneToOne: false
            referencedRelation: "sits"
            referencedColumns: ["id"]
          },
        ]
      }
      sit_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          sit_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          sit_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          sit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sit_status_history_sit_id_fkey"
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
          availability_nudge_sent_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          city: string | null
          country: string | null
          cover_photo_url: string | null
          created_at: string
          daily_routine: string | null
          end_date: string | null
          environments: string[]
          flexible_dates: boolean | null
          id: string
          is_urgent: boolean
          last_unpublished_reason: string | null
          logement_override: string | null
          max_applications: number | null
          min_gardien_sits: number
          open_to: string[] | null
          owner_message: string | null
          property_id: string
          published_at: string | null
          reminder_j48_sent: boolean | null
          reminder_j7_sent: boolean | null
          review_j1_sent: boolean | null
          review_j5_sent: boolean | null
          slug: string | null
          specific_expectations: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["sit_status"]
          title: string
          unpublished_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepting_applications?: boolean
          animaux_override?: string | null
          availability_nudge_sent_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string
          daily_routine?: string | null
          end_date?: string | null
          environments?: string[]
          flexible_dates?: boolean | null
          id?: string
          is_urgent?: boolean
          last_unpublished_reason?: string | null
          logement_override?: string | null
          max_applications?: number | null
          min_gardien_sits?: number
          open_to?: string[] | null
          owner_message?: string | null
          property_id: string
          published_at?: string | null
          reminder_j48_sent?: boolean | null
          reminder_j7_sent?: boolean | null
          review_j1_sent?: boolean | null
          review_j5_sent?: boolean | null
          slug?: string | null
          specific_expectations?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sit_status"]
          title?: string
          unpublished_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepting_applications?: boolean
          animaux_override?: string | null
          availability_nudge_sent_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string
          daily_routine?: string | null
          end_date?: string | null
          environments?: string[]
          flexible_dates?: boolean | null
          id?: string
          is_urgent?: boolean
          last_unpublished_reason?: string | null
          logement_override?: string | null
          max_applications?: number | null
          min_gardien_sits?: number
          open_to?: string[] | null
          owner_message?: string | null
          property_id?: string
          published_at?: string | null
          reminder_j48_sent?: boolean | null
          reminder_j7_sent?: boolean | null
          review_j1_sent?: boolean | null
          review_j5_sent?: boolean | null
          slug?: string | null
          specific_expectations?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sit_status"]
          title?: string
          unpublished_at?: string | null
          updated_at?: string
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
          demanding_breeds_ok: boolean
          dog_sizes_accepted: string[]
          experience_years: string | null
          farm_animals_ok: boolean | null
          geographic_radius: number | null
          guard_experience: string
          handover_preference: string | null
          has_license: boolean | null
          has_vehicle: boolean | null
          household_composition: string[] | null
          id: string
          indoor_cats_only: boolean
          interests: string[] | null
          is_available: boolean
          languages: string[] | null
          life_pace: string | null
          lifestyle: string[] | null
          max_duration: number | null
          meeting_preference: string[] | null
          min_duration: number | null
          min_notice: string | null
          min_stay_duration: string | null
          motivation: string | null
          own_animals: string[]
          prefer_visitors: boolean | null
          preferences_notes: string | null
          preferred_environments: string[] | null
          preferred_frequency: string | null
          preferred_periods: string[] | null
          references_text: string | null
          reply_median_minutes: number | null
          reply_stats_updated_at: string | null
          sensitivities: string[]
          sitter_type: string | null
          smoker: boolean | null
          special_animal_skills: string[]
          strict_rules_ok: boolean | null
          updated_at: string
          user_id: string
          work_during_sit: string | null
        }
        Insert: {
          accompanied_by?: string | null
          animal_types?: string[] | null
          availability_dates?: Json | null
          availability_during?: string | null
          bonus_skills?: string[] | null
          competences?: string[] | null
          created_at?: string
          demanding_breeds_ok?: boolean
          dog_sizes_accepted?: string[]
          experience_years?: string | null
          farm_animals_ok?: boolean | null
          geographic_radius?: number | null
          guard_experience?: string
          handover_preference?: string | null
          has_license?: boolean | null
          has_vehicle?: boolean | null
          household_composition?: string[] | null
          id?: string
          indoor_cats_only?: boolean
          interests?: string[] | null
          is_available?: boolean
          languages?: string[] | null
          life_pace?: string | null
          lifestyle?: string[] | null
          max_duration?: number | null
          meeting_preference?: string[] | null
          min_duration?: number | null
          min_notice?: string | null
          min_stay_duration?: string | null
          motivation?: string | null
          own_animals?: string[]
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
          preferred_environments?: string[] | null
          preferred_frequency?: string | null
          preferred_periods?: string[] | null
          references_text?: string | null
          reply_median_minutes?: number | null
          reply_stats_updated_at?: string | null
          sensitivities?: string[]
          sitter_type?: string | null
          smoker?: boolean | null
          special_animal_skills?: string[]
          strict_rules_ok?: boolean | null
          updated_at?: string
          user_id: string
          work_during_sit?: string | null
        }
        Update: {
          accompanied_by?: string | null
          animal_types?: string[] | null
          availability_dates?: Json | null
          availability_during?: string | null
          bonus_skills?: string[] | null
          competences?: string[] | null
          created_at?: string
          demanding_breeds_ok?: boolean
          dog_sizes_accepted?: string[]
          experience_years?: string | null
          farm_animals_ok?: boolean | null
          geographic_radius?: number | null
          guard_experience?: string
          handover_preference?: string | null
          has_license?: boolean | null
          has_vehicle?: boolean | null
          household_composition?: string[] | null
          id?: string
          indoor_cats_only?: boolean
          interests?: string[] | null
          is_available?: boolean
          languages?: string[] | null
          life_pace?: string | null
          lifestyle?: string[] | null
          max_duration?: number | null
          meeting_preference?: string[] | null
          min_duration?: number | null
          min_notice?: string | null
          min_stay_duration?: string | null
          motivation?: string | null
          own_animals?: string[]
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
          preferred_environments?: string[] | null
          preferred_frequency?: string | null
          preferred_periods?: string[] | null
          references_text?: string | null
          reply_median_minutes?: number | null
          reply_stats_updated_at?: string | null
          sensitivities?: string[]
          sitter_type?: string | null
          smoker?: boolean | null
          special_animal_skills?: string[]
          strict_rules_ok?: boolean | null
          updated_at?: string
          user_id?: string
          work_during_sit?: string | null
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
          ai_checked_at: string | null
          ai_duplicate_of_label: string | null
          ai_reason: string | null
          ai_suggested_label: string | null
          ai_verdict: string | null
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
          ai_checked_at?: string | null
          ai_duplicate_of_label?: string | null
          ai_reason?: string | null
          ai_suggested_label?: string | null
          ai_verdict?: string | null
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
          ai_checked_at?: string | null
          ai_duplicate_of_label?: string | null
          ai_reason?: string | null
          ai_suggested_label?: string | null
          ai_verdict?: string | null
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
      small_mission_response_thanks: {
        Row: {
          created_at: string
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "small_mission_response_thanks_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "small_mission_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_response_thanks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "small_mission_response_thanks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_response_thanks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          helpful_count: number
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
          helpful_count?: number
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
          helpful_count?: number
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
          end_date: string | null
          exchange_offer: string
          id: string
          latitude: number | null
          longitude: number | null
          mission_type: Database["public"]["Enums"]["mission_type_enum"]
          pet_size: string | null
          pet_species: string | null
          photos: string[]
          postal_code: string
          status: Database["public"]["Enums"]["small_mission_status"]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["small_mission_category"]
          city?: string
          created_at?: string
          date_needed?: string | null
          description?: string
          duration_estimate?: string
          end_date?: string | null
          exchange_offer?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_type?: Database["public"]["Enums"]["mission_type_enum"]
          pet_size?: string | null
          pet_species?: string | null
          photos?: string[]
          postal_code?: string
          status?: Database["public"]["Enums"]["small_mission_status"]
          title?: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["small_mission_category"]
          city?: string
          created_at?: string
          date_needed?: string | null
          description?: string
          duration_estimate?: string
          end_date?: string | null
          exchange_offer?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_type?: Database["public"]["Enums"]["mission_type_enum"]
          pet_size?: string | null
          pet_species?: string | null
          photos?: string[]
          postal_code?: string
          status?: Database["public"]["Enums"]["small_mission_status"]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
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
          expiry_30d_sent: boolean
          expiry_7d_sent: boolean
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
          expiry_30d_sent?: boolean
          expiry_7d_sent?: boolean
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
          expiry_30d_sent?: boolean
          expiry_7d_sent?: boolean
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
      user_journeys: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          exit_reason: string | null
          id: string
          last_step_at: string | null
          sequence_key: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          exit_reason?: string | null
          id?: string
          last_step_at?: string | null
          sequence_key: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          exit_reason?: string | null
          id?: string
          last_step_at?: string | null
          sequence_key?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      email_idempotency_daily_counts: {
        Row: {
          day: string | null
          hit_type: string | null
          hits: number | null
          template_name: string | null
        }
        Relationships: []
      }
      helper_recognition_stats: {
        Row: {
          selected_count: number | null
          useful_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_reputation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "small_mission_responses_responder_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_email_stats: {
        Row: {
          bounced_count: number | null
          click_rate: number | null
          click_through_rate: number | null
          complained_count: number | null
          created_at: string | null
          delivered_count: number | null
          mass_email_id: string | null
          open_rate: number | null
          recipients_count: number | null
          segment: string | null
          subject: string | null
          total_clicks: number | null
          total_opens: number | null
          tracked_count: number | null
          unique_clicks: number | null
          unique_opens: number | null
        }
        Relationships: []
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
      public_pets: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          age: number | null
          alone_duration: Database["public"]["Enums"]["alone_duration"] | null
          breed: string | null
          character: string | null
          id: string | null
          name: string | null
          photo_url: string | null
          property_id: string | null
          species: Database["public"]["Enums"]["pet_species"] | null
          walk_duration: Database["public"]["Enums"]["walk_duration"] | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alone_duration?: Database["public"]["Enums"]["alone_duration"] | null
          breed?: string | null
          character?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          property_id?: string | null
          species?: Database["public"]["Enums"]["pet_species"] | null
          walk_duration?: Database["public"]["Enums"]["walk_duration"] | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          alone_duration?: Database["public"]["Enums"]["alone_duration"] | null
          breed?: string | null
          character?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          property_id?: string | null
          species?: Database["public"]["Enums"]["pet_species"] | null
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
      public_profiles: {
        Row: {
          available_for_help: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          completed_sits_count: number | null
          created_at: string | null
          custom_skills: Json | null
          first_name: string | null
          id: string | null
          identity_verified: boolean | null
          is_founder: boolean | null
          latitude_approx: number | null
          longitude_approx: number | null
          postal_code: string | null
          profile_completion: number | null
          skill_categories: string[] | null
        }
        Insert: {
          available_for_help?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_sits_count?: number | null
          created_at?: string | null
          custom_skills?: Json | null
          first_name?: string | null
          id?: string | null
          identity_verified?: boolean | null
          is_founder?: boolean | null
          latitude_approx?: never
          longitude_approx?: never
          postal_code?: string | null
          profile_completion?: number | null
          skill_categories?: string[] | null
        }
        Update: {
          available_for_help?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_sits_count?: number | null
          created_at?: string | null
          custom_skills?: Json | null
          first_name?: string | null
          id?: string | null
          identity_verified?: boolean | null
          is_founder?: boolean | null
          latitude_approx?: never
          longitude_approx?: never
          postal_code?: string | null
          profile_completion?: number | null
          skill_categories?: string[] | null
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
      accept_application: { Args: { p_application_id: string }; Returns: Json }
      accept_garde_accord: {
        Args: {
          p_document_content: Json
          p_document_hash: string
          p_garde_id: string
          p_ip_address?: string
        }
        Returns: undefined
      }
      admin_analytics_daily_events: {
        Args: { _role?: string; _since: string; _until: string }
        Returns: {
          jour: string
          onboarding_completed: number
          page_views: number
          signup_completed: number
          signup_started: number
        }[]
      }
      admin_analytics_event_counts: {
        Args: { _role?: string; _since: string; _until: string }
        Returns: {
          cnt: number
          event_type: string
        }[]
      }
      admin_analytics_role_breakdown: {
        Args: { _since: string; _until: string }
        Returns: {
          cnt: number
          event_type: string
          role: string
        }[]
      }
      admin_analytics_top_sources: {
        Args: {
          _limit?: number
          _role?: string
          _since: string
          _until: string
        }
        Returns: {
          path: string
          views: number
        }[]
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
      admin_get_conversation_messages: {
        Args: { p_conversation_id: string }
        Returns: {
          content: string
          created_at: string
          is_system: boolean
          message_id: string
          photo_url: string
          read_at: string
          sender_avatar: string
          sender_id: string
          sender_name: string
        }[]
      }
      admin_get_listing_applications: {
        Args: { p_sit_id: string }
        Returns: {
          application_id: string
          avatar_url: string
          created_at: string
          first_name: string
          last_name: string
          message: string
          sitter_id: string
          status: string
        }[]
      }
      admin_get_listing_conversations: {
        Args: { p_sit_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          last_message_at: string
          message_count: number
          owner_avatar: string
          owner_id: string
          owner_name: string
          sitter_avatar: string
          sitter_id: string
          sitter_name: string
        }[]
      }
      admin_get_listing_traffic_sources: {
        Args: { p_limit?: number; p_sit_id: string }
        Returns: {
          hits: number
          last_hit_at: string
          referrer_host: string
        }[]
      }
      admin_get_listings_application_counts: {
        Args: { p_sit_ids: string[] }
        Returns: {
          app_count: number
          pending_app_count: number
          sit_id: string
        }[]
      }
      admin_get_listings_stats: {
        Args: { p_sit_ids: string[] }
        Returns: {
          application_count: number
          conversation_count: number
          last_view_at: string
          member_view_count: number
          message_count: number
          public_view_count: number
          sit_id: string
          unique_member_view_count: number
          unique_view_count: number
          view_count: number
        }[]
      }
      admin_get_pending_deletions_count: { Args: never; Returns: number }
      admin_get_recent_account_deletions: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          first_name: string
          id: string
          requested_at: string
          scheduled_for: string
          status: string
          user_id: string
        }[]
      }
      admin_get_recent_applications_activity: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          sit_id: string
          sit_title: string
          sitter_first_name: string
        }[]
      }
      admin_get_recent_sit_status_changes: {
        Args: { p_limit?: number }
        Returns: {
          changed_at: string
          id: string
          new_status: string
          old_status: string
          owner_city: string
          owner_first_name: string
          sit_id: string
          sit_title: string
        }[]
      }
      admin_get_signup_confirmation_stats: {
        Args: { p_days?: number }
        Returns: {
          avg_delay_seconds: number
          confirmation_rate: number
          median_delay_seconds: number
          p90_delay_seconds: number
          total_confirmed: number
          total_failed: number
          total_pending: number
          total_sent: number
        }[]
      }
      admin_get_signup_confirmations: {
        Args: { p_days?: number }
        Returns: {
          confirmed_at: string
          delay_seconds: number
          error_message: string
          message_id: string
          recipient_email: string
          sent_at: string
          status: string
          user_created_at: string
          user_id: string
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
      admin_get_sit_stats: {
        Args: { p_sit_id: string }
        Returns: {
          conversation_count: number
          message_count: number
          view_count: number
        }[]
      }
      admin_get_sits_stats: {
        Args: { p_sit_ids: string[] }
        Returns: {
          conversation_count: number
          message_count: number
          sit_id: string
          view_count: number
        }[]
      }
      admin_get_sits_status_counts: {
        Args: { p_since?: string }
        Returns: {
          cnt: number
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
      admin_message_stats: { Args: { _since?: string }; Returns: Json }
      admin_reject_competence_label: {
        Args: { p_label: string }
        Returns: number
      }
      admin_send_message_to_user: {
        Args: { p_content: string; p_target_user_id: string }
        Returns: string
      }
      admin_top_message_users: {
        Args: { _limit?: number; _since?: string }
        Returns: Json
      }
      admin_update_skill_status: {
        Args: { p_new_label?: string; p_new_status: string; p_skill_id: string }
        Returns: number
      }
      apply_referral_reward: {
        Args: { p_referred_id: string }
        Returns: undefined
      }
      archive_sit: { Args: { p_sit_id: string }; Returns: undefined }
      auto_archive_past_sits: {
        Args: never
        Returns: {
          archived_finished: number
          archived_published: number
          ended: number
          started: number
        }[]
      }
      auto_flag_urgent_sits: { Args: never; Returns: number }
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
      change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      check_invitation_quota: { Args: { _owner_id: string }; Returns: boolean }
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
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_available_sitters_for_nudge: {
        Args: { p_department: string; p_end_date: string; p_start_date: string }
        Returns: {
          email: string
          first_name: string
          user_id: string
        }[]
      }
      find_duplicate_gmail_account: {
        Args: { _user_id: string }
        Returns: {
          canonical_email: string
          canonical_user_id: string
        }[]
      }
      generate_sit_slug: {
        Args: { p_city: string; p_id: string; p_title: string }
        Returns: string
      }
      get_email_preferences_by_email: {
        Args: { p_email: string }
        Returns: {
          alert_emails: boolean
          digest_emails: boolean
          product_emails: boolean
          user_id: string
        }[]
      }
      get_garde_environments: {
        Args: { p_garde_id: string }
        Returns: string[]
      }
      get_inventaire_counts: { Args: never; Returns: Json }
      get_mission_author_public: {
        Args: { _mission_id: string }
        Returns: {
          avatar_url: string
          city: string
          first_name: string
          identity_verified: boolean
          member_since: string
          postal_code: string
          user_id: string
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_context_type: Database["public"]["Enums"]["conversation_context"]
          p_other_user_id: string
          p_sit_id?: string
          p_small_mission_id?: string
        }
        Returns: string
      }
      get_own_email: { Args: never; Returns: string }
      get_pro_map_points: {
        Args: never
        Returns: {
          category: string
          city: string
          id: string
          lat: number
          lng: number
          raison_sociale: string
          rating_avg: number
          rating_count: number
          slug: string
          urgences_24_7: boolean
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          animaux_accompagnes: number
          maisons_gardees: number
          missions_entraide: number
          total_inscrits: number
        }[]
      }
      get_signup_funnel_metrics: {
        Args: { p_period_days?: number }
        Returns: Json
      }
      get_sit_application_counts: {
        Args: { p_sit_id: string }
        Returns: {
          app_count: number
          pending_app_count: number
        }[]
      }
      get_sit_views_count: {
        Args: { p_sit_ids: string[] }
        Returns: {
          sit_id: string
          views_30d: number
          views_total: number
        }[]
      }
      get_unread_messages_count: { Args: { _user_id: string }; Returns: number }
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
      increment_photo_analysis_quota: {
        Args: { _user_id: string }
        Returns: number
      }
      increment_pro_view: { Args: { _slug: string }; Returns: undefined }
      increment_redirect_hit: {
        Args: { p_slug_from: string }
        Returns: undefined
      }
      increment_small_mission_view: {
        Args: { _mission_id: string }
        Returns: undefined
      }
      invite_helper_to_mission: {
        Args: { p_helper_id: string; p_mission_id: string }
        Returns: string
      }
      is_account_empty: { Args: { _user_id: string }; Returns: boolean }
      is_profile_ready_for_action: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      list_sits_needing_availability_nudge: {
        Args: never
        Returns: {
          city: string
          department: string
          end_date: string
          owner_id: string
          sit_id: string
          start_date: string
          title: string
        }[]
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
      normalize_analytics_source: { Args: { raw: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_completed_sits_count: {
        Args: { _user_id: string }
        Returns: undefined
      }
      recalculate_cancellations: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      recalculate_completed_sits: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_all_sitter_reply_stats: { Args: never; Returns: number }
      refresh_pro_rating: { Args: { _pro_id: string }; Returns: undefined }
      refresh_sitter_reply_stats: {
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
      set_email_preferences_by_token: {
        Args: {
          p_alert: boolean
          p_digest: boolean
          p_product: boolean
          p_token: string
        }
        Returns: boolean
      }
      slugify_city: { Args: { input: string }; Returns: string }
      trigger_indexnow_push: {
        Args: { _path: string; _source: string }
        Returns: undefined
      }
      unpublish_sit:
        | { Args: { p_sit_id: string }; Returns: number }
        | { Args: { p_reason?: string; p_sit_id: string }; Returns: number }
      upsert_my_email_preferences: {
        Args: { p_alert: boolean; p_digest: boolean; p_product: boolean }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "calm" | "moderate" | "sportive"
      alone_duration: "never" | "2h" | "6h" | "all_day"
      analysis_request_status: "new" | "in_progress" | "done" | "archived"
      analysis_request_type: "city" | "breed" | "places" | "pros" | "other"
      app_role: "admin" | "moderator" | "user"
      application_status:
        | "pending"
        | "viewed"
        | "discussing"
        | "accepted"
        | "rejected"
        | "cancelled"
      community_question_category:
        | "animaux"
        | "jardin"
        | "maison"
        | "garde"
        | "autre"
      community_question_status: "open" | "resolved" | "closed"
      conversation_context:
        | "sit_application"
        | "sitter_inquiry"
        | "mission_help"
        | "owner_pitch"
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
      mission_type_enum: "besoin" | "offre"
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
      pro_category:
        | "veterinaire"
        | "pet_sitter_pro"
        | "educateur"
        | "toiletteur"
        | "osteopathe"
        | "dresseur_sportif"
        | "transporteur"
        | "photographe"
      pro_doc_type_enum:
        | "diploma_acaced"
        | "diploma_other"
        | "siret_kbis"
        | "insurance_rc_pro"
        | "certification"
        | "other"
      pro_moderation_status: "pending" | "approved" | "rejected"
      pro_profile_status_enum: "none" | "pending" | "verified" | "rejected"
      pro_verification_status_enum:
        | "pending"
        | "auto_approved"
        | "auto_rejected"
        | "needs_review"
        | "approved"
        | "rejected"
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
        | "archived"
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
        | "annuel"
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
      analysis_request_status: ["new", "in_progress", "done", "archived"],
      analysis_request_type: ["city", "breed", "places", "pros", "other"],
      app_role: ["admin", "moderator", "user"],
      application_status: [
        "pending",
        "viewed",
        "discussing",
        "accepted",
        "rejected",
        "cancelled",
      ],
      community_question_category: [
        "animaux",
        "jardin",
        "maison",
        "garde",
        "autre",
      ],
      community_question_status: ["open", "resolved", "closed"],
      conversation_context: [
        "sit_application",
        "sitter_inquiry",
        "mission_help",
        "owner_pitch",
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
      mission_type_enum: ["besoin", "offre"],
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
      pro_category: [
        "veterinaire",
        "pet_sitter_pro",
        "educateur",
        "toiletteur",
        "osteopathe",
        "dresseur_sportif",
        "transporteur",
        "photographe",
      ],
      pro_doc_type_enum: [
        "diploma_acaced",
        "diploma_other",
        "siret_kbis",
        "insurance_rc_pro",
        "certification",
        "other",
      ],
      pro_moderation_status: ["pending", "approved", "rejected"],
      pro_profile_status_enum: ["none", "pending", "verified", "rejected"],
      pro_verification_status_enum: [
        "pending",
        "auto_approved",
        "auto_rejected",
        "needs_review",
        "approved",
        "rejected",
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
        "archived",
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
        "annuel",
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
