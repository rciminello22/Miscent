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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      declared_statements: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          payment_method_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          payment_method_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          payment_method_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "declared_statements_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declared_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_shared_records: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["category"] | null
          created_by_slot: number | null
          deleted_at: string
          deleted_by_slot: number
          description: string | null
          from_slot: number | null
          kind: string
          occurred_on: string | null
          record_created_at: string | null
          source_id: string
          space_id: string
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["category"] | null
          created_by_slot?: number | null
          deleted_at?: string
          deleted_by_slot: number
          description?: string | null
          from_slot?: number | null
          kind: string
          occurred_on?: string | null
          record_created_at?: string | null
          source_id: string
          space_id: string
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["category"] | null
          created_by_slot?: number | null
          deleted_at?: string
          deleted_by_slot?: number
          description?: string | null
          from_slot?: number | null
          kind?: string
          occurred_on?: string | null
          record_created_at?: string | null
          source_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_shared_records_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      former_memberships: {
        Row: {
          left_at: string
          slot: number
          snapshot: Json
          space_id: string
          user_id: string
        }
        Insert: {
          left_at?: string
          slot: number
          snapshot: Json
          space_id: string
          user_id: string
        }
        Update: {
          left_at?: string
          slot?: number
          snapshot?: Json
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "former_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          space_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          target_slot: number
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          space_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          target_slot: number
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          space_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          target_slot?: number
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      member_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          from_slot: number
          id: string
          recorded_by_slot: number
          space_id: string
          to_slot: number
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          from_slot: number
          id?: string
          recorded_by_slot: number
          space_id: string
          to_slot: number
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          from_slot?: number
          id?: string
          recorded_by_slot?: number
          space_id?: string
          to_slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_payments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_days: {
        // MANUAL (migración 0020, todavía sin aplicar): la tabla entera. Regenerar
        // con `npm run db:types` después del push.
        Row: {
          closing_day: number | null
          closing_day_approx: boolean
          created_at: string
          due_day: number | null
          due_day_approx: boolean
          id: string
          payment_method_id: string
          valid_until: string
        }
        Insert: {
          closing_day?: number | null
          closing_day_approx?: boolean
          created_at?: string
          due_day?: number | null
          due_day_approx?: boolean
          id?: string
          payment_method_id: string
          valid_until: string
        }
        Update: {
          closing_day?: number | null
          closing_day_approx?: boolean
          created_at?: string
          due_day?: number | null
          due_day_approx?: boolean
          id?: string
          payment_method_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_days_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        // MANUAL (migración 0019, todavía sin aplicar): `closing_day_approx`,
        // `due_day_approx` y `deleted_at`. Regenerar con `npm run db:types`
        // después del push.
        Row: {
          archived: boolean
          closing_day: number | null
          closing_day_approx: boolean
          created_at: string
          deleted_at: string | null
          due_day: number | null
          due_day_approx: boolean
          id: string
          kind: Database["public"]["Enums"]["payment_method_kind"]
          name: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          closing_day?: number | null
          closing_day_approx?: boolean
          created_at?: string
          deleted_at?: string | null
          due_day?: number | null
          due_day_approx?: boolean
          id?: string
          kind: Database["public"]["Enums"]["payment_method_kind"]
          name: string
          user_id: string
        }
        Update: {
          archived?: boolean
          closing_day?: number | null
          closing_day_approx?: boolean
          created_at?: string
          deleted_at?: string | null
          due_day?: number | null
          due_day_approx?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["payment_method_kind"]
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_movements: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at: string
          date: string
          description: string | null
          first_installment_month: string | null
          id: string
          installment_impact_day: number | null
          installments_approximate: boolean
          installments_count: number | null
          kind: Database["public"]["Enums"]["movement_kind"]
          payment_method_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          date: string
          description?: string | null
          first_installment_month?: string | null
          id?: string
          installment_impact_day?: number | null
          installments_approximate?: boolean
          installments_count?: number | null
          kind: Database["public"]["Enums"]["movement_kind"]
          payment_method_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          date?: string
          description?: string | null
          first_installment_month?: string | null
          id?: string
          installment_impact_day?: number | null
          installments_approximate?: boolean
          installments_count?: number | null
          kind?: Database["public"]["Enums"]["movement_kind"]
          payment_method_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_movements_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          has_personal_account: boolean
          id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          display_name: string
          has_personal_account?: boolean
          id: string
          timezone?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          has_personal_account?: boolean
          id?: string
          timezone?: string
        }
        Relationships: []
      }
      record_reviews: {
        Row: {
          reviewed_at: string
          slot: number
          source_id: string
          space_id: string
        }
        Insert: {
          reviewed_at?: string
          slot: number
          source_id: string
          space_id: string
        }
        Update: {
          reviewed_at?: string
          slot?: number
          source_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_reviews_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_overrides: {
        Row: {
          amount: number
          month: string
          recurrence_id: string
        }
        Insert: {
          amount: number
          month: string
          recurrence_id: string
        }
        Update: {
          amount?: number
          month?: string
          recurrence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_overrides_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrences: {
        // MANUAL (migración 0019, todavía sin aplicar): `day_approx` y
        // `day_of_month` ahora admite null (solo un ingreso personal "No sé").
        // Regenerar con `npm run db:types` después del push.
        Row: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at: string
          created_by_slot: number | null
          day_approx: boolean
          day_of_month: number | null
          departure_resolution: string | null
          description: string | null
          end_month: string | null
          id: string
          kind: Database["public"]["Enums"]["movement_kind"]
          owner_user_id: string | null
          past_terms: Json
          payer_slot: number | null
          payment_method_id: string | null
          share_slot_1: number | null
          share_slot_2: number | null
          space_id: string | null
          split_mode: Database["public"]["Enums"]["split_mode"] | null
          start_month: string
          stopped_by_departure_on: string | null
          updated_at: string
          updated_by_slot: number | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          created_by_slot?: number | null
          day_approx?: boolean
          day_of_month?: number | null
          departure_resolution?: string | null
          description?: string | null
          end_month?: string | null
          id?: string
          kind: Database["public"]["Enums"]["movement_kind"]
          owner_user_id?: string | null
          past_terms?: Json
          payer_slot?: number | null
          payment_method_id?: string | null
          share_slot_1?: number | null
          share_slot_2?: number | null
          space_id?: string | null
          split_mode?: Database["public"]["Enums"]["split_mode"] | null
          start_month: string
          stopped_by_departure_on?: string | null
          updated_at?: string
          updated_by_slot?: number | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          created_by_slot?: number | null
          day_approx?: boolean
          day_of_month?: number | null
          departure_resolution?: string | null
          description?: string | null
          end_month?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["movement_kind"]
          owner_user_id?: string | null
          past_terms?: Json
          payer_slot?: number | null
          payment_method_id?: string | null
          share_slot_1?: number | null
          share_slot_2?: number | null
          space_id?: string | null
          split_mode?: Database["public"]["Enums"]["split_mode"] | null
          start_month?: string
          stopped_by_departure_on?: string | null
          updated_at?: string
          updated_by_slot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at: string
          created_by_slot: number
          date: string
          description: string | null
          first_installment_month: string | null
          id: string
          installment_impact_day: number | null
          installments_approximate: boolean
          installments_count: number | null
          payer_slot: number
          share_slot_1: number
          share_slot_2: number
          space_id: string
          split_mode: Database["public"]["Enums"]["split_mode"]
          updated_at: string
          updated_by_slot: number
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          created_by_slot: number
          date: string
          description?: string | null
          first_installment_month?: string | null
          id?: string
          installment_impact_day?: number | null
          installments_approximate?: boolean
          installments_count?: number | null
          payer_slot: number
          share_slot_1: number
          share_slot_2: number
          space_id: string
          split_mode?: Database["public"]["Enums"]["split_mode"]
          updated_at?: string
          updated_by_slot: number
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          created_by_slot?: number
          date?: string
          description?: string | null
          first_installment_month?: string | null
          id?: string
          installment_impact_day?: number | null
          installments_approximate?: boolean
          installments_count?: number | null
          payer_slot?: number
          share_slot_1?: number
          share_slot_2?: number
          space_id?: string
          split_mode?: Database["public"]["Enums"]["split_mode"]
          updated_at?: string
          updated_by_slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_expenses_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_payment_details: {
        Row: {
          payment_method_id: string
          slot: number
          source_id: string
          space_id: string
        }
        Insert: {
          payment_method_id: string
          slot: number
          source_id: string
          space_id: string
        }
        Update: {
          payment_method_id?: string
          slot?: number
          source_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_payment_details_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_payment_details_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          display_name: string
          is_creator: boolean
          joined_at: string | null
          left_at: string | null
          slot: number
          space_id: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string | null
        }
        Insert: {
          display_name: string
          is_creator?: boolean
          joined_at?: string | null
          left_at?: string | null
          slot: number
          space_id: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Update: {
          display_name?: string
          is_creator?: boolean
          joined_at?: string | null
          left_at?: string | null
          slot?: number
          space_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          id: string
          initial_balance: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_balance?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_balance?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_accept_invitation: {
        Args: { confirmed_name?: string; raw_token: string }
        Returns: string
      }
      app_activate_personal_account: { Args: never; Returns: undefined }
      app_create_invitation: {
        Args: { target_space_id: string }
        Returns: string
      }
      app_create_space: {
        Args: {
          initial_balance?: number
          initial_balance_favors?: string
          other_member_name: string
          space_name: string
        }
        Returns: string
      }
      app_delete_account: { Args: never; Returns: undefined }
      app_departure_end_month: {
        Args: { as_of: string; day_of_month: number }
        Returns: unknown
      }
      app_has_personal_account: { Args: never; Returns: boolean }
      app_is_anonymous: { Args: never; Returns: boolean }
      app_leave_space: { Args: { target_space_id: string }; Returns: undefined }
      app_mark_reviewed: {
        Args: { source_ids: string[]; target_space_id: string }
        Returns: undefined
      }
      app_member_departs: {
        Args: { departing_slot: number; target_space_id: string }
        Returns: undefined
      }
      app_my_slot: { Args: { target_space_id: string }; Returns: number }
      app_my_space_ids: { Args: never; Returns: string[] }
      app_record_shared_deletion: {
        Args: {
          p_amount: number
          p_category: Database["public"]["Enums"]["category"]
          p_created_by_slot: number
          p_description: string
          p_from_slot: number
          p_kind: string
          p_occurred_on: string
          p_record_created_at: string
          p_source_id: string
          p_space_id: string
        }
        Returns: undefined
      }
      app_remove_member_access: {
        Args: { target_space_id: string }
        Returns: undefined
      }
      app_resolve_stopped_recurrence: {
        Args: { keep: boolean; target_recurrence_id: string }
        Returns: string
      }
      app_space_snapshot: {
        Args: { my_slot_value: number; target_space_id: string }
        Returns: Json
      }
    }
    Enums: {
      category:
        | "supermercado"
        | "alquiler"
        | "expensas"
        | "servicios"
        | "internet"
        | "celular"
        | "transporte"
        | "salud"
        | "farmacia"
        | "educacion"
        | "hogar"
        | "gastronomia"
        | "ocio"
        | "suscripciones"
        | "gimnasio"
        | "ropa"
        | "mascotas"
        | "impuestos"
        | "regalos"
        | "otros"
        | "sueldo"
        | "extra"
      invitation_status: "active" | "used" | "expired" | "revoked"
      member_status: "no_access" | "active" | "former"
      movement_kind: "expense" | "income"
      payment_method_kind:
        | "cash"
        | "debit"
        | "wallet"
        | "transfer"
        | "other"
        | "card"
      split_mode: "even" | "custom"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category: [
        "supermercado",
        "alquiler",
        "expensas",
        "servicios",
        "internet",
        "celular",
        "transporte",
        "salud",
        "farmacia",
        "educacion",
        "hogar",
        "gastronomia",
        "ocio",
        "suscripciones",
        "gimnasio",
        "ropa",
        "mascotas",
        "impuestos",
        "regalos",
        "otros",
        "sueldo",
        "extra",
      ],
      invitation_status: ["active", "used", "expired", "revoked"],
      member_status: ["no_access", "active", "former"],
      movement_kind: ["expense", "income"],
      payment_method_kind: [
        "cash",
        "debit",
        "wallet",
        "transfer",
        "other",
        "card",
      ],
      split_mode: ["even", "custom"],
    },
  },
} as const
