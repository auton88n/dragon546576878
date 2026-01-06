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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attractions: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          adult_count: number
          adult_price: number
          booking_reference: string
          booking_status: string
          cancelled_at: string | null
          child_count: number
          child_price: number
          confirmation_email_sent: boolean | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          language: string
          last_email_sent_at: string | null
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          qr_codes_generated: boolean | null
          reminder_email_sent: boolean | null
          senior_count: number | null
          senior_price: number | null
          special_requests: string | null
          total_amount: number
          updated_at: string | null
          visit_date: string
          visit_time: string
        }
        Insert: {
          adult_count?: number
          adult_price: number
          booking_reference: string
          booking_status?: string
          cancelled_at?: string | null
          child_count?: number
          child_price: number
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          language?: string
          last_email_sent_at?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          qr_codes_generated?: boolean | null
          reminder_email_sent?: boolean | null
          senior_count?: number | null
          senior_price?: number | null
          special_requests?: string | null
          total_amount: number
          updated_at?: string | null
          visit_date: string
          visit_time: string
        }
        Update: {
          adult_count?: number
          adult_price?: number
          booking_reference?: string
          booking_status?: string
          cancelled_at?: string | null
          child_count?: number
          child_price?: number
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          language?: string
          last_email_sent_at?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          qr_codes_generated?: boolean | null
          reminder_email_sent?: boolean | null
          senior_count?: number | null
          senior_price?: number | null
          special_requests?: string | null
          total_amount?: number
          updated_at?: string | null
          visit_date?: string
          visit_time?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attachments: Json | null
          attempts: number | null
          body_html: string
          body_text: string | null
          booking_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          last_attempt: string | null
          sent_at: string | null
          status: string | null
          subject: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          attachments?: Json | null
          attempts?: number | null
          body_html: string
          body_text?: string | null
          booking_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          attachments?: Json | null
          attempts?: number | null
          body_html?: string
          body_text?: string | null
          booking_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_scans: {
        Row: {
          employee_id: string
          id: string
          scan_location: string | null
          scanned_at: string | null
          scanner_user_id: string | null
        }
        Insert: {
          employee_id: string
          id?: string
          scan_location?: string | null
          scanned_at?: string | null
          scanner_user_id?: string | null
        }
        Update: {
          employee_id?: string
          id?: string
          scan_location?: string | null
          scanned_at?: string | null
          scanner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_scans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          department: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          qr_code_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          qr_code_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          qr_code_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_booking_requests: {
        Row: {
          admin_notes: string | null
          contact_person: string
          created_at: string | null
          email: string
          group_size: number
          group_type: string
          id: string
          organization_name: string
          phone: string
          preferred_dates: Json
          quoted_amount: number | null
          special_requirements: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          contact_person: string
          created_at?: string | null
          email: string
          group_size: number
          group_type: string
          id?: string
          organization_name: string
          phone: string
          preferred_dates?: Json
          quoted_amount?: number | null
          special_requirements?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          contact_person?: string
          created_at?: string | null
          email?: string
          group_size?: number
          group_type?: string
          id?: string
          organization_name?: string
          phone?: string
          preferred_dates?: Json
          quoted_amount?: number | null
          special_requirements?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          adult_count: number
          child_count: number
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name_ar: string
          name_en: string
          price: number
          updated_at: string | null
        }
        Insert: {
          adult_count?: number
          child_count?: number
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar: string
          name_en: string
          price: number
          updated_at?: string | null
        }
        Update: {
          adult_count?: number
          child_count?: number
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          hired_date: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          hired_date?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          hired_date?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          device_info: string | null
          id: string
          ip_address: unknown
          notes: string | null
          scan_location: string | null
          scan_result: string
          scan_timestamp: string | null
          scanner_user_id: string | null
          ticket_id: string | null
        }
        Insert: {
          device_info?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          scan_location?: string | null
          scan_result: string
          scan_timestamp?: string | null
          scanner_user_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          device_info?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          scan_location?: string | null
          scan_result?: string
          scan_timestamp?: string | null
          scanner_user_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          messages: Json | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          transferred_at: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transferred_at?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transferred_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_email: string
          admin_id: string
          admin_name: string
          ayn_notes: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_email: string
          admin_id: string
          admin_name: string
          ayn_notes?: string | null
          category?: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_email?: string
          admin_id?: string
          admin_name?: string
          ayn_notes?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          is_used: boolean | null
          qr_code_data: string
          qr_code_url: string | null
          scan_location: string | null
          scanned_at: string | null
          scanned_by: string | null
          ticket_code: string
          ticket_type: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          qr_code_data: string
          qr_code_url?: string | null
          scan_location?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          ticket_code: string
          ticket_type: string
          valid_from: string
          valid_until: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          qr_code_data?: string
          qr_code_url?: string | null
          scan_location?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          ticket_code?: string
          ticket_type?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_booking_with_tickets: {
        Args: { booking_uuid: string }
        Returns: Json
      }
      get_bookings_by_email: {
        Args: { customer_email_input: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      validate_employee_badge: { Args: { employee_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "scanner" | "manager" | "support"
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
      app_role: ["admin", "scanner", "manager", "support"],
    },
  },
} as const
