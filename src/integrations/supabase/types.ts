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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string
          category: string
          created_at: string
          description: string | null
          format: string
          id: string
          isbn: string
          price_cents: number
          published_year: number | null
          stock: number
          title: string
        }
        Insert: {
          author: string
          category?: string
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          isbn: string
          price_cents: number
          published_year?: number | null
          stock?: number
          title: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          isbn?: string
          price_cents?: number
          published_year?: number | null
          stock?: number
          title?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string
          created_at: string
          email: string
          full_name: string
          id: string
          marketing_opt_in: boolean
          member_tier: string
          phone: string | null
          postal_code: string | null
          state: string | null
          store_credit_cents: number
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          marketing_opt_in?: boolean
          member_tier?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          store_credit_cents?: number
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          marketing_opt_in?: boolean
          member_tier?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          store_credit_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          id: string
          question: string
          slug: string
          tags: string[]
        }
        Insert: {
          answer: string
          category?: string
          id?: string
          question: string
          slug: string
          tags?: string[]
        }
        Update: {
          answer?: string
          category?: string
          id?: string
          question?: string
          slug?: string
          tags?: string[]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          book_id: string | null
          fulfillment_status: string
          id: string
          isbn: string | null
          order_id: string
          quantity: number
          title: string
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          book_id?: string | null
          fulfillment_status?: string
          id?: string
          isbn?: string | null
          order_id: string
          quantity?: number
          title: string
          total_cents?: number
          unit_price_cents?: number
        }
        Update: {
          book_id?: string | null
          fulfillment_status?: string
          id?: string
          isbn?: string | null
          order_id?: string
          quantity?: number
          title?: string
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          currency: string
          customer_id: string
          discount_cents: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          placed_at: string
          shipping_address: Json
          shipping_cents: number
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          currency?: string
          customer_id: string
          discount_cents?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          placed_at?: string
          shipping_address?: Json
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          currency?: string
          customer_id?: string
          discount_cents?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          placed_at?: string
          shipping_address?: Json
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          completed_at: string | null
          customer_id: string | null
          email: string
          expires_at: string
          id: string
          requested_at: string
          status: string
          token: string
        }
        Insert: {
          completed_at?: string | null
          customer_id?: string | null
          email: string
          expires_at?: string
          id?: string
          requested_at?: string
          status?: string
          token: string
        }
        Update: {
          completed_at?: string | null
          customer_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          requested_at?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          body_markdown: string
          category: string
          effective_date: string
          id: string
          metadata: Json
          slug: string
          summary: string
          title: string
        }
        Insert: {
          body_markdown: string
          category?: string
          effective_date?: string
          id?: string
          metadata?: Json
          slug: string
          summary: string
          title: string
        }
        Update: {
          body_markdown?: string
          category?: string
          effective_date?: string
          id?: string
          metadata?: Json
          slug?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      refund_events: {
        Row: {
          actor: string
          amount_cents: number | null
          created_at: string
          id: string
          metadata: Json
          note: string | null
          refund_id: string
          status_from: string | null
          status_to: string | null
          type: string
        }
        Insert: {
          actor?: string
          amount_cents?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          refund_id: string
          status_from?: string | null
          status_to?: string | null
          type?: string
        }
        Update: {
          actor?: string
          amount_cents?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          refund_id?: string
          status_from?: string | null
          status_to?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_events_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          order_id: string
          processed_at: string | null
          reason: string | null
          refund_number: string
          return_id: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          order_id: string
          processed_at?: string | null
          reason?: string | null
          refund_number: string
          return_id?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          order_id?: string
          processed_at?: string | null
          reason?: string | null
          refund_number?: string
          return_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: string
          id: string
          order_item_id: string
          quantity: number
          return_id: string
        }
        Insert: {
          condition?: string
          id?: string
          order_item_id: string
          quantity?: number
          return_id: string
        }
        Update: {
          condition?: string
          id?: string
          order_item_id?: string
          quantity?: number
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          closed_at: string | null
          comment: string | null
          customer_id: string
          expected_refund_cents: number
          id: string
          label_url: string | null
          order_id: string
          reason: string
          received_at: string | null
          requested_at: string
          rma_number: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          comment?: string | null
          customer_id: string
          expected_refund_cents?: number
          id?: string
          label_url?: string | null
          order_id: string
          reason?: string
          received_at?: string | null
          requested_at?: string
          rma_number: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          comment?: string | null
          customer_id?: string
          expected_refund_cents?: number
          id?: string
          label_url?: string | null
          order_id?: string
          reason?: string
          received_at?: string | null
          requested_at?: string
          rma_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          description: string | null
          id: string
          location: string | null
          occurred_at: string
          shipment_id: string
          status: string
        }
        Insert: {
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          shipment_id: string
          status: string
        }
        Update: {
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string
          created_at: string
          delivered_at: string | null
          estimated_delivery: string | null
          id: string
          order_id: string
          service_level: string
          shipped_at: string | null
          status: string
          tracking_number: string
          tracking_url: string | null
        }
        Insert: {
          carrier?: string
          created_at?: string
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id: string
          service_level?: string
          shipped_at?: string | null
          status?: string
          tracking_number: string
          tracking_url?: string | null
        }
        Update: {
          carrier?: string
          created_at?: string
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id?: string
          service_level?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee: string | null
          category: string
          channel: string
          created_at: string
          customer_id: string | null
          id: string
          order_id: string | null
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          category?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          category?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          metadata: Json
          ticket_id: string
          type: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          metadata?: Json
          ticket_id: string
          type?: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          currency: string
          customer_id: string | null
          description: string | null
          id: string
          method: string
          occurred_at: string
          order_id: string | null
          reference: string | null
          status: string
          transaction_number: string
          type: string
        }
        Insert: {
          amount_cents: number
          currency?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          method?: string
          occurred_at?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          transaction_number: string
          type: string
        }
        Update: {
          amount_cents?: number
          currency?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          method?: string
          occurred_at?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          transaction_number?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_bookly_demo: { Args: never; Returns: Json }
      seed_bookly_demo: { Args: never; Returns: Json }
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
