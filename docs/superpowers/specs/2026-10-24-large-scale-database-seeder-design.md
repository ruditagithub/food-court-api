# Design Specification: Large-Scale Modular Database Seeder (Real-Case 1 Year Simulation)

**Date**: 2026-10-24  
**Author**: Antigravity Assistant  
**Status**: Draft (Awaiting User Review)  
**Target System**: `backend` (ElysiaJS + Drizzle ORM + MySQL 8.x + Bun)

---

## 1. Executive Summary & Goals

Tujuan spesifikasi ini adalah merancang sistem seeder database berskala besar, realistis, dan berkinerja tinggi (*high performance bulk generation*) untuk aplikasi Food Court Multi-Tenant API.

### Kebutuhan Utama:
1. **Skala Data**:
   - **5 Cabang Food Court** terkemuka di Indonesia (Surabaya, Jakarta, Bandung, Bali, Yogyakarta).
   - **Minimal 20 Tenant per Food Court** (Total: 100–120 Tenant unik dengan stan `STAN-A01` dst).
   - **10 s/d 40 Menu Kuliner per Tenant** (Total: ~2.500 s/d 3.500 hidangan kuliner Nusantara).
   - **Minimal 40.000 Pesanan (Orders)** dengan seluruh relasi lengkap (`dining_sessions`, `session_participants`, `tenant_orders`, `order_items`, `kitchen_queues`, `payment_groups`, `payments`, `order_status_logs`).
2. **Rentang Waktu Realistis**:
   - Transaksi terdistribusi dari **1 Agustus 2025 s/d 24 Oktober 2026** (~14 bulan).
   - Mengikuti pola kurva makan siang (11:30–13:30) dan makan malam (18:00–20:30), serta lonjakan pesanan akhir pekan (*weekend peak*).
3. **Integritas Relasional & Foreign Key Strictness**:
   - Seluruh UUID konsisten dan berpasangan sempurna (`sessionId`, `orderId`, `tenantOrderId`, `foodCourtId`, `tenantId`, `menuId`, `paymentGroupId`).
   - Perhitungan total rupiah (`subtotal`, `taxAmount`, `serviceFee`, `totalAmount`) presisi dan matematis cocok antara master order dan tenant order.
4. **Arsitektur Modular**:
   - Direktori `backend/db/seeds/` dengan berkas independen per entitas.
   - Master orchestrator `backend/db/seed.ts` yang menjalankan seluruh modul secara sekuensial.
   - Eksekusi cepat melalui *chunked bulk insert* (batch 500–1.000 rows) agar 40.000+ orders selesai dalam hitungan detik, bukan jam.

---

## 2. Arsitektur Berkas & Modul

```text
backend/db/
├── index.ts
├── schema.ts
├── seed.ts                         <-- Master runner / orchestrator
└── seeds/
    ├── helpers/
    │   ├── indonesian-names.ts     <-- Bank data nama orang, brand kios, hidangan Nusantara
    │   ├── date-generator.ts       <-- Generator waktu realistis (kurva jam makan & weekend)
    │   └── batch-inserter.ts       <-- Helper chunked bulk insert performa tinggi
    ├── 00-clean.seed.ts            <-- Reset database aman (SET FOREIGN_KEY_CHECKS = 0)
    ├── 01-users.seed.ts            <-- 4 Akun default + 5 Manajer FC + 100+ Tenant Owners + 200 Customers
    ├── 02-food-courts.seed.ts      <-- 5 Food Courts (Surabaya, Jakarta, Bandung, Bali, Jogja)
    ├── 03-tables-kiosks.seed.ts    <-- 125 Meja QR (25 per FC) + Kiosk Devices
    ├── 04-tenants.seed.ts          <-- 105 Tenant Kios (21 per FC) dengan jam operasional & stan
    ├── 05-menus.seed.ts            <-- 300+ Kategori & ~2.800 Menu Kuliner lengkap
    └── 06-orders-history.seed.ts   <-- 40.000+ Pesanan, Sub-orders, Items, Queues, Payments (14 Bulan)
```

---

## 3. Detail Data & Domain

### A. Akun Pengguna (`01-users.seed.ts`)
Password default untuk seluruh akun: **`password123`** (`argon2id`).
- **Super Admin (Default)**: `admin@foodcourt.com` (Nama: *Super Admin Amici*)
- **Admin Food Court (Default)**: `manager@foodcourt.com` (Nama: *Manajer Grand City*)
- **Tenant Owner (Default)**: `tenant@foodcourt.com` (Nama: *Ibu Siti - Warung Rawon*)
- **Customer (Default)**: `customer@foodcourt.com` (Nama: *Rizky Ramadhan*)
- **5 Manajer Food Court Tambahan**:
  - `manager.surabaya@foodcourt.com`, `manager.jakarta@foodcourt.com`, `manager.bandung@foodcourt.com`, `manager.bali@foodcourt.com`, `manager.jogja@foodcourt.com`.
- **105 Akun Pemilik Kios**:
  - `tenant.rawon01@foodcourt.com`, `tenant.sate02@foodcourt.com`, dll.
- **200 Akun Pelanggan Terdaftar**:
  - Nama-nama khas Indonesia (Budi Santoso, Dewi Lestari, Ahmad Fauzi, dsb.).

### B. 5 Cabang Food Court (`02-food-courts.seed.ts`)
1. **Amici Food Court Grand City Surabaya** (`slug: fc-grand-city-surabaya`)
2. **Amici Food Court Grand Indonesia Jakarta** (`slug: fc-grand-indonesia-jakarta`)
3. **Amici Food Court Paris Van Java Bandung** (`slug: fc-paris-van-java-bandung`)
4. **Amici Food Court Beachwalk Kuta Bali** (`slug: fc-beachwalk-kuta-bali`)
5. **Amici Food Court Pakuwon Mall Jogja** (`slug: fc-pakuwon-mall-jogja`)

### C. Meja & Kiosk (`03-tables-kiosks.seed.ts`)
- Setiap food court memiliki 25 meja makan (Total: 125 meja, `T-01` s/d `T-25`).
- Setiap meja memiliki `qrToken` unik (`QR-FC{1..5}-T{01..25}`).
- 2 Kiosk self-service per cabang (`KIOSK-01`, `KIOSK-02`).

### D. 105 Tenant Kios (`04-tenants.seed.ts`)
Setiap cabang memiliki 21 gerai spesifik dengan ragam kuliner khas:
1. Masakan Tradisional Jawa (Rawon, Soto Ayam Lamongan, Gudeg, Tahu Telur).
2. Olahan Daging & Unggas (Bebek Sinjay, Ayam Goreng Kalasan, Sate Madura).
3. Kuliner Mie & Bakso (Bakso Malang Kota, Mie Ayam Jamur, Cuanki Bandung).
4. Masakan Padang & Minang (Nasi Padang Salero Bundo, Rendang Asli).
5. Kuliner Seafood & Ikan Bakar (Ikan Bakar Jimbaran, Cumi Saus Padang).
6. Western & Fast Food (Burger Bento, Pasta Pronto, Crispy Chicken).
7. Kuliner Oriental (Nasi Goreng Hongkong, Dimsum House, Kwetiau Sapi).
8. Minuman Tradisional (Es Cendol Durian, Es Doger, Wedang Ronde).
9. Modern Beverage & Coffee (Kopi Kenangan Amici, Matcha House, Boba Station).
10. Snack & Dessert (Martabak Manis, Pisang Goreng Crispy, Roti Bakar).

### E. Menu Kuliner (`05-menus.seed.ts`)
- Setiap tenant memiliki 2–4 kategori menu (contoh: *Makanan Utama, Kudapan/Snack, Minuman Segar*).
- Setiap tenant memiliki antara 10 hingga 40 menu acak.
- Harga menu realistis:
  - Makanan utama: Rp 18.000 – Rp 65.000
  - Camilan: Rp 8.000 – Rp 25.000
  - Minuman: Rp 4.000 – Rp 28.000
- Stok harian: 30–100 porsi per menu.
- Status menu: 95% `AVAILABLE`, 5% `OUT_OF_STOCK`.

---

## 4. Simulasi Transaksi 40.000+ Pesanan (`06-orders-history.seed.ts`)

### A. Distribusi Tanggal & Jam (Agustus 2025 – Oktober 2026)
- **Rentang Hari**: ~450 hari.
- **Rata-rata Pesanan Harian**: ~85 – 100 pesanan per hari di seluruh 5 cabang.
- **Kurva Waktu Pemesanan**:
  - 11:30 – 14:00 (Makan Siang): 40% pesanan.
  - 17:30 – 21:00 (Makan Malam): 45% pesanan.
  - 09:00 – 11:30 & 14:00 – 17:30 (Sore/Snack): 15% pesanan.
- **Faktor Weekend**: Volume Sabtu & Minggu ditingkatkan sebesar +35%.

### B. Alur Relasi Data per Pesanan
Untuk setiap pesanan:
1. `dining_sessions`:
   - `orderType`: 80% `DINE_IN` (terkait meja), 20% `TAKEAWAY`.
   - `status`: `COMPLETED` (85%), `CANCELLED` (10%), `PAYMENT_PENDING` (5%).
2. `session_participants`:
   - Terkait user customer acak atau guest name.
3. `orders` (Master Order):
   - `orderNumber`: `ORD-YYYYMMDD-XXXXX`
   - `subtotal`: Penjumlahan item menu.
   - `taxAmount`: 10% dari subtotal.
   - `serviceFee`: Rp 2.000 (tetap).
   - `totalAmount`: `subtotal + taxAmount + serviceFee`.
4. `tenant_orders`:
   - Satu sesi dapat memesan ke 1 hingga 3 tenant berbeda (multi-tenant order).
5. `order_items`:
   - 1 hingga 3 item per tenant order dengan `menuNameSnapshot` & `unitPriceSnapshot`.
6. `kitchen_queues`:
   - Tiket antrean bernomor `Q-001` s/d `Q-999` per tenant per hari.
7. `payment_groups` & `payments`:
   - Metode: `QRIS` (60%), `E_WALLET` (20%), `CASH` (10%), `CARD` (10%).
   - Status: `SUCCESS` (85%), `FAILED` (10%), `REFUNDED` (5%).

---

## 5. Strategi Performa Bulk Insert (Menghindari Timeout / Crash)

Memasukkan 40.000 orders berarti menyisipkan **~350.000 total baris database**. Jika dilakukan satu per satu (`row-by-row`), proses memakan waktu berjam-jam.

### Solusi Teknis Performa:
1. **In-Memory Pre-computation**:
   - Seluruh objek data dihitung dan digenerate di memori terlebih dahulu ke dalam *arrays*.
2. **Chunked Bulk Insert (Ukuran Batch 1.000 Baris)**:
   ```typescript
   async function bulkInsert<T>(table: any, rows: T[], chunkSize = 1000) {
     for (let i = 0; i < rows.length; i += chunkSize) {
       const chunk = rows.slice(i, i + chunkSize);
       await db.insert(table).values(chunk);
     }
   }
   ```
3. **Optimasi Foreign Key Checks**:
   - `await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`)` saat truncate dan bulk seeding, kemudian diaktifkan kembali `SET FOREIGN_KEY_CHECKS = 1;` setelah selesai.
4. **Terminal Progress Indicator**:
   - Menampilkan status progres interaktif per batch (e.g. `[25%] 10.000 / 40.000 orders generated & inserted`).

---

## 6. Verifikasi & Pengujian Seeder

1. **Integritas Count**:
   - `SELECT COUNT(*) FROM food_courts` ➔ Tepat 5.
   - `SELECT COUNT(*) FROM tenants` ➔ Minimal 100 (tepat 105).
   - `SELECT COUNT(*) FROM menus` ➔ Minimal 2.000 (antara 2.500–3.500).
   - `SELECT COUNT(*) FROM orders` ➔ Minimal 40.000.
2. **Integritas Tanggal**:
   - `SELECT MIN(created_at), MAX(created_at) FROM orders` ➔ Rentang `2025-08-01` s/d `2026-10-24`.
3. **Integritas Relasi**:
   - Query verifikasi `JOIN orders o INNER JOIN tenant_orders to ON o.id = to.order_id INNER JOIN order_items oi ON to.id = oi.tenant_order_id` tidak ada foreign key yatim (*no orphan rows*).
4. **Dashboard Frontend Test**:
   - Buka `/app/dashboard` dengan Super Admin dan Tenant untuk memastikan chart omzet, grafik tren bulanan, dan rekap pesanan langsung tampil memukau dan akurat.

---

## 7. Rencana Eksekusi Berdasarkan Persetujuan

Setelah rancangan ini disetujui:
1. Membuat helper data Nusantara (`helpers/`).
2. Membuat modul `00-clean.seed.ts` s/d `05-menus.seed.ts`.
3. Mengembangkan generator performa tinggi `06-orders-history.seed.ts` (40.000 pesanan).
4. Menghubungkan ke `backend/db/seed.ts`.
5. Menjalankan `bun run seed` dan mengonfirmasi output di database.
