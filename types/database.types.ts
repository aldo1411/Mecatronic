export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'superadmin' | 'owner' | 'admin' | 'mechanic' | 'receptionist'
export type WorkOrderState = 'received' | 'in_progress' | 'waiting_part' | 'ready' | 'delivered' | 'cancelled'
export type PartOrigin = 'stock' | 'special_order' | 'client_provided'
export type PaymentMethod = 'cash' | 'spei' | 'card'
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled'
export type InvoiceItemType = 'part' | 'service'
export type ReceiptSentVia = 'print' | 'whatsapp' | 'email'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'
export type BillingInterval = 'monthly' | 'annual'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_id: string | null
          name: string
          last_name: string
          second_last_name: string | null
          rfc: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          contact_type: string
          contact: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }
      roles: {
        Row: {
          id: string
          name: UserRole
          description: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      workshops: {
        Row: {
          id: string
          owner_id: string
          name: string
          rfc: string | null
          subscription_status: SubscriptionStatus
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['workshops']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['workshops']['Insert']>
      }
      user_workshop: {
        Row: {
          id: string
          user_id: string
          workshop_id: string
          role_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_workshop']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_workshop']['Insert']>
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price_monthly: number
          price_annual: number
          max_users: number
          max_vehicles: number | null
          features: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscription_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscription_plans']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          workshop_id: string
          plan_id: string
          status: SubscriptionStatus
          billing_interval: BillingInterval
          current_period_start: string
          current_period_end: string
          trial_ends_at: string | null
          grace_period_ends_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      parts: {
        Row: {
          id: string
          workshop_id: string
          name: string
          description: string | null
          sku: string | null
          unit: string
          sale_price: number
          min_inventario: number
          created_at: string
          updated_at: string
          is_active: boolean
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['parts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['parts']['Insert']>
      }
      inventory_inventario: {
        Row: {
          id: string
          workshop_id: string
          part_id: string
          quantity_on_hand: number
          average_cost: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_stock']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['inventory_stock']['Insert']>
      }
      inventory_entries: {
        Row: {
          id: string
          workshop_id: string
          part_id: string
          supplier_id: string | null
          quantity: number
          unit_cost: number
          total_cost: number
          invoice_ref: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['inventory_entries']['Row'], 'id' | 'created_at' | 'total_cost'>
        Update: Partial<Database['public']['Tables']['inventory_entries']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          workshop_id: string
          name: string
          contact_name: string | null
          rfc: string | null
          created_at: string
          updated_at: string
          is_active: boolean
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      vehicles: {
        Row: {
          id: string
          client_id: string
          brand: string
          model: string
          year: number
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
      }
      history_notes: {
        Row: {
          id: string
          vehicle_id: string
          notes: string | null
          photos: string[] | null
          kilometers: number | null
          diagnostic: string | null
          services: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['history_notes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['history_notes']['Insert']>
      }
      work_orders: {
        Row: {
          id: string
          workshop_id: string
          client_id: string
          vehicle_id: string
          mechanic_id: string | null
          folio: string
          description: string | null
          state: WorkOrderState
          estimated_delivery: string | null
          total_cost: number
          created_at: string
          updated_at: string
          is_active: boolean
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['work_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['work_orders']['Insert']>
      }
      work_order_parts: {
        Row: {
          id: string
          work_order_id: string
          part_id: string | null
          origin: PartOrigin
          quantity: number
          unit_cost: number
          sale_price: number
          margin: number
          part_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_order_parts']['Row'], 'id' | 'created_at' | 'updated_at' | 'margin'>
        Update: Partial<Database['public']['Tables']['work_order_parts']['Insert']>
      }
      service_catalog: {
        Row: {
          id: string
          workshop_id: string
          name: string
          description: string | null
          default_price: number
          tax_rate: number
          created_at: string
          updated_at: string
          is_active: boolean
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['service_catalog']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['service_catalog']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          workshop_id: string
          work_order_id: string
          client_id: string
          folio: string
          status: InvoiceStatus
          subtotal: number
          tax_amount: number
          total: number
          notes: string | null
          issued_at: string | null
          due_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          cfdi_uuid: string | null
          cfdi_status: string | null
          cfdi_stamped_at: string | null
          cfdi_xml_url: string | null
          cfdi_pdf_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at' | 'total'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          item_type: InvoiceItemType
          reference_id: string | null
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          subtotal: number
          tax_amount: number
          total: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at' | 'subtotal' | 'tax_amount' | 'total'>
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          workshop_id: string
          amount: number
          method: PaymentMethod
          reference: string | null
          paid_at: string
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      receipts: {
        Row: {
          id: string
          invoice_id: string
          workshop_id: string
          payment_id: string | null
          folio_receipt: string
          pdf_url: string | null
          generated_at: string
          sent_via: ReceiptSentVia | null
        }
        Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>
      }
    }
    Views: {
      low_stock_alerts: {
        Row: {
          id: string
          workshop_id: string
          name: string
          sku: string | null
          min_inventario: number
          quantity_on_hand: number
          average_cost: number
          sale_price: number
        }
      }
      invoice_balance: {
        Row: {
          invoice_id: string
          workshop_id: string
          folio: string
          status: InvoiceStatus
          total: number
          amount_paid: number
          balance_due: number
        }
      }
      daily_cash_summary: {
        Row: {
          workshop_id: string
          method: PaymentMethod
          day: string
          transactions: number
          total: number
        }
      }
    }
    Functions: {
      increment_folio_sequence: {
        Args: { p_workshop_id: string; p_folio_type: string; p_year: number }
        Returns: number
      }
      get_active_workshop_id: { Args: Record<never, never>; Returns: string }
      get_active_role: { Args: Record<never, never>; Returns: string }
      has_active_subscription: { Args: Record<never, never>; Returns: boolean }
      is_superadmin: { Args: Record<never, never>; Returns: boolean }
      is_owner_or_admin: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      work_order_state: WorkOrderState
      part_origin: PartOrigin
      payment_method: PaymentMethod
      invoice_status: InvoiceStatus
      invoice_item_type: InvoiceItemType
      receipt_sent_via: ReceiptSentVia
      subscription_status: SubscriptionStatus
      billing_interval: BillingInterval
    }
  }
}
