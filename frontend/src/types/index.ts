/**
 * Domain Types - Food Court App
 * Aligned with backend schema
 */

export type Role = 'admin' | 'admin-food-court' | 'tenant' | 'customer' | 'cashier'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  updatedAt: string
}

export interface FoodCourt {
  id: string
  managerId: string | null
  name: string
  slug: string
  address: string | null
  phone: string | null
  logo: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  foodCourtId: string
  ownerId: string | null
  name: string
  slug: string
  stallNumber: string
  description: string | null
  logo: string | null
  isOpen: boolean
  openingTime: string | null
  closingTime: string | null
  owner?: {
    id: string
    name: string
    email: string
    status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED'
    role: string
  } | null
  foodCourt?: FoodCourt | null
  createdAt: string
  updatedAt: string
}

export interface MenuCategory {
  id: string
  tenantId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type MenuStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'HIDDEN'

export interface MenuOption {
  id: string
  menuId: string
  name: string
  priceAdjustment: number
  createdAt?: string
  updatedAt?: string
}

export interface Menu {
  id: string
  tenantId: string
  categoryId: string | null
  name: string
  description: string | null
  price: number
  stock: number
  status: MenuStatus
  preparationTime: number
  imageUrl: string | null
  isAvailable: boolean
  createdAt: string
  updatedAt: string
  category?: MenuCategory
  tenant?: Tenant
  options?: MenuOption[]
}

export interface CartItem {
  menuId: string
  name: string
  price: number
  quantity: number
  stock?: number
  notes?: string
  tenantId: string
  tenantName: string
  stallNumber?: string
  imageUrl?: string | null
  selectedOptions?: Array<{ id: string; name: string; priceAdjustment: number }>
  optionIds?: string[]
}

export interface MenuCategoryWithMenus extends MenuCategory {
  menus: Menu[]
}

export type TableStatus = 'available' | 'occupied' | 'disabled'

export interface Table {
  id: string
  foodCourtId: string
  tableNumber: string
  qrToken: string
  capacity: number
  status: TableStatus
  createdAt: string
  updatedAt: string
  foodCourt?: FoodCourt
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SENT_TO_KITCHEN' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'
export type TenantOrderStatus = 'WAITING_PAYMENT' | 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED'

export interface Order {
  id: string
  sessionId: string
  orderNumber: string
  subtotal: number
  taxAmount: number
  serviceFee: number
  discountAmount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
  updatedAt: string
  tenantOrders?: TenantOrder[]
  table?: Table
  tableId?: string | null
}

export interface TenantOrder {
  id: string
  orderId: string
  tenantId: string
  subtotal: number
  status: TenantOrderStatus
  sentToKitchenAt: string | null
  createdAt: string
  updatedAt: string
  tenant?: Tenant
  items?: OrderItem[]
  kitchenQueue?: KitchenQueue
}

export interface OrderItem {
  id: string
  tenantOrderId: string
  menuId: string | null
  menuNameSnapshot: string
  unitPriceSnapshot: number
  quantity: number
  subtotal: number
  notes: string | null
  createdAt: string
  updatedAt: string
  menu?: Menu
  options?: OrderItemOption[]
}

export interface OrderItemOption {
  id: string
  orderItemId: string
  optionNameSnapshot: string
  priceAdjustmentSnapshot: number
  createdAt: string
  updatedAt: string
}

export interface KitchenQueue {
  id: string
  tenantOrderId: string
  queueNumber: string
  status: 'QUEUED' | 'COOKING' | 'READY' | 'PICKED_UP'
  queuedAt: string
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'QRIS' | 'CASH' | 'CARD' | 'E_WALLET' | 'BANK_TRANSFER'

export interface Payment {
  id: string
  paymentGroupId: string
  paymentReference: string
  paymentMethod: PaymentMethod
  provider: string | null
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUNDED'
  paidAt: string | null
  expiredAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * API Request/Response Types
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  message: string
  data: {
    token: string
    user: User
  }
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: Role
}

export interface CreateOrderRequest {
  tableId?: string
  sessionId?: string
  customerName?: string
  notes?: string
  orderType?: 'DINE_IN' | 'TAKEAWAY'
  discountCode?: string
  discountId?: string
  items: {
    menuId: string
    quantity: number
    notes?: string
    specialInstructions?: string
    optionIds?: string[]
  }[]
}

export interface TrackOrderResponse {
  orderNumber: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  totalAmount: number
  tableNumber: string
  sessionCode?: string
  createdAt: string
  discountAmount?: number
  discountCode?: string | null
  stalls: {
    tenantName: string
    stallNumber: string
    status: TenantOrderStatus
    queueNumber: string
    items: {
      name: string
      quantity: number
      options: string[]
    }[]
  }[]
}

export interface ProcessPaymentRequest {
  orderId?: string
  paymentGroupId?: string
  paymentMethod: string
  amount?: number
  provider?: string
}

export interface Discount {
  id: string
  foodCourtId: string
  tenantId?: string | null
  code?: string | null
  name: string
  description?: string | null
  scope: 'FOOD_COURT' | 'TENANT'
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  maxDiscountAmount?: number | null
  minOrderAmount: number
  isPublic: boolean
  usageLimit?: number | null
  usageCount: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
  createdAt?: string
  updatedAt?: string
  foodCourt?: {
    id: string
    name: string
  } | null
  tenant?: {
    id: string
    name: string
    stallNumber?: string
  } | null
}

export interface DiscountCalculationResult {
  valid: boolean
  discount: Discount
  qualifyingSubtotal: number
  discountAmount: number
  subtotal: number
  discountedSubtotal: number
  serviceFee: number
  taxAmount: number
  totalAmount: number
  message?: string
}

export interface CreateDiscountInput {
  foodCourtId: string
  tenantId?: string | null
  code?: string | null
  name: string
  description?: string | null
  scope: 'FOOD_COURT' | 'TENANT'
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number
  isPublic?: boolean
  usageLimit?: number | null
  startDate: string
  endDate: string
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
}

export interface UpdateDiscountInput {
  name?: string
  description?: string | null
  scope?: 'FOOD_COURT' | 'TENANT'
  tenantId?: string | null
  code?: string | null
  type?: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value?: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number
  isPublic?: boolean
  usageLimit?: number | null
  startDate?: string
  endDate?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
}

export interface Kiosk {
  id: string
  foodCourtId: string
  kioskName: string
  deviceCode: string
  location?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  foodCourt?: FoodCourt
}
