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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          agency: string | null
          bank_code: string
          bank_name: string
          color: string | null
          created_at: string
          id: string
          initial_balance: number
          nickname: string | null
          number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency?: string | null
          bank_code: string
          bank_name: string
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          nickname?: string | null
          number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency?: string | null
          bank_code?: string
          bank_name?: string
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          nickname?: string | null
          number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_imports: {
        Row: {
          account_id: string | null
          authorized_at: string
          bank_code: string | null
          bank_name: string | null
          created_at: string
          duplicate_rows: number
          filename: string
          format: string
          id: string
          imported_rows: number
          total_rows: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          authorized_at?: string
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          duplicate_rows?: number
          filename: string
          format: string
          id?: string
          imported_rows?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          authorized_at?: string
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          duplicate_rows?: number
          filename?: string
          format?: string
          id?: string
          imported_rows?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_global: boolean
          kind: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_global?: boolean
          kind: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_global?: boolean
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          color: string
          completed: boolean
          created_at: string
          current_amount: number
          icon: string
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          completed?: boolean
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          completed?: boolean
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imported_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_suggestion: string | null
          created_at: string
          date: string
          dedup_hash: string
          description: string
          external_id: string | null
          id: string
          import_id: string
          is_pix: boolean
          matched_transaction_id: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_suggestion?: string | null
          created_at?: string
          date: string
          dedup_hash: string
          description: string
          external_id?: string | null
          id?: string
          import_id: string
          is_pix?: boolean
          matched_transaction_id?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_suggestion?: string | null
          created_at?: string
          date?: string
          dedup_hash?: string
          description?: string
          external_id?: string | null
          id?: string
          import_id?: string
          is_pix?: boolean
          matched_transaction_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          active: boolean
          amount: number
          category: string | null
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          description: string
          end_date: string | null
          essential: boolean
          fixed: boolean
          frequency: string
          id: string
          next_run: string
          paused_until: string | null
          skip_dates: string[]
          start_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description: string
          end_date?: string | null
          essential?: boolean
          fixed?: boolean
          frequency: string
          id?: string
          next_run: string
          paused_until?: string | null
          skip_dates?: string[]
          start_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string
          end_date?: string | null
          essential?: boolean
          fixed?: boolean
          frequency?: string
          id?: string
          next_run?: string
          paused_until?: string | null
          skip_dates?: string[]
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          auto_generated: boolean
          category: string | null
          created_at: string
          date: string
          description: string
          essential: boolean
          fixed: boolean
          id: string
          payment_method: string | null
          recurring: boolean
          recurring_id: string | null
          tags: string[]
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_generated?: boolean
          category?: string | null
          created_at?: string
          date: string
          description: string
          essential?: boolean
          fixed?: boolean
          id?: string
          payment_method?: string | null
          recurring?: boolean
          recurring_id?: string | null
          tags?: string[]
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_generated?: boolean
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          essential?: boolean
          fixed?: boolean
          id?: string
          payment_method?: string | null
          recurring?: boolean
          recurring_id?: string | null
          tags?: string[]
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_due_recurring_transactions: {
        Args: { _user_id: string }
        Returns: number
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
    Enums: {},
  },
} as const
