# Design Specification: Menu Options & Order Pipeline Integration (Backend)

- **Date:** 2026-10-26
- **Status:** Approved
- **Target Audience:** Backend Developers, Tenant Portal, Customer Ordering System

---

## 1. Executive Summary & Objective

Pada platform food court ini, banyak sajian kuliner yang memiliki opsi varian rasa, tingkat kepedasan, ukuran porsi, maupun topping tambahan (misalnya: *Level 1 Pedas (Rp 0)*, *Level 2 Pedas (+Rp 2.000)*, *Porsi Jumbo (+Rp 5.000)*, *Ekstra Telur (+Rp 4.000)*).

Tabel database `menu_options` dan `order_item_options` sudah didefinisikan pada Drizzle ORM, namun belum memiliki modul endpoint dan logika bisnis di backend.

Tujuan dari fitur ini adalah:
1. **Pengelolaan Fleksibel Menu Options (Hybrid):** Tenant dapat melampirkan array `options` sekaligus saat membuat/memperbarui menu (`POST /api/menus` & `PUT /api/menus/:id`), atau mengelolanya secara satuan melalui sub-resource endpoints (`/api/menus/:menuId/options`).
2. **Smart Synchronization (Upsert & Prune):** Saat menu diperbarui dengan list options, sistem otomatis memperbarui opsi yang ada, menambah opsi baru, dan menghapus opsi lama yang dibuang dari daftar.
3. **Penyajian Data Lengkap:** Query menu (`getById`, `getAll`, dan katalog stan) otomatis menyertakan data relasi `options`.
4. **Integrasi Akurat ke Alur Pemesanan (Order Pipeline):** Ketika pelanggan memilih opsi hidangan (`optionIds`), backend menghitung akumulasi penyesuaian harga (`priceAdjustment`) dan menyimpan snapshot ke tabel `order_item_options`.

---

## 2. Database Schema Reference

Mengacu pada skema yang telah ada di `backend/db/schema.ts`:

### 2.1. Tabel `menu_options`
```typescript
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
```

### 2.2. Tabel `order_item_options`
```typescript
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
```

---

## 3. Data Contracts & Validation Layer (`backend/modules/menus/model.ts`)

```typescript
import { t } from "elysia";

export const MenuOptionItemDTO = t.Object({
  id: t.Optional(t.String()), // ID opsi untuk identifikasi saat update
  name: t.String({ minLength: 1, maxLength: 100 }),
  priceAdjustment: t.Optional(t.Numeric({ default: 0 })),
});

export const CreateMenuDTO = t.Object({
  tenantId: t.String(),
  categoryId: t.Optional(t.String()),
  name: t.String({ minLength: 2, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Numeric({ minimum: 0 }),
  stock: t.Optional(t.Integer({ minimum: 0 })),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
  options: t.Optional(t.Array(MenuOptionItemDTO)),
});

export const UpdateMenuDTO = t.Object({
  categoryId: t.Optional(t.String()),
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  price: t.Optional(t.Numeric({ minimum: 0 })),
  stock: t.Optional(t.Integer({ minimum: 0 })),
  imageUrl: t.Optional(t.String()),
  isAvailable: t.Optional(t.Boolean()),
  options: t.Optional(t.Array(MenuOptionItemDTO)),
});

export const CreateMenuOptionDTO = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  priceAdjustment: t.Optional(t.Numeric({ default: 0 })),
});

export const UpdateMenuOptionDTO = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  priceAdjustment: t.Optional(t.Numeric()),
});

export type MenuOptionItemDTOType = typeof MenuOptionItemDTO.static;
export type CreateMenuOptionDTOType = typeof CreateMenuOptionDTO.static;
export type UpdateMenuOptionDTOType = typeof UpdateMenuOptionDTO.static;
```

---

## 4. API Endpoints Specification

### 4.1. Menu Level Endpoints (`/api/menus`)
* `POST /api/menus`: Menyimpan menu baru beserta seluruh item dalam array `options` (jika disertakan).
* `PUT /api/menus/:id`: Memperbarui menu. Jika `options` disertakan, menjalankan logika *smart upsert & prune*.
* `GET /api/menus/:id` & `GET /api/menus`: Mengembalikan data menu dengan relasi `options: true`.

### 4.2. Sub-Resource Endpoints (`/api/menus/:menuId/options`)
* `GET /api/menus/:menuId/options`: Mengambil semua opsi untuk menu tertentu.
* `POST /api/menus/:menuId/options`: Menambahkan 1 opsi baru ke menu.
* `PUT /api/menus/options/:id`: Mengubah nama dan/atau `priceAdjustment` opsi.
* `DELETE /api/menus/options/:id`: Menghapus opsi dari database.

---

## 5. Order Pipeline Integration (`backend/modules/orders/service.ts`)

Saat pembuatan pesanan melalui `createOrder`:
1. **Pemeriksaan `optionIds`:**
   * Jika item pesanan memiliki `optionIds` non-kosong:
   * Query database untuk memastikan semua `optionIds` terdaftar di bawah `menuId` terkait.
2. **Kalkulasi Harga Satuan:**
   * `basePrice = menu.price`
   * `totalAdjustment = sum(selectedOptions.map(o => o.priceAdjustment))`
   * `effectiveUnitPrice = basePrice + totalAdjustment`
   * `orderItem.subtotal = effectiveUnitPrice * item.quantity`
3. **Penyimpanan Snapshot:**
   * Simpan `unitPriceSnapshot = effectiveUnitPrice` pada tabel `order_items`.
   * Simpan setiap opsi terpilih ke tabel `order_item_options`:
     * `optionNameSnapshot`: `option.name`
     * `priceAdjustmentSnapshot`: `option.priceAdjustment`

---

## 6. Authorization & Security

1. **Tenant Ownership Verification:**
   * Sebelum membuat, mengedit, atau menghapus opsi menu, sistem memverifikasi bahwa:
     * User dengan peran `tenant` adalah pemilik stan terkait (`tenants.ownerId === user.id`).
     * User dengan peran `admin-food-court` mengelola food court tempat stan berada.
     * User dengan peran `admin` memiliki akses penuh.
2. **Data Consistency:**
   * Relasi `menu_options.menuId` berstatus `onDelete: cascade`, sehingga jika menu dihapus, seluruh opsinya otomatis terhapus secara bersih.
