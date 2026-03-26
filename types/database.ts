export type UserRole = 'superadmin' | 'owner' | 'admin' | 'mechanic' | 'receptionist'
export type WorkOrderState = 'received' | 'in_progress' | 'waiting_part' | 'ready' | 'delivered' | 'cancelled'
export type PartOrigin = 'stock' | 'special_order' | 'client_provided'
export type PaymentMethod = 'cash' | 'spei' | 'card'
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'

export interface Profile {
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

export interface Workshop {
  id: string
  owner_id: string
  name: string
  rfc: string | null
  subscription_status: SubscriptionStatus
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface UserWorkshop {
  id: string
  user_id: string
  workshop_id: string
  role_id: string
  is_active: boolean
  created_at: string
  roles?: { name: UserRole }
  workshops?: Workshop
}

export interface WorkOrder {
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
  profiles?: Profile
  vehicles?: Vehicle
  mechanics?: Profile
}

export interface Vehicle {
  id: string
  client_id: string
  brand: string
  model: string
  year: number
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface HistoryNote {
  id: string
  vehicle_id: string
  work_order_id: string | null
  notes: string | null
  photos: string[] | null
  kilometers: number | null
  diagnostic: string | null
  services: string | null
  created_at: string
  created_by: string | null
}

export interface WorkOrderPart {
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
  parts?: Part
}

export interface Part {
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
}

export interface InventoryStock {
  id: string
  workshop_id: string
  part_id: string
  quantity_on_hand: number
  average_cost: number
  updated_at: string
  parts?: Part
}

export interface Supplier {
  id: string
  workshop_id: string
  name: string
  contact_name: string | null
  rfc: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Invoice {
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
  profiles?: Profile
  work_orders?: WorkOrder
  invoice_items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  item_type: 'part' | 'service'
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

export interface Payment {
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

export interface AppMetadata {
  active_workshop_id: string | null
  active_role: UserRole | null
  subscription_status: SubscriptionStatus | null
}
