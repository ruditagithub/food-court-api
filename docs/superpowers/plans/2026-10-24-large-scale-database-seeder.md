# Implementation Plan: Large-Scale Modular Database Seeder (Real-Case 1 Year Simulation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem seeder database modular berkinerja tinggi yang mengisi 5 Cabang Food Court, 105 Tenant, ~2.800 Menu, dan 40.000+ Transaksi Pesanan realistis selama rentang waktu 14 bulan (Agustus 2025 s/d Oktober 2026).

**Architecture:** Arsitektur modular per entitas di direktori `backend/db/seeds/`, di-orchestrate oleh `backend/db/seed.ts`. Eksekusi bulk insertion menggunakan batch chunking (1.000 baris per query) dalam transaksi MySQL dengan penonaktifan sementara foreign key checks untuk mencapai kecepatan maksimal tanpa memory bloat atau timeout.

**Tech Stack:** Bun, TypeScript, ElysiaJS, Drizzle ORM, MySQL 8.x, Argon2id.

## Global Constraints
- Target direktori seeder: `backend/db/seeds/` dan file orchestrator `backend/db/seed.ts`.
- Akun login pengujian default: `admin@foodcourt.com`, `manager@foodcourt.com`, `tenant@foodcourt.com`, `customer@foodcourt.com` dengan password default: `password123`.
- Rentang tanggal pesanan: `2025-08-01` s/d `2026-10-24`.
- Jumlah Food Court: Tepat 5 cabang.
- Jumlah Tenant per Food Court: Minimal 20 (Target: 21 per FC, Total 105).
- Jumlah Menu per Tenant: Acak antara 10 s/d 40 menu.
- Jumlah Orders: Minimal 40.000 orders beserta relasi lengkapnya.
- Zero-orphan foreign keys: Seluruh UUID relasi harus konsisten dan valid.

---

### Task 1: Indonesian Data Bank & Batch Insert Helpers

**Files:**
- Create: `backend/db/seeds/helpers/indonesian-names.ts`
- Create: `backend/db/seeds/helpers/date-generator.ts`
- Create: `backend/db/seeds/helpers/batch-inserter.ts`

**Interfaces:**
- Produces:
  - `indonesianNames`: Daftar nama orang Indonesia, nama food court, kategori kuliner, brand stan, nama hidangan Nusantara, deskripsi menu, dan rentang harga.
  - `generateRandomOrderDate(startDate, endDate)`: Mengembalikan tanggal acak dengan kurva jam makan siang (11:30–14:00), makan malam (17:30–21:00), dan pembobotan akhir pekan (+35%).
  - `chunkedInsert(table, rows, chunkSize, label)`: Eksekusi bulk insert dengan chunking dan log persentase progres.

- [ ] **Step 1: Buat helper data bank Indonesia (`backend/db/seeds/helpers/indonesian-names.ts`)**
  - Menyediakan ratusan variasi nama orang Indonesia, 5 nama cabang food court, 100+ nama stan kuliner, 200+ nama makanan/minuman khas (Rawon, Soto, Gudeg, Sate, Bakso, Dimsum, Kopi, Boba, dsb.).

- [ ] **Step 2: Buat helper generator tanggal realistis (`backend/db/seeds/helpers/date-generator.ts`)**
  - Implementasi fungsi pemilihan waktu dengan distribusi probabilitas jam makan siang (40%), makan malam (45%), dan jam sepi (15%), serta faktor pengali hari Sabtu & Minggu.

- [ ] **Step 3: Buat helper chunked bulk insert berkinerja tinggi (`backend/db/seeds/helpers/batch-inserter.ts`)**
  - Implementasi fungsi pemecah array menjadi chunk 1.000 baris dengan eksekusi `await db.insert(table).values(chunk)` dan pelaporan durasi serta persentase progres di terminal.

- [ ] **Step 4: Commit**
  ```bash
  git add backend/db/seeds/helpers/
  git commit -m "feat(seed): add Indonesian data bank, date generator, and batch inserter helpers"
  ```

---

### Task 2: Database Cleaner & Reset Module

**Files:**
- Create: `backend/db/seeds/00-clean.seed.ts`

**Interfaces:**
- Produces: `cleanDatabase(): Promise<void>`

- [ ] **Step 1: Implementasikan modul pembersihan aman (`backend/db/seeds/00-clean.seed.ts`)**
  - Eksekusi `SET FOREIGN_KEY_CHECKS = 0;`
  - Truncate seluruh 19 tabel database: `payments`, `payment_group_items`, `payment_groups`, `order_status_logs`, `kitchen_queues`, `order_item_options`, `order_items`, `tenant_orders`, `orders`, `session_participants`, `dining_sessions`, `menu_options`, `menus`, `menu_categories`, `tenants`, `kiosks`, `tables`, `food_courts`, `users`.
  - Eksekusi `SET FOREIGN_KEY_CHECKS = 1;`
  - Log status pembersihan berhasil di terminal.

- [ ] **Step 2: Commit**
  ```bash
  git add backend/db/seeds/00-clean.seed.ts
  git commit -m "feat(seed): add cleanDatabase seed module"
  ```

---

### Task 3: Seed Users (Super Admin, Managers, Tenant Owners, Customers)

**Files:**
- Create: `backend/db/seeds/01-users.seed.ts`

**Interfaces:**
- Consumes: `cleanDatabase()`
- Produces: `seedUsers(): Promise<{ superAdmin: User, managers: User[], tenantOwners: User[], customers: User[] }>`

- [ ] **Step 1: Buat modul `backend/db/seeds/01-users.seed.ts`**
  - Hash password `password123` sekali saja menggunakan `Bun.password.hash(..., { algorithm: "argon2id" })`.
  - Masukkan 4 user default (`admin@foodcourt.com`, `manager@foodcourt.com`, `tenant@foodcourt.com`, `customer@foodcourt.com`).
  - Generate 5 Food Court Managers (`manager.surabaya@foodcourt.com`, dst.).
  - Generate 105 Tenant Owners (`tenant.001@foodcourt.com` s/d `tenant.105@foodcourt.com`).
  - Generate 200 Customers dengan nama dan email Indonesia.
  - Insert seluruh user via `chunkedInsert(users, allUsers)`.
  - Kembalikan objek user untuk digunakan modul berikutnya.

- [ ] **Step 2: Commit**
  ```bash
  git add backend/db/seeds/01-users.seed.ts
  git commit -m "feat(seed): add modular seedUsers for default and realistic users"
  ```

---

### Task 4: Seed Food Courts, Tables, & Kiosks

**Files:**
- Create: `backend/db/seeds/02-food-courts.seed.ts`
- Create: `backend/db/seeds/03-tables-kiosks.seed.ts`

**Interfaces:**
- Consumes: `users` dari Task 3.
- Produces: `seedFoodCourts(managers)`, `seedTablesAndKiosks(foodCourts)`

- [ ] **Step 1: Buat modul `backend/db/seeds/02-food-courts.seed.ts`**
  - Definisikan 5 cabang food court:
    1. Amici Food Court Grand City Surabaya
    2. Amici Food Court Grand Indonesia Jakarta
    3. Amici Food Court Paris Van Java Bandung
    4. Amici Food Court Beachwalk Kuta Bali
    5. Amici Food Court Pakuwon Mall Jogja
  - Hubungkan masing-masing cabang ke manajer terkait.
  - Insert ke tabel `food_courts`.

- [ ] **Step 2: Buat modul `backend/db/seeds/03-tables-kiosks.seed.ts`**
  - Generate 25 meja per cabang (`T-01` s/d `T-25`) dengan kapasitas 2, 4, 6, dan 8 kursi.
  - Generate QR token unik: `QR-{fcSlug}-{tableNumber}`.
  - Generate 2 Kiosk per cabang (`KIOSK-01`, `KIOSK-02`).
  - Insert ke tabel `tables` dan `kiosks`.

- [ ] **Step 3: Commit**
  ```bash
  git add backend/db/seeds/02-food-courts.seed.ts backend/db/seeds/03-tables-kiosks.seed.ts
  git commit -m "feat(seed): add modular seedFoodCourts and seedTablesAndKiosks"
  ```

---

### Task 5: Seed Tenants, Categories, & Menus

**Files:**
- Create: `backend/db/seeds/04-tenants.seed.ts`
- Create: `backend/db/seeds/05-menus.seed.ts`

**Interfaces:**
- Consumes: `foodCourts`, `tenantOwners`.
- Produces: `seedTenants(foodCourts, tenantOwners)`, `seedMenus(tenants)`

- [ ] **Step 1: Buat modul `backend/db/seeds/04-tenants.seed.ts`**
  - Generate 21 tenant per food court (Total: 105 tenant).
  - Berikan nama stan otentik (e.g. *Rawon Bu Siti, Soto Lamongan Cak Har, Bebek Sinjay, Gudeg Yu Djum, Bakso Malang Cak Man, Sate Ayam Ponorogo, Kopi Kenangan Nusantara, Dimsum House, dsb.*).
  - Nomor stan urut: `STAN-A01` s/d `STAN-C07`.
  - Tautkan `ownerId` ke tenant owner user.
  - Insert ke tabel `tenants`.

- [ ] **Step 2: Buat modul `backend/db/seeds/05-menus.seed.ts`**
  - Untuk setiap tenant, buat 2–4 kategori menu (`menu_categories`).
  - Untuk setiap tenant, generate antara 10 hingga 40 menu acak (`menus`).
  - Hitung total menu yang dihasilkan (~2.500 s/d 3.500 menu).
  - Tentukan harga menu realistis (Rp 8.000 s/d Rp 65.000), stok harian (30–100), estimasi masak (10–25 menit).
  - Insert `menu_categories` dan `menus` menggunakan `chunkedInsert`.

- [ ] **Step 3: Commit**
  ```bash
  git add backend/db/seeds/04-tenants.seed.ts backend/db/seeds/05-menus.seed.ts
  git commit -m "feat(seed): add modular seedTenants and seedMenus"
  ```

---

### Task 6: High-Performance Bulk Orders History Generator (40.000+ Orders)

**Files:**
- Create: `backend/db/seeds/06-orders-history.seed.ts`

**Interfaces:**
- Consumes: `foodCourts`, `tenants`, `tables`, `menus`, `customers`.
- Produces: `seedOrdersHistory(context, totalOrders = 40000)`

- [ ] **Step 1: Buat generator memori pesanan terdistribusi 14 bulan (`backend/db/seeds/06-orders-history.seed.ts`)**
  - Loop iterasi dari 1 s/d 40.000 (atau lebih).
  - Pilih tanggal pemesanan acak antara `2025-08-01` hingga `2026-10-24` menggunakan kurva waktu `generateRandomOrderDate()`.
  - Pilih cabang food court dan meja (atau takeaway).
  - Buat `dining_session` dan `session_participant`.
  - Pilih 1 s/d 2 tenant pada food court tersebut.
  - Pilih 1 s/d 3 menu per tenant untuk membentuk `order_items`.
  - Hitung snapshot harga, subtotal, tax amount (10%), service fee (Rp 2.000), dan total amount.
  - Tentukan status: 85% `COMPLETED` / `PAID`, 10% `CANCELLED`, 5% `REFUNDED` / `PENDING`.
  - Buat `kitchen_queue` per tenant order.
  - Buat `payment_group` dan `payment` (QRIS 60%, E-Wallet 20%, Cash 10%, Card 10%).
  - Buat `order_status_logs`.

- [ ] **Step 2: Implementasi chunked insert pipeline berurutan**
  - Masukkan data dalam batch 1.000 baris secara bertahap:
    1. `dining_sessions`
    2. `session_participants`
    3. `orders`
    4. `tenant_orders`
    5. `order_items`
    6. `kitchen_queues`
    7. `payment_groups`
    8. `payments`
    9. `order_status_logs`
  - Cetak indikator progres di terminal setiap 5.000 pesanan (`[12.5%] 5.000 / 40.000 orders selesai`).

- [ ] **Step 3: Commit**
  ```bash
  git add backend/db/seeds/06-orders-history.seed.ts
  git commit -m "feat(seed): add high-performance 40k+ orders history seeder"
  ```

---

### Task 7: Master Runner Orchestrator & Validasi Akhir

**Files:**
- Modify: `backend/db/seed.ts`

- [ ] **Step 1: Perbarui `backend/db/seed.ts` untuk memanggil seluruh modul**
  - Panggil `cleanDatabase()`
  - Panggil `seedUsers()`
  - Panggil `seedFoodCourts()`
  - Panggil `seedTablesAndKiosks()`
  - Panggil `seedTenants()`
  - Panggil `seedMenus()`
  - Panggil `seedOrdersHistory(context, 40000)`
  - Tampilkan ringkasan statistik akhir (total waktu, total baris per tabel).

- [ ] **Step 2: Jalankan `bun run seed` di backend**
  - Pantau log eksekusi hingga selesai (exit code 0).
  - Pastikan tidak ada foreign key violation atau duplicate key error.

- [ ] **Step 3: Eksekusi query validasi integritas data**
  - Jalankan script verifikasi:
    - Count per tabel (`food_courts` = 5, `tenants` = 105, `menus` ≥ 2.500, `orders` ≥ 40.000).
    - Rentang tanggal: `MIN(created_at)` sekitar Agustus 2025 dan `MAX(created_at)` Oktober 2026.
    - Zero orphan check (`LEFT JOIN` orders dan tenant_orders).

- [ ] **Step 4: Commit**
  ```bash
  git add backend/db/seed.ts
  git commit -m "feat(seed): integrate all modular seeders into master seed.ts runner"
  ```

---

## Verification Plan

### Automated Verification
1. Jalankan seeder penuh:
   ```bash
   cd backend
   bun run seed
   ```
2. Jalankan automated upload & backend test untuk memastikan tidak ada schema breakage:
   ```bash
   bun test
   ```
3. Jalankan automated SQL verification count script:
   ```bash
   bun run test/verify-seed.ts
   ```
   Ekspektasi: Seluruh count sesuai target (5 FC, 105 tenant, 40.000+ orders, rentang tanggal Agustus 2025 - Oktober 2026).

### Manual Verification
1. Buka browser di frontend:
   - Login sebagai Super Admin (`admin@foodcourt.com` / `password123`) di `/app/login`.
   - Buka `/app/dashboard`: Verifikasi chart omzet tahunan, grafik penjualan per cabang, dan total statistik bento penuh dengan data 1 tahun.
   - Buka `/app/super-admin/tenants`: Verifikasi 105 tenant tampil dengan stan dan cabang masing-masing.
   - Buka `/app/super-admin/menus`: Verifikasi ribuan menu kuliner Indonesia dapat difilter per cabang dan per tenant.
   - Buka `/app/admin/orders`: Verifikasi puluhan ribu pesanan tampil dengan filter tanggal, status, dan rincian meja.
