# Food Court API Documentation

RESTful API berperforma tinggi untuk manajemen operasional Food Court modern multi-cabang, multi-tenant, dan multi-kios. Dibangun menggunakan **ElysiaJS**, **Bun runtime**, **Drizzle ORM**, dan **MySQL**.

---

## Daftar Isi
1. [Tech Stack & Arsitektur](#tech-stack--arsitektur)
2. [Instalasi & Menjalankan Proyek](#instalasi--menjalankan-proyek)
3. [Akun Pengujian Seeder (Demo Accounts)](#akun-pengujian-seeder-demo-accounts)
4. [Konsep Hak Akses (Role-Based Access Control / RBAC)](#konsep-hak-akses-role-based-access-control--rbac)
5. [Matriks Hak Akses & Response Antar Role Seluruh Endpoint](#matriks-hak-akses--response-antar-role-seluruh-endpoint)
   - [1. General & Health](#1-general--health)
   - [2. Auth (`/api/auth`)](#2-auth-apiauth)
   - [3. Food Courts (`/api/food-courts`, `/api/food-court`)](#3-food-courts-apifood-courts-apifood-court)
   - [4. Tenants (`/api/tenants`)](#4-tenants-apitenants)
   - [5. Admin Food Court Withdrawal Management (`/api/admin/withdrawals`)](#5-admin-food-court-withdrawal-management-apiadminwithdrawals)
   - [6. Menus & Kategori (`/api/menus`)](#6-menus--kategori-apimenus)
   - [7. Tables & Meja QR (`/api/tables`)](#7-tables--meja-qr-apitables)
   - [8. Orders & Split Bill (`/api/orders`)](#8-orders--split-bill-apiorders)
   - [9. Payments & Cashier POS (`/api/payments`)](#9-payments--cashier-pos-apipayments)
   - [10. Food Court Wallet & Penarikan Cabang (`/api/admin/food-court`)](#10-food-court-wallet--penarikan-cabang-apiadminfood-court)
   - [11. Super Admin Disbursements & Platform Revenue (`/api/super-admin`)](#11-super-admin-disbursements--platform-revenue-apisuper-admin)
   - [12. Rekonsiliasi Biaya Platform Sistem (`/api/admin/system`)](#12-rekonsiliasi-biaya-platform-sistem-apiadminsystem)
   - [13. Media & File Upload (`/api/upload`, `/uploads/*`)](#13-media--file-upload-apiupload-uploads)
   - [14. Discounts & Promo Vouchers (`/api/discounts`)](#14-discounts--promo-vouchers-apidiscounts)
   - [15. Self-Service Kiosks (`/api/kiosks`)](#15-self-service-kiosks-apikiosks)
6. [Dokumentasi Lengkap Seluruh Endpoint](#dokumentasi-lengkap-seluruh-endpoint)
   - [1. General & Health](#1-general--health-detail)
   - [2. Autentikasi & Akun (`/api/auth`)](#2-autentikasi--akun-apiauth)
   - [3. Food Courts (`/api/food-courts`, `/api/food-court`)](#3-food-courts-apifood-courts-apifood-court-detail)
   - [4. Tenants / Kios Gerai (`/api/tenants`)](#4-tenants--kios-gerai-apitenants)
   - [5. Manajemen Penarikan Dana Tenant oleh Admin Cabang (`/api/admin/withdrawals`)](#5-manajemen-penarikan-dana-tenant-oleh-admin-cabang-apiadminwithdrawals)
   - [6. Menus, Kategori & Opsi Varian (`/api/menus`)](#6-menus-kategori--opsi-varian-apimenus)
   - [7. Meja Food Court & QR Code (`/api/tables`)](#7-meja-food-court--qr-code-apitables)
   - [8. Pemesanan & Split Bill (`/api/orders`)](#8-pemesanan--split-bill-apiorders)
   - [9. Pembayaran & Kasir POS (`/api/payments`)](#9-pembayaran--kasir-pos-apipayments)
   - [10. Dompet Cabang Food Court (`/api/admin/food-court`)](#10-dompet-cabang-food-court-apiadminfood-court)
   - [11. Super Admin Disbursements & Platform Revenue (`/api/super-admin`)](#11-super-admin-disbursements--platform-revenue-apisuper-admin-detail)
   - [12. Rekonsiliasi Biaya Platform Sistem (`/api/admin/system`)](#12-rekonsiliasi-biaya-platform-sistem-apiadminsystem-detail)
   - [13. Media & File Upload (`/api/upload`, `/uploads/*`)](#13-media--file-upload-apiupload-uploads-detail)
   - [14. Program Promo & Diskon Vouchers (`/api/discounts`)](#14-program-promo--diskon-vouchers-apidiscounts)
   - [15. Mesin Pemesanan Mandiri / Self-Service Kiosks (`/api/kiosks`)](#15-mesin-pemesanan-mandiri--self-service-kiosks-apikiosks)
7. [Struktur Error Response](#struktur-error-response)

---

## Tech Stack & Arsitektur

- **Runtime**: [Bun](https://bun.sh/)
- **Framework Web**: [ElysiaJS](https://elysiajs.com/) (Fast, Type-safe & OpenAPI ready)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Engine**: MySQL 8.0+
- **Validasi Skema**: TypeBox (Elysia Standard Type System)
- **Dokumentasi Interaktif**: Swagger UI (`/swagger`)

---

## Instalasi & Menjalankan Proyek

### 1. Prasyarat
- Pasang [Bun](https://bun.sh/) di komputer Anda (`curl -fsSL https://bun.sh/install | bash` atau via npm/powershell).
- Siapkan database MySQL dan buat database bernama `food_court`.

### 2. Salin Konfigurasi Environment
Buat file `.env` di root direktori proyek:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/food_court"
JWT_SECRET="super-secret-key-food-court-api"
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
MIDTRANS_IS_PRODUCTION=false
```

### 3. Install Dependensi & Jalankan Migrasi
```bash
# Install paket
bun install

# Jalankan migrasi / sinkronisasi skema database
bun run db:push

# Jalankan seeder akun & data pengujian awal
bun run seed

# Jalankan server mode development
bun run dev
```

Server akan aktif di:
- **API URL**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/swagger`
- **Swagger JSON Specification**: `http://localhost:3000/swagger/json`

---

## Akun Pengujian Seeder (Demo Accounts)

Setelah menjalankan `bun run seed` (atau `bun run db/seed.ts`), sistem secara otomatis membuat akun-akun pengujian untuk seluruh role yang tersedia. Seluruh akun menggunakan kata sandi bawaan: **`password123`**.

| Role | Nama Pengguna | Email Login | Kata Sandi | ID Pengguna | Scope / Hak Akses Sampel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** (`admin`) | Super Admin Amici | `admin@foodcourt.com` | `password123` | `usr-super-admin-001` | Akses global seluruh cabang food court, stan tenant, katalog menu global, meja QR, pencairan dana cabang, rekap revenue platform, dan rekonsiliasi biaya |
| **Admin Food Court** (`admin-food-court`) | Manajer Grand City | `manager@foodcourt.com` | `password123` | `usr-manager-fc-001` | Manajer cabang *Amici Food Court Grand City* (`fc-grand-city-001`). Mengelola stan, meja QR, kiosk terminal cabang, persetujuan penarikan tenant, dan dompet cabang |
| **Kasir Food Court** (`cashier`) | Kasir Amici | `cashier@foodcourt.com` | `password123` | `usr-cashier-001` | Operasional loket kasir: lookup tagihan pesanan (orderNumber/CSH), settlement pembayaran tunai, kembalian uang, dan rekap mutasi kas harian |
| **Tenant / Stan** (`tenant`) | Ibu Siti (Warung Rawon) | `tenant@foodcourt.com` | `password123` | `usr-tenant-owner-001` | Pemilik stan *Warung Rawon Bu Siti* (`STAN-A01`, `tnt-rawon-siti-001`). Mengelola menu & opsi varian, antrean dapur, dompet stan, dan penarikan saldo |
| **Customer** (`customer`) | Rizky Ramadhan | `customer@foodcourt.com` | `password123` | `usr-customer-001` | Pembeli/pengunjung. Scan meja via QR, pesan makanan multi-stan, konfigurasi split-bill, checkout Midtrans / tunai di kasir |

### Data Sampel Tambahan Hasil Seeder

Selain akun pengguna, perintah seeder juga menyertakan data operasional sampel siap uji:

- **Cabang Food Court**:
  - Nama: `Amici Food Court Grand City`
  - ID: `fc-grand-city-001`
  - Slug: `amici-food-court-grand-city`
  - Alamat: `Jl. Pemuda No. 10 Lantai 2, Surabaya`
- **Meja QR Tersedia**:
  - Meja `T-01` (`id: tbl-01-gc`, Kapasitas: 4 orang, Token QR: `QR-MEJA-T01-SURABAYA`)
  - Meja `T-02` (`id: tbl-02-gc`, Kapasitas: 6 orang, Token QR: `QR-MEJA-T02-SURABAYA`)
- **Stan Tenant**:
  - Nama: `Warung Rawon Bu Siti` (Nomor Stan: `STAN-A01`, `id: tnt-rawon-siti-001`)
- **Menu Sampel**:
  - `Rawon Daging Spesial` (Rp 32.000, Kategori: *Makanan Utama*, Stok: 40)
  - `Es Teh Manis Segar` (Rp 5.000, Kategori: *Minuman*, Stok: 100)

---

## Konsep Hak Akses (Role-Based Access Control / RBAC)

Sistem ini memiliki 5 tingkatan Role dan 1 akses Publik/Tamu:

| Role | Kode Sistem | Deskripsi & Ruang Lingkup Hak Akses |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | Pengelola platform global. Memiliki hak akses penuh untuk seluruh cabang food court, persetujuan pencairan dana cabang food court, rekapitulasi platform revenue 1%, rekonsiliasi biaya, manajemen master user, tenant, meja, dan pesanan. |
| **Admin Food Court** | `admin-food-court` | Manajer cabang food court tertentu. Mengelola cabang miliknya, tenant di cabangnya, meja QR cabang, perangkat self-service kiosk, persetujuan penarikan saldo tenant (*tenant withdrawals*), dan penarikan saldo dompet cabang miliknya. Dilarang mengakses cabang manajer lain. |
| **Kasir Food Court** | `cashier` | Petugas kasir cabang food court. Menangani antrean pembayaran tunai secara langsung di loket kasir (*Cashier POS*), pencarian tagihan pesanan via barcode / kode CSH / orderNumber, konfirmasi penerimaan uang tunai & perhitungan kembalian, serta rekap mutasi kas harian. |
| **Tenant / Penjual** | `tenant` | Pemilik gerai/kios makanan. Mengelola profil kios miliknya, kategori menu, daftar menu, varian opsi/topping, memproses antrean pesanan dapur stan miliknya, serta mengajukan pencairan saldo dompet tenant. Dilarang mengakses kios atau cabang lain. |
| **Customer** | `customer` | Pengunjung/pembeli. Mendaftar akun, scan meja via QR, pesan makanan multi-gerai dalam 1 keranjang, join sesi meja aktif, konfigurasi split-bill rombongan, dan memilih metode pembayaran (Midtrans QRIS/transfer atau tunai di kasir). |
| **Public / Guest** | *(Tanpa Token)* | Pengunjung umum tanpa login. Melihat status API, katalog menu stan per cabang, tracking pesanan secara live via nomor order, scan meja / Kiosk terminal via QR/deviceCode, validasi voucher promo diskon, serta membaca dokumentasi Swagger. |

---

## Matriks Hak Akses & Response Antar Role Seluruh Endpoint

Tabel berikut menyajikan seluruh **97 endpoint aksi** (mencakup total **105 mounted route entries** termasuk endpoint alias) yang aktif di backend hasil pemindaian route aplikasi ElysiaJS:

### 1. General & Health

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/` | 200 OK | 200 OK | 200 OK | 200 OK | Health check dan info metadata server API. |

### 2. Auth (`/api/auth`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | `POST` | `/api/auth/register` | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Registrasi pengguna baru (`admin`, `admin-food-court`, `tenant`, `customer`, `cashier`). |
| 3 | `POST` | `/api/auth/login` | Login & terima token JWT | Login & terima token JWT | Login & terima token JWT | Login & terima token JWT | Autentikasi email dan kata sandi untuk memperoleh token JWT. |
| 4 | `GET` | `/api/auth/verify-activation-token` | Diizinkan (Public) | Diizinkan (Public) | Diizinkan (Public) | **Diizinkan (Public)** | Memverifikasi token aktivasi akun tenant via email sebelum set password. |
| 5 | `POST` | `/api/auth/activate-account` | Diizinkan (Public) | Diizinkan (Public) | Diizinkan (Public) | **Diizinkan (Public)** | Mengaktifkan akun tenant baru dengan menetapkan kata sandi & menerima token JWT. |
| 6 | `GET` | `/api/auth/me` | Profil Super Admin | Profil Manajer Cabang | Profil Pemilik Kios | Profil User Login *(Tanpa token: `401 Unauthorized`)* | Mengambil data profil user yang sedang login berdasarkan token JWT. |

### 3. Food Courts (`/api/food-courts`, `/api/food-court`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 7 | `POST` | `/api/food-courts/` | Diizinkan (Bisa pilih managerId) | Diizinkan (Otomatis managerId = user.id) | `403 Forbidden` | `403 Forbidden` | Mendaftarkan lokasi food court baru (otomatis generate slug unik). |
| 8 | `GET` | `/api/food-courts/` | Mengembalikan **seluruh food court** | **Hanya food court miliknya** (`managerId = user.id`) | `403 Forbidden` | `403 Forbidden` | Mengambil daftar food court dengan filter status dan pencarian nama. |
| 9 | `GET` | `/api/food-courts/{id}` | Mengembalikan detail food court manapun | Mengembalikan detail **jika food court miliknya**; ditolak `403` jika lain | `403 Forbidden` | `403 Forbidden` | Mengambil detail food court lengkap dengan daftar meja dan stan kios (ID/slug). |
| 10 | `GET` | `/api/food-courts/{id}/tenant` | Mengembalikan seluruh tenant di food court | Diizinkan **hanya jika food court miliknya** | `403 Forbidden` | `403 Forbidden` | Mengambil daftar stan tenant di food court untuk manajemen internal (juga tersedia di `/api/food-court/{id}/tenant`). |
| 11 | `GET` | `/api/food-courts/{id}/tenant/public` | Diizinkan (Public) | Diizinkan (Public) | Diizinkan (Public) | **Diizinkan (Public)** | Mengambil daftar stan tenant aktif di cabang food court untuk pelanggan umum (juga tersedia di `/api/food-court/{id}/tenant/public`). |
| 12 | `PUT` | `/api/food-courts/{id}` | Diizinkan update cabang manapun | Diizinkan **hanya untuk food court miliknya** | `403 Forbidden` | `403 Forbidden` | Memperbarui informasi profil, alamat, telepon, atau status food court. |
| 13 | `DELETE` | `/api/food-courts/{id}` | Diizinkan hapus cabang | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Menghapus food court beserta relasi data di dalamnya (Super Admin saja). |

### 4. Tenants (`/api/tenants`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 14 | `GET` | `/api/tenants/` | Mengembalikan **seluruh tenant** | **Hanya tenant di food court miliknya** | `403 Forbidden` | `403 Forbidden` | Mengambil master daftar tenant food court untuk manajemen internal. |
| 15 | `GET` | `/api/tenants/mine` | `403 Forbidden` | `403 Forbidden` | **Mengembalikan profil stan miliknya** | `403 Forbidden` | Mengambil profil stan kios milik akun tenant yang sedang login. |
| 16 | `GET` | `/api/tenants/{id}` | Detail profil gerai | Detail profil gerai | Detail profil gerai | **Detail profil gerai (Public)** | Detail tenant lengkap dengan daftar kategori & menu (menerima ID UUID atau slug). |
| 17 | `GET` | `/api/tenants/food-court/{id}` | Mengembalikan seluruh tenant di cabang | Mengembalikan tenant **jika food court miliknya** | `403 Forbidden` | `403 Forbidden` | Mengambil daftar stan tenant di food court tertentu via modul tenants (`?isOpen=` dan `?search=`). |
| 18 | `POST` | `/api/tenants/` | Diizinkan buat gerai di cabang manapun | Diizinkan buat gerai di cabangnya | Diizinkan daftarkan gerai miliknya | `403 Forbidden` | Membuat tenant baru (memvalidasi keunikan nomor stan aktif di cabang terkait). |
| 19 | `PUT` | `/api/tenants/{id}` | Diizinkan update gerai manapun | Diizinkan **jika tenant di cabangnya** | Diizinkan **hanya untuk gerai miliknya** | `403 Forbidden` | Update data tenant (nama, nomor stan, jam buka/tutup, rekening bank, status). |
| 20 | `DELETE` | `/api/tenants/{id}` | Diizinkan hapus gerai | `403 Forbidden` | Diizinkan **hanya untuk gerai miliknya** | `403 Forbidden` | Menghapus tenant dari food court. |
| 21 | `POST` | `/api/tenants/{id}/resend-activation` | Diizinkan kirim ulang email | Diizinkan jika di cabangnya | `403 Forbidden` | `403 Forbidden` | Mengirim ulang email tautan aktivasi akun tenant ke pemilik stan. |
| 22 | `GET` | `/api/tenants/wallet` | Diizinkan (dengan `?tenantId=`) | Diizinkan (dengan `?tenantId=`) | **Melihat saldo dompet stan miliknya** | `403 Forbidden` | Melihat ringkasan saldo dompet stan (`balance`, `heldBalance`), pendapatan kotor, & mutasi. |
| 23 | `GET` | `/api/tenants/withdrawals` | Diizinkan (dengan `?tenantId=`) | Diizinkan (dengan `?tenantId=`) | **Melihat riwayat pencairan stan miliknya** | `403 Forbidden` | Mengambil riwayat pengajuan pencairan dana dompet stan tenant. |
| 24 | `POST` | `/api/tenants/withdrawals` | Diizinkan | Diizinkan | **Mengajukan pencairan dana dompet** | `403 Forbidden` | Mengajukan penarikan saldo dompet stan (Tunai atau Transfer Bank, Min Rp 10.000). |
| 25 | `PATCH`| `/api/tenants/withdrawals/{id}/confirm` | Diizinkan | Diizinkan | **Konfirmasi dana telah diterima** | `403 Forbidden` | Tenant mengonfirmasi penerimaan dana pencairan transfer (`DISBURSED` -> `COMPLETED`). |
| 25b | `GET` | `/api/tenants/dashboard-stats` | Diizinkan (dengan `?tenantId=`) | `403 Forbidden` | **Melihat analitik 4-layer stan miliknya** | `403 Forbidden` | Mengambil 4-layer merchant business & product intelligence (omzet, porsi, best sellers, jam sibuk). |

### 5. Admin Food Court Withdrawal Management (`/api/admin/withdrawals`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 26 | `GET` | `/api/admin/withdrawals/` | Melihat seluruh penarikan tenant lintas cabang | **Melihat penarikan tenant di cabangnya** | `403 Forbidden` | `403 Forbidden` | Mengambil daftar pengajuan penarikan dana dari seluruh tenant (filter status). |
| 27 | `PATCH`| `/api/admin/withdrawals/{id}/process` | Diizinkan proses penarikan | Diizinkan proses tenant cabangnya | `403 Forbidden` | `403 Forbidden` | Memproses pencairan dana tenant dan menyertakan bukti transfer / struk kasir (`DISBURSED`). |
| 28 | `PATCH`| `/api/admin/withdrawals/{id}/reject` | Diizinkan tolak | Diizinkan tolak tenant cabangnya | `403 Forbidden` | `403 Forbidden` | Menolak penarikan dana tenant; saldo tertahan dikembalikan otomatis ke dompet tenant. |
| 29 | `PATCH`| `/api/admin/withdrawals/{id}/complete` | Diizinkan selesaikan | Diizinkan selesaikan pencairan tunai | `403 Forbidden` | `403 Forbidden` | Menyelesaikan pencairan uang tunai di tempat secara langsung (`COMPLETED`). |

### 6. Menus & Kategori (`/api/menus`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 30 | `GET` | `/api/menus/` | Mengembalikan seluruh menu | Hanya menu tenant di cabangnya | Hanya menu stan miliknya | `403 Forbidden` | Daftar master menu internal manajemen dengan filter kategori, ketersediaan, dan pencarian. |
| 31 | `GET` | `/api/menus/categories` | Mengembalikan seluruh kategori | Hanya kategori tenant di cabangnya | Hanya kategori stan miliknya | `403 Forbidden` | Mengambil daftar kategori menu terisolasi per role, menerima query `?tenantId=...`. |
| 32 | `GET` | `/api/menus/categories/{tenantId}` | Detail kategori & menu tenant | Detail jika stan di cabangnya | Detail jika stan miliknya | **Detail kategori & menu tenant (Public)** | Mengambil kategori dan daftar menu di dalamnya untuk tenant tertentu. |
| 33 | `GET` | `/api/menus/tenant/{tenantId}` | Mengembalikan menu tenant | Mengembalikan menu tenant | Mengembalikan menu tenant | **Mengembalikan menu tenant (Public)** | Mengambil seluruh menu aktif milik satu tenant (ID UUID atau slug). |
| 34 | `POST` | `/api/menus/categories` | Diizinkan buat kategori | Diizinkan untuk tenant di cabangnya | Diizinkan untuk stan miliknya | `403 Forbidden` | Membuat kategori menu baru untuk gerai tenant tertentu (`tenantId`, `name`). |
| 35 | `PUT` | `/api/menus/categories/{id}` | Diizinkan update kategori | Diizinkan untuk tenant di cabangnya | Diizinkan untuk stan miliknya | `403 Forbidden` | Memperbarui nama kategori menu (`name`). |
| 36 | `DELETE`| `/api/menus/categories/{id}` | Diizinkan hapus kategori | Diizinkan untuk tenant di cabangnya | Diizinkan untuk stan miliknya | `403 Forbidden` | Menghapus kategori menu (menu di dalamnya dialihkan menjadi tanpa kategori/`null`). |
| 37 | `GET` | `/api/menus/{id}/options` | Melihat opsi menu | Melihat opsi menu | Melihat opsi menu | **Melihat opsi menu (Public)** | Mengambil daftar opsi/topping/varian tambahan (`menu_options`) untuk menu tertentu. |
| 38 | `POST` | `/api/menus/{id}/options` | Diizinkan tambah opsi | Diizinkan jika di cabangnya | Diizinkan untuk menu miliknya | `403 Forbidden` | Menambahkan opsi varian baru pada menu (nama, penyesuaian harga tambahan). |
| 39 | `PUT` | `/api/menus/options/{id}` | Diizinkan update opsi | Diizinkan jika di cabangnya | Diizinkan untuk opsi miliknya | `403 Forbidden` | Memperbarui nama atau penyesuaian harga opsi menu (juga: `/api/menus/{id}/options/{optionId}`). |
| 40 | `DELETE`| `/api/menus/options/{id}` | Diizinkan hapus opsi | Diizinkan jika di cabangnya | Diizinkan untuk opsi miliknya | `403 Forbidden` | Menghapus opsi varian menu (juga: `/api/menus/{id}/options/{optionId}`). |
| 41 | `GET` | `/api/menus/{id}` | Detail item menu | Detail item menu | Detail item menu | **Detail item menu (Public)** | Mengambil data detail satu item menu makanan/minuman berdasarkan ID. |
| 42 | `POST` | `/api/menus/` | Diizinkan buat menu | Diizinkan untuk tenant di cabangnya | Diizinkan untuk stan miliknya | `403 Forbidden` | Membuat menu baru lengkap dengan stok, kategori, dan opsi varian. |
| 43 | `PUT` | `/api/menus/{id}` | Diizinkan update menu | Diizinkan jika menu di cabangnya | Diizinkan jika menu miliknya | `403 Forbidden` | Update data menu (nama, harga, stok, ketersediaan, gambar). |
| 44 | `DELETE`| `/api/menus/{id}` | Diizinkan hapus menu | Diizinkan jika menu di cabangnya | Diizinkan jika menu miliknya | `403 Forbidden` | Menghapus item menu makanan/minuman. |

### 7. Tables & Meja QR (`/api/tables`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 45 | `GET` | `/api/tables/scan/{qrToken}` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public)** | Scan QR untuk mendapatkan detail meja & cabang tanpa perlu login. |
| 46 | `GET` | `/api/tables/{id}/qr` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public)** | Merender dan men-stream grafis QR Code meja secara dinamis dalam format SVG. |
| 47 | `GET` | `/api/tables/` | Mengembalikan seluruh meja | Hanya meja di cabangnya | `403 Forbidden` | `403 Forbidden` | Mengambil daftar meja makan cabang (filter status meja). |
| 48 | `GET` | `/api/tables/{id}` | Mengembalikan detail meja | Hanya meja di cabangnya | `403 Forbidden` | `403 Forbidden` | Mengambil data detail meja makan berdasarkan ID. |
| 49 | `GET` | `/api/tables/{id}/sessions` | Seluruh riwayat sesi meja | Sesi meja di cabangnya | `403 Forbidden` | `403 Forbidden` | Melihat riwayat sesi makan per meja (partisipan, pesanan, status). |
| 50 | `POST` | `/api/tables/` | Diizinkan membuat meja | Diizinkan membuat di cabangnya | `403 Forbidden` | `403 Forbidden` | Membuat meja makan baru dan otomatis membuat token QR (`qrToken`) unik. |
| 51 | `PUT` | `/api/tables/{id}` | Diizinkan update meja | Diizinkan update di cabangnya | `403 Forbidden` | `403 Forbidden` | Memperbarui kapasitas atau status meja (`available`, `occupied`, `disabled`). |
| 52 | `POST` | `/api/tables/{id}/regenerate-qr` | Diizinkan | Diizinkan jika di cabangnya | `403 Forbidden` | `403 Forbidden` | Membuat ulang token QR meja untuk alasan keamanan. |
| 53 | `DELETE`| `/api/tables/{id}` | Diizinkan hapus meja | Diizinkan jika di cabangnya | `403 Forbidden` | `403 Forbidden` | Menghapus meja dari cabang food court. |

### 8. Orders & Split Bill (`/api/orders`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 54 | `POST` | `/api/orders/` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Customer / Public)** | Membuat pesanan baru multi-tenant (Dine-In meja / Takeaway Kiosk), snapshot harga, dan sub-order per stan. |
| 55 | `GET` | `/api/orders/` | Melihat seluruh riwayat pesanan | *(Mengikuti relasi cabang)* | **Hanya pesanan yang masuk ke stannya** | **Hanya pesanan miliknya sendiri** | Mengambil riwayat daftar pesanan (disaring otomatis sesuai hak role pemanggil). |
| 56 | `GET` | `/api/orders/track/{orderNumber}` | Live tracking pesanan | Live tracking pesanan | Live tracking pesanan | **Live tracking pesanan (Public)** | Live tracking status pesanan dan antrean masak dapur secara publik via link/QR. |
| 57 | `POST` | `/api/orders/sessions/join` | Diizinkan join sesi | Diizinkan join sesi | Diizinkan join sesi | **Diizinkan (Customer / Public)** | Bergabung ke sesi meja makan aktif untuk pemesanan bersama rombongan. |
| 58 | `GET` | `/api/orders/{id}` | Melihat rincian order manapun | Melihat jika terkait cabangnya | Melihat jika stannya terlibat | Melihat jika merupakan order miliknya | Mengambil detail lengkap pesanan, sub-order per gerai, alokasi split bill, dan rincian diskon. |
| 59 | `POST` | `/api/orders/{id}/split-bill` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Customer / Public)** | Mengonfigurasi pembagian tagihan pesanan rombongan (*split-bill*) per item per partisipan. |
| 60 | `PATCH`| `/api/orders/{id}/status` | Diizinkan update status | Diizinkan jika terkait | Diizinkan jika terlibat | `403 Forbidden` | Update status pesanan utama (COMPLETED/CANCELLED). Selesai otomatis bebaskan meja. |
| 61 | `PATCH`| `/api/orders/tenant-orders/{id}/status`| Diizinkan update antrean | Diizinkan jika terkait | **Pemilik stan penerima order** | `403 Forbidden` | Dapur tenant memperbarui progres masak (`QUEUED` -> `PREPARING` -> `READY` -> `COMPLETED`). |
| 62 | `PATCH`| `/api/orders/items/{itemId}/status` | Diizinkan update status item | Diizinkan jika terkait | **Pemilik stan item tersebut** | `403 Forbidden` | Mengupdate status pengerjaan untuk setiap item makanan individual. |

### 9. Payments & Cashier POS (`/api/payments`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 63 | `POST` | `/api/payments/` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public / Kasir)** | Memproses pembayaran langsung (QRIS, CASH, TRANSFER), ubah status `PAID`, dan teruskan ke dapur. |
| 64 | `POST` | `/api/payments/midtrans` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public / Customer)** | Membuat transaksi Midtrans Snap, mengembalikan `snapToken` & `redirectUrl`. |
| 65 | `POST` | `/api/payments/midtrans/notification` | - | - | - | **Dipanggil server Midtrans (Public)** | Webhook status pembayaran Midtrans (diverifikasi via `signature_key`). |
| 66 | `POST` | `/api/payments/midtrans/{reference}/sync` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public)** | Tarik ulang status transaksi dari Midtrans (berguna tanpa webhook publik). |
| 67 | `GET` | `/api/payments/cashier/pending` | Diizinkan | Diizinkan | `403 Forbidden` | **Diizinkan (Kasir / Public)** | Mengambil daftar tagihan yang menunggu pembayaran tunai di kasir (*cash on delivery*). |
| 68 | `GET` | `/api/payments/cashier/lookup/{query}` | Diizinkan | Diizinkan | `403 Forbidden` | **Diizinkan (Kasir / Public)** | Mencari rincian tagihan kasir berdasarkan orderNumber, paymentGroupId, atau kode CSH-. |
| 69 | `POST` | `/api/payments/cashier/confirm` | Diizinkan | Diizinkan | `403 Forbidden` | **Diizinkan (Kasir / Public)** | Kasir mengonfirmasi uang tunai diterima, menghitung kembalian, dan memfinalisasi pembayaran jadi `PAID`. |
| 70 | `GET` | `/api/payments/cashier/history` | Diizinkan | Diizinkan | `403 Forbidden` | **Diizinkan (Kasir)** | Mengambil rekap transaksi kasir dan akumulasi total uang kas harian. |
| 71 | `GET` | `/api/payments/{orderId}` | Melihat bukti pembayaran | Melihat bukti jika terkait | Melihat bukti jika terkait | Melihat bukti order miliknya *(Tamu: `401`)* | Mengambil rincian dan bukti transaksi pembayaran berdasarkan ID pesanan. |

### 10. Food Court Wallet & Penarikan Cabang (`/api/admin/food-court`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 72 | `GET` | `/api/admin/food-court/wallet` | Diizinkan (dengan `?foodCourtId=`) | **Melihat saldo dompet cabangnya** | `403 Forbidden` | `403 Forbidden` | Mengambil ringkasan saldo dompet cabang food court dan mutasi komisi sewa. |
| 73 | `GET` | `/api/admin/food-court/withdrawals` | Diizinkan (seluruh cabang) | **Melihat riwayat penarikan cabangnya** | `403 Forbidden` | `403 Forbidden` | Mengambil riwayat pengajuan penarikan dana cabang food court. |
| 74 | `POST` | `/api/admin/food-court/withdrawals` | Diizinkan | **Mengajukan penarikan dana cabang** | `403 Forbidden` | `403 Forbidden` | Mengajukan pencairan dana cabang via Transfer Bank (Minimal Rp 50.000). |
| 75 | `POST`/`PATCH` | `/api/admin/food-court/withdrawals/{id}/confirm` | Diizinkan | **Konfirmasi dana masuk ke rekening cabang** | `403 Forbidden` | `403 Forbidden` | Manajer cabang mengonfirmasi bahwa dana transfer dari Super Admin telah diterima. |
| 75b | `GET` | `/api/admin/food-court/dashboard-stats` | Diizinkan (cabang default) | **Melihat analitik 4-layer cabangnya** | `403 Forbidden` | `403 Forbidden` | Mengambil 4-layer insight statistik cabang (finansial, okupansi meja, beban dapur stan, kanal). |

### 11. Super Admin Disbursements & Platform Revenue (`/api/super-admin`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 76 | `GET` | `/api/super-admin/withdrawals` | **Melihat seluruh pengajuan cabang** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Menampilkan seluruh pengajuan pencairan dana dari cabang-cabang food court. |
| 77 | `POST`/`PATCH` | `/api/super-admin/withdrawals/{id}/process` | **Memproses pencairan dana cabang** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Super Admin memproses pencairan dan mengunggah bukti transfer bank (`DISBURSED`). |
| 78 | `POST`/`PATCH` | `/api/super-admin/withdrawals/{id}/reject` | **Menolak pengajuan pencairan cabang** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Menolak pencairan cabang; saldo tertahan dikembalikan otomatis ke dompet cabang. |
| 79 | `POST`/`PATCH` | `/api/super-admin/withdrawals/{id}/complete`| **Memfinalisasi pencairan dana cabang**| `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Memfinalisasi status pencairan dana food court menjadi `COMPLETED`. |
| 80 | `GET` | `/api/super-admin/platform-revenue` | **Melihat rekap pendapatan platform** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Melihat total pendapatan platform Amici (biaya layanan aplikasi 1%) & kontribusi per cabang. |
| 80b | `GET` | `/api/super-admin/dashboard-stats` | **Melihat analitik 4-layer platform** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Mengambil 4-layer executive statistical insights (GMV, fee 1%, leaderboard cabang, SLA dapur). |

### 12. Rekonsiliasi Biaya Platform Sistem (`/api/admin/system`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 81 | `POST` | `/api/admin/system/reconcile-tenant-fees` | **Menjalankan rekonsiliasi fee** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Merekonsiliasi riwayat potongan platform tenant dan mengkreditkan kembali ke saldo tenant. |

### 13. Media & File Upload (`/api/upload`, `/uploads/*`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 82 | `POST` | `/api/upload` | Diizinkan | Diizinkan | Diizinkan | `401 Unauthorized` | Mengunggah gambar (maks 1 MB, jpg/png/webp) ke folder `menus`, `tenants`, atau `food-courts`. |
| 83 | `GET` | `/uploads/*` | Diizinkan (Public) | Diizinkan (Public) | Diizinkan (Public) | **Diizinkan (Public)** | Mengakses file gambar statis publik (aman dari path traversal). |

### 14. Discounts & Promo Vouchers (`/api/discounts`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 84 | `GET` | `/api/discounts/public` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public)** | Mengambil daftar voucher diskon aktif yang dapat dipakai pelanggan saat checkout. |
| 85 | `POST` | `/api/discounts/validate` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Customer / Public)** | Validasi kode promo terhadap keranjang belanja dan simulasi potongan harga. |
| 86 | `POST` | `/api/discounts/` | Diizinkan buat promo | Diizinkan untuk cabangnya | Diizinkan untuk stannya | `403 Forbidden` | Membuat promo diskon baru (persentase / nominal tetap, kuota, masa berlaku). |
| 87 | `GET` | `/api/discounts/` | Seluruh promo diskon | Promo di cabangnya | Promo stannya | `403 Forbidden` | Mengambil daftar master promo diskon untuk dashboard manajemen internal. |
| 88 | `GET` | `/api/discounts/{id}` | Detail promo diskon | Detail promo diskon | Detail promo diskon | `403 Forbidden` | Mengambil detail konfigurasi promo diskon berdasarkan ID. |
| 89 | `PUT` | `/api/discounts/{id}` | Diizinkan update promo | Diizinkan jika di cabangnya | Diizinkan jika promo stannya | `403 Forbidden` | Memperbarui nama, masa berlaku, kuota, atau status promo diskon. |
| 90 | `DELETE`| `/api/discounts/{id}` | Diizinkan hapus/nonaktif | Diizinkan jika di cabangnya | Diizinkan jika promo stannya | `403 Forbidden` | Menonaktifkan voucher promo diskon (`INACTIVE`). |

### 15. Self-Service Kiosks (`/api/kiosks`)

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Kasir / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 91 | `GET` | `/api/kiosks/resolve/{deviceCode}` | Diizinkan | Diizinkan | Diizinkan | **Diizinkan (Public)** | Resolusi terminal Kiosk via deviceCode untuk memuat cabang, stan, dan katalog menu takeaway. |
| 92 | `GET` | `/api/kiosks/` | Seluruh terminal Kiosk | Kiosk di cabangnya | `403 Forbidden` | `403 Forbidden` | Mengambil daftar perangkat terminal Kiosk yang terdaftar di cabang food court. |
| 93 | `POST` | `/api/kiosks/` | Diizinkan mendaftarkan | Diizinkan di cabangnya | `403 Forbidden` | `403 Forbidden` | Mendaftarkan perangkat mesin terminal Kiosk baru di cabang food court. |
| 94 | `GET` | `/api/kiosks/{id}` | Detail perangkat Kiosk | Detail Kiosk cabangnya | `403 Forbidden` | `403 Forbidden` | Mengambil detail informasi perangkat terminal Kiosk berdasarkan ID. |
| 95 | `PUT` | `/api/kiosks/{id}` | Diizinkan update Kiosk | Diizinkan di cabangnya | `403 Forbidden` | `403 Forbidden` | Memperbarui data Kiosk atau mengubah status aktif/nonaktif terminal. |
| 96 | `DELETE`| `/api/kiosks/{id}` | Diizinkan hapus Kiosk | Diizinkan di cabangnya | `403 Forbidden` | `403 Forbidden` | Menghapus perangkat Kiosk dari sistem cabang food court. |
| 97 | `GET` | `/api/kiosks/{id}/stats` | Statistik performa Kiosk | Statistik Kiosk cabangnya | `403 Forbidden` | `403 Forbidden` | Mengambil statistik pemesanan takeaway & omzet yang diproses mesin Kiosk. |

---

## Dokumentasi Lengkap Seluruh Endpoint

Semua endpoint yang membutuhkan autentikasi wajib menyertakan HTTP Header:
```http
Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>
```

---

<div id="1-general--health-detail"></div>

### 1. General & Health

#### `GET /`
- **Fungsi**: Memeriksa status kesehatan server dan info metadata API.
- **Akses**: Public (Semua orang tanpa token)
- **Contoh Response (200 OK)**:
```json
{
  "name": "Food Court API",
  "status": "online",
  "version": "1.0.0",
  "documentation": "/swagger",
  "timestamp": "2026-11-01T04:30:00.000Z"
}
```

---

### 2. Autentikasi & Akun (`/api/auth`)

#### `POST /api/auth/register`
- **Fungsi**: Mendaftarkan pengguna baru dengan role tertentu (`admin`, `admin-food-court`, `tenant`, `customer`, atau `cashier`).
- **Akses**: Public
- **Contoh Request Body**:
```json
{
  "name": "Budi Santoso",
  "email": "budi@foodcourt.com",
  "password": "password123",
  "role": "admin-food-court"
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
    "name": "Budi Santoso",
    "email": "budi@foodcourt.com",
    "role": "admin-food-court",
    "createdAt": "2026-11-01T04:30:00.000Z"
  }
}
```

#### `POST /api/auth/login`
- **Fungsi**: Masuk ke akun dan mendapatkan token JWT untuk otorisasi endpoint lainnya.
- **Akses**: Public
- **Contoh Request Body**:
```json
{
  "email": "budi@foodcourt.com",
  "password": "password123"
}
```
- **Contoh Response (200 OK)**:
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
      "name": "Budi Santoso",
      "email": "budi@foodcourt.com",
      "role": "admin-food-court"
    }
  }
}
```

#### `GET /api/auth/verify-activation-token`
- **Fungsi**: Memverifikasi validitas token aktivasi akun tenant yang dikirimkan via email.
- **Akses**: Public
- **Query Parameter**: `?token=act_987654321_abc`
- **Contoh Response (200 OK)**:
```json
{
  "valid": true,
  "email": "tenant.siti@foodcourt.com",
  "name": "Ibu Siti",
  "tenantName": "Warung Rawon Bu Siti"
}
```

#### `POST /api/auth/activate-account`
- **Fungsi**: Mengaktifkan akun tenant baru dengan memasukkan token aktivasi dan membuat password awal.
- **Akses**: Public
- **Contoh Request Body**:
```json
{
  "token": "act_987654321_abc",
  "password": "passwordBaru123"
}
```
- **Contoh Response (200 OK)**:
```json
{
  "message": "Akun berhasil diaktifkan",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-tenant-owner-001",
      "name": "Ibu Siti",
      "email": "tenant.siti@foodcourt.com",
      "role": "tenant"
    }
  }
}
```

#### `GET /api/auth/me`
- **Fungsi**: Mengambil profil pengguna yang sedang login berdasarkan token JWT.
- **Akses**: Authenticated (`admin`, `admin-food-court`, `tenant`, `customer`, `cashier`)
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
    "name": "Budi Santoso",
    "email": "budi@foodcourt.com",
    "role": "admin-food-court",
    "createdAt": "2026-11-01T04:30:00.000Z"
  }
}
```

---

<div id="3-food-courts-apifood-courts-apifood-court-detail"></div>

### 3. Food Courts (`/api/food-courts`, `/api/food-court`)

#### `POST /api/food-courts`
- **Fungsi**: Mendaftarkan lokasi food court baru. Field `slug` dibuat otomatis dari `name`.
- **Akses**: `admin`, `admin-food-court`
- **Contoh Request Body**:
```json
{
  "name": "Grand City Food Court @Lantai 2",
  "address": "Jl. Pemuda No. 10, Surabaya",
  "phone": "081234567890",
  "logo": "https://example.com/logo.jpg"
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Food court registered successfully",
  "data": {
    "id": "fc-grand-city-001",
    "managerId": "usr-manager-fc-001",
    "name": "Grand City Food Court @Lantai 2",
    "slug": "grand-city-food-court-lantai-2",
    "address": "Jl. Pemuda No. 10, Surabaya",
    "phone": "081234567890",
    "status": "ACTIVE"
  }
}
```

#### `GET /api/food-courts`
- **Fungsi**: Mengambil daftar food court.
- **Akses**: `admin`, `admin-food-court` (`tenant` dan `customer` ditolak dengan `403 Forbidden`).
- **Query Opsional**: `?status=ACTIVE&search=Grand`

#### `GET /api/food-courts/:id`
- **Fungsi**: Mengambil detail satu food court lengkap dengan daftar meja dan tenant (ID UUID atau slug).
- **Akses**: `admin`, atau `admin-food-court` pemiliknya.

#### `GET /api/food-courts/:id/tenant`
- **Fungsi**: Mengambil daftar seluruh stan gerai/tenant yang berada di food court tertentu untuk dashboard manajemen internal.
- **Akses**: `admin`, `admin-food-court` pemilik cabang.
- **Alias Endpoint**: `GET /api/food-court/:id/tenant`

#### `GET /api/food-courts/:id/tenant/public`
- **Fungsi**: Mengambil daftar stan gerai/tenant aktif di cabang food court untuk pengunjung/pelanggan tanpa login.
- **Akses**: Public (Tanpa token)
- **Alias Endpoint**: `GET /api/food-court/:id/tenant/public`
- **Query Opsional**: `?isOpen=true&search=Rawon`

#### `PUT /api/food-courts/:id`
- **Fungsi**: Memperbarui informasi profil, alamat, telepon, atau status cabang food court.
- **Akses**: `admin`, atau manajer pemilik (`admin-food-court`).

#### `DELETE /api/food-courts/:id`
- **Fungsi**: Menghapus food court beserta relasi data di dalamnya.
- **Akses**: `admin` only.

---

### 4. Tenants / Kios Gerai (`/api/tenants`)

#### `POST /api/tenants`
- **Fungsi**: Membuat tenant/kios baru di dalam food court. Nomor stan divalidasi unik untuk stan yang aktif di cabang tersebut.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "foodCourtId": "fc-grand-city-001",
  "name": "Warung Rawon Bu Siti",
  "stallNumber": "STAN-A01",
  "description": "Rawon empal daging sapi khas Surabaya",
  "ownerName": "Ibu Siti",
  "ownerEmail": "siti.rawon@gmail.com",
  "isOpen": true,
  "openingTime": "09:00:00",
  "closingTime": "21:00:00"
}
```

#### `GET /api/tenants`
- **Fungsi**: Mengambil daftar tenant di food court untuk manajemen internal.
- **Akses**: `admin` (seluruh cabang), `admin-food-court` (cabang kelolaannya).

#### `GET /api/tenants/mine`
- **Fungsi**: Mengambil profil lengkap gerai/stan kios milik akun tenant yang sedang login.
- **Akses**: `tenant`

#### `GET /api/tenants/:id`
- **Fungsi**: Mengambil data detail gerai lengkap dengan daftar menu dan kategorinya (menerima ID UUID atau slug).
- **Akses**: Public / Semua Role

#### `GET /api/tenants/food-court/:id`
- **Fungsi**: Mengambil daftar seluruh gerai/stan kios di cabang food court tertentu (berdasarkan ID cabang) untuk dashboard manajemen internal melalui modul Tenants.
- **Akses**: `admin`, `admin-food-court` pengelola cabang terkait.
- **Query Opsional**: `?isOpen=true&search=Rawon`
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "tnt-rawon-siti-001",
      "foodCourtId": "fc-grand-city-001",
      "name": "Warung Rawon Bu Siti",
      "stallNumber": "STAN-A01",
      "description": "Rawon empal daging sapi khas Surabaya",
      "isOpen": true
    }
  ]
}
```

#### `PUT /api/tenants/:id`
- **Fungsi**: Memperbarui informasi gerai/kios, jam operasional, atau nomor rekening bank tenant.
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court` pengelola cabang terkait.

#### `DELETE /api/tenants/:id`
- **Fungsi**: Menghapus gerai/kios tenant dari food court.
- **Akses**: `admin`, `tenant` pemilik kios.

#### `POST /api/tenants/:id/resend-activation`
- **Fungsi**: Mengirim ulang email tautan aktivasi akun ke pemilik stan kios tenant.
- **Akses**: `admin`, `admin-food-court`

#### `GET /api/tenants/wallet`
- **Fungsi**: Mengambil ringkasan saldo dompet stan tenant (`balance`, `heldBalance`), total pendapatan kotor, serta mutasi kredit dan debit pesanan.
- **Akses**: `tenant`, `admin`, `admin-food-court` (menerima query `?tenantId=...`)

#### `GET /api/tenants/withdrawals`
- **Fungsi**: Mengambil riwayat pengajuan penarikan dana dompet stan tenant.
- **Akses**: `tenant`, `admin`, `admin-food-court` (menerima query `?tenantId=...`)

#### `POST /api/tenants/withdrawals`
- **Fungsi**: Mengajukan pencairan dana saldo dompet (minimal Rp 10.000).
- **Akses**: `tenant`, `admin`, `admin-food-court`
- **Contoh Request Body**:
```json
{
  "amount": 150000,
  "paymentMethod": "TRANSFER",
  "bankName": "BCA",
  "bankAccountNumber": "8291029384",
  "bankAccountHolder": "Siti Rahmawati"
}
```

#### `PATCH /api/tenants/withdrawals/:id/confirm`
- **Fungsi**: Konfirmasi oleh pemilik tenant bahwa dana pencairan transfer bank telah masuk ke rekening pribadinya (`DISBURSED` -> `COMPLETED`).
- **Akses**: `tenant`, `admin`, `admin-food-court`

#### `GET /api/tenants/dashboard-stats`
- **Fungsi**: Mengambil 4-layer merchant business & product intelligence terisolasi untuk akun stan tenant yang sedang login atau stan yang dispesifikasikan oleh Super Admin. Menyajikan total omzet, saldo dompet siap tarik, porsi terjual, rata-rata nilai transaksi (AOV), tren omzet harian/mingguan, grafik distribusi jam sibuk (*peak hours*), daftar 5 menu terlaris beserta popularitas opsi tambahannya, peringatan stok menipis/habis, serta riwayat pencairan dana terakhir.
- **Akses**: `tenant` (stan miliknya), `admin` (dengan query `?tenantId=...`)
- **Query Opsional**:
  - `range`: Rentang waktu filter analitik (`today`, `7d`, `30d`, `this_month`). Default: `30d`.
  - `tenantId`: ID stan tenant (khusus akses oleh Super Admin `admin`).
- **Contoh Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 14500000,
      "portionsSold": 580,
      "walletBalance": 3200000,
      "averageOrderValue": 25000
    },
    "salesTrend": [
      { "date": "2026-11-01", "revenue": 450000, "portions": 18 }
    ],
    "peakHours": [
      { "hour": "12:00", "portionCount": 42 }
    ],
    "topMenus": [
      {
        "menuId": "menu-uuid-1",
        "menuName": "Nasi Goreng Spesial",
        "categoryName": "Makanan Utama",
        "portionCount": 120,
        "totalSales": 3000000,
        "popularOptions": [
          { "optionName": "Pedas Sedang", "selectionCount": 75 }
        ]
      }
    ],
    "categoryDistribution": [
      { "categoryName": "Makanan Utama", "itemCount": 8, "percentage": 80 }
    ],
    "stockAlerts": [
      { "menuId": "menu-uuid-2", "menuName": "Es Teh Manis", "stock": 3, "isAvailable": true }
    ],
    "recentWithdrawals": [
      {
        "id": "wd-01",
        "amount": 500000,
        "paymentMethod": "TRANSFER",
        "status": "COMPLETED",
        "createdAt": "2026-11-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 5. Manajemen Penarikan Dana Tenant oleh Admin Cabang (`/api/admin/withdrawals`)

#### `GET /api/admin/withdrawals`
- **Fungsi**: Menampilkan daftar seluruh pengajuan pencairan dana dari tenant di bawah cabang kelolaan.
- **Akses**: `admin`, `admin-food-court`
- **Query Opsional**: `?status=REQUESTED|DISBURSED|COMPLETED|REJECTED`

#### `PATCH /api/admin/withdrawals/:id/process`
- **Fungsi**: Memproses pengajuan pencairan dana tenant dan menyertakan bukti transfer bank atau struk pencairan (`DISBURSED`).
- **Akses**: `admin`, `admin-food-court`
- **Contoh Request Body**:
```json
{
  "paymentMethod": "TRANSFER",
  "proofReceiptUrl": "http://localhost:3000/uploads/proofs/trx-123.jpg",
  "transferReference": "TRX-BCA-99881122",
  "adminNotes": "Pencairan batch sore telah ditransfer"
}
```

#### `PATCH /api/admin/withdrawals/:id/reject`
- **Fungsi**: Menolak pengajuan pencairan dana tenant; sistem secara otomatis mengembalikan saldo tertahan (`heldBalance`) kembali ke saldo aktif tenant.
- **Akses**: `admin`, `admin-food-court`
- **Contoh Request Body**:
```json
{
  "reason": "Nomor rekening tidak valid / nama tidak sesuai buku tabungan"
}
```

#### `PATCH /api/admin/withdrawals/:id/complete`
- **Fungsi**: Menyelesaikan pencairan uang tunai di tempat secara langsung (`COMPLETED`).
- **Akses**: `admin`, `admin-food-court`

---

### 6. Menus, Kategori & Opsi Varian (`/api/menus`)

#### `GET /api/menus`
- **Fungsi**: Mengambil daftar master menu dengan opsi filter untuk pengelolaan gerai.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Query Opsional**: `?tenantId=...&categoryId=...&isAvailable=true&search=Rawon`

#### `GET /api/menus/categories`
- **Fungsi**: Mengambil seluruh kategori menu sesuai lingkup otorisasi akun.
- **Akses**: `admin`, `admin-food-court`, `tenant` (menerima `?tenantId=...`)

#### `GET /api/menus/categories/:tenantId`
- **Fungsi**: Mengambil semua kategori beserta menu di dalamnya untuk tenant tertentu.
- **Akses**: Public / Semua Role

#### `GET /api/menus/tenant/:tenantId`
- **Fungsi**: Mengambil seluruh menu milik satu tenant (ID UUID atau slug).
- **Akses**: Public / Semua Role

#### `POST /api/menus/categories`
- **Fungsi**: Membuat kategori menu baru untuk tenant.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "tenantId": "tnt-rawon-siti-001",
  "name": "Makanan Utama"
}
```

#### `PUT /api/menus/categories/:id`
- **Fungsi**: Memperbarui nama kategori menu.
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `DELETE /api/menus/categories/:id`
- **Fungsi**: Menghapus kategori menu (menu di dalamnya dialihkan menjadi tanpa kategori).
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `GET /api/menus/:id/options`
- **Fungsi**: Mengambil daftar opsi/topping/varian tambahan untuk menu tertentu.
- **Akses**: Public / Semua Role

#### `POST /api/menus/:id/options`
- **Fungsi**: Menambahkan varian opsi tambahan baru pada menu.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "name": "Extra Telur Asin",
  "priceAdjustment": 5000
}
```

#### `PUT /api/menus/options/:id`
- **Fungsi**: Memperbarui nama atau penyesuaian harga varian opsi menu (juga didukung via `PUT /api/menus/:id/options/:optionId`).
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `DELETE /api/menus/options/:id`
- **Fungsi**: Menghapus opsi varian menu (juga didukung via `DELETE /api/menus/:id/options/:optionId`).
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `GET /api/menus/:id`
- **Fungsi**: Mengambil detail satu item menu makanan/minuman berdasarkan ID.
- **Akses**: Public / Semua Role

#### `POST /api/menus`
- **Fungsi**: Membuat menu baru lengkap dengan stok dan opsi varian.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "tenantId": "tnt-rawon-siti-001",
  "categoryId": "cat-makanan-utama-001",
  "name": "Rawon Komplit Daging Empal",
  "description": "Nasi rawon kuah hitam dengan daging empal gurih & sambal terasi",
  "price": 35000,
  "stock": 50,
  "imageUrl": "/uploads/menus/rawon.jpg",
  "isAvailable": true,
  "options": [
    { "name": "Level Pedas Sedang", "priceAdjustment": 0 },
    { "name": "Tambah Kerupuk Udang", "priceAdjustment": 3000 }
  ]
}
```

#### `PUT /api/menus/:id`
- **Fungsi**: Memperbarui informasi menu item.
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `DELETE /api/menus/:id`
- **Fungsi**: Menghapus menu item makanan/minuman.
- **Akses**: `admin`, `admin-food-court`, `tenant`

---

### 7. Meja Food Court & QR Code (`/api/tables`)

#### `GET /api/tables/scan/:qrToken`
- **Fungsi**: Scan token QR untuk mendapatkan detail meja dan cabang food court tanpa login.
- **Akses**: Public (Tanpa token)

#### `GET /api/tables/:id/qr`
- **Fungsi**: Menghasilkan dan men-stream grafis QR Code meja secara dinamis dalam format SVG scannable (`image/svg+xml`).
- **Akses**: Public (Tanpa token)
- **Query Opsional**: `?origin=http://localhost:5173`

#### `GET /api/tables`
- **Fungsi**: Mengambil daftar meja makan cabang food court (filter `?status=available|occupied|disabled`).
- **Akses**: `admin`, `admin-food-court`

#### `GET /api/tables/:id`
- **Fungsi**: Mengambil data detail meja makan berdasarkan ID.
- **Akses**: `admin`, `admin-food-court`

#### `GET /api/tables/:id/sessions`
- **Fungsi**: Mengambil riwayat sesi makan (*dining sessions*) per meja (partisipan, pesanan, status).
- **Akses**: `admin`, `admin-food-court`

#### `POST /api/tables`
- **Fungsi**: Membuat meja makan baru dan otomatis membuat token QR scannable.
- **Akses**: `admin`, `admin-food-court`

#### `PUT /api/tables/:id`
- **Fungsi**: Memperbarui nomor meja, kapasitas, atau status meja (`available`, `occupied`, `disabled`).
- **Akses**: `admin`, `admin-food-court`

#### `POST /api/tables/:id/regenerate-qr`
- **Fungsi**: Membuat ulang token QR meja baru untuk alasan keamanan.
- **Akses**: `admin`, `admin-food-court`

#### `DELETE /api/tables/:id`
- **Fungsi**: Menghapus meja dari food court.
- **Akses**: `admin`, `admin-food-court`

---

### 8. Pemesanan & Split Bill (`/api/orders`)

#### `POST /api/orders`
- **Fungsi**: Membuat pesanan makanan multi-tenant. Mendukung pesanan Dine-In di meja atau Takeaway via Kiosk, snapshot harga menu, integrasi promo voucher, dan pemecahan sub-order per stan.
- **Akses**: Customer / Public
- **Contoh Request Body**:
```json
{
  "tableId": "tbl-01-gc",
  "customerName": "Rizky Ramadhan",
  "orderType": "DINE_IN",
  "discountCode": "HEMAT10K",
  "notes": "Pesanan makan siang rombongan",
  "items": [
    {
      "menuId": "menu-rawon-001",
      "quantity": 2,
      "specialInstructions": "Kuah dipisah",
      "optionIds": ["opt-kerupuk-001"]
    }
  ]
}
```

#### `GET /api/orders`
- **Fungsi**: Mengambil riwayat daftar pesanan disaring otomatis sesuai peran pemanggil (`admin`, `tenant`, atau `customer`).
- **Akses**: Authenticated (`admin`, `tenant`, `customer`)

#### `GET /api/orders/track/:orderNumber`
- **Fungsi**: Tracking status pesanan dan antrean masak dapur secara real-time via nomor pesanan.
- **Akses**: Public (Tanpa token)

#### `POST /api/orders/sessions/join`
- **Fungsi**: Pelanggan lain di meja yang sama bergabung ke sesi makan aktif via scan `qrToken` atau kode sesi.
- **Akses**: Customer / Public

#### `GET /api/orders/:id`
- **Fungsi**: Mengambil rincian lengkap pesanan, sub-order stan dapur, alokasi split bill, dan total tagihan.
- **Akses**: Public / Authenticated

#### `POST /api/orders/:id/split-bill`
- **Fungsi**: Mengonfigurasi pembagian tagihan pesanan rombongan (*split-bill*) per item per nama partisipan secara transparan & proporsional terhadap diskon.
- **Akses**: Customer / Public
- **Contoh Request Body**:
```json
{
  "groups": [
    {
      "participantName": "Rizky",
      "items": [{ "orderItemId": "item-rawon-001", "quantity": 1 }]
    },
    {
      "participantName": "Budi",
      "items": [{ "orderItemId": "item-rawon-001", "quantity": 1 }]
    }
  ]
}
```

#### `PATCH /api/orders/:id/status`
- **Fungsi**: Memperbarui status pesanan utama (`COMPLETED` / `CANCELLED`). Selesai otomatis membebaskan meja menjadi `available`.
- **Akses**: `admin`, `tenant` yang terlibat

#### `PATCH /api/orders/tenant-orders/:id/status`
- **Fungsi**: Dapur gerai tenant memperbarui status antrean masakan (`QUEUED` -> `PREPARING` -> `READY` -> `COMPLETED`).
- **Akses**: `admin`, `tenant` pemilik stan

#### `PATCH /api/orders/items/:itemId/status`
- **Fungsi**: Memperbarui status pengerjaan untuk setiap item individual di pesanan.
- **Akses**: `admin`, `tenant` pemilik stan

---

### 9. Pembayaran & Kasir POS (`/api/payments`)

#### `POST /api/payments`
- **Fungsi**: Memproses pembayaran pesanan (QRIS, CASH, TRANSFER). Otomatis mengubah status tagihan menjadi `PAID` dan meneruskan pesanan ke antrean dapur tenant.
- **Akses**: Public / Customer / Kasir
- **Contoh Request Body**:
```json
{
  "orderId": "ord-76e33f38-2026",
  "paymentMethod": "QRIS",
  "amount": 64000,
  "provider": "Static-QRIS"
}
```

#### `POST /api/payments/midtrans`
- **Fungsi**: Membuat transaksi Midtrans Snap untuk pembayaran digital (mengembalikan `snapToken` & `redirectUrl`).
- **Akses**: Public / Customer

#### `POST /api/payments/midtrans/notification`
- **Fungsi**: Webhook status transaksi dari server Midtrans (diverifikasi via `signature_key`).
- **Akses**: Dipanggil oleh server Midtrans (Public)

#### `POST /api/payments/midtrans/:reference/sync`
- **Fungsi**: Tarik ulang status transaksi dari Midtrans untuk `reference` tertentu dan sinkronisasi status pembayaran.
- **Akses**: Public

#### `GET /api/payments/cashier/pending`
- **Fungsi**: Menampilkan daftar seluruh tagihan yang menunggu penyelesaian pembayaran tunai di kasir (*cashier settlement*).
- **Akses**: Kasir / Admin / Public
- **Query Opsional**: `?q=ORD-20261101`

#### `GET /api/payments/cashier/lookup/:query`
- **Fungsi**: Mencari rincian tagihan kasir berdasarkan nomor pesanan (`orderNumber`), ID payment group, atau kode pembayaran `CSH-`.
- **Akses**: Kasir / Public

#### `POST /api/payments/cashier/confirm`
- **Fungsi**: Kasir mengonfirmasi penerimaan uang tunai dari pelanggan. Sistem menghitung kembalian uang, memfinalisasi status menjadi `PAID/SUCCESS`, dan meneruskan order ke dapur tenant.
- **Akses**: Kasir / Admin / Public
- **Contoh Request Body**:
```json
{
  "orderId": "ord-76e33f38-2026",
  "cashReceived": 100000
}
```
- **Contoh Response (200 OK)**:
```json
{
  "message": "Cash payment confirmed successfully",
  "data": {
    "paymentId": "pay-csh-001",
    "orderId": "ord-76e33f38-2026",
    "totalAmount": 64000,
    "cashReceived": 100000,
    "changeAmount": 36000,
    "status": "SUCCESS"
  }
}
```

#### `GET /api/payments/cashier/history`
- **Fungsi**: Mengambil riwayat transaksi pembayaran kasir dan rekapitulasi total penerimaan uang kas harian.
- **Akses**: Kasir / Admin

#### `GET /api/payments/:orderId`
- **Fungsi**: Mengambil bukti dan rincian transaksi pembayaran berdasarkan ID order.
- **Akses**: Authenticated (`customer`, `cashier`, `admin`, `tenant`)

---

### 10. Dompet Cabang Food Court (`/api/admin/food-court`)

#### `GET /api/admin/food-court/wallet`
- **Fungsi**: Mengambil ringkasan saldo dompet cabang food court (akumulasi potongan komisi sewa stan) dan buku besar mutasi transaksi (*ledger*).
- **Akses**: `admin-food-court`, `admin`
- **Query Opsional**: `?foodCourtId=fc-grand-city-001`

#### `GET /api/admin/food-court/withdrawals`
- **Fungsi**: Mengambil riwayat pengajuan penarikan dana cabang food court.
- **Akses**: `admin-food-court`, `admin`
- **Query Opsional**: `?foodCourtId=...&status=REQUESTED|DISBURSED|COMPLETED|REJECTED`

#### `POST /api/admin/food-court/withdrawals`
- **Fungsi**: Manajer cabang mengajukan pencairan dana saldo dompet food court via Transfer Bank (minimal Rp 50.000).
- **Akses**: `admin-food-court`, `admin`
- **Contoh Request Body**:
```json
{
  "amount": 2500000,
  "bankName": "Bank Mandiri",
  "bankAccountNumber": "142001928374",
  "bankAccountHolder": "PT Pengelola Grand City"
}
```

#### `POST /api/admin/food-court/withdrawals/:id/confirm`
- **Fungsi**: Manajer cabang mengonfirmasi bahwa dana transfer dari Super Admin platform telah masuk ke rekening cabang (`DISBURSED` -> `COMPLETED`).
- **Akses**: `admin-food-court`, `admin`
- **Alias Method**: Mendukung `PATCH /api/admin/food-court/withdrawals/:id/confirm`

#### `GET /api/admin/food-court/dashboard-stats`
- **Fungsi**: Mengambil 4-layer insight statistik operasional dan finansial terisolasi untuk manajer cabang food court (`admin-food-court`) atau Super Admin. Menampilkan ringkasan omzet kotor cabang, total pesanan, okupansi meja makan real-time, durasi rata-rata makan pelanggan (*dining duration*), tren pendapatan, perbandingan kanal pemesanan (Dine-in QR vs Takeaway Kiosk), leaderboard omzet tenant di cabang, antrean aktif pengerjaan dapur per stan, dan daftar pesanan terbaru yang sedang berjalan.
- **Akses**: `admin-food-court` (cabang kelolaannya), `admin` (cabang default atau via `?foodCourtId=...`)
- **Query Opsional**:
  - `range`: Rentang waktu filter analitik (`today`, `7d`, `30d`, `this_month`). Default: `30d`.
  - `foodCourtId`: ID cabang food court (khusus Super Admin `admin`).
- **Contoh Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "branchRevenue": 85000000,
      "totalOrders": 1250,
      "currentOccupancyRate": 68.5,
      "avgDiningDurationMinutes": 42
    },
    "revenueTrend": [
      { "date": "2026-11-01", "revenue": 3200000, "orderCount": 48 }
    ],
    "channelBreakdown": {
      "dineInQrRevenue": 65000000,
      "dineInQrOrders": 950,
      "takeawayKioskRevenue": 20000000,
      "takeawayKioskOrders": 300
    },
    "tenantLeaderboard": [
      {
        "tenantId": "tnt-01",
        "tenantName": "Kopi Kenangan Senja",
        "stallNumber": "B-01",
        "totalRevenue": 22000000,
        "orderCount": 410
      }
    ],
    "kitchenQueueWorkload": [
      {
        "tenantId": "tnt-01",
        "tenantName": "Kopi Kenangan Senja",
        "queuedCount": 3,
        "preparingCount": 2,
        "readyCount": 1
      }
    ],
    "recentBranchOrders": [
      {
        "id": "ord-01",
        "orderNumber": "ORD-20261102-001",
        "type": "DINE_IN",
        "status": "PROCESSING",
        "totalAmount": 75000,
        "createdAt": "2026-11-02T12:30:00.000Z"
      }
    ]
  }
}
```

---

<div id="11-super-admin-disbursements--platform-revenue-apisuper-admin-detail"></div>

### 11. Super Admin Disbursements & Platform Revenue (`/api/super-admin`)

#### `GET /api/super-admin/withdrawals`
- **Fungsi**: Menampilkan seluruh pengajuan pencairan dana dari seluruh cabang food court di sistem platform.
- **Akses**: `admin` (Super Admin)

#### `POST /api/super-admin/withdrawals/:id/process`
- **Fungsi**: Super Admin memproses pencairan dana cabang food court dan menyertakan bukti transfer bank (`DISBURSED`).
- **Akses**: `admin` (Super Admin)
- **Alias Method**: Mendukung `PATCH`
- **Contoh Request Body**:
```json
{
  "proofReceiptUrl": "http://localhost:3000/uploads/proofs/transfer-fc-01.jpg",
  "transferReference": "TRX-MDR-889900",
  "adminNotes": "Pencairan operasional cabang periode akhir bulan"
}
```

#### `POST /api/super-admin/withdrawals/:id/reject`
- **Fungsi**: Menolak pengajuan pencairan cabang food court; saldo tertahan dikembalikan otomatis ke dompet cabang terkait.
- **Akses**: `admin` (Super Admin)
- **Alias Method**: Mendukung `PATCH`
- **Contoh Request Body**:
```json
{
  "reason": "Nomor rekening perusahaan tidak terdaftar dalam kontrak kerjasama"
}
```

#### `POST /api/super-admin/withdrawals/:id/complete`
- **Fungsi**: Memfinalisasi status pencairan dana food court menjadi `COMPLETED`.
- **Akses**: `admin` (Super Admin)
- **Alias Method**: Mendukung `PATCH`

#### `GET /api/super-admin/platform-revenue`
- **Fungsi**: Menampilkan total akumulasi pendapatan platform Amici (biaya layanan aplikasi 1% dari omzet kotor pesanan) beserta rincian kontribusi per cabang food court.
- **Akses**: `admin` (Super Admin)
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "totalPlatformRevenue": 4850000,
    "branches": [
      {
        "foodCourtId": "fc-grand-city-001",
        "foodCourtName": "Amici Food Court Grand City",
        "totalGrossRevenue": 485000000,
        "platformFeeContribution": 4850000
      }
    ]
  }
}
```

#### `GET /api/super-admin/dashboard-stats`
- **Fungsi**: Mengambil 4-layer executive statistical insights lintas cabang untuk akun Super Admin (`admin`). Menampilkan metrik makro Gross Merchandise Value (GMV), akumulasi platform fee 1%, total transaksi terselesaikan, active branch count, tren pendapatan platform harian/mingguan, leaderboard performa seluruh cabang food court, perbandingan adopsi kanal pemesanan (Dine-in QR vs Kiosk Takeaway), metrik SLA kecepatan masak dapur, komposisi metode pembayaran pelanggan, serta antrean pencairan dana cabang yang memerlukan tindakan verifikasi.
- **Akses**: `admin` (Super Admin only)
- **Query Opsional**:
  - `range`: Rentang waktu filter analitik (`today`, `7d`, `30d`, `this_month`). Default: `30d`.
  - `foodCourtId`: Filter analitik khusus untuk satu cabang tertentu (opsional).
- **Contoh Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalGmv": 485000000,
      "platformFee": 4850000,
      "totalOrders": 12450,
      "activeBranches": 8
    },
    "gmvTrend": [
      { "date": "2026-11-01", "gmv": 15200000, "platformFee": 152000 }
    ],
    "branchLeaderboard": [
      {
        "foodCourtId": "fc-01",
        "foodCourtName": "Grand City Food Court",
        "gmv": 185000000,
        "orderCount": 4800,
        "platformFee": 1850000
      }
    ],
    "channelAdoption": {
      "dineInQrRevenue": 340000000,
      "dineInQrCount": 8700,
      "takeawayKioskRevenue": 145000000,
      "takeawayKioskCount": 3750
    },
    "kitchenSla": {
      "avgPrepTimeMinutes": 14.5,
      "ordersDelayedCount": 18,
      "onTimePercentage": 96.2
    },
    "paymentComposition": [
      { "method": "QRIS", "count": 7800, "totalAmount": 310000000 },
      { "method": "CASH", "count": 3200, "totalAmount": 125000000 },
      { "method": "TRANSFER", "count": 1450, "totalAmount": 50000000 }
    ],
    "actionableWithdrawals": [
      {
        "id": "wd-fc-01",
        "foodCourtName": "Grand City Food Court",
        "amount": 5000000,
        "status": "REQUESTED",
        "createdAt": "2026-11-02T08:00:00.000Z"
      }
    ]
  }
}
```

---

<div id="12-rekonsiliasi-biaya-platform-sistem-apiadminsystem-detail"></div>

### 12. Rekonsiliasi Biaya Platform Sistem (`/api/admin/system`)

#### `POST /api/admin/system/reconcile-tenant-fees`
- **Fungsi**: Rekonsiliasi riwayat potongan platform tenant masa lampau dan mengkreditkan kembali selisih dana ke saldo dompet tenant.
- **Akses**: `admin` (Super Admin)
- **Contoh Response (200 OK)**:
```json
{
  "success": true,
  "message": "Rekonsiliasi platform fee tenant berhasil diselesaikan",
  "data": {
    "reconciledTenantsCount": 12,
    "totalRefundedAmount": 145000
  }
}
```

---

<div id="13-media--file-upload-apiupload-uploads-detail"></div>

### 13. Media & File Upload (`/api/upload`, `/uploads/*`)

Modul penyimpanan file gambar lokal (Local Storage) dengan pembatasan ukuran file **maksimal 1 MB** per file, validasi tipe gambar (`image/jpeg`, `image/png`, `image/webp`), nama file acak, dan proteksi path traversal.

#### `POST /api/upload`
- **Fungsi**: Mengunggah file foto sajian menu, logo stan gerai, atau logo cabang food court.
- **Akses**: Authenticated (`admin`, `admin-food-court`, `tenant`)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Body (`multipart/form-data`)**:
  - `file`: Binary file gambar (Maks. 1 MB, tipe `.jpg`, `.png`, `.webp`).
  - `folder` *(opsional)*: Subfolder tujuan: `'menus' | 'tenants' | 'food-courts'`. Default: `'menus'`.
- **Response `200 OK`**:
```json
{
  "message": "File berhasil disimpan di server",
  "data": {
    "url": "http://localhost:3000/uploads/menus/1730000000000-a1b2c3d4.jpg",
    "filename": "1730000000000-a1b2c3d4.jpg",
    "size": 412500,
    "mimeType": "image/jpeg"
  }
}
```

#### `GET /uploads/*`
- **Fungsi**: Mengambil file gambar statis publik untuk ditampilkan di browser / web pelanggan.
- **Akses**: Public (Tanpa token).
- **Keamanan**: Dilengkapi proteksi path traversal attack (menolak `..`), header `X-Content-Type-Options: nosniff`, dan browser cache `max-age=86400`.

---

### 14. Program Promo & Diskon Vouchers (`/api/discounts`)

#### `GET /api/discounts/public`
- **Fungsi**: Mengambil daftar kupon promo/voucher aktif yang tersedia untuk digunakan pelanggan saat checkout.
- **Akses**: Public (Tanpa token)
- **Query Parameter**: `?foodCourtId=fc-grand-city-001&tenantId=...`
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "dsc-grand-opening-10k",
      "foodCourtId": "fc-grand-city-001",
      "code": "HEMAT10K",
      "name": "Diskon Grand Opening Rp 10.000",
      "description": "Potongan langsung Rp 10.000 minimal belanja Rp 40.000",
      "scope": "FOOD_COURT",
      "type": "FIXED_AMOUNT",
      "value": 10000,
      "minOrderAmount": 40000,
      "isPublic": true,
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-12-31T23:59:59.000Z",
      "status": "ACTIVE"
    }
  ]
}
```

#### `POST /api/discounts/validate`
- **Fungsi**: Memvalidasi kode kupon promo atau ID voucher terhadap item keranjang belanja dan menghitung estimasi diskon sebelum checkout.
- **Akses**: Customer / Public
- **Contoh Request Body**:
```json
{
  "foodCourtId": "fc-grand-city-001",
  "discountCode": "HEMAT10K",
  "items": [
    {
      "menuId": "menu-rawon-001",
      "quantity": 2,
      "optionIds": ["opt-kerupuk-001"]
    }
  ]
}
```
- **Contoh Response (200 OK)**:
```json
{
  "message": "Voucher valid",
  "data": {
    "valid": true,
    "discount": { "id": "dsc-grand-opening-10k", "code": "HEMAT10K", "name": "Diskon Grand Opening" },
    "subtotal": 70000,
    "discountAmount": 10000,
    "discountedSubtotal": 60000,
    "serviceFee": 600,
    "taxAmount": 6060,
    "totalAmount": 66660
  }
}
```

#### `POST /api/discounts`
- **Fungsi**: Membuat program promo diskon baru (tingkat food court atau tingkat stan tenant).
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "foodCourtId": "fc-grand-city-001",
  "code": "RAWONFEST",
  "name": "Diskon Spesial Rawon 15%",
  "description": "Potongan 15% untuk santap rawon",
  "scope": "TENANT",
  "tenantId": "tnt-rawon-siti-001",
  "type": "PERCENTAGE",
  "value": 15,
  "maxDiscountAmount": 20000,
  "minOrderAmount": 50000,
  "isPublic": true,
  "usageLimit": 100,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-11-30T23:59:59.000Z",
  "status": "ACTIVE"
}
```

#### `GET /api/discounts`
- **Fungsi**: Mengambil master daftar promo diskon untuk dashboard manajemen internal.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Query Opsional**: `?foodCourtId=...&tenantId=...&status=ACTIVE&search=RAWON`

#### `GET /api/discounts/:id`
- **Fungsi**: Mengambil detail informasi konfigurasi voucher promo berdasarkan ID diskon.
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `PUT /api/discounts/:id`
- **Fungsi**: Memperbarui nama, masa berlaku, kuota, atau status promo diskon.
- **Akses**: `admin`, `admin-food-court`, `tenant`

#### `DELETE /api/discounts/:id`
- **Fungsi**: Menonaktifkan program promo diskon (`INACTIVE`).
- **Akses**: `admin`, `admin-food-court`, `tenant`

---

### 15. Mesin Pemesanan Mandiri / Self-Service Kiosks (`/api/kiosks`)

#### `GET /api/kiosks/resolve/:deviceCode`
- **Fungsi**: Resolusi terminal mesin kios mandiri berdasarkan kode perangkat (`deviceCode`). Mengembalikan profil food court, daftar stan tenant aktif, dan katalog menu takeaway untuk pemesanan langsung di mesin.
- **Akses**: Public (Tanpa token)
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "kiosk": {
      "id": "ksk-gc-lobby-01",
      "kioskName": "Kiosk Lobby Utama",
      "deviceCode": "KIOSK-GC-LOBBY-01",
      "status": "ACTIVE",
      "location": "Lobby Barat Lantai 2"
    },
    "foodCourt": {
      "id": "fc-grand-city-001",
      "name": "Amici Food Court Grand City",
      "slug": "amici-food-court-grand-city"
    },
    "tenants": [
      {
        "id": "tnt-rawon-siti-001",
        "name": "Warung Rawon Bu Siti",
        "stallNumber": "STAN-A01",
        "isOpen": true
      }
    ]
  }
}
```

#### `GET /api/kiosks`
- **Fungsi**: Mengambil daftar perangkat terminal Kiosk yang terdaftar di cabang food court.
- **Akses**: `admin`, `admin-food-court`
- **Query Opsional**: `?status=ACTIVE&foodCourtId=fc-grand-city-001`

#### `POST /api/kiosks`
- **Fungsi**: Mendaftarkan perangkat mesin terminal Kiosk baru di cabang food court.
- **Akses**: `admin`, `admin-food-court`
- **Contoh Request Body**:
```json
{
  "foodCourtId": "fc-grand-city-001",
  "kioskName": "Kiosk Pintu Timur Lantai 2",
  "deviceCode": "KIOSK-GC-EAST-02",
  "location": "Dekat Pintu Masuk Timur",
  "status": "ACTIVE"
}
```

#### `GET /api/kiosks/:id`
- **Fungsi**: Mengambil detail informasi perangkat terminal Kiosk berdasarkan ID.
- **Akses**: `admin`, `admin-food-court`

#### `PUT /api/kiosks/:id`
- **Fungsi**: Memperbarui nama, kode mesin, lokasi fisik, atau mengaktifkan/menonaktifkan perangkat Kiosk.
- **Akses**: `admin`, `admin-food-court`

#### `DELETE /api/kiosks/:id`
- **Fungsi**: Menghapus data perangkat Kiosk dari sistem cabang food court.
- **Akses**: `admin`, `admin-food-court`

#### `GET /api/kiosks/:id/stats`
- **Fungsi**: Mengambil statistik performa mesin Kiosk (total pesanan takeaway yang dibuat, total omzet yang diproses, nilai rata-rata transaksi, dan tenant terpopuler).
- **Akses**: `admin`, `admin-food-court`
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "kioskId": "ksk-gc-lobby-01",
    "totalOrders": 128,
    "totalRevenue": 7450000,
    "averageOrderValue": 58203,
    "topTenants": [
      {
        "tenantId": "tnt-rawon-siti-001",
        "tenantName": "Warung Rawon Bu Siti",
        "orderCount": 74
      }
    ]
  }
}
```

---

## Struktur Error Response

Semua error pada API ini mengikuti format respons JSON terstandar:

```json
{
  "success": false,
  "error": "NamaError",
  "message": "Penjelasan detail mengenai error yang terjadi"
}
```

### Panduan Kode Status HTTP:
- **`400 BadRequestError`**: Format input data salah atau melanggar aturan bisnis (misal: nomor stan duplikat pada stan aktif di food court yang sama, nominal pencairan di bawah batas minimal, file melebihi 1 MB).
- **`401 UnauthorizedError`**: Token JWT tidak disertakan atau token telah kadaluarsa.
- **`403 ForbiddenError`**: Pengguna login, tetapi tidak memiliki izin mengakses entitas tersebut (misal: manajer food court mengakses data cabang lain, customer mengakses daftar internal tenant, atau bukan pemilik stan).
- **`404 NotFoundError`**: Data yang dicari (Food Court / Tenant / Menu / Kategori / Meja / Order / Diskon / Kiosk) tidak ditemukan.
- **`409 ConflictError`**: Terjadi konflik data unik (misal: slug food court sudah terdaftar, deviceCode Kiosk duplikat, email pengguna sudah digunakan).
- **`422 ValidationError`**: Data body/parameter tidak sesuai dengan validasi skema TypeBox.
- **`500 InternalServerError`**: Terjadi kesalahan internal pada server database atau aplikasi.