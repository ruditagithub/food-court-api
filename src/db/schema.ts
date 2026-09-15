import { relations } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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
  role: mysqlEnum("role", ["admin", "tenant", "customer"])
    .notNull()
    .default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tenants: many(tenants),
  orders: many(orders),
}));

// ==========================================
// 2. Tenants (Kios / Gerai) Table
// ==========================================
export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  stallNumber: varchar("stall_number", { length: 50 }).notNull(),
  ownerId: varchar("owner_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, {
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  categories: many(categories),
  menus: many(menus),
  orderItems: many(orderItems),
}));

// ==========================================
// 3. Categories Table
// ==========================================
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => tenants.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  menus: many(menus),
}));

// ==========================================
// 4. Menus Table
// ==========================================
export const menus = mysqlTable("menus", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(
    () => categories.id,
    { onDelete: "set null" },
  ),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // Harga dalam Rupiah (integer)
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const menusRelations = relations(menus, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [menus.tenantId],
    references: [tenants.id],
  }),
  category: one(categories, {
    fields: [menus.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

// ==========================================
// 5. Tables (Meja Food Court) Table
// ==========================================
export const tables = mysqlTable("tables", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tableNumber: varchar("table_number", { length: 50 }).notNull().unique(),
  capacity: int("capacity").notNull().default(4),
  status: mysqlEnum("status", ["available", "occupied", "reserved"])
    .notNull()
    .default("available"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tablesRelations = relations(tables, ({ many }) => ({
  orders: many(orders),
}));

// ==========================================
// 6. Orders Table
// ==========================================
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 36 }).references(
    () => users.id,
    { onDelete: "set null" },
  ),
  customerName: varchar("customer_name", { length: 100 }),
  tableId: varchar("table_id", { length: 36 }).references(() => tables.id, {
    onDelete: "set null",
  }),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "cooking",
    "ready",
    "completed",
    "cancelled",
  ])
    .notNull()
    .default("pending"),
  totalPrice: int("total_price").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
  payment: one(payments),
}));

// ==========================================
// 7. Order Items Table
// ==========================================
export const orderItems = mysqlTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuId: varchar("menu_id", { length: 36 })
    .notNull()
    .references(() => menus.id),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id),
  quantity: int("quantity").notNull().default(1),
  unitPrice: int("unit_price").notNull(),
  subtotal: int("subtotal").notNull(),
  itemStatus: mysqlEnum("item_status", [
    "pending",
    "cooking",
    "ready",
    "served",
    "cancelled",
  ])
    .notNull()
    .default("pending"),
  specialNotes: text("special_notes"),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menu: one(menus, {
    fields: [orderItems.menuId],
    references: [menus.id],
  }),
  tenant: one(tenants, {
    fields: [orderItems.tenantId],
    references: [tenants.id],
  }),
}));

// ==========================================
// 8. Payments Table
// ==========================================
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: int("amount").notNull(),
  paymentMethod: mysqlEnum("payment_method", ["cash", "qris", "transfer"])
    .notNull()
    .default("qris"),
  paymentStatus: mysqlEnum("payment_status", [
    "pending",
    "paid",
    "failed",
    "refunded",
  ])
    .notNull()
    .default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));
