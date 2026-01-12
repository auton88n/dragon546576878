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
          arrival_status: string | null
          arrived_at: string | null
          arrived_scanned_by: string | null
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
          arrival_status?: string | null
          arrived_at?: string | null
          arrived_scanned_by?: string | null
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
          arrival_status?: string | null
          arrived_at?: string | null
          arrived_scanned_by?: string | null
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
          reply_message: string | null
          reply_sent: boolean | null
          reply_sent_at: string | null
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
          reply_message?: string | null
          reply_sent?: boolean | null
          reply_sent_at?: string | null
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
          reply_message?: string | null
          reply_sent?: boolean | null
          reply_sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_invoices: {
        Row: {
          booking_id: string | null
          client_email: string
          client_name: string
          client_phone: string
          client_type: string
          company_name: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          invoice_number: string
          language: string | null
          notes: string | null
          num_adults: number
          num_children: number
          paid_at: string | null
          payment_id: string | null
          services: Json | null
          status: string
          total_amount: number
          updated_at: string | null
          visit_date: string
          visit_time: string
        }
        Insert: {
          booking_id?: string | null
          client_email: string
          client_name: string
          client_phone: string
          client_type?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          invoice_number: string
          language?: string | null
          notes?: string | null
          num_adults?: number
          num_children?: number
          paid_at?: string | null
          payment_id?: string | null
          services?: Json | null
          status?: string
          total_amount: number
          updated_at?: string | null
          visit_date: string
          visit_time: string
        }
        Update: {
          booking_id?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string
          client_type?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          invoice_number?: string
          language?: string | null
          notes?: string | null
          num_adults?: number
          num_children?: number
          paid_at?: string | null
          payment_id?: string | null
          services?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          visit_date?: string
          visit_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      marketing_qr_scans: {
        Row: {
          campaign_id: string
          campaign_name: string
          destination: string
          id: string
          ip_country: string | null
          referrer: string | null
          scanned_at: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          campaign_name: string
          destination: string
          id?: string
          ip_country?: string | null
          referrer?: string | null
          scanned_at?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          campaign_name?: string
          destination?: string
          id?: string
          ip_country?: string | null
          referrer?: string | null
          scanned_at?: string | null
          user_agent?: string | null
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
      payment_logs: {
        Row: {
          amount: number | null
          booking_id: string | null
          changed_by: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          payment_id: string | null
          payment_method: string | null
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      rate_limits: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          identifier: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          identifier: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          identifier?: string
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
      vip_contacts: {
        Row: {
          category: string
          confirmed_guests: number | null
          created_at: string | null
          email: string
          id: string
          last_contacted_at: string | null
          name_ar: string
          name_en: string
          notes: string | null
          phone: string | null
          preferred_language: string
          status: string
          title_ar: string | null
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          confirmed_guests?: number | null
          created_at?: string | null
          email: string
          id?: string
          last_contacted_at?: string | null
          name_ar: string
          name_en: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          confirmed_guests?: number | null
          created_at?: string | null
          email?: string
          id?: string
          last_contacted_at?: string | null
          name_ar?: string
          name_en?: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vip_email_logs: {
        Row: {
          contact_email: string
          contact_id: string | null
          contact_name: string
          created_at: string | null
          error_message: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          template_type: string
          tracking_id: string | null
        }
        Insert: {
          contact_email: string
          contact_id?: string | null
          contact_name: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_type: string
          tracking_id?: string | null
        }
        Update: {
          contact_email?: string
          contact_id?: string | null
          contact_name?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_type?: string
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vip_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_invitations: {
        Row: {
          booking_id: string | null
          confirmed_at: string | null
          confirmed_guests: number | null
          contact_id: string | null
          created_at: string | null
          decline_reason: string | null
          declined_at: string | null
          event_date: string | null
          event_time: string | null
          expires_at: string | null
          guest_allowance: number | null
          id: string
          include_video: boolean | null
          offer_details_ar: string | null
          offer_details_en: string | null
          perks: Json | null
          rsvp_token: string
        }
        Insert: {
          booking_id?: string | null
          confirmed_at?: string | null
          confirmed_guests?: number | null
          contact_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          guest_allowance?: number | null
          id?: string
          include_video?: boolean | null
          offer_details_ar?: string | null
          offer_details_en?: string | null
          perks?: Json | null
          rsvp_token?: string
        }
        Update: {
          booking_id?: string | null
          confirmed_at?: string | null
          confirmed_guests?: number | null
          contact_id?: string | null
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          guest_allowance?: number | null
          id?: string
          include_video?: boolean | null
          offer_details_ar?: string | null
          offer_details_en?: string | null
          perks?: Json | null
          rsvp_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_invitations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_invitations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vip_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_abandoned_bookings: { Args: { days_old?: number }; Returns: Json }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_booking_with_tickets: {
        Args: { booking_uuid: string }
        Returns: Json
      }
      get_bookings_by_email: {
        Args: { customer_email_input: string }
        Returns: Json
      }
      get_invoice_by_id: { Args: { invoice_uuid: string }; Returns: Json }
      get_true_pending_payments: {
        Args: never
        Returns: {
          booking_count: number
          total_amount: number
        }[]
      }
      get_vip_invitation_by_token: { Args: { token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      update_vip_rsvp: {
        Args: {
          p_decline_reason?: string
          p_guests?: number
          p_status: string
          p_token: string
        }
        Returns: Json
      }
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
