export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Hand-authored to mirror `supabase gen types typescript` output. Kept in sync
// with supabase/migrations/*. If the CLI becomes available (linked project or
// local db), regenerate with:
//   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          preferred_role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          preferred_role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          preferred_role?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      circles: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          invite_code: string
          teacher_invite_code: string
          status: string
          current_week: number
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          invite_code: string
          teacher_invite_code?: string
          status?: string
          current_week?: number
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          invite_code?: string
          teacher_invite_code?: string
          status?: string
          current_week?: number
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_memberships: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: string
          status: string
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role: string
          status?: string
          joined_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          role?: string
          status?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_memberships_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          id: string
          circle_id: string
          student_id: string
          report_date: string
          week_reference: string | null
          did_hifz: boolean
          hifz_surah: number | null
          hifz_from_ayah: number | null
          hifz_to_ayah: number | null
          hifz_page: number | null
          hifz_mistakes: number
          hifz_notes: string | null
          did_revision: boolean
          revision_ranges: Json
          revision_mistakes: number
          revision_notes: string | null
          listener_type: string | null
          listener_user_id: string | null
          listener_name: string | null
          total_mistakes: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          student_id: string
          report_date?: string
          week_reference?: string | null
          did_hifz?: boolean
          hifz_surah?: number | null
          hifz_from_ayah?: number | null
          hifz_to_ayah?: number | null
          hifz_page?: number | null
          hifz_mistakes?: number
          hifz_notes?: string | null
          did_revision?: boolean
          revision_ranges?: Json
          revision_mistakes?: number
          revision_notes?: string | null
          listener_type?: string | null
          listener_user_id?: string | null
          listener_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          student_id?: string
          report_date?: string
          week_reference?: string | null
          did_hifz?: boolean
          hifz_surah?: number | null
          hifz_from_ayah?: number | null
          hifz_to_ayah?: number | null
          hifz_page?: number | null
          hifz_mistakes?: number
          hifz_notes?: string | null
          did_revision?: boolean
          revision_ranges?: Json
          revision_mistakes?: number
          revision_notes?: string | null
          listener_type?: string | null
          listener_user_id?: string | null
          listener_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memorization_settings: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          start_surah: number
          start_page: number | null
          start_ayah: number
          hifz_amount: string
          hifz_custom_note: string | null
          revision_amount: string
          revision_start: number | null
          revision_end: number | null
          revision_cursor: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          start_surah?: number
          start_page?: number | null
          start_ayah?: number
          hifz_amount?: string
          hifz_custom_note?: string | null
          revision_amount?: string
          revision_start?: number | null
          revision_end?: number | null
          revision_cursor?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          circle_id?: string
          start_surah?: number
          start_page?: number | null
          start_ayah?: number
          hifz_amount?: string
          hifz_custom_note?: string | null
          revision_amount?: string
          revision_start?: number | null
          revision_end?: number | null
          revision_cursor?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorization_settings_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorization_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_assignments: {
        Row: {
          id: string
          circle_id: string
          student_id: string
          assignment_date: string
          hifz_surah: number | null
          hifz_from_ayah: number | null
          hifz_to_ayah: number | null
          revision_ranges: Json
          source_frontier: number | null
          source_cursor: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          student_id: string
          assignment_date: string
          hifz_surah?: number | null
          hifz_from_ayah?: number | null
          hifz_to_ayah?: number | null
          revision_ranges?: Json
          source_frontier?: number | null
          source_cursor?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          student_id?: string
          assignment_date?: string
          hifz_surah?: number | null
          hifz_from_ayah?: number | null
          hifz_to_ayah?: number | null
          revision_ranges?: Json
          source_frontier?: number | null
          source_cursor?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_assignments_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
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
      is_circle_owner: {
        Args: { target_circle_id: string }
        Returns: boolean
      }
      is_circle_member: {
        Args: { target_circle_id: string }
        Returns: boolean
      }
      is_circle_teacher: {
        Args: { target_circle_id: string }
        Returns: boolean
      }
      my_teacher_circle_ids: {
        Args: Record<PropertyKey, never>
        Returns: { circle_id: string }[]
      }
      submit_daily_report: {
        Args: {
          p_circle_id: string
          p_assignment_id: string | null
          p_report: Json
          p_new_cursor: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
