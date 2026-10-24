# Spesifikasi Desain: 1 Akun 1 Tenant & Aktivasi Mandiri via Mailer (Gmail SMTP)

**Tanggal:** 2026-10-24  
**Status:** Approved  
**Penulis:** Antigravity AI & Tim Pengembang FoodCourt OS  

---

## 1. Latar Belakang & Masalah
Saat mendaftarkan stan baru di menu Super Admin / Admin Food Court (`/app/super-admin/tenants` dan `/app/admin/tenants`), terdapat kolom input manual **UUID Akun Pemilik (`ownerId`)**. Hal ini memiliki beberapa kelemahan kritis:
1. **UX Buruk:** Admin dipaksa menghafal atau menyalin string UUID acak 36-karakter (`c7a18b92-...`) dari database.
2. **Tidak Ada Enforce 1 Akun = 1 Tenant:** Sistem saat ini memperbolehkan satu akun user memiliki lebih dari satu gerai makanan (*multi-tenant per user*), padahal aturan bisnis menghendaki **1 Akun = 1 Tenant secara unik**.
3. **Pendaftaran Terpisah:** Calon pemilik stan harus membuat akun terlebih dahulu sebelum admin mendaftarkan stannya.
4. **Keamanan Kredensial:** Admin berpotensi mengetahui kata sandi pemilik jika dibuatkan manual.

---

## 2. Tujuan & Solusi
1. **Enforce 1 User = 1 Tenant:** Setiap akun pengguna bertipe `tenant` hanya boleh menjadi pemilik dari maksimal satu gerai aktif. Kolom `owner_id` di database memiliki *unique constraint*.
2. **Seamless Onboarding (Buat Stan Sekaligus Buat Akun):** Admin cukup mengisi **Nama Pemilik** dan **Email Pemilik** di form stan.
3. **Aktivasi Mandiri via Email (Nodemailer + Gmail SMTP):** Sistem secara otomatis mengirimkan tautan aktivasi mandiri ke email pemilik gerai dengan masa berlaku **7 hari**.
4. **Pemilik Menentukan Password Sendiri:** Pemilik mengklik tautan email, diarahkan ke halaman web aktivasi, membuat password mereka sendiri, dan langsung login ke dashboard tenant.
5. **Status Awal Stan Otomatis Tutup:** Gerai baru dibuat dengan status `isOpen = false` (Tutup) dan berstatus *Menunggu Aktivasi* hingga pemilik mengaktifkan akunnya.

---

## 3. Perubahan Skema Database

### 3.1 Tabel `users` (`backend/db/schema.ts`)
Tambahan kolom untuk mendukung proses aktivasi akun:
```typescript
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "admin-food-court", "tenant", "customer"])
    .notNull()
    .default("customer"),
  status: mysqlEnum("status", ["ACTIVE", "PENDING_ACTIVATION", "SUSPENDED"])
    .notNull()
    .default("ACTIVE"),
  activationToken: varchar("activation_token", { length: 255 }),
  activationExpires: timestamp("activation_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

### 3.2 Tabel `tenants` (`backend/db/schema.ts`)
Tambahkan indeks unik pada kolom `ownerId`:
```typescript
export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    foodCourtId: varchar("food_court_id", { length: 36 })
      .notNull()
      .references(() => foodCourts.id, { onDelete: "cascade" }),
    ownerId: varchar("owner_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    stallNumber: varchar("stall_number", { length: 50 }).notNull(),
    description: text("description"),
    logo: varchar("logo", { length: 255 }),
    isOpen: boolean("is_open").notNull().default(false), // Default: TUTUP saat pendaftaran
    openingTime: varchar("opening_time", { length: 8 }),
    closingTime: varchar("closing_time", { length: 8 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    unique("uq_foodcourt_slug").on(table.foodCourtId, table.slug),
    unique("uq_tenant_owner_id").on(table.ownerId), // 1 User = 1 Tenant Unique Constraint
  ],
);
```

---

## 4. Modul Mailer (Nodemailer + Gmail SMTP)

### 4.1 Dependensi
- `nodemailer` & `@types/nodemailer` diinstal pada backend.

### 4.2 Layanan Mailer (`backend/common/mailer.ts`)
- Membaca konfigurasi dari environment variables:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_SECURE=true
  SMTP_USER=emailanda@gmail.com
  SMTP_PASS=xxxx xxxx xxxx xxxx  # Google App Password 16 karakter
  MAIL_FROM="FoodCourt OS <emailanda@gmail.com>"
  ```
- **Fallback Dev:** Jika variabel `SMTP_USER` / `SMTP_PASS` belum diisi di `.env`, modul otomatis mencetak tautan aktivasi ke console/terminal (`[DEV MAILER] Link Aktivasi: http://localhost:5173/activate-account?token=...`) sehingga alur pengujian tidak terblokir.
- **Template Email HTML Responsif:**
  - Header berlogo FoodCourt OS.
  - Informasi stan: Nama Gerai, Nomor Kios, Nama Cabang Food Court.
  - Tombol CTA: *"Aktifkan Akun & Buat Kata Sandi"*.
  - Informasi kedaluwarsa 7 hari.

---

## 5. Alur & Endpoint API Backend

### 5.1 Pembuatan Tenant & Akun Baru: `POST /api/tenants`
- **Request Body (DTO):**
  ```typescript
  {
    foodCourtId?: string;
    name: string;
    stallNumber: string;
    ownerName: string;   // Nama pemilik gerai
    ownerEmail: string;  // Email pemilik gerai
    description?: string;
    openingTime?: string;
    closingTime?: string;
    logo?: string;
  }
  ```
- **Logika Validasi:**
  1. Cek apakah `ownerEmail` sudah ada di tabel `users`:
     - Jika sudah ada:
       - Cek apakah user tersebut sudah memiliki baris di tabel `tenants`.
       - Jika **sudah memiliki gerai**: Throw `ConflictError (409)`: *"Email '{ownerEmail}' sudah terdaftar sebagai pemilik gerai '{existingTenant.name}'. Satu akun hanya boleh memiliki 1 gerai."*
       - Jika **belum memiliki gerai**: Hubungkan user ini sebagai `ownerId`, update role menjadi `'tenant'`, dan kirim email pemberitahuan pendaftaran stan.
     - Jika belum ada:
       - Generate token aktivasi kriptografis (`crypto.randomBytes(32).toString('hex')`).
       - Set `activationExpires = now + 7 hari`.
       - Simpan user baru dengan `role = 'tenant'`, `status = 'PENDING_ACTIVATION'`, dan placeholder password acak yang di-hash.
  2. Validasi keunikan `stallNumber` di food court terkait.
  3. Simpan record gerai baru di `tenants` dengan `isOpen = false` dan `ownerId = user.id`.
  4. Panggil `mailer.sendActivationEmail({ to: ownerEmail, ownerName, tenantName, activationToken, foodCourtName })`.

### 5.2 Verifikasi Token Aktivasi: `GET /api/auth/verify-activation-token?token=...`
- **Tujuan:** Dipanggil saat pengguna membuka halaman aktivasi di browser.
- **Respon:**
  - Valid: `{ valid: true, data: { email, name, tenantName, stallNumber, foodCourtName } }`.
  - Tidak valid / Kedaluwarsa: `{ valid: false, message: "Token aktivasi tidak valid atau telah kedaluwarsa (lebih dari 7 hari)." }`.

### 5.3 Eksekusi Aktivasi Akun: `POST /api/auth/activate-account`
- **Request Body:** `{ token: string, password: string }`.
- **Logika:**
  1. Cari user berdasarkan `activationToken` yang belum kedaluwarsa (`activationExpires > NOW()`).
  2. Validasi password minimal 6 karakter.
  3. Hash password baru dengan `Bun.password.hash` (Argon2 / bcrypt).
  4. Update user:
     - `passwordHash = newHash`
     - `status = 'ACTIVE'`
     - `activationToken = null`
     - `activationExpires = null`
  5. Generate JWT login token dan kembalikan ke frontend agar pengguna langsung masuk ke dashboard tenant mereka.

### 5.4 Kirim Ulang Tautan Aktivasi: `POST /api/tenants/:id/resend-activation`
- **Akses:** Admin Food Court & Super Admin.
- **Logika:**
  - Mengambil pemilik gerai terkait. Jika user masih berstatus `PENDING_ACTIVATION`, generate token baru (berlaku 7 hari lagi) dan kirim ulang email aktivasi.

---

## 6. Antarmuka Pengguna (Frontend)

### 6.1 `TenantFormDialog.tsx`
- Menghapus input `ID Akun Pemilik (User UUID)`.
- Menggantinya dengan:
  - Input **Nama Pemilik Kios** (`ownerName`).
  - Input **Email Pemilik Kios** (`ownerEmail`).
- Memberikan catatan petunjuk: *"Email aktivasi akun dan pembuatan kata sandi akan otomatis dikirimkan ke email pemilik (berlaku 7 hari)."*

### 6.2 Halaman Baru `ActivateAccountPage.tsx` (`/activate-account`)
- Mengakses query param `?token=...`.
- Tampilan:
  - Kartu selamat datang yang elegan.
  - Ringkasan gerai: *"Selamat bergabung! Anda mendaftarkan akun untuk mengelola stan **{Nama Stan}** (Stan {Nomor}) di {Food Court}."*
  - Form Kata Sandi Baru & Konfirmasi Kata Sandi.
  - Tombol *"Aktifkan Akun & Masuk ke Dashboard"*.
  - Menangani error jika token tidak sah/kedaluwarsa dengan petunjuk menghubungi admin untuk kirim ulang aktivasi.

### 6.3 Halaman Admin (`AdminTenantsPage` & `SuperAdminTenantsPage`)
- Menambahkan status badge **"Menunggu Aktivasi"** jika status akun pemilik masih `PENDING_ACTIVATION`.
- Tombol aksi **"Kirim Ulang Email Aktivasi"** di tabel gerai.

---

## 7. Rencana Pengujian
1. **Unit & Integration Test:**
   - Test pembuatan tenant menghasilkan user baru dengan status `PENDING_ACTIVATION`.
   - Test penolakan jika 1 user mencoba didaftarkan pada 2 tenant (`ConflictError`).
   - Test verifikasi token berhasil dalam rentang 7 hari dan gagal jika kedaluwarsa.
   - Test endpoint aktivasi berhasil memperbarui password dan mengembalikan JWT token.
2. **E2E / Browser Validation:**
   - Admin membuat gerai baru dengan email uji coba.
   - Membuka link aktivasi di browser.
   - Mengisi password baru dan verifikasi redirect langsung ke dashboard tenant.
