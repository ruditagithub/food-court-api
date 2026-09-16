# Alur 1: Pelanggan & Meja (Customer & Table Ordering Flow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun backend lengkap untuk Alur Pelanggan dan Meja pada Food Court API, meliputi skema database multi-tier (Drizzle ORM), resolusi otomatis sesi makan (`dining_sessions`), snapshot menu/harga, pemecahan sub-order kios (`tenant_orders`), antrean awal dapur (`kitchen_queues`), tagihan awal (`payment_groups`), dan pelacakan pesanan publik.

**Architecture:** Menerapkan arsitektur *Clean Evolution with Seamless Gateway*: saat pelanggan memesan via `POST /api/orders` dengan menyertakan `tableId`, sistem secara atomik memverifikasi meja, membuat sesi aktif di `dining_sessions`, mengunci meja menjadi `occupied`, menghitung snapshot harga menu & varian di `order_items`, membagi item per gerai ke `tenant_orders`, membuat antrean dapur awal di `kitchen_queues`, dan menyiapkan grup tagihan default di `payment_groups`.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, MySQL2, TypeBox validation, Bun test runner.

## Global Constraints

- File skema database di `src/db/schema.ts` menggunakan konvensi Drizzle ORM MySQL: kolom database `snake_case`, properti objek TypeScript `camelCase`.
- Seluruh harga menggunakan tipe data `int` (Rupiah murni tanpa sen).
- Primary Key seluruh tabel menggunakan `varchar("id", { length: 36 })` yang di-generate via `crypto.randomUUID()`.
- Wajib mempertahankan tabel `users` dan relasi `ownerId` pada `tenants` agar autentikasi Admin dan Tenant tetap berjalan lancar.
- Penanganan error menggunakan kelas `AppError` (`BadRequestError`, `NotFoundError`, `ForbiddenError`) di `src/common/errors`.

---

### Task 1: Update Skema Database Drizzle (19 Tabel Komprehensif)

**Files:**
- Modify: `src/db/schema.ts`
- Test: `test/schema_integrity.test.ts`

**Interfaces:**
- Produces: Seluruh 19 tabel Drizzle (`users`, `foodCourts`, `tables`, `kiosks`, `tenants`, `menuCategories`, `menus`, `menuOptions`, `diningSessions`, `sessionParticipants`, `orders`, `tenantOrders`, `orderItems`, `orderItemOptions`, `kitchenQueues`, `orderStatusLogs`, `paymentGroups`, `paymentGroupItems`, `payments`) dan relasi `relations()`-nya.

- [ ] **Step 1: Tulis tes verifikasi integritas skema tabel**

```typescript
// test/schema_integrity.test.ts
import { describe, expect, it } from "bun:test";
import {
  users,
  foodCourts,
  tables,
  kiosks,
  tenants,
  menuCategories,
  menus,
  menuOptions,
  diningSessions,
  sessionParticipants,
  orders,
  tenantOrders,
  orderItems,
  orderItemOptions,
  kitchenQueues,
  orderStatusLogs,
  paymentGroups,
  paymentGroupItems,
  payments,
} from "../src/db/schema";

describe("Drizzle Schema Integrity Check", () => {
  it("harus mengekspor seluruh 19 tabel yang didefinisikan", () => {
    expect(users).toBeDefined();
    expect(foodCourts).toBeDefined();
    expect(tables).toBeDefined();
    expect(kiosks).toBeDefined();
    expect(tenants).toBeDefined();
    expect(menuCategories).toBeDefined();
    expect(menus).toBeDefined();
    expect(menuOptions).toBeDefined();
    expect(diningSessions).toBeDefined();
    expect(sessionParticipants).toBeDefined();
    expect(orders).toBeDefined();
    expect(tenantOrders).toBeDefined();
    expect(orderItems).toBeDefined();
    expect(orderItemOptions).toBeDefined();
    expect(kitchenQueues).toBeDefined();
    expect(orderStatusLogs).toBeDefined();
    expect(paymentGroups).toBeDefined();
    expect(paymentGroupItems).toBeDefined();
    expect(payments).toBeDefined();
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memverifikasi kegagalan awal**

Jalankan: `bun test test/schema_integrity.test.ts`
Ekspektasi: Gagal karena tabel-tabel baru belum diekspor dari `src/db/schema.ts`.

- [ ] **Step 3: Implementasikan pembaruan skema lengkap di `src/db/schema.ts`**

Perbarui `src/db/schema.ts` dengan 19 tabel dan relasi lengkap sesuai spesifikasi:
- `users`: Pertahankan `id`, `name`, `email`, `passwordHash`, `role`.
- `foodCourts`: `id`, `name`, `slug`, `address`, `phone`, `logo`, `status` (`ACTIVE`, `INACTIVE`).
- `tables`: `id`, `foodCourtId`, `tableNumber`, `qrToken`, `capacity`, `status` (`available`, `occupied`, `disabled`).
- `kiosks`: `id`, `foodCourtId`, `kioskName`, `deviceCode`, `location`, `status`.
- `tenants`: `id`, `foodCourtId`, `ownerId`, `name`, `slug`, `stallNumber`, `description`, `logo`, `isOpen`, `openingTime`, `closingTime`.
- `menuCategories`: `id`, `tenantId`, `name`, `sortOrder`.
- `menus`: `id`, `tenantId`, `categoryId`, `name`, `description`, `price`, `stock`, `status`, `preparationTime`, `imageUrl`.
- `menuOptions`: `id`, `menuId`, `name`, `priceAdjustment`.
- `diningSessions`: `id`, `foodCourtId`, `tableId`, `kioskId`, `sessionCode`, `orderType`, `status`, `startedAt`, `expiredAt`.
- `sessionParticipants`: `id`, `sessionId`, `userId`, `name`, `deviceToken`, `isHost`, `joinedAt`.
- `orders`: `id`, `sessionId`, `orderNumber`, `subtotal`, `taxAmount`, `serviceFee`, `discountAmount`, `totalAmount`, `paymentStatus`, `orderStatus`, `notes`.
- `tenantOrders`: `id`, `orderId`, `tenantId`, `subtotal`, `status`, `sentToKitchenAt`.
- `orderItems`: `id`, `tenantOrderId`, `menuId`, `menuNameSnapshot`, `unitPriceSnapshot`, `quantity`, `subtotal`, `notes`.
- `orderItemOptions`: `id`, `orderItemId`, `optionNameSnapshot`, `priceAdjustmentSnapshot`.
- `kitchenQueues`: `id`, `tenantOrderId`, `queueNumber`, `status`, `queuedAt`, `startedAt`, `finishedAt`.
- `orderStatusLogs`: `id`, `orderId`, `status`, `description`, `createdAt`.
- `paymentGroups`: `id`, `orderId`, `participantId`, `amountDue`, `amountPaid`, `status`.
- `paymentGroupItems`: `id`, `paymentGroupId`, `orderItemId`, `allocatedAmount`.
- `payments`: `id`, `paymentGroupId`, `paymentReference`, `paymentMethod`, `provider`, `amount`, `status`, `paidAt`, `expiredAt`.

- [ ] **Step 4: Jalankan tes integritas skema untuk memastikan lolos**

Jalankan: `bun test test/schema_integrity.test.ts`
Ekspektasi: PASS.

- [ ] **Step 5: Commit perubahan skema**

```bash
git add src/db/schema.ts test/schema_integrity.test.ts
git commit -m "feat(db): implement comprehensive 19-table schema in drizzle"
```

---

### Task 2: DTO Model Validasi Pemesanan & Sesi Meja

**Files:**
- Modify: `src/modules/orders/model.ts`
- Modify: `src/modules/tables/model.ts`

**Interfaces:**
- Consumes: TypeBox `t` dari Elysia.
- Produces:
  - `CreateOrderDTO`, `CreateOrderDTOType` (dengan field `tableId`, `sessionId`, `customerName`, `orderType`, `items`, `notes`, `options`).
  - `JoinSessionDTO`, `JoinSessionDTOType` (dengan `qrToken`, `sessionCode`, `participantName`).
  - `UpdateOrderStatusDTO`, `UpdateTenantOrderStatusDTO`.

- [ ] **Step 1: Perbarui `src/modules/orders/model.ts` dengan skema DTO yang kaya**

Tambahkan validasi:
- Item pesanan menampung `menuId`, `quantity` (min 1), `notes` (opsional), dan `optionIds` (opsional array string).
- Request pesanan menerima `tableId` (opsional jika via sesi), `sessionId` (opsional jika via meja), `customerName`, `orderType` (`DINE_IN` / `TAKEAWAY`), dan `notes`.
- DTO untuk filter pencarian dan query pagination.

- [ ] **Step 2: Perbarui `src/modules/tables/model.ts` untuk menyertakan `foodCourtId` dan `qrToken`**

Pastikan DTO pembuatan meja menampung `foodCourtId` opsional (atau fallback ke default) dan `qrToken`.

- [ ] **Step 3: Commit pembaruan DTO Model**

```bash
git add src/modules/orders/model.ts src/modules/tables/model.ts
git commit -m "feat(orders): expand DTO validation models for multi-tier table sessions"
```

---

### Task 3: Implementasi Logika Service Alur Pemesanan Meja (`OrderService`)

**Files:**
- Modify: `src/modules/orders/service.ts`

**Interfaces:**
- Consumes: `db` client, `schema` tables, DTO types dari `model.ts`, error classes dari `src/common/errors`.
- Produces:
  - `orderService.create(data, currentUser)`:
    1. Cek atau buat `foodCourtId` default jika belum ada.
    2. Validasi `tableId` dan cek sesi aktif di `dining_sessions`.
    3. Jika meja belum punya sesi aktif, buat sesi baru (`ACTIVE`) + host participant di `session_participants`, serta ubah status meja jadi `occupied`.
    4. Ambil dan validasi seluruh `menus` & opsi `menuOptions` yang diminta.
    5. Validasi ketersediaan menu dan status buka kios tenant.
    6. Generate `orderNumber` (format: `FC-xxxxxx-xxx`).
    7. Kelompokkan item per `tenant_id` dan simpan sub-order di `tenant_orders` (status `WAITING_PAYMENT`).
    8. Simpan `order_items` dengan `menu_name_snapshot`, `unit_price_snapshot`, `subtotal`, serta snapshot opsi di `order_item_options`.
    9. Buat entri antrean awal di `kitchen_queues` (`QUEUED`).
    10. Buat grup tagihan default di `payment_groups` dan alokasikan item ke `payment_group_items`.
    11. Catat log status di `order_status_logs`.
  - `orderService.getById(id)`: Mengambil master order beserta sesi meja, sub-order per kios, item snapshot, kitchen queue, dan tagihan.
  - `orderService.trackByOrderNumber(orderNumber)`: Pelacakan publik status pesanan.
  - `orderService.joinSession(data, currentUser)`: Bergabung ke meja aktif via `qrToken` atau `sessionCode`.

- [ ] **Step 1: Implementasikan method-method tersebut di `src/modules/orders/service.ts` secara lengkap tanpa placeholder**

- [ ] **Step 2: Commit pembaruan service**

```bash
git add src/modules/orders/service.ts
git commit -m "feat(orders): implement multi-tier table session ordering logic in OrderService"
```

---

### Task 4: Perbarui Controller Endpoint Pemesanan (`src/modules/orders/index.ts`)

**Files:**
- Modify: `src/modules/orders/index.ts`

**Interfaces:**
- Produces Endpoint:
  - `POST /api/orders`: Buat pesanan baru.
  - `GET /api/orders`: List pesanan.
  - `GET /api/orders/:id`: Detail lengkap pesanan.
  - `GET /api/orders/track/:orderNumber`: Pelacakan pesanan publik.
  - `POST /api/orders/sessions/join`: Bergabung ke sesi meja.
  - `PATCH /api/orders/tenant-orders/:id/status`: Tenant mengupdate status masak sub-order kiosnya.
  - `PATCH /api/orders/:id/status`: Tenant atau Admin menyelesaikan pesanan & membebaskan meja.

- [ ] **Step 1: Pasang rute-rute tersebut di `src/modules/orders/index.ts` dengan TypeBox validation dan Swagger tag `Orders`**

- [ ] **Step 2: Commit controller**

```bash
git add src/modules/orders/index.ts
git commit -m "feat(orders): register new customer and table endpoints in ordersController"
```

---

### Task 5: End-to-End Testing Alur Pelanggan & Meja

**Files:**
- Create: `test/customer_table_flow.test.ts`
- Modify: `test/food_court_flow.test.ts`

**Interfaces:**
- Menguji seluruh siklus dari awal sampai akhir:
  1. Setup Admin, Food Court, Meja (dengan `qrToken`), Tenant, Kategori, Menu, dan Opsi Menu.
  2. Pelanggan scan QR meja dan melakukan checkout pemesanan (`POST /api/orders`).
  3. Verifikasi: Meja berubah jadi `occupied`.
  4. Verifikasi: Terbentuk `dining_sessions` berstatus `ACTIVE`.
  5. Verifikasi: Terbentuk `orders` (master) dan `tenant_orders` (sub-order stan).
  6. Verifikasi: Item pesanan memiliki `menu_name_snapshot` dan `unit_price_snapshot`.
  7. Verifikasi: Terbentuk antrean awal di `kitchen_queues`.
  8. Verifikasi: Pelacakan pesanan via `GET /api/orders/track/:orderNumber`.
  9. Pelanggan lain bergabung ke meja via `POST /api/orders/sessions/join`.

- [ ] **Step 1: Tulis automated test di `test/customer_table_flow.test.ts`**

- [ ] **Step 2: Jalankan test suite**

Jalankan: `bun test test/customer_table_flow.test.ts`
Ekspektasi: 100% PASS (Semua assertion hijau).

- [ ] **Step 3: Jalankan keseluruhan test suite backend**

Jalankan: `bun test`
Ekspektasi: Semua test suite (`health.test.ts`, `auth.test.ts`, `customer_table_flow.test.ts`, dll.) lolos.

- [ ] **Step 4: Commit hasil pengujian**

```bash
git add test/customer_table_flow.test.ts test/food_court_flow.test.ts
git commit -m "test: add comprehensive end-to-end test suite for customer and table flow"
```
