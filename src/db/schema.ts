import { relations } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// ==========================================
// 1. Users Table
// ==========================================
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "admin-food-court", "tenant", "customer"])
    .notNull()
    .default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tenants: many(tenants),
  sessionParticipants: many(sessionParticipants),
  managedFoodCourts: many(foodCourts),
}));

// ==========================================
// 2. Food Courts Table
// ==========================================
export const foodCourts = mysqlTable("food_courts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  managerId: varchar("manager_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 30 }),
  logo: varchar("logo", { length: 255 }),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE"])
    .notNull()
    .default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const foodCourtsRelations = relations(foodCourts, ({ one, many }) => ({
  manager: one(users, {
    fields: [foodCourts.managerId],
    references: [users.id],
  }),
  tables: many(tables),
  kiosks: many(kiosks),
  tenants: many(tenants),
  diningSessions: many(diningSessions),
}));

// ==========================================
// 3. Tables (Meja Food Court)
// ==========================================
export const tables = mysqlTable(
  "tables",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    foodCourtId: varchar("food_court_id", { length: 36 })
      .notNull()
      .references(() => foodCourts.id, { onDelete: "cascade" }),
    tableNumber: varchar("table_number", { length: 20 }).notNull(),
    qrToken: varchar("qr_token", { length: 100 }).notNull().unique(),
    capacity: int("capacity").notNull().default(4),
    status: mysqlEnum("status", ["available", "occupied", "disabled"])
      .notNull()
      .default("available"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    unique("uq_foodcourt_tablenumber").on(table.foodCourtId, table.tableNumber),
  ],
);

export const tablesRelations = relations(tables, ({ one, many }) => ({
  foodCourt: one(foodCourts, {
    fields: [tables.foodCourtId],
    references: [foodCourts.id],
  }),
  diningSessions: many(diningSessions),
}));

// ==========================================
// 4. Kiosks (Self-service Kiosk)
// ==========================================
export const kiosks = mysqlTable("kiosks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  foodCourtId: varchar("food_court_id", { length: 36 })
    .notNull()
    .references(() => foodCourts.id, { onDelete: "cascade" }),
  kioskName: varchar("kiosk_name", { length: 100 }).notNull(),
  deviceCode: varchar("device_code", { length: 100 }).notNull().unique(),
  location: varchar("location", { length: 100 }),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE"])
    .notNull()
    .default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const kiosksRelations = relations(kiosks, ({ one, many }) => ({
  foodCourt: one(foodCourts, {
    fields: [kiosks.foodCourtId],
    references: [foodCourts.id],
  }),
  diningSessions: many(diningSessions),
}));

// ==========================================
// 5. Tenants (Kios / Gerai)
// ==========================================
export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    foodCourtId: varchar("food_court_id", { length: 36 })
      .notNull()
      .references(() => foodCourts.id, { onDelete: "cascade" }),
    ownerId: varchar("owner_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    stallNumber: varchar("stall_number", { length: 50 }).notNull(),
    description: text("description"),
    logo: varchar("logo", { length: 255 }),
    isOpen: boolean("is_open").notNull().default(true),
    openingTime: varchar("opening_time", { length: 8 }),
    closingTime: varchar("closing_time", { length: 8 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [unique("uq_foodcourt_slug").on(table.foodCourtId, table.slug)],
);

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  foodCourt: one(foodCourts, {
    fields: [tenants.foodCourtId],
    references: [foodCourts.id],
  }),
  owner: one(users, {
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  categories: many(menuCategories),
  menus: many(menus),
  tenantOrders: many(tenantOrders),
}));

// ==========================================
// 6. Menu Categories Table
// ==========================================
export const menuCategories = mysqlTable("menu_categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const menuCategoriesRelations = relations(
  menuCategories,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [menuCategories.tenantId],
      references: [tenants.id],
    }),
    menus: many(menus),
  }),
);

// Backward compatibility alias for categories
export const categories = menuCategories;
export const categoriesRelations = menuCategoriesRelations;

// ==========================================
// 7. Menus Table
// ==========================================
export const menus = mysqlTable("menus", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(
    () => menuCategories.id,
    { onDelete: "set null" },
  ),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  price: int("price").notNull(),
  stock: int("stock").notNull().default(0),
  status: mysqlEnum("status", ["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"])
    .notNull()
    .default("AVAILABLE"),
  preparationTime: int("preparation_time").notNull().default(15),
  imageUrl: varchar("image_url", { length: 255 }),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const menusRelations = relations(menus, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [menus.tenantId],
    references: [tenants.id],
  }),
  category: one(menuCategories, {
    fields: [menus.categoryId],
    references: [menuCategories.id],
  }),
  options: many(menuOptions),
  orderItems: many(orderItems),
}));

// ==========================================
// 8. Menu Options (Addons / Varian)
// ==========================================
export const menuOptions = mysqlTable("menu_options", {
  id: varchar("id", { length: 36 }).primaryKey(),
  menuId: varchar("menu_id", { length: 36 })
    .notNull()
    .references(() => menus.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  priceAdjustment: int("price_adjustment").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const menuOptionsRelations = relations(menuOptions, ({ one }) => ({
  menu: one(menus, {
    fields: [menuOptions.menuId],
    references: [menus.id],
  }),
}));

// ==========================================
// 9. Dining Sessions (Sesi Meja / Kiosk)
// ==========================================
export const diningSessions = mysqlTable("dining_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  foodCourtId: varchar("food_court_id", { length: 36 })
    .notNull()
    .references(() => foodCourts.id, { onDelete: "cascade" }),
  tableId: varchar("table_id", { length: 36 }).references(() => tables.id, {
    onDelete: "set null",
  }),
  kioskId: varchar("kiosk_id", { length: 36 }).references(() => kiosks.id, {
    onDelete: "set null",
  }),
  sessionCode: varchar("session_code", { length: 20 }).notNull().unique(),
  orderType: mysqlEnum("order_type", ["DINE_IN", "TAKEAWAY"])
    .notNull()
    .default("DINE_IN"),
  status: mysqlEnum("status", [
    "ACTIVE",
    "PAYMENT_PENDING",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ])
    .notNull()
    .default("ACTIVE"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const diningSessionsRelations = relations(
  diningSessions,
  ({ one, many }) => ({
    foodCourt: one(foodCourts, {
      fields: [diningSessions.foodCourtId],
      references: [foodCourts.id],
    }),
    table: one(tables, {
      fields: [diningSessions.tableId],
      references: [tables.id],
    }),
    kiosk: one(kiosks, {
      fields: [diningSessions.kioskId],
      references: [kiosks.id],
    }),
    participants: many(sessionParticipants),
    orders: many(orders),
  }),
);

// ==========================================
// 10. Session Participants
// ==========================================
export const sessionParticipants = mysqlTable("session_participants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 })
    .notNull()
    .references(() => diningSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 120 }).notNull(),
  deviceToken: varchar("device_token", { length: 255 }),
  isHost: boolean("is_host").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one, many }) => ({
    session: one(diningSessions, {
      fields: [sessionParticipants.sessionId],
      references: [diningSessions.id],
    }),
    user: one(users, {
      fields: [sessionParticipants.userId],
      references: [users.id],
    }),
    paymentGroups: many(paymentGroups),
  }),
);

// ==========================================
// 11. Orders (Master Order)
// ==========================================
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 })
    .notNull()
    .references(() => diningSessions.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  subtotal: int("subtotal").notNull().default(0),
  taxAmount: int("tax_amount").notNull().default(0),
  serviceFee: int("service_fee").notNull().default(0),
  discountAmount: int("discount_amount").notNull().default(0),
  totalAmount: int("total_amount").notNull().default(0),
  paymentStatus: mysqlEnum("payment_status", [
    "PENDING",
    "PARTIALLY_PAID",
    "PAID",
    "REFUNDED",
  ])
    .notNull()
    .default("PENDING"),
  orderStatus: mysqlEnum("order_status", [
    "DRAFT",
    "CONFIRMED",
    "SENT_TO_KITCHEN",
    "COMPLETED",
    "CANCELLED",
  ])
    .notNull()
    .default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(diningSessions, {
    fields: [orders.sessionId],
    references: [diningSessions.id],
  }),
  tenantOrders: many(tenantOrders),
  paymentGroups: many(paymentGroups),
  statusLogs: many(orderStatusLogs),
}));

// ==========================================
// 12. Tenant Orders (Sub-Order per Kios)
// ==========================================
export const tenantOrders = mysqlTable("tenant_orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  subtotal: int("subtotal").notNull().default(0),
  status: mysqlEnum("status", [
    "WAITING_PAYMENT",
    "QUEUED",
    "PREPARING",
    "READY",
    "COMPLETED",
  ])
    .notNull()
    .default("WAITING_PAYMENT"),
  sentToKitchenAt: timestamp("sent_to_kitchen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const tenantOrdersRelations = relations(
  tenantOrders,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [tenantOrders.orderId],
      references: [orders.id],
    }),
    tenant: one(tenants, {
      fields: [tenantOrders.tenantId],
      references: [tenants.id],
    }),
    items: many(orderItems),
    kitchenQueue: one(kitchenQueues),
  }),
);

// ==========================================
// 13. Order Items
// ==========================================
export const orderItems = mysqlTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantOrderId: varchar("tenant_order_id", { length: 36 })
    .notNull()
    .references(() => tenantOrders.id, { onDelete: "cascade" }),
  menuId: varchar("menu_id", { length: 36 }).references(() => menus.id, {
    onDelete: "set null",
  }),
  menuNameSnapshot: varchar("menu_name_snapshot", { length: 150 }).notNull(),
  unitPriceSnapshot: int("unit_price_snapshot").notNull(),
  quantity: int("quantity").notNull().default(1),
  subtotal: int("subtotal").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  tenantOrder: one(tenantOrders, {
    fields: [orderItems.tenantOrderId],
    references: [tenantOrders.id],
  }),
  menu: one(menus, {
    fields: [orderItems.menuId],
    references: [menus.id],
  }),
  options: many(orderItemOptions),
  paymentGroupItems: many(paymentGroupItems),
}));

// ==========================================
// 14. Order Item Options
// ==========================================
export const orderItemOptions = mysqlTable("order_item_options", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderItemId: varchar("order_item_id", { length: 36 })
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  optionNameSnapshot: varchar("option_name_snapshot", { length: 120 }).notNull(),
  priceAdjustmentSnapshot: int("price_adjustment_snapshot")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const orderItemOptionsRelations = relations(
  orderItemOptions,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemOptions.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

// ==========================================
// 15. Kitchen Queues
// ==========================================
export const kitchenQueues = mysqlTable("kitchen_queues", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantOrderId: varchar("tenant_order_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => tenantOrders.id, { onDelete: "cascade" }),
  queueNumber: varchar("queue_number", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["QUEUED", "COOKING", "READY", "PICKED_UP"])
    .notNull()
    .default("QUEUED"),
  queuedAt: timestamp("queued_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const kitchenQueuesRelations = relations(kitchenQueues, ({ one }) => ({
  tenantOrder: one(tenantOrders, {
    fields: [kitchenQueues.tenantOrderId],
    references: [tenantOrders.id],
  }),
}));

// ==========================================
// 16. Order Status Logs
// ==========================================
export const orderStatusLogs = mysqlTable("order_status_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderStatusLogsRelations = relations(
  orderStatusLogs,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusLogs.orderId],
      references: [orders.id],
    }),
  }),
);

// ==========================================
// 17. Payment Groups (Split Bill Group)
// ==========================================
export const paymentGroups = mysqlTable("payment_groups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id", { length: 36 })
    .notNull()
    .references(() => sessionParticipants.id, { onDelete: "cascade" }),
  amountDue: int("amount_due").notNull(),
  amountPaid: int("amount_paid").notNull().default(0),
  status: mysqlEnum("status", ["PENDING", "PAID", "CANCELLED"])
    .notNull()
    .default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const paymentGroupsRelations = relations(
  paymentGroups,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [paymentGroups.orderId],
      references: [orders.id],
    }),
    participant: one(sessionParticipants, {
      fields: [paymentGroups.participantId],
      references: [sessionParticipants.id],
    }),
    items: many(paymentGroupItems),
    payments: many(payments),
  }),
);

// ==========================================
// 18. Payment Group Items
// ==========================================
export const paymentGroupItems = mysqlTable("payment_group_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  paymentGroupId: varchar("payment_group_id", { length: 36 })
    .notNull()
    .references(() => paymentGroups.id, { onDelete: "cascade" }),
  orderItemId: varchar("order_item_id", { length: 36 })
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  allocatedAmount: int("allocated_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const paymentGroupItemsRelations = relations(
  paymentGroupItems,
  ({ one }) => ({
    paymentGroup: one(paymentGroups, {
      fields: [paymentGroupItems.paymentGroupId],
      references: [paymentGroups.id],
    }),
    orderItem: one(orderItems, {
      fields: [paymentGroupItems.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

// ==========================================
// 19. Payments Table
// ==========================================
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  paymentGroupId: varchar("payment_group_id", { length: 36 })
    .notNull()
    .references(() => paymentGroups.id, { onDelete: "cascade" }),
  paymentReference: varchar("payment_reference", { length: 120 })
    .notNull()
    .unique(),
  paymentMethod: mysqlEnum("payment_method", [
    "QRIS",
    "CASH",
    "CARD",
    "E_WALLET",
    "BANK_TRANSFER",
  ])
    .notNull()
    .default("QRIS"),
  provider: varchar("provider", { length: 50 }),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", [
    "PENDING",
    "SUCCESS",
    "FAILED",
    "EXPIRED",
    "REFUNDED",
  ])
    .notNull()
    .default("PENDING"),
  paidAt: timestamp("paid_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  paymentGroup: one(paymentGroups, {
    fields: [payments.paymentGroupId],
    references: [paymentGroups.id],
  }),
}));
