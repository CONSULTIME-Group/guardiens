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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          sit_id: string
          sitter_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          sit_id: string
          sitter_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          sit_id?: string
          sitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          heating_instructions: string | null
          id: string
          neighbor_name: string | null
          neighbor_phone: string | null
          plumber_phone: string | null
          property_id: string
          trash_days: string | null
          updated_at: string
          user_id: string
          vet_address: string | null
          vet_name: string | null
          vet_phone: string | null
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
          heating_instructions?: string | null
          id?: string
          neighbor_name?: string | null
          neighbor_phone?: string | null
          plumber_phone?: string | null
          property_id: string
          trash_days?: string | null
          updated_at?: string
          user_id: string
          vet_address?: string | null
          vet_name?: string | null
          vet_phone?: string | null
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
          heating_instructions?: string | null
          id?: string
          neighbor_name?: string | null
          neighbor_phone?: string | null
          plumber_phone?: string | null
          property_id?: string
          trash_days?: string | null
          updated_at?: string
          user_id?: string
          vet_address?: string | null
          vet_name?: string | null
          vet_phone?: string | null
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
      owner_profiles: {
        Row: {
          communication_notes: string | null
          created_at: string
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
          communication_notes?: string | null
          created_at?: string
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
          communication_notes?: string | null
          created_at?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_animals: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
          sitter_profile_id: string
          species: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sitter_profile_id: string
          species?: string
        }
        Update: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cancellation_count: number
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          postal_code: string | null
          profile_completion: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cancellation_count?: number
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          postal_code?: string | null
          profile_completion?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cancellation_count?: number
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          postal_code?: string | null
          profile_completion?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          animal_care_rating: number | null
          comment: string | null
          communication_rating: number | null
          created_at: string
          housing_condition_rating: number | null
          housing_respect_rating: number | null
          id: string
          instructions_clarity_rating: number | null
          listing_accuracy_rating: number | null
          overall_rating: number
          published: boolean | null
          reliability_rating: number | null
          review_type: string | null
          reviewee_id: string
          reviewer_id: string
          sit_id: string
          welcome_rating: number | null
          would_recommend: boolean | null
        }
        Insert: {
          animal_care_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          overall_rating: number
          published?: boolean | null
          reliability_rating?: number | null
          review_type?: string | null
          reviewee_id: string
          reviewer_id: string
          sit_id: string
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          animal_care_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          housing_condition_rating?: number | null
          housing_respect_rating?: number | null
          id?: string
          instructions_clarity_rating?: number | null
          listing_accuracy_rating?: number | null
          overall_rating?: number
          published?: boolean | null
          reliability_rating?: number | null
          review_type?: string | null
          reviewee_id?: string
          reviewer_id?: string
          sit_id?: string
          welcome_rating?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      sits: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          end_date: string | null
          flexible_dates: boolean | null
          id: string
          open_to: string[] | null
          property_id: string
          specific_expectations: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["sit_status"]
          title: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_date?: string | null
          flexible_dates?: boolean | null
          id?: string
          open_to?: string[] | null
          property_id: string
          specific_expectations?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sit_status"]
          title?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_date?: string | null
          flexible_dates?: boolean | null
          id?: string
          open_to?: string[] | null
          property_id?: string
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
            referencedRelation: "profiles"
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
          motivation: string | null
          prefer_visitors: boolean | null
          preferences_notes: string | null
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
          motivation?: string | null
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
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
          motivation?: string | null
          prefer_visitors?: boolean | null
          preferences_notes?: string | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_level: "calm" | "moderate" | "sportive"
      alone_duration: "never" | "2h" | "6h" | "all_day"
      application_status:
        | "pending"
        | "viewed"
        | "discussing"
        | "accepted"
        | "rejected"
        | "cancelled"
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
        | "completed"
        | "cancelled"
      user_role: "owner" | "sitter" | "both"
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
      application_status: [
        "pending",
        "viewed",
        "discussing",
        "accepted",
        "rejected",
        "cancelled",
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
      sit_status: ["draft", "published", "confirmed", "completed", "cancelled"],
      user_role: ["owner", "sitter", "both"],
      walk_duration: ["none", "30min", "1h", "2h_plus"],
    },
  },
} as const
