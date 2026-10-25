# Design Specification: Tenant Wallet, 1% Platform Fee Settlement, and Withdrawal System

- **Date:** 2026-10-25
- **Status:** Approved
- **Target Audience:** Food Court Admin, Tenants (Stall Owners), Platform Owner (Super Admin)

---

## 1. Executive Summary & Business Objective

Dalam ekosistem aplikasi food court digital ini, platform bertindak sebagai perantara pemesanan digital di mana pemilik aplikasi (Super Admin) menyediakan sistem untuk pengelola food court (Admin Food Court) dan gerai kuliner (Tenants). 

Fitur ini menyediakan mekanisme otomatisasi keuangan ujung-ke-ujung (*end-to-end financial settlement*):
1. **Pemotongan Biaya Aplikasi (1%):** Setiap pesanan yang telah dibayar lunas akan dipotong biaya aplikasi sebesar **1%** untuk pemilik aplikasi (Super Admin), dan sisa **99%** menjadi hak bersih tenant.
2. **Log Transaksi Pendapatan & Buku Kas (Double-Entry Ledger):** Setiap subtotal pesanan per tenant dicatat secara transparan pada tabel log mutasi saldo (`tenant_balance_logs`).
3. **Dompet & Saldo Tenant (`tenants.balance`):** Setiap tenant memiliki saldo aktif yang bertambah otomatis saat pesanan lunas.
4. **Pengajuan Penarikan Dana (Withdrawal Request):** Tenant dapat mengajukan pencairan saldo ke Admin Food Court via **Transfer Bank/E-Wallet** atau **Tunai Langsung (Cash)**. Saldo langsung dikunci (*held*) saat pengajuan untuk mencegah penarikan ganda.
5. **Pemrosesan & Validasi Dua Tahap:** Admin Food Court memproses penarikan dengan menyertakan bukti transfer atau catatan serah terima cash, lalu status divalidasi hingga tuntas (*COMPLETED*) setelah dana dikonfirmasi diterima oleh tenant.

---

## 2. Database Architecture & Schema Design

Perubahan dan penambahan skema dibuat menggunakan Drizzle ORM pada file `backend/db/schema.ts`:

### 2.1. Pembaruan Tabel `tenants`
Menambahkan kolom pelacakan saldo dan informasi rekening bank default:
```typescript
// Kolom tambahan pada tabel tenants
balance: int("balance").notNull().default(0), // Saldo aktif tenant dalam Rupiah
bankName: varchar("bank_name", { length: 50 }), // Rekening default (opsional)
bankAccountNumber: varchar("bank_account_number", { length: 50 }),
bankAccountHolder: varchar("bank_account_holder", { length: 100 }),
```

### 2.2. Tabel Baru: `tenant_balance_logs`
Mencatat seluruh mutasi debit/kredit saldo tenant untuk keperluan audit keuangan:
```typescript
export const tenantBalanceLogs = mysqlTable("tenant_balance_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  tenantOrderId: varchar("tenant_order_id", { length: 36 })
    .references(() => tenantOrders.id, { onDelete: "set null" }),
  withdrawalRequestId: varchar("withdrawal_request_id", { length: 36 })
    .references(() => withdrawalRequests.id, { onDelete: "set null" }),
  type: mysqlEnum("type", [
    "ORDER_REVENUE",       // Pemasukan dari pesanan yang lunas (+netAmount)
    "WITHDRAWAL_HOLD",    // Penguncian saldo saat ajukan penarikan (-amount)
    "WITHDRAWAL_REFUND",  // Pengembalian saldo jika penarikan ditolak (+amount)
    "WITHDRAWAL_COMPLETED"// Penanda penarikan selesai (netAmount: 0)
  ]).notNull(),
  grossAmount: int("gross_amount").notNull().default(0), // Subtotal kotor tenant
  platformFee: int("platform_fee").notNull().default(0), // 1% fee aplikasi
  netAmount: int("net_amount").notNull(),                 // Nilai mutasi (+/-)
  balanceAfter: int("balance_after").notNull(),           // Snapshot saldo setelah mutasi
  description: text("description"),                      // Catatan mutasi human-readable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 2.3. Tabel Baru: `withdrawal_requests`
Menyimpan riwayat pengajuan pencairan saldo dari tenant ke Admin Food Court:
```typescript
export const withdrawalRequests = mysqlTable("withdrawal_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  foodCourtId: varchar("food_court_id", { length: 36 })
    .notNull()
    .references(() => foodCourts.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id", { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  amount: int("amount").notNull(),
  paymentMethod: mysqlEnum("payment_method", ["CASH", "TRANSFER"]).notNull(),
  bankName: varchar("bank_name", { length: 50 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountHolder: varchar("bank_account_holder", { length: 100 }),
  status: mysqlEnum("status", [
    "PENDING",    // Diajukan tenant, saldo di-hold
    "PROCESSED",  // Admin mengirim transfer / menyerahkan cash + bukti
    "COMPLETED",  // Tenant konfirmasi penerimaan / admin selesaikan cash
    "REJECTED",   // Ditolak admin, saldo dikembalikan ke tenant
  ]).notNull().default("PENDING"),
  proofReceiptUrl: varchar("proof_receipt_url", { length: 255 }), // Gambar bukti transfer/kwitansi
  transferReference: varchar("transfer_reference", { length: 100 }), // No. referensi bank
  adminNotes: text("admin_notes"),                                // Catatan / alasan penolakan
  processedBy: varchar("processed_by", { length: 36 })
    .references(() => users.id, { onDelete: "set null" }),        // User ID Admin Food Court
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

---

## 3. Business Logic & Settlement Calculation

### 3.1. Settlement Pesanan Lunas (Order Paid)
1. Terjadi saat seluruh tagihan pesanan telah berstatus `PAID` pada `orders` (`settlePaymentGroup` atau `completePayment`).
2. Iterasi setiap `tenantOrders` di bawah pesanan tersebut:
   * **Pengecekan Idempotensi:** Cek apakah sudah ada log bertipe `ORDER_REVENUE` dengan `tenantOrderId` tersebut di `tenant_balance_logs`. Jika sudah ada, lewati agar saldo tidak terisi ganda.
   * `grossAmount = tenantOrder.subtotal`
   * `platformFee = Math.round(grossAmount * 0.01)` (1% komisi platform)
   * `netAmount = grossAmount - platformFee` (99% hak bersih tenant)
   * Dalam DB transaction:
     * Ambil `balance` tenant saat ini.
     * `balanceAfter = currentBalance + netAmount`
     * Insert log mutasi ke `tenant_balance_logs`.
     * Update `tenants.balance = balanceAfter`.

### 3.2. Alur Pengajuan Penarikan Saldo Tenant
1. **Validasi:** Nominal penarikan $\ge$ Rp 10.000 dan $\le$ `tenant.balance`.
2. **Penguncian Saldo (Hold):**
   * Saldo tenant langsung didebit: `tenants.balance = tenants.balance - amount`.
   * Simpan record `withdrawal_requests` (status `PENDING`).
   * Catat mutasi `tenant_balance_logs` (`type: "WITHDRAWAL_HOLD"`, `netAmount: -amount`).

### 3.3. Alur Pemrosesan oleh Admin Food Court
1. Admin melihat daftar penarikan dana dari seluruh tenant di food court-nya.
2. **Jika Diproses (Disburse):**
   * Admin memilih metode (Cash atau Transfer).
   * Untuk Transfer: Input nomor referensi bank dan upload foto bukti transfer (menggunakan endpoint upload gambar `/api/upload`).
   * Status pengajuan berubah menjadi `PROCESSED`.
3. **Jika Ditolak (Reject):**
   * Admin memasukkan alasan penolakan (`adminNotes`).
   * Saldo tenant dikembalikan otomatis: `tenants.balance = tenants.balance + amount`.
   * Catat log refund di `tenant_balance_logs` (`type: "WITHDRAWAL_REFUND"`, `netAmount: +amount`).
   * Status pengajuan berubah menjadi `REJECTED`.
4. **Penyelesaian Akhir (Complete):**
   * **Opsi A (Transfer/Cash):** Tenant menekan tombol **"Konfirmasi Sudah Terima"** di halaman dompet tenant $\rightarrow$ status berubah menjadi `COMPLETED`.
   * **Opsi B (Tunai di Tempat):** Admin Food Court dapat langsung menandai `COMPLETED` jika uang tunai diserahkan dan diterima langsung saat itu juga.

---

## 4. API Endpoints Specification

### 4.1. Modul Tenant (`/api/tenants`)
| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| `GET` | `/api/tenants/wallet` | `tenant` | Mengambil data saldo aktif, total kotor, total fee 1%, dan mutasi saldo terbaru |
| `POST` | `/api/tenants/withdrawals` | `tenant` | Mengajukan penarikan dana (nominal, metode, info rekening) |
| `GET` | `/api/tenants/withdrawals` | `tenant` | Mengambil riwayat pengajuan penarikan dana milik tenant login |
| `PATCH` | `/api/tenants/withdrawals/:id/confirm` | `tenant` | Mengonfirmasi penerimaan dana (mengubah status `PROCESSED` $\rightarrow$ `COMPLETED`) |

### 4.2. Modul Admin Food Court (`/api/admin/withdrawals`)
| Method | Endpoint | Role | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/withdrawals` | `admin-food-court`, `admin` | Mengambil daftar pengajuan penarikan tenant di food court yang dikelola |
| `PATCH` | `/api/admin/withdrawals/:id/process` | `admin-food-court`, `admin` | Memproses pencairan dana (upload bukti transfer / kwitansi cash, status $\rightarrow$ `PROCESSED`) |
| `PATCH` | `/api/admin/withdrawals/:id/reject` | `admin-food-court`, `admin` | Menolak pengajuan penarikan (mengembalikan saldo tenant, status $\rightarrow$ `REJECTED`) |
| `PATCH` | `/api/admin/withdrawals/:id/complete` | `admin-food-court`, `admin` | Menyelesaikan penarikan langsung untuk penyerahan tunai di tempat |

---

## 5. Frontend UI/UX Design

### 5.1. Halaman Dompet Tenant (`/app/tenant/wallet`)
* **Header & Stat Cards:**
  * Kartu Saldo Aktif dengan nominal tebal dan tombol aksi utama **"Ajukan Penarikan Dana"**.
  * Kartu Ringkasan: Total Penjualan Kotor, Total Potongan Biaya Aplikasi (1%), Total Dana Dicairkan.
* **Modal Penarikan Dana:**
  * Pilihan metode: Transfer Bank / E-Wallet vs Tunai Langsung.
  * Input nominal penarikan dengan quick chips (Rp 50k, 100k, 250k, Tarik Semua).
  * Form rekening tujuan (dengan opsi simpan ke profil tenant).
  * Estimasi sisa saldo setelah penarikan.
* **Tampilan Tab Riwayat:**
  * **Tab 1: Riwayat Penarikan Dana:** Daftar request penarikan, badge status warna, tombol **"Lihat Bukti Transfer"**, dan tombol **"Konfirmasi Sudah Terima"**.
  * **Tab 2: Mutasi Saldo & Pesanan:** Tabel buku kas pesanan (ID Order, Tanggal, Subtotal Kotor, Biaya Aplikasi 1%, Saldo Bersih, Saldo Akhir).

### 5.2. Halaman Pencairan Dana Admin Food Court (`/app/admin/withdrawals`)
* **Statistik Cepat:** Antrean Pending, Total Nominal Menunggu Dicairkan, Total Berhasil Dicairkan.
* **Tabel Antrean Penarikan:** Filter status (`ALL`, `PENDING`, `PROCESSED`, `COMPLETED`, `REJECTED`), Nama Stan, Nominal, Metode, Info Rekening.
* **Modal Pemrosesan:**
  * Tampilan rekening tujuan yang mudah disalin.
  * Form input nomor referensi transfer.
  * Uploader foto bukti transfer / kwitansi tanda terima.
  * Tombol aksi: "Proses & Kirim Bukti", "Tolak (Refund Saldo)", "Selesaikan Tunai".

### 5.3. Pembaruan Navigasi & Routing
* Tambahkan route `/app/tenant/wallet` di `App.tsx` dengan `RoleGuard` role `['tenant']`.
* Tambahkan route `/app/admin/withdrawals` di `App.tsx` dengan `RoleGuard` role `['admin-food-court', 'admin']`.
* Tambahkan menu item di Navbar/Sidebar untuk peran Tenant dan Admin Food Court.

---

## 6. Safety, Concurrency, and Error Handling

1. **Race Condition Prevention:** Pengajuan penarikan dana menggunakan transaksi database dengan validasi `amount <= tenant.balance`. Saldo langsung dipotong saat `PENDING` sehingga tenant tidak dapat mengajukan penarikan melebihi saldo aktif secara bersamaan.
2. **Refund Guarantee:** Jika Admin menolak pengajuan, pengembalian dana dieksekusi secara atomik (`balance + amount`) dan dicatat pada log mutasi (`WITHDRAWAL_REFUND`).
3. **Idempotent Order Settlement:** Log mutasi mencatat `tenantOrderId` unik per pesanan, memastikan tidak terjadi mutasi ganda jika fungsi settlement terpanggil berulang kali.
