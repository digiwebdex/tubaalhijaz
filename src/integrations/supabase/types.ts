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
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_2fa: {
        Row: {
          created_at: string
          sms_enabled: boolean
          sms_phone: string | null
          totp_enabled: boolean
          totp_secret: string | null
          totp_secret_pending: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sms_enabled?: boolean
          sms_phone?: string | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_secret_pending?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          sms_enabled?: boolean
          sms_phone?: string | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_secret_pending?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_2fa_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      agent_commissions: {
        Row: {
          base_amount: number
          booking_id: string | null
          commission_amount: number
          commission_pct: number
          created_at: string
          id: string
          notes: string | null
          paid_amount: number
          status: string
          supplier_agent_id: string
          updated_at: string
        }
        Insert: {
          base_amount?: number
          booking_id?: string | null
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          status?: string
          supplier_agent_id: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          booking_id?: string | null
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          status?: string
          supplier_agent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          method: string | null
          path: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          method?: string | null
          path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          method?: string | null
          path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_documents: {
        Row: {
          booking_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          user_id: string
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          user_id: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      booking_members: {
        Row: {
          booking_id: string
          created_at: string
          discount: number
          final_price: number
          full_name: string
          id: string
          package_id: string | null
          passport_number: string | null
          selling_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          discount?: number
          final_price?: number
          full_name: string
          id?: string
          package_id?: string | null
          passport_number?: string | null
          selling_price?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          discount?: number
          final_price?: number
          full_name?: string
          id?: string
          package_id?: string | null
          passport_number?: string | null
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_members_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_members_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_members_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_members_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "v_package_profit"
            referencedColumns: ["package_id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_type: string
          commission_due: number
          commission_paid: number
          commission_per_person: number
          cost_price_per_person: number | null
          created_at: string
          discount: number
          driver_name: string | null
          driver_notes: string | null
          driver_phone: string | null
          due_amount: number | null
          extra_expense: number | null
          guest_address: string | null
          guest_email: string | null
          guest_name: string | null
          guest_passport: string | null
          guest_phone: string | null
          id: string
          installment_plan_id: string | null
          moallem_due: number
          moallem_id: string | null
          notes: string | null
          num_travelers: number
          package_id: string
          paid_amount: number
          paid_by_moallem: number
          paid_to_supplier: number
          pickup_location: string | null
          pickup_time: string | null
          profit_amount: number | null
          selling_price_per_person: number | null
          status: string
          supplier_agent_id: string | null
          supplier_due: number
          total_amount: number
          total_commission: number
          total_cost: number | null
          tracking_id: string
          updated_at: string
          user_id: string | null
          vehicle_number: string | null
        }
        Insert: {
          booking_type?: string
          commission_due?: number
          commission_paid?: number
          commission_per_person?: number
          cost_price_per_person?: number | null
          created_at?: string
          discount?: number
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          due_amount?: number | null
          extra_expense?: number | null
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_passport?: string | null
          guest_phone?: string | null
          id?: string
          installment_plan_id?: string | null
          moallem_due?: number
          moallem_id?: string | null
          notes?: string | null
          num_travelers?: number
          package_id: string
          paid_amount?: number
          paid_by_moallem?: number
          paid_to_supplier?: number
          pickup_location?: string | null
          pickup_time?: string | null
          profit_amount?: number | null
          selling_price_per_person?: number | null
          status?: string
          supplier_agent_id?: string | null
          supplier_due?: number
          total_amount: number
          total_commission?: number
          total_cost?: number | null
          tracking_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
        }
        Update: {
          booking_type?: string
          commission_due?: number
          commission_paid?: number
          commission_per_person?: number
          cost_price_per_person?: number | null
          created_at?: string
          discount?: number
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          due_amount?: number | null
          extra_expense?: number | null
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_passport?: string | null
          guest_phone?: string | null
          id?: string
          installment_plan_id?: string | null
          moallem_due?: number
          moallem_id?: string | null
          notes?: string | null
          num_travelers?: number
          package_id?: string
          paid_amount?: number
          paid_by_moallem?: number
          paid_to_supplier?: number
          pickup_location?: string | null
          pickup_time?: string | null
          profit_amount?: number | null
          selling_price_per_person?: number | null
          status?: string
          supplier_agent_id?: string | null
          supplier_due?: number
          total_amount?: number
          total_commission?: number
          total_cost?: number | null
          tracking_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_moallem_id_fkey"
            columns: ["moallem_id"]
            isOneToOne: false
            referencedRelation: "moallems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "v_package_profit"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "bookings_supplier_agent_id_fkey"
            columns: ["supplier_agent_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          min_days_before_departure: number | null
          name: string
          refund_type: string
          refund_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_days_before_departure?: number | null
          name: string
          refund_type?: string
          refund_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_days_before_departure?: number | null
          name?: string
          refund_type?: string
          refund_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      catering_orders: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          days: number
          delivery_address: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          package_id: string | null
          persons: number
          start_date: string | null
          status: string
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          days?: number
          delivery_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          persons?: number
          start_date?: string | null
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          days?: number
          delivery_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          persons?: number
          start_date?: string | null
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catering_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "catering_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_packages: {
        Row: {
          created_at: string
          cuisine: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          meal_type: string
          min_persons: number
          name: string
          price_per_meal: number
          show_on_website: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuisine?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          meal_type: string
          min_persons?: number
          name: string
          price_per_meal?: number
          show_on_website?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuisine?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          meal_type?: string
          min_persons?: number
          name?: string
          price_per_meal?: number
          show_on_website?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cms_versions: {
        Row: {
          content: Json
          created_at: string
          id: string
          note: string | null
          section_key: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          note?: string | null
          section_key: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          note?: string | null
          section_key?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commission_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payout_date: string
          recorded_by: string | null
          reference: string | null
          supplier_agent_id: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payout_date?: string
          recorded_by?: string | null
          reference?: string | null
          supplier_agent_id: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payout_date?: string
          recorded_by?: string | null
          reference?: string | null
          supplier_agent_id?: string
          wallet_account_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      daily_cashbook: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          type: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          type: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          type?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_cashbook_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          customer_id: string | null
          date: string
          expense_type: string
          id: string
          note: string | null
          package_id: string | null
          title: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: string
          created_at?: string
          customer_id?: string | null
          date?: string
          expense_type?: string
          id?: string
          note?: string | null
          package_id?: string | null
          title: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          date?: string
          expense_type?: string
          id?: string
          note?: string | null
          package_id?: string | null
          title?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "expenses_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "v_package_profit"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "expenses_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_summary: {
        Row: {
          id: string
          net_profit: number
          total_expense: number
          total_income: number
          updated_at: string
        }
        Insert: {
          id?: string
          net_profit?: number
          total_expense?: number
          total_income?: number
          updated_at?: string
        }
        Update: {
          id?: string
          net_profit?: number
          total_expense?: number
          total_income?: number
          updated_at?: string
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          guests: number
          hotel_id: string
          id: string
          notes: string | null
          room_id: string
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          guests?: number
          hotel_id: string
          id?: string
          notes?: string | null
          room_id: string
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          guests?: number
          hotel_id?: string
          id?: string
          notes?: string | null
          room_id?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: Json | null
          capacity: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price_per_night: number
        }
        Insert: {
          amenities?: Json | null
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price_per_night: number
        }
        Update: {
          amenities?: Json | null
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_per_night?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: Json | null
          city: string
          created_at: string
          description: string | null
          distance_to_haram: string | null
          gallery: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          location: string
          name: string
          star_rating: number | null
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          city?: string
          created_at?: string
          description?: string | null
          distance_to_haram?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location: string
          name: string
          star_rating?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          city?: string
          created_at?: string
          description?: string | null
          distance_to_haram?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          name?: string
          star_rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      installment_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          num_installments: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          num_installments: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          num_installments?: number
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          event_key: string | null
          id: string
          provider_message_id: string | null
          provider_response: Json
          queue_id: string | null
          recipient: string
          related_id: string | null
          related_type: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          provider_message_id?: string | null
          provider_response?: Json
          queue_id?: string | null
          recipient: string
          related_id?: string | null
          related_type?: string | null
          status: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          provider_message_id?: string | null
          provider_response?: Json
          queue_id?: string | null
          recipient?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      message_queue: {
        Row: {
          attachments: Json
          attempts: number
          body: string
          channel: string
          created_at: string
          created_by: string | null
          event_key: string | null
          id: string
          language: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient: string
          recipient_name: string | null
          related_id: string | null
          related_type: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          attempts?: number
          body: string
          channel: string
          created_at?: string
          created_by?: string | null
          event_key?: string | null
          id?: string
          language?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          recipient: string
          recipient_name?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          event_key?: string | null
          id?: string
          language?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          recipient?: string
          recipient_name?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          event_key: string
          id: string
          is_active: boolean
          language: string
          subject: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
          language?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
          language?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      moallem_commission_payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          date: string
          id: string
          moallem_id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string | null
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          moallem_id: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          moallem_id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moallem_commission_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moallem_commission_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "moallem_commission_payments_moallem_id_fkey"
            columns: ["moallem_id"]
            isOneToOne: false
            referencedRelation: "moallems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moallem_commission_payments_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      moallem_items: {
        Row: {
          created_at: string
          description: string
          id: string
          moallem_id: string
          quantity: number
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          moallem_id: string
          quantity?: number
          total_amount?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          moallem_id?: string
          quantity?: number
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "moallem_items_moallem_id_fkey"
            columns: ["moallem_id"]
            isOneToOne: false
            referencedRelation: "moallems"
            referencedColumns: ["id"]
          },
        ]
      }
      moallem_payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          date: string
          id: string
          moallem_id: string
          notes: string | null
          payment_method: string | null
          receipt_file_path: string | null
          recorded_by: string | null
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          moallem_id: string
          notes?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          recorded_by?: string | null
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          moallem_id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          recorded_by?: string | null
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moallem_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moallem_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "moallem_payments_moallem_id_fkey"
            columns: ["moallem_id"]
            isOneToOne: false
            referencedRelation: "moallems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moallem_payments_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      moallems: {
        Row: {
          address: string | null
          contract_date: string | null
          contracted_amount: number
          contracted_hajji: number
          created_at: string
          id: string
          name: string
          nid_number: string | null
          notes: string | null
          phone: string | null
          status: string
          total_deposit: number
          total_due: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          contract_date?: string | null
          contracted_amount?: number
          contracted_hajji?: number
          created_at?: string
          id?: string
          name: string
          nid_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          total_deposit?: number
          total_due?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          contract_date?: string | null
          contracted_amount?: number
          contracted_hajji?: number
          created_at?: string
          id?: string
          name?: string
          nid_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          total_deposit?: number
          total_due?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          booking_id: string | null
          channel: string
          created_at: string
          error_detail: string | null
          event_type: string
          id: string
          message: string
          payment_id: string | null
          recipient: string
          sent_by: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          channel: string
          created_at?: string
          error_detail?: string | null
          event_type: string
          id?: string
          message: string
          payment_id?: string | null
          recipient: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          channel?: string
          created_at?: string
          error_detail?: string | null
          event_type?: string
          id?: string
          message?: string
          payment_id?: string | null
          recipient?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "notification_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          email_enabled: boolean
          enabled: boolean
          event_key: string
          event_label: string
          id: string
          sms_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          email_enabled?: boolean
          enabled?: boolean
          event_key: string
          event_label: string
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          email_enabled?: boolean
          enabled?: boolean
          event_key?: string
          event_label?: string
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      online_payment_sessions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          customer_phone: string | null
          gateway: string
          gateway_response: Json | null
          id: string
          payment_id: string | null
          status: string
          tran_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_phone?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          payment_id?: string | null
          status?: string
          tran_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_phone?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          payment_id?: string | null
          status?: string
          tran_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "online_payment_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number | null
          expiry_date: string | null
          features: Json | null
          highlight_tag: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          rating: number
          services: Json | null
          show_on_website: boolean
          start_date: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          expiry_date?: string | null
          features?: Json | null
          highlight_tag?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          rating?: number
          services?: Json | null
          show_on_website?: boolean
          start_date?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          expiry_date?: string | null
          features?: Json | null
          highlight_tag?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          rating?: number
          services?: Json | null
          show_on_website?: boolean
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          installment_number: number | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          receipt_file_path: string | null
          status: string
          transaction_id: string | null
          user_id: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payments_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          id: string
          nid_number: string | null
          notes: string | null
          passport_number: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          nid_number?: string | null
          notes?: string | null
          passport_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          nid_number?: string | null
          notes?: string | null
          passport_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_tracking_logs: {
        Row: {
          city: string | null
          country: string | null
          document_type: string | null
          id: string
          ip_address: string | null
          qr_id: string | null
          scan_result: string
          scanned_at: string
          tracking_id: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          document_type?: string | null
          id?: string
          ip_address?: string | null
          qr_id?: string | null
          scan_result?: string
          scanned_at?: string
          tracking_id?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          document_type?: string | null
          id?: string
          ip_address?: string | null
          qr_id?: string | null
          scan_result?: string
          scanned_at?: string
          tracking_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_tracking_logs_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_verifications: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string
          expires_at: string | null
          id: string
          last_scanned_at: string | null
          metadata: Json
          related_id: string
          related_type: string
          scan_count: number
          status: string
          token: string
          tracking_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: string
          expires_at?: string | null
          id?: string
          last_scanned_at?: string | null
          metadata?: Json
          related_id: string
          related_type: string
          scan_count?: number
          status?: string
          token: string
          tracking_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string
          expires_at?: string | null
          id?: string
          last_scanned_at?: string | null
          metadata?: Json
          related_id?: string
          related_type?: string
          scan_count?: number
          status?: string
          token?: string
          tracking_id?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          booking_id: string
          created_at: string
          deduction_amount: number
          id: string
          original_amount: number
          policy_id: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          refund_amount: number
          refund_method: string | null
          status: string
          updated_at: string
          wallet_account_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          deduction_amount?: number
          id?: string
          original_amount?: number
          policy_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          status?: string
          updated_at?: string
          wallet_account_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          deduction_amount?: number
          id?: string
          original_amount?: number
          policy_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          status?: string
          updated_at?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "refunds_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          amount_applied: number
          created_at: string
          id: string
          invoice_no: string | null
          settlement_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          amount_applied?: number
          created_at?: string
          id?: string
          invoice_no?: string | null
          settlement_id: string
          source_id: string
          source_type: string
        }
        Update: {
          amount_applied?: number
          created_at?: string
          id?: string
          invoice_no?: string | null
          settlement_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payer_name: string | null
          payment_method: string
          receipt_file_path: string | null
          settlement_date: string
          settlement_no: string
          status: string
          total_amount: number
          updated_at: string
          wallet_account_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payer_name?: string | null
          payment_method?: string
          receipt_file_path?: string | null
          settlement_date?: string
          settlement_no?: string
          status?: string
          total_amount?: number
          updated_at?: string
          wallet_account_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payer_name?: string | null
          payment_method?: string
          receipt_file_path?: string | null
          settlement_date?: string
          settlement_no?: string
          status?: string
          total_amount?: number
          updated_at?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: Json
          id: string
          section_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id?: string
          section_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      supplier_agent_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          supplier_agent_id: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          supplier_agent_id: string
          total_amount?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          supplier_agent_id?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_agent_items_supplier_agent_id_fkey"
            columns: ["supplier_agent_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_agent_payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_file_path: string | null
          recorded_by: string | null
          supplier_agent_id: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          recorded_by?: string | null
          supplier_agent_id: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_file_path?: string | null
          recorded_by?: string | null
          supplier_agent_id?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_agent_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_agent_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "supplier_agent_payments_supplier_agent_id_fkey"
            columns: ["supplier_agent_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_agent_payments_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_agents: {
        Row: {
          address: string | null
          agent_name: string
          agent_user_id: string | null
          commission_pct: number
          company_name: string | null
          contract_date: string | null
          contracted_amount: number
          contracted_hajji: number
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_name: string
          agent_user_id?: string | null
          commission_pct?: number
          company_name?: string | null
          contract_date?: string | null
          contracted_amount?: number
          contracted_hajji?: number
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_name?: string
          agent_user_id?: string | null
          commission_pct?: number
          company_name?: string | null
          contract_date?: string | null
          contracted_amount?: number
          contracted_hajji?: number
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_contract_payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          payment_date: string
          payment_method: string | null
          supplier_id: string
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: string | null
          supplier_id: string
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: string | null
          supplier_id?: string
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contract_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contract_payments_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          contract_amount: number
          created_at: string
          id: string
          pilgrim_count: number
          supplier_id: string
          total_due: number
          total_paid: number
        }
        Insert: {
          contract_amount?: number
          created_at?: string
          id?: string
          pilgrim_count?: number
          supplier_id: string
          total_due?: number
          total_paid?: number
        }
        Update: {
          contract_amount?: number
          created_at?: string
          id?: string
          pilgrim_count?: number
          supplier_id?: string
          total_due?: number
          total_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_bookings: {
        Row: {
          arrival_date: string | null
          bill_correction_amount: number | null
          billing_name: string | null
          booking_ref: string | null
          client_reference: string | null
          created_at: string
          created_by: string | null
          customer_billing_amount: number
          customer_due: number
          departure_date: string | null
          expected_collection_date: string | null
          id: string
          invoice_no: string
          issue_date: string
          our_cost: number
          passenger_name: string
          payment_status: string
          profit: number
          received_amount: number
          remarks: string | null
          route: string | null
          staff_name: string | null
          status: string
          terms_of_charge: string
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          arrival_date?: string | null
          bill_correction_amount?: number | null
          billing_name?: string | null
          booking_ref?: string | null
          client_reference?: string | null
          created_at?: string
          created_by?: string | null
          customer_billing_amount?: number
          customer_due?: number
          departure_date?: string | null
          expected_collection_date?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          our_cost?: number
          passenger_name: string
          payment_status?: string
          profit?: number
          received_amount?: number
          remarks?: string | null
          route?: string | null
          staff_name?: string | null
          status?: string
          terms_of_charge?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          arrival_date?: string | null
          bill_correction_amount?: number | null
          billing_name?: string | null
          booking_ref?: string | null
          client_reference?: string | null
          created_at?: string
          created_by?: string | null
          customer_billing_amount?: number
          customer_due?: number
          departure_date?: string | null
          expected_collection_date?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          our_cost?: number
          passenger_name?: string
          payment_status?: string
          profit?: number
          received_amount?: number
          remarks?: string | null
          route?: string | null
          staff_name?: string | null
          status?: string
          terms_of_charge?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_refunds: {
        Row: {
          bill_received: number
          billing_amount_was: number
          billing_name: string | null
          booking_ref: string | null
          client_reference: string | null
          created_at: string
          created_by: string | null
          credit_amount_to_client: number
          credit_status: string
          customer_refund_charge: number
          due: number
          id: string
          invoice_no: string
          our_refund_charge: number
          passenger_name: string
          profit: number
          refund_back_from_vendor: number
          refund_date: string
          remarks: string | null
          route: string | null
          staff_name: string | null
          status: string
          terms_of_charge: string
          ticket_booking_id: string | null
          ticket_costing_was: number
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
          wallet_account_id: string | null
        }
        Insert: {
          bill_received?: number
          billing_amount_was?: number
          billing_name?: string | null
          booking_ref?: string | null
          client_reference?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount_to_client?: number
          credit_status?: string
          customer_refund_charge?: number
          due?: number
          id?: string
          invoice_no?: string
          our_refund_charge?: number
          passenger_name: string
          profit?: number
          refund_back_from_vendor?: number
          refund_date?: string
          remarks?: string | null
          route?: string | null
          staff_name?: string | null
          status?: string
          terms_of_charge?: string
          ticket_booking_id?: string | null
          ticket_costing_was?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
          wallet_account_id?: string | null
        }
        Update: {
          bill_received?: number
          billing_amount_was?: number
          billing_name?: string | null
          booking_ref?: string | null
          client_reference?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount_to_client?: number
          credit_status?: string
          customer_refund_charge?: number
          due?: number
          id?: string
          invoice_no?: string
          our_refund_charge?: number
          passenger_name?: string
          profit?: number
          refund_back_from_vendor?: number
          refund_date?: string
          remarks?: string | null
          route?: string | null
          staff_name?: string | null
          status?: string
          terms_of_charge?: string
          ticket_booking_id?: string | null
          ticket_costing_was?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_refunds_ticket_booking_id_fkey"
            columns: ["ticket_booking_id"]
            isOneToOne: false
            referencedRelation: "ticket_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_refunds_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_refunds_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          credit: number
          customer_id: string | null
          date: string
          debit: number
          id: string
          note: string | null
          payment_method: string | null
          reference: string | null
          source_id: string | null
          source_type: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: string
          created_at?: string
          credit?: number
          customer_id?: string | null
          date?: string
          debit?: number
          id?: string
          note?: string | null
          payment_method?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          credit?: number
          customer_id?: string | null
          date?: string
          debit?: number
          id?: string
          note?: string | null
          payment_method?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_profit"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      transport_bookings: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          dropoff_location: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          passengers: number
          pickup_datetime: string | null
          pickup_location: string
          status: string
          total_price: number
          updated_at: string
          user_id: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          dropoff_location: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          passengers?: number
          pickup_datetime?: string | null
          pickup_location: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          dropoff_location?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          passengers?: number
          pickup_datetime?: string | null
          pickup_location?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      transport_orders: {
        Row: {
          arrival_airport: string | null
          created_at: string
          currency: string
          dropoff_address: string | null
          flight_number: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string
          hotel_destination: string | null
          id: string
          madinah_hotel_name: string | null
          makkah_hotel_name: string | null
          notes: string | null
          passengers: number
          pickup_address: string | null
          pickup_date: string | null
          pickup_time: string | null
          route_from: string | null
          route_to: string | null
          route_type: string | null
          service_id: string | null
          status: string
          total_price: number
          tracking_id: string
          updated_at: string
          user_id: string | null
          vehicle_type: string
        }
        Insert: {
          arrival_airport?: string | null
          created_at?: string
          currency?: string
          dropoff_address?: string | null
          flight_number?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          hotel_destination?: string | null
          id?: string
          madinah_hotel_name?: string | null
          makkah_hotel_name?: string | null
          notes?: string | null
          passengers?: number
          pickup_address?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          route_from?: string | null
          route_to?: string | null
          route_type?: string | null
          service_id?: string | null
          status?: string
          total_price?: number
          tracking_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_type: string
        }
        Update: {
          arrival_airport?: string | null
          created_at?: string
          currency?: string
          dropoff_address?: string | null
          flight_number?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          hotel_destination?: string | null
          id?: string
          madinah_hotel_name?: string | null
          makkah_hotel_name?: string | null
          notes?: string | null
          passengers?: number
          pickup_address?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          route_from?: string | null
          route_to?: string | null
          route_type?: string | null
          service_id?: string | null
          status?: string
          total_price?: number
          tracking_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "transport_services"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_services: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          price_bdt: number
          price_sar: number
          route_from: string | null
          route_to: string | null
          show_on_website: boolean
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_bdt?: number
          price_sar?: number
          route_from?: string | null
          route_to?: string | null
          show_on_website?: boolean
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_bdt?: number
          price_sar?: number
          route_from?: string | null
          route_to?: string | null
          show_on_website?: boolean
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      transport_voucher_orders: {
        Row: {
          agent_country: string | null
          agent_name: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          flights: Json
          group_numbers: string[]
          hotels: Json
          id: string
          internal_movements: Json
          notes: string | null
          ops_24h_phone: string | null
          package_name: string | null
          pilgrim_count: number | null
          status: string
          supervisor_madinah_phone: string | null
          supervisor_makkah_phone: string | null
          transport_type: string | null
          travel_date: string | null
          umrah_company: string | null
          updated_at: string
        }
        Insert: {
          agent_country?: string | null
          agent_name?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          flights?: Json
          group_numbers?: string[]
          hotels?: Json
          id?: string
          internal_movements?: Json
          notes?: string | null
          ops_24h_phone?: string | null
          package_name?: string | null
          pilgrim_count?: number | null
          status?: string
          supervisor_madinah_phone?: string | null
          supervisor_makkah_phone?: string | null
          transport_type?: string | null
          travel_date?: string | null
          umrah_company?: string | null
          updated_at?: string
        }
        Update: {
          agent_country?: string | null
          agent_name?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          flights?: Json
          group_numbers?: string[]
          hotels?: Json
          id?: string
          internal_movements?: Json
          notes?: string | null
          ops_24h_phone?: string | null
          package_name?: string | null
          pilgrim_count?: number | null
          status?: string
          supervisor_madinah_phone?: string | null
          supervisor_makkah_phone?: string | null
          transport_type?: string | null
          travel_date?: string | null
          umrah_company?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      umrah_orders: {
        Row: {
          assigned_to: string | null
          catering_package_id: string | null
          created_at: string
          customer_id: string | null
          estimated_price_bdt: number
          estimated_price_sar: number
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          include_hotel: boolean
          include_reception: boolean
          include_visa: boolean
          include_ziyarat: boolean
          internal_notes: string | null
          madinah_nights: number
          makkah_nights: number
          num_travelers: number
          passport_ready: boolean
          program_tier: string
          room_type: string | null
          special_requests: string | null
          status: string
          tracking_id: string | null
          transport_vehicle: string | null
          travel_month: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          catering_package_id?: string | null
          created_at?: string
          customer_id?: string | null
          estimated_price_bdt?: number
          estimated_price_sar?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          include_hotel?: boolean
          include_reception?: boolean
          include_visa?: boolean
          include_ziyarat?: boolean
          internal_notes?: string | null
          madinah_nights?: number
          makkah_nights?: number
          num_travelers?: number
          passport_ready?: boolean
          program_tier?: string
          room_type?: string | null
          special_requests?: string | null
          status?: string
          tracking_id?: string | null
          transport_vehicle?: string | null
          travel_month?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          catering_package_id?: string | null
          created_at?: string
          customer_id?: string | null
          estimated_price_bdt?: number
          estimated_price_sar?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          include_hotel?: boolean
          include_reception?: boolean
          include_visa?: boolean
          include_ziyarat?: boolean
          internal_notes?: string | null
          madinah_nights?: number
          makkah_nights?: number
          num_travelers?: number
          passport_ready?: boolean
          program_tier?: string
          room_type?: string | null
          special_requests?: string | null
          status?: string
          tracking_id?: string | null
          transport_vehicle?: string | null
          travel_month?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "umrah_orders_catering_package_id_fkey"
            columns: ["catering_package_id"]
            isOneToOne: false
            referencedRelation: "catering_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visa_applications: {
        Row: {
          applicant_name: string
          application_date: string
          billing_amount: number
          billing_name: string | null
          client_delivery_date: string | null
          client_reference: string | null
          country_name: string
          created_at: string
          created_by: string | null
          customer_due: number
          expected_collection_date: string | null
          id: string
          invoice_no: string
          our_cost: number
          passport_number: string | null
          payment_status: string
          profit: number
          received_amount: number
          remarks: string | null
          staff_name: string | null
          status: string
          submission_date: string | null
          updated_at: string
          vendor_delivery_date: string | null
          vendor_id: string | null
          vendor_name: string | null
          visa_status: string
        }
        Insert: {
          applicant_name: string
          application_date?: string
          billing_amount?: number
          billing_name?: string | null
          client_delivery_date?: string | null
          client_reference?: string | null
          country_name: string
          created_at?: string
          created_by?: string | null
          customer_due?: number
          expected_collection_date?: string | null
          id?: string
          invoice_no?: string
          our_cost?: number
          passport_number?: string | null
          payment_status?: string
          profit?: number
          received_amount?: number
          remarks?: string | null
          staff_name?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          vendor_delivery_date?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          visa_status?: string
        }
        Update: {
          applicant_name?: string
          application_date?: string
          billing_amount?: number
          billing_name?: string | null
          client_delivery_date?: string | null
          client_reference?: string | null
          country_name?: string
          created_at?: string
          created_by?: string | null
          customer_due?: number
          expected_collection_date?: string | null
          id?: string
          invoice_no?: string
          our_cost?: number
          passport_number?: string | null
          payment_status?: string
          profit?: number
          received_amount?: number
          remarks?: string | null
          staff_name?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          vendor_delivery_date?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          visa_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "supplier_agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_booking_profit: {
        Row: {
          booking_id: string | null
          commission_due: number | null
          commission_paid: number | null
          commission_per_person: number | null
          cost_price_per_person: number | null
          due_amount: number | null
          extra_expense: number | null
          guest_name: string | null
          moallem_due: number | null
          moallem_id: string | null
          num_travelers: number | null
          package_id: string | null
          package_name: string | null
          package_type: string | null
          paid_amount: number | null
          paid_by_moallem: number | null
          paid_to_supplier: number | null
          profit_amount: number | null
          selling_price_per_person: number | null
          status: string | null
          supplier_due: number | null
          total_amount: number | null
          total_commission: number | null
          total_cost: number | null
          total_expenses: number | null
          total_payments: number | null
          tracking_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_moallem_id_fkey"
            columns: ["moallem_id"]
            isOneToOne: false
            referencedRelation: "moallems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "v_package_profit"
            referencedColumns: ["package_id"]
          },
        ]
      }
      v_customer_profit: {
        Row: {
          customer_id: string | null
          full_name: string | null
          phone: string | null
          profit: number | null
          total_bookings: number | null
          total_expenses: number | null
          total_payments: number | null
        }
        Relationships: []
      }
      v_package_profit: {
        Row: {
          package_id: string | null
          package_name: string | null
          package_price: number | null
          package_type: string | null
          profit: number | null
          total_bookings: number | null
          total_expenses: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      deactivate_expired_packages: { Args: never; Returns: undefined }
      gen_refund_invoice_no: { Args: never; Returns: string }
      gen_settlement_no: { Args: never; Returns: string }
      gen_ticket_invoice_no: { Args: never; Returns: string }
      gen_visa_invoice_no: { Args: never; Returns: string }
      generate_installment_schedule: {
        Args: {
          p_booking_id: string
          p_num_installments: number
          p_total_amount: number
          p_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_source_received: {
        Args: { p_source_id: string; p_source_type: string }
        Returns: undefined
      }
      recalculate_wallet_balances: {
        Args: never
        Returns: {
          account_name: string
          new_balance: number
          old_balance: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "manager"
        | "staff"
        | "viewer"
        | "accountant"
        | "booking"
        | "cms"
        | "agent"
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
      app_role: [
        "admin",
        "user",
        "manager",
        "staff",
        "viewer",
        "accountant",
        "booking",
        "cms",
        "agent",
      ],
    },
  },
} as const
