# Food Court API Documentation

RESTful API berperforma tinggi untuk manajemen operasional Food Court modern. Dibangun menggunakan **ElysiaJS**, **Bun runtime**, **Drizzle ORM**, dan **MySQL**.

---

## Daftar Isi
1. [Tech Stack & Arsitektur](#tech-stack--arsitektur)
2. [Instalasi & Menjalankan Proyek](#instalasi--menjalankan-proyek)
3. [Konsep Hak Akses (Role-Based Access Control / RBAC)](#konsep-hak-akses-role-based-access-control--rbac)
4. [Matriks Hak Akses & Response Antar Role Seluruh Endpoint](#matriks-hak-akses--response-antar-role-seluruh-endpoint)
5. [Dokumentasi Lengkap Seluruh Endpoint](#dokumentasi-lengkap-seluruh-endpoint)
   - [1. General & Health](#1-general--health)
   - [2. Autentikasi (`/api/auth`)](#2-autentikasi-apiauth)
   - [3. Food Courts (`/api/food-courts`)](#3-food-courts-apifood-courts)
   - [4. Tenants / Kios (`/api/tenants`, `/api/food-court/:id/tenant`)](#4-tenants--kios-apitenants-apifood-courtidtenant)
   - [5. Menus & Kategori (`/api/menus`)](#5-menus--kategori-apimenus)
   - [6. Meja Food Court (`/api/tables`)](#6-meja-food-court-apitables)
   - [7. Pemesanan / Orders (`/api/orders`)](#7-pemesanan--orders-apiorders)
   - [8. Pembayaran / Payments (`/api/payments`)](#8-pembayaran--payments-apipayments)
6. [Struktur Error Response](#struktur-error-response)

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
```

### 3. Install Dependensi & Jalankan Migrasi
```bash
# Install paket
bun install

# Jalankan migrasi / sinkronisasi skema database
bun run db:push

# Jalankan server mode development
bun run dev
```

Server akan aktif di:
- **API URL**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/swagger`
- **Swagger JSON Specification**: `http://localhost:3000/swagger/json`

---

## Konsep Hak Akses (Role-Based Access Control / RBAC)

Sistem ini memiliki 4 tingkatan Role dan 1 akses Publik/Tamu:

| Role | Kode Sistem | Deskripsi & Ruang Lingkup Hak Akses |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | Pengelola sistem utama. Memiliki hak akses penuh untuk melihat, menambah, mengubah, dan menghapus seluruh data pada semua food court, tenant, menu, meja, dan pesanan. |
| **Admin Food Court** | `admin-food-court` | Manajer food court tertentu. Mengelola food court miliknya, tenant yang beroperasi di food court miliknya, serta meja dan menu di food court tersebut. Dilarang mengakses data food court milik manajer lain. |
| **Tenant / Penjual** | `tenant` | Pemilik gerai/kios makanan. Mengelola profil kios miliknya, kategori menu, daftar menu, serta memproses antrean pesanan dapur untuk gerainya. Dilarang mengakses daftar tenant global atau food court lain. |
| **Customer** | `customer` | Pengunjung/pembeli. Dapat mendaftar akun, scan meja via QR, melihat katalog menu per tenant, memesan makanan multi-gerai dalam 1 keranjang, join sesi meja aktif, dan memproses pembayaran. Dilarang mengakses endpoint manajemen internal. |
| **Public / Guest** | *(Tanpa Token)* | Pengunjung umum tanpa login. Dapat melihat status API, katalog menu per tenant, tracking live status pesanan melalui nomor pesanan (`orderNumber`), serta membaca dokumentasi Swagger. |

---

## Matriks Hak Akses & Response Antar Role Seluruh Endpoint

Tabel berikut menyajikan seluruh 38 endpoint aktif hasil pemindaian spesifikasi Swagger OpenAPI (`/swagger/json`). Endpoint telah dikelompokkan sesuai dengan folder/tag pada Swagger:

### 1. General & Health

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/` | 200 OK (Status server & metadata) | 200 OK (Status server & metadata) | 200 OK (Status server & metadata) | 200 OK (Status server & metadata) | Health check dan info metadata server API. |

### 2. Auth

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | `POST` | `/api/auth/register` | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Diizinkan (Daftar akun baru) | Registrasi pengguna baru (`admin`, `admin-food-court`, `tenant`, `customer`). |
| 3 | `POST` | `/api/auth/login` | Login & terima token JWT | Login & terima token JWT | Login & terima token JWT | Login & terima token JWT | Autentikasi email dan kata sandi untuk memperoleh token JWT. |
| 4 | `GET` | `/api/auth/me` | Profil Super Admin | Profil Manajer Food Court | Profil Pemilik Kios | Profil Customer *(Tanpa token: `401 Unauthorized`)* | Mengambil data profil user yang sedang login berdasarkan token JWT. |

### 3. Food Courts

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | `POST` | `/api/food-courts/` | Diizinkan (Bisa pilih managerId) | Diizinkan (Otomatis managerId = user.id) | `403 Forbidden` | `403 Forbidden` | Mendaftarkan lokasi food court baru (otomatis generate slug unik). |
| 6 | `GET` | `/api/food-courts/` | Mengembalikan **seluruh food court** di sistem | **Hanya food court miliknya** (`managerId = user.id`) | `403 Forbidden` | `403 Forbidden` | Mengambil daftar food court. Tersedia filter status dan pencarian nama. |
| 7 | `GET` | `/api/food-courts/{id}` | Mengembalikan detail food court manapun | Mengembalikan detail **hanya jika food court miliknya**; ditolak `403` jika food court lain | `403 Forbidden` | `403 Forbidden` | Mengambil data detail food court lengkap dengan daftar meja dan tenant (ID/slug). |
| 8 | `PUT` | `/api/food-courts/{id}` | Diizinkan update food court manapun | Diizinkan **hanya untuk food court miliknya**; ditolak `403` jika food court lain | `403 Forbidden` | `403 Forbidden` | Memperbarui informasi profil, alamat, telepon, atau status food court. |
| 9 | `DELETE` | `/api/food-courts/{id}` | Diizinkan menghapus food court | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | Menghapus food court beserta relasi data di dalamnya (Super Admin saja). |

### 4. Tenants

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 10 | `GET` | `/api/tenants/` | Mengembalikan **seluruh tenant** dari semua food court | **Hanya tenant yang ada di food court kelolaannya** | `403 Forbidden` | `403 Forbidden` | Mengambil master daftar tenant food court untuk manajemen internal. |
| 11 | `POST` | `/api/tenants/` | Diizinkan buat gerai di food court manapun | Diizinkan buat gerai di food court kelolaannya | Diizinkan daftarkan gerai miliknya | `403 Forbidden` | Membuat tenant baru (memvalidasi keunikan nomor stan yang sedang aktif). |
| 12 | `GET` | `/api/tenants/{id}` | Mengembalikan detail profil gerai | Mengembalikan detail profil gerai | Mengembalikan detail profil gerai | Mengembalikan detail profil gerai | Detail tenant lengkap dengan daftar kategori & menu (menerima ID/slug). |
| 13 | `PUT` | `/api/tenants/{id}` | Diizinkan update gerai manapun | Diizinkan **hanya jika tenant di food court miliknya** | Diizinkan **hanya untuk gerai miliknya sendiri** | `403 Forbidden` | Update data tenant (nama, nomor stan, jam buka/tutup, status operasional). |
| 14 | `DELETE` | `/api/tenants/{id}` | Diizinkan hapus gerai | `403 Forbidden` | Diizinkan **hanya untuk gerai miliknya sendiri** | `403 Forbidden` | Menghapus tenant dari food court. |
| 15 | `GET` | `/api/food-court/{id}/tenant` | Mengembalikan seluruh tenant di food court tersebut | Diizinkan **hanya jika food court miliknya**; ditolak `403` jika food court lain | `403 Forbidden` | `403 Forbidden` | Mengambil daftar seluruh gerai/tenant di food court tertentu. |

### 5. Menus

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 18 | `GET` | `/api/menus/` | Mengembalikan **seluruh menu** dari semua food court | **Hanya menu dari tenant di food court kelolaannya** | **Hanya menu dari kios miliknya sendiri** | `403 Forbidden` *(Gunakan menu per tenant)* | Daftar menu internal manajemen dengan filter kategori, ketersediaan, dan nama. |
| 19 | `POST` | `/api/menus/` | Diizinkan buat menu | Diizinkan jika untuk tenant di food court miliknya | Diizinkan jika untuk gerai miliknya sendiri | `403 Forbidden` | Membuat menu baru (memvalidasi relasi kategori milik tenant terkait). |
| 20 | `GET` | `/api/menus/categories/{tenantId}` | Mengembalikan kategori & menu tenant | Diizinkan **jika tenant di food court miliknya**; ditolak `403` jika di luar | Diizinkan **jika tenant miliknya sendiri**; ditolak `403` jika milik orang lain | Mengembalikan kategori & menu tenant (katalog belanja pembeli) | Mengambil kategori dan daftar menu di dalamnya untuk tenant tertentu. |
| 21 | `GET` | `/api/menus/tenant/{tenantId}` | Mengembalikan seluruh menu tenant | Diizinkan **jika tenant di food court miliknya**; ditolak `403` jika di luar | Diizinkan **jika tenant miliknya sendiri**; ditolak `403` jika milik orang lain | Mengembalikan seluruh menu tenant (katalog belanja pembeli) | Mengambil seluruh menu milik satu tenant (menerima ID UUID atau slug). |
| 22 | `POST` | `/api/menus/categories` | Diizinkan buat kategori | Diizinkan untuk tenant di food court miliknya | Diizinkan untuk tenant miliknya sendiri | `403 Forbidden` | Membuat kategori menu baru untuk gerai tenant tertentu. |
| 23 | `GET` | `/api/menus/{id}` | Mengembalikan detail item menu | Mengembalikan detail item menu | Mengembalikan detail item menu | Mengembalikan detail item menu | Mengambil data detail satu item menu makanan/minuman berdasarkan ID. |
| 24 | `PUT` | `/api/menus/{id}` | Diizinkan update menu | Diizinkan jika menu milik tenant di food court kelolaannya | Diizinkan jika menu milik kiosnya sendiri | `403 Forbidden` | Update data menu (nama, harga, stok, ketersediaan, gambar). |
| 25 | `DELETE` | `/api/menus/{id}` | Diizinkan hapus menu | Diizinkan jika menu milik tenant di food court kelolaannya | Diizinkan jika menu milik kiosnya sendiri | `403 Forbidden` | Menghapus item menu makanan/minuman. |

### 6. Tables

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 26 | `GET` | `/api/tables/` | Mengembalikan seluruh meja | Hanya meja dari food court kelolaannya | Hanya meja dari food court tempat kiosnya berada | `403 Forbidden` | Mengambil daftar meja makan (terisolasi per Role). |
| 27 | `POST` | `/api/tables/` | Diizinkan membuat meja | Diizinkan jika di food court kelolaannya | `403 Forbidden` | `403 Forbidden` | Membuat meja makan baru dan otomatis membuat token QR (`qrToken`) unik. |
| 28 | `GET` | `/api/tables/{id}` | Mengembalikan detail meja | Hanya meja dari food court kelolaannya | Hanya meja dari food court tempat kiosnya berada | `403 Forbidden` | Mengambil data detail meja makan berdasarkan ID (terisolasi per Role). |
| 29 | `PUT` | `/api/tables/{id}` | Diizinkan update meja | Diizinkan jika meja di food court kelolaannya | `403 Forbidden` | `403 Forbidden` | Memperbarui kapasitas atau status meja (`available`, `occupied`, `disabled`). |
| 30 | `DELETE` | `/api/tables/{id}` | Diizinkan hapus meja | Diizinkan jika meja di food court kelolaannya | `403 Forbidden` | `403 Forbidden` | Menghapus meja dari food court. |

### 7. Orders

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 31 | `POST` | `/api/orders/` | Diizinkan membuat order | Diizinkan membuat order | Diizinkan membuat order | Diizinkan membuat order (multi-tenant order di meja) | Membuat pesanan baru, membuat sesi meja makan, dan memecah sub-order per kios. |
| 32 | `GET` | `/api/orders/` | Melihat **seluruh riwayat pesanan** di semua food court | *(Mengikuti relasi transaksi)* | **Hanya melihat pesanan yang masuk ke kios miliknya** (`tenantOrders`) | **Hanya melihat pesanan yang dibuat oleh dirinya sendiri** (`userId = user.id`) | Mengambil riwayat daftar pesanan (disaring otomatis sesuai hak role pemanggil). |
| 33 | `GET` | `/api/orders/track/{orderNumber}` | Live tracking pesanan | Live tracking pesanan | Live tracking pesanan | Live tracking pesanan pembeli tanpa login via nomor order | Live tracking status pesanan dan antrean masak dapur secara publik via link/QR. |
| 34 | `POST` | `/api/orders/sessions/join` | Diizinkan join sesi | Diizinkan join sesi | Diizinkan join sesi | Customer login dapat bergabung ke sesi meja via `qrToken` *(Tamu: `401 Unauthorized`)* | Bergabung ke sesi meja makan aktif untuk pemesanan rombongan. |
| 35 | `GET` | `/api/orders/{id}` | Melihat rincian lengkap pesanan manapun | Melihat jika terkait food court kelolaannya | Melihat jika pesanan memuat menu dari gerainya | Melihat jika merupakan pesanan miliknya sendiri | Mengambil detail pesanan, rincian sub-order gerai, dan total tagihan. |
| 36 | `PATCH` | `/api/orders/{id}/status` | Diizinkan update status utama | Diizinkan jika terkait | Diizinkan jika gerainya terlibat | `403 Forbidden` | Update status pesanan utama (COMPLETED/CANCELLED). Selesai otomatis bebaskan meja. |
| 37 | `PATCH` | `/api/orders/tenant-orders/{id}/status` | Diizinkan update antrean | Diizinkan jika terkait | Diizinkan **hanya pemilik stan penerima order tersebut** | `403 Forbidden` | Dapur tenant memperbarui progres masak (`QUEUED` -> `PREPARING` -> `READY` -> `COMPLETED`). |
| 38 | `PATCH` | `/api/orders/items/{itemId}/status` | Diizinkan update status item | Diizinkan jika terkait | Diizinkan **hanya pemilik gerai dari menu tersebut** | `403 Forbidden` | Mengupdate status pengerjaan untuk setiap item makanan individual. |

### 8. Payments

| No | Method | Endpoint / Path | Super Admin (`admin`) | Admin Food Court (`admin-food-court`) | Tenant (`tenant`) | Customer / Public | Keterangan & Perilaku |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 39 | `POST` | `/api/payments/` | Diizinkan proses bayar | Diizinkan proses bayar | Diizinkan proses bayar | Diizinkan bayar pesanan (QRIS, CASH, TRANSFER) | Memproses pembayaran pesanan, mengubah status order jadi `PAID`, dan kirim antrean ke dapur. |
| 40 | `GET` | `/api/payments/{orderId}` | Melihat bukti pembayaran | Melihat bukti jika terkait | Melihat bukti jika terkait | Melihat bukti pembayaran pesanannya *(Tamu: `401 Unauthorized`)* | Mengambil detail dan bukti transaksi pembayaran berdasarkan ID pesanan. |

---

## Dokumentasi Lengkap Seluruh Endpoint

Semua endpoint yang membutuhkan autentikasi wajib menyertakan HTTP Header:
```http
Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>
```

---

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
  "timestamp": "2026-09-25T01:20:00.000Z"
}
```

---

### 2. Autentikasi (`/api/auth`)

#### `POST /api/auth/register`
- **Fungsi**: Mendaftarkan pengguna baru dengan role tertentu (`admin`, `admin-food-court`, `tenant`, atau `customer`).
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
    "createdAt": "2026-09-25T01:21:00.000Z",
    "updatedAt": "2026-09-25T01:21:00.000Z"
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

#### `GET /api/auth/me`
- **Fungsi**: Mengambil profil user yang sedang login berdasarkan token JWT.
- **Akses**: Authenticated (`admin`, `admin-food-court`, `tenant`, `customer`)
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
    "name": "Budi Santoso",
    "email": "budi@foodcourt.com",
    "role": "admin-food-court",
    "createdAt": "2026-09-25T01:21:00.000Z"
  }
}
```

---

### 3. Food Courts (`/api/food-courts`)

#### `POST /api/food-courts`
- **Fungsi**: Mendaftarkan lokasi food court baru. Field `slug` dibuat otomatis dari `name` (karakter dibersihkan dari spasi & simbol khusus).
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
    "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "managerId": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
    "name": "Grand City Food Court @Lantai 2",
    "slug": "grand-city-food-court-lantai-2",
    "address": "Jl. Pemuda No. 10, Surabaya",
    "phone": "081234567890",
    "logo": "https://example.com/logo.jpg",
    "status": "ACTIVE",
    "createdAt": "2026-09-25T01:22:00.000Z",
    "updatedAt": "2026-09-25T01:22:00.000Z",
    "tenants": [],
    "tables": []
  }
}
```

#### `GET /api/food-courts`
- **Fungsi**: Mengambil daftar food court.
- **Akses**: `admin`, `admin-food-court` (`tenant` dan `customer` ditolak dengan `403 Forbidden`).
- **Dinamika Perilaku**:
  - `admin`: Melihat semua food court dari seluruh manajer.
  - `admin-food-court`: Otomatis hanya melihat food court miliknya.
- **Query Opsional**: `?status=ACTIVE&search=Grand`
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "managerId": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
      "name": "Grand City Food Court @Lantai 2",
      "slug": "grand-city-food-court-lantai-2",
      "status": "ACTIVE",
      "manager": {
        "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
        "name": "Budi Santoso",
        "email": "budi@foodcourt.com",
        "role": "admin-food-court"
      },
      "tenants": [],
      "tables": []
    }
  ]
}
```

#### `GET /api/food-courts/:id`
- **Fungsi**: Mengambil detail satu food court lengkap dengan daftar meja dan tenant. Parameter `:id` mendukung ID UUID maupun slug.
- **Akses**: `admin`, atau `admin-food-court` pemiliknya (`403 Forbidden` jika food court milik manajer lain).

#### `PUT /api/food-courts/:id`
- **Fungsi**: Memperbarui profil/nama food court.
- **Akses**: `admin`, atau manajer pemilik (`admin-food-court`).

#### `DELETE /api/food-courts/:id`
- **Fungsi**: Menghapus food court beserta relasi data di dalamnya.
- **Akses**: `admin` only.

---

### 4. Tenants / Kios (`/api/tenants`, `/api/food-court/:id/tenant`)

#### `POST /api/tenants`
- **Fungsi**: Membuat tenant/kios baru di dalam food court.
  - Slug dibuat otomatis dan dijamin unik per food court.
  - Nomor stan (`stallNumber`) divalidasi tidak boleh bertabrakan dengan tenant lain yang sedang buka/aktif (`isOpen: true`) di food court yang sama.
- **Akses**: `admin`, `admin-food-court`, `tenant`
- **Contoh Request Body**:
```json
{
  "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
  "name": "Warung Rawon Bu Siti",
  "stallNumber": "STAN-A01",
  "description": "Rawon empal daging sapi khas Surabaya",
  "isOpen": true,
  "openingTime": "09:00:00",
  "closingTime": "21:00:00"
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Tenant created successfully",
  "data": {
    "id": "59b40097-4007-42f0-94cb-fa225916ca11",
    "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "name": "Warung Rawon Bu Siti",
    "slug": "warung-rawon-bu-siti",
    "stallNumber": "STAN-A01",
    "isOpen": true
  }
}
```

#### `GET /api/tenants`
- **Fungsi**: Mengambil daftar tenant di food court.
- **Akses**: `admin`, `admin-food-court` (`tenant` dan `customer` **tidak memiliki akses** / `403 Forbidden`).
- **Dinamika Perilaku**:
  - `admin`: Melihat tenant dari seluruh food court di sistem.
  - `admin-food-court`: **Otomatis hanya melihat tenant yang berada di food court kelolaannya**.
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "59b40097-4007-42f0-94cb-fa225916ca11",
      "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "name": "Warung Rawon Bu Siti",
      "slug": "warung-rawon-bu-siti",
      "stallNumber": "STAN-A01",
      "isOpen": true,
      "categories": []
    }
  ]
}
```

#### `GET /api/tenants/:id`
- **Fungsi**: Mengambil data detail gerai lengkap dengan daftar menu dan kategorinya.
- **Akses**: Public / Semua Role

#### `GET /api/food-court/:id/tenant`
- **Fungsi**: Mengambil daftar seluruh gerai/tenant yang berada di suatu food court.
- **Folder di Swagger**: **Tenants**
- **Akses**: `admin`, `admin-food-court` pemiliknya (`tenant` dan `customer` **tidak memiliki akses** / `403 Forbidden`).
- **Parameter**: `:id` berupa UUID atau slug food court (misal: `grand-city-food-court-lantai-2`).
- **Query Opsional**: `?isOpen=true&search=Rawon`
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "59b40097-4007-42f0-94cb-fa225916ca11",
      "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "ownerId": "91a1e0b5-7c9b-4a57-b08e-5bdf8e983058",
      "name": "Warung Rawon Bu Siti",
      "slug": "warung-rawon-bu-siti",
      "stallNumber": "STAN-A01",
      "description": "Rawon empal sapi kuah gurih",
      "isOpen": true,
      "categories": [
        {
          "id": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
          "name": "Makanan Utama",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

#### `PUT /api/tenants/:id`
- **Fungsi**: Memperbarui informasi gerai/kios.
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court` pengelola food court terkait.

#### `DELETE /api/tenants/:id`
- **Fungsi**: Menghapus gerai/kios.
- **Akses**: `admin`, `tenant` pemilik kios.

---

### 5. Menus & Kategori (`/api/menus`)

#### `POST /api/menus/categories`
- **Fungsi**: Membuat kategori menu baru untuk tenant.
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court` pengelola food court terkait.
- **Contoh Request Body**:
```json
{
  "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
  "name": "Makanan Utama"
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Category created successfully",
  "data": {
    "id": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
    "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
    "name": "Makanan Utama",
    "createdAt": "2026-09-25T01:25:00.000Z"
  }
}
```

#### `GET /api/menus/categories/:tenantId`
- **Fungsi**: Mengambil semua kategori beserta menu di dalamnya untuk tenant tertentu.
- **Akses**: Public / Semua Role (Pembeli, Tenant, Admin Food Court, Super Admin).
- **Dinamika Perilaku & Proteksi**:
  - `admin-food-court`: Ditolak `403 Forbidden` jika tenant berada di luar food court kelolaannya.
  - `tenant`: Ditolak `403 Forbidden` jika bukan kios miliknya.
  - Menu di dalam kategori diproteksi 100% hanya menampilkan menu dengan `tenant_id` yang sesuai (tidak bocor ke tenant lain).
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
      "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
      "name": "Makanan Utama",
      "menus": [
        {
          "id": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
          "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
          "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
          "name": "Rawon Komplit Empal",
          "price": 32000,
          "isAvailable": true
        }
      ]
    }
  ]
}
```

#### `POST /api/menus`
- **Fungsi**: Membuat menu baru.
  - String kosong `""` pada `categoryId`, `description`, atau `imageUrl` otomatis dikonversi ke `null`.
  - Jika `categoryId` diisi, sistem memvalidasi bahwa kategori tersebut ada dan milik tenant terkait (mencegah error database foreign key).
  - Field `price` fleksibel menerima number (`32000`) maupun numeric string (`"32000"`).
  - Field `imageUrl` menerima URL penuh (`https://...`) maupun relative path (`/uploads/rawon.jpg`).
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court` pengelola food court.
- **Contoh Request Body**:
```json
{
  "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
  "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
  "name": "Rawon Komplit Empal",
  "description": "Nasi rawon kuah hitam dengan daging empal gurih & telur asin",
  "price": 32000,
  "imageUrl": "/images/rawon.jpg",
  "isAvailable": true
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Menu item created successfully",
  "data": {
    "id": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
    "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
    "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
    "name": "Rawon Komplit Empal",
    "description": "Nasi rawon kuah hitam dengan daging empal gurih & telur asin",
    "price": 32000,
    "stock": 0,
    "status": "AVAILABLE",
    "imageUrl": "/images/rawon.jpg",
    "isAvailable": true,
    "createdAt": "2026-09-25T01:26:00.000Z",
    "updatedAt": "2026-09-25T01:26:00.000Z"
  }
}
```

#### `GET /api/menus`
- **Fungsi**: Mengambil daftar menu dengan opsi filter untuk pengelolaan gerai.
- **Akses**: `admin`, `admin-food-court`, `tenant` (Customer **tidak boleh mengakses endpoint ini** / `403 Forbidden`).
- **Dinamika Perilaku**:
  - `admin`: Melihat semua menu dari semua gerai.
  - `admin-food-court`: **Hanya melihat menu dari tenant yang berada di food court miliknya**.
  - `tenant`: **Hanya melihat menu dari kios miliknya sendiri**.
  - `customer`: Ditolak `403 Forbidden`. Customer dapat melihat menu per tenant via `GET /api/menus/tenant/:tenantId` atau `GET /api/tenants/:id/menus`.
- **Query Opsional**: `?tenantId=...&categoryId=...&isAvailable=true&search=Rawon`

#### `GET /api/menus/tenant/:tenantId`
- **Fungsi**: Endpoint khusus untuk mengambil seluruh menu milik satu tenant tertentu. Parameter `:tenantId` fleksibel menerima UUID maupun slug tenant.
- **Akses**: Public / Semua Role (Digunakan oleh aplikasi pemesan makanan / pembeli).
- **Contoh Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
      "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
      "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
      "name": "Rawon Komplit Empal",
      "price": 32000,
      "isAvailable": true,
      "category": {
        "id": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
        "name": "Makanan Utama"
      }
    }
  ]
}
```

#### `GET /api/menus/:id`
- **Fungsi**: Mengambil data detail satu menu item berdasarkan ID menunya.
- **Akses**: Public / Semua Role

#### `PUT /api/menus/:id`
- **Fungsi**: Memperbarui informasi menu item.
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court`.

#### `DELETE /api/menus/:id`
- **Fungsi**: Menghapus menu item.
- **Akses**: `admin`, `tenant` pemilik kios, `admin-food-court`.

---

### 6. Meja Food Court (`/api/tables`)

#### `POST /api/tables`
- **Fungsi**: Membuat meja baru di food court. Otomatis menghasilkan `qrToken` unik untuk discan pelanggan.
- **Akses**: `admin` only.
- **Contoh Request Body**:
```json
{
  "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
  "tableNumber": "T-01",
  "capacity": 4
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Table created successfully",
  "data": {
    "id": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
    "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "tableNumber": "T-01",
    "qrToken": "qr_1727227654321_abc123",
    "capacity": 4,
    "status": "available"
  }
}
```

#### `GET /api/tables`
- **Fungsi**: Mengambil daftar meja (dapat difilter via `?status=available|occupied|disabled`).
- **Akses**: Public / Semua Role

#### `GET /api/tables/:id`
- **Fungsi**: Mengambil data detail meja berdasarkan ID meja.
- **Akses**: Public / Semua Role

#### `PUT /api/tables/:id`
- **Fungsi**: Memperbarui kapasitas atau status meja.
- **Akses**: `admin` only.

#### `DELETE /api/tables/:id`
- **Fungsi**: Menghapus meja dari food court.
- **Akses**: `admin` only.

---

### 7. Pemesanan / Orders (`/api/orders`)

#### `POST /api/orders`
- **Fungsi**: Membuat pesanan makanan multi-tenant. Sistem otomatis:
  1. Membuat/menghubungkan ke `diningSession` meja.
  2. Menyimpan snapshot nama & harga menu pada saat dipesan.
  3. Memecah pesanan utama menjadi sub-order per tenant (`tenantOrders`).
- **Akses**: Customer (atau guest dengan mencantumkan nama pembeli).
- **Contoh Request Body**:
```json
{
  "tableId": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
  "customerName": "Rizky Ramadhan",
  "notes": "Pesanan makan siang",
  "items": [
    {
      "menuId": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
      "quantity": 2,
      "specialInstructions": "Kuah dipisah, pedas"
    }
  ]
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Order placed successfully",
  "data": {
    "id": "76e33f38-2785-455b-8669-ce561a0d319a",
    "orderNumber": "ORD-20260925-0001",
    "tableId": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
    "customerName": "Rizky Ramadhan",
    "totalAmount": 64000,
    "status": "PENDING_PAYMENT",
    "tenantOrders": [
      {
        "id": "42e2b921-2e11-482a-a92c-55c4ea87f941",
        "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
        "subtotal": 64000,
        "cookingStatus": "QUEUED"
      }
    ]
  }
}
```

#### `GET /api/orders/track/:orderNumber`
- **Fungsi**: Tracking status pesanan dan antrean masak dapur secara real-time menggunakan nomor pesanan (`orderNumber`).
- **Akses**: Public (Dapat diakses langsung oleh pembeli lewat link/QR tanpa login).
- **Contoh Response (200 OK)**:
```json
{
  "data": {
    "orderNumber": "ORD-20260925-0001",
    "status": "PAID",
    "customerName": "Rizky Ramadhan",
    "totalAmount": 64000,
    "tenantOrders": [
      {
        "tenantName": "Warung Rawon Bu Siti",
        "stallNumber": "STAN-A01",
        "cookingStatus": "PREPARING"
      }
    ]
  }
}
```

#### `POST /api/orders/sessions/join`
- **Fungsi**: Pelanggan lain di meja yang sama bergabung ke sesi makan aktif via scan `qrToken`.
- **Akses**: Authenticated / Customer

#### `GET /api/orders`
- **Fungsi**: Mengambil daftar pesanan.
- **Akses**: Authenticated (`admin`, `tenant`, `customer`)
- **Dinamika Perilaku**:
  - `admin`: Melihat semua pesanan di seluruh food court.
  - `customer`: Hanya melihat pesanan yang dibuat oleh akun miliknya.
  - `tenant`: Melihat pesanan yang memuat menu gerainya.

#### `GET /api/orders/:id`
- **Fungsi**: Mengambil rincian lengkap pesanan berdasarkan ID order.
- **Akses**: Authenticated (`admin`, `customer` pemesan, atau `tenant` yang terlibat).

#### `PATCH /api/orders/:id/status`
- **Fungsi**: Memperbarui status pesanan utama (misal: `COMPLETED` / `CANCELLED`). Jika pesanan selesai, sistem otomatis membebaskan meja menjadi `available`.
- **Akses**: `admin`, `tenant` yang terlibat.

#### `PATCH /api/orders/tenant-orders/:id/status`
- **Fungsi**: Dapur gerai tenant memperbarui status antrean masakan (`QUEUED` -> `PREPARING` -> `READY` -> `COMPLETED`).
- **Akses**: `admin`, `tenant` pemilik kios.
- **Contoh Request Body**:
```json
{
  "cookingStatus": "PREPARING"
}
```

#### `PATCH /api/orders/items/:itemId/status`
- **Fungsi**: Memperbarui status pengerjaan untuk setiap item individual di pesanan.
- **Akses**: `admin`, `tenant` pemilik kios.

---

### 8. Pembayaran / Payments (`/api/payments`)

#### `POST /api/payments`
- **Fungsi**: Memproses pembayaran untuk pesanan. Otomatis mengubah status order menjadi `PAID` dan meneruskan antrean ke dapur tenant.
- **Akses**: Public / Customer / Kasir
- **Metode Pembayaran**: `QRIS`, `CASH`, `TRANSFER`
- **Contoh Request Body**:
```json
{
  "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
  "method": "QRIS",
  "amount": 64000,
  "reference": "QRIS-TRX-998877"
}
```
- **Contoh Response (201 Created)**:
```json
{
  "message": "Payment processed successfully",
  "data": {
    "id": "a90b4317-09d2-43d9-9528-662580a6c781",
    "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
    "method": "QRIS",
    "amount": 64000,
    "status": "SUCCESS",
    "paidAt": "2026-09-25T01:28:00.000Z"
  }
}
```

#### `GET /api/payments/:orderId`
- **Fungsi**: Mengambil bukti/detail transaksi pembayaran berdasarkan ID order.
- **Akses**: Authenticated (`customer` terkait, Kasir, atau `admin`).

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
- **`400 BadRequestError`**: Format input data salah atau melanggar aturan bisnis (misal: nomor stan duplikat pada stan aktif di food court yang sama).
- **`401 UnauthorizedError`**: Token JWT tidak disertakan atau token telah kadaluarsa.
- **`403 ForbiddenError`**: Pengguna login, tetapi tidak memiliki izin mengakses entitas tersebut (misal: manajer food court mengakses data tenant food court lain, customer mengakses daftar internal tenant, atau customer mengakses daftar menu global).
- **`404 NotFoundError`**: Data yang dicari (Food Court / Tenant / Menu / Kategori / Meja / Order) tidak ditemukan.
- **`409 ConflictError`**: Terjadi konflik data unik (misal: slug food court sudah terdaftar).
- **`422 ValidationError`**: Data body/parameter tidak sesuai dengan validasi skema TypeBox.
- **`500 InternalServerError`**: Terjadi kesalahan internal pada server database atau aplikasi.