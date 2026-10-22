# Full UI for All User Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive Web UI implementing all 38+ backend API endpoints across all 5 user tiers (Public/Guest, Customer, Tenant, Admin Food Court, Super Admin), adhering strictly to the design system in `DESIGN.md` and using **shadcn/ui** component primitives customized to project design tokens.

**Architecture:** A single Vite React 19 app serving two primary areas: (1) `/s/*`, `/checkout`, `/track/*`, `/login` as mobile-first Customer/Guest views (`max-w-md mx-auto`), and (2) `/app/*` as desktop/tablet-first Internal views wrapped in a role-guarded sidebar layout. Modularized per backend domain phase according to `backend/README.md`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, `@tanstack/react-query`, React Router 7, **shadcn/ui** component architecture (Radix UI primitives + Lucide icons), Bun + ElysiaJS + Drizzle ORM (backend).

---

## Global Constraints & Design Tokens (`DESIGN.md` + shadcn/ui)

- **Design System Palette (`DESIGN.md`):** Achromatic palette: Canvas `#f5f5f5`, Paper `#ffffff`, Sidebar `#fafafa`, Ink `#0a0a0a`, Ink Soft `#171717`, Mid Gray `#737373`, Hairline `#e5e5e5`. Destructive red `#e7000b` reserved exclusively for errors and destructive actions. No arbitrary brand colors.
- **shadcn/ui Customization Rule:** All shadcn components use the exact project radius tokens:
  - Exactly 18px (`rounded-[18px]`) for all interactive elements: `Button`, `Input`, `Select`, `Badge`, `Switch`, `DropdownMenuTrigger`.
  - Exactly 24px (`rounded-[24px]`) for containers: `Card`, `DialogContent`, `SheetContent`, `PopoverContent`.
- **Typography:** Geist / Inter. Engineered display headlines at 48px/600 with `-0.05em` tracking. Body at 14px (`leading-[1.43]`). Currency formatted via `formatRupiah(amount)` as `Rp 32.000` (integers only).
- **Backend API Rules:** All authenticated requests pass `Authorization: Bearer <token>`. Errors follow `{ success: false, error: string, message: string }` and are notified via shadcn `Sonner` toast.
- **State & Real-Time:** Server state managed by TanStack Query. Real-time screens (KDS & Live Order Tracking) poll at 5-second intervals (`refetchInterval: 5000`).

---

## Task Decomposition by Backend Phase

### Phase 1: Autentikasi (`/api/auth`) (4 Tasks)
- **Task 1:** Halaman Login Utama (`/login` & `/app/login`) — `POST /api/auth/login`
- **Task 2:** Halaman Registrasi Customer Mandiri (`/register`) — `POST /api/auth/register` (Role: customer)
- **Task 3:** Dialog Registrasi User Internal oleh Admin (`UserRegisterDialog`) — `POST /api/auth/register` (Role selector)
- **Task 4:** Session Resolver, Header Profile Pill & Halaman Profil Akun (`/app/profile`) — `GET /api/auth/me`

### Phase 2: Food Courts (`/api/food-courts`) (4 Tasks)
- **Task 5:** Master Manajemen & Detail Food Court Global untuk Super Admin (`/app/super-admin/food-courts`) — `GET /api/food-courts`, `GET /api/food-courts/:id`, `DELETE /api/food-courts/:id`
- **Task 6:** Dialog Buat & Edit Food Court Universal (`FoodCourtDialog`) — `POST /api/food-courts`, `PUT /api/food-courts/:id`
- **Task 7:** Layar Onboarding & Profil Pengaturan Food Court untuk Admin Food Court (`/app/admin/food-court`) — `GET /api/food-courts`, `POST /api/food-courts`, `PUT /api/food-courts/:id`, `GET /api/food-court/:id/tenant`
- **Task 7b:** Food Court Context & Branding Header untuk Role Tenant & Customer (`FoodCourtContextPill`, `FoodCourtCustomerHeader`) — `GET /api/tables/scan/:qrToken` & Route Role Guards

### Phase 3: Tenants / Kios (`/api/tenants`, `/api/food-court/:id/tenant`) (4 Tasks)
- **Task 8:** Helper Endpoint Public Tenant List (`GET /api/food-court/:id/tenant/public`) & Tenant Self-Resolution (`GET /api/tenants/mine`)
- **Task 9:** Layar Onboarding & Manajemen Tenant oleh Admin Food Court (`/app/admin/tenants`)
- **Task 10:** Layar Profil & Jam Operasional Kios Tenant (`/app/tenant/profile`)
- **Task 11:** Master Tenant Global untuk Super Admin (`/app/super-admin/tenants`)

### Phase 4: Menus & Kategori (`/api/menus`) (3 Tasks)
- **Task 12:** Layar Manajemen Menu & Stok Cepat Tenant (`/app/tenant/menus`)
- **Task 13:** Dialog CRUD Menu & Dialog Manajemen Kategori (`MenuFormDialog`, `CategoryManagerDialog`)
- **Task 14:** Layar Katalog Menu Gabungan untuk Customer (`/s/:qrToken`)

### Phase 5: Meja Food Court (`/api/tables`) (3 Tasks)
- **Task 15:** Layar Manajemen Meja & Riwayat Sesi Makan (`/app/admin/tables`)
- **Task 16:** Modal Cetak QR Meja & Reset QR Token (`QrPrintModal`, `POST /api/tables/:id/regenerate-qr`)
- **Task 17:** Landing Page Scan Meja Customer (`/s/:qrToken` Table Resolver)

### Phase 6: Pemesanan / Orders (`/api/orders`) (4 Tasks)
- **Task 18:** Keranjang Belanja Multi-Tenant & Layar Checkout (`CartDrawer`, `/checkout`)
- **Task 19:** Layar Kitchen Display System (KDS) Kanban 3-Kolom Tenant (`/app/tenant/kds`)
- **Task 20:** Layar Live Tracking Status Masak Real-Time Customer (`/track/:orderNumber`)
- **Task 21:** Layar Monitoring Pesanan Food Court & Intervensi Status (`/app/admin/orders`)

### Phase 7: Pembayaran / Payments (`/api/payments`) (2 Tasks)
- **Task 22:** Integrasi Midtrans Snap Popup & Sinkronisasi Pembayaran (`/checkout`)
- **Task 23:** Layar Rekap Log Transaksi & Struk Pembayaran (`/app/admin/payments`, `/app/tenant/orders`)

---

## Detailed Tasks

---

### Phase 1: Autentikasi (`/api/auth`)

#### Task 1: Halaman Login Utama (`/login` & `/app/login`)

**Files:**
- Create: `frontend/src/pages/auth/LoginPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/login.test.tsx`

**Fungsi Halaman & Keterangan:**
Gerbang masuk utama bagi seluruh kategori pengguna (Customer, Tenant kios, Admin Food Court, dan Super Admin) untuk memperoleh sesi (token JWT). Memvalidasi kombinasi email dan password, menyimpan token di `localStorage`, dan mengarahkan pengguna secara otomatis sesuai hak aksesnya (*Role-Based Redirection*):
- `tenant` $\rightarrow$ `/app/tenant/kds` (Layar Kitchen Display Dapur)
- `admin-food-court` $\rightarrow$ `/app/admin/dashboard` (Ringkasan Food Court)
- `admin` $\rightarrow$ `/app/admin/dashboard` / `/app/super-admin/food-courts`
- `customer` $\rightarrow$ halaman checkout atau menu meja sebelumnya

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`rounded-[24px]`, border `#e5e5e5`)
- `Input` (`rounded-[18px]`, background `#f5f5f5`)
- `Label` (`text-xs font-mono uppercase tracking-wider text-[#737373]`)
- `Button` (`rounded-[18px]`, height 36px, primary `#0a0a0a` text `#fafafa`)
- `Sonner` (Toast notifikasi kesalahan)

**Form Fields & Input yang Harus Diisi:**

| Nama Field | Tipe Input | Label UI | Placeholder | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `email` | `email` | Email Pengguna | `nama@foodcourt.com` | Wajib diisi, format email RFC | "Format email tidak valid" / "Email wajib diisi" |
| `password` | `password` | Kata Sandi | `••••••••` | Wajib diisi, minimal 6 karakter | "Kata sandi minimal 6 karakter" |
| `showPassword` | `button` icon | *(Icon Mata)* | - | Toggle melihat kata sandi | Switch tipe input antara `password` & `text` |

**Aksi & Tombol pada Halaman:**
1. Tombol `Masuk ke Akun` (`Button variant="primary"`): Mengirim request. Teks berubah menjadi spinner `"Memverifikasi..."` saat proses.
2. Link `Belum punya akun? Daftar sebagai Pelanggan`: Mengarahkan ke rute `/register`.
3. Link `Kembali ke Beranda`: Mengarahkan ke landing page `/`.

**API Request & Response Specification:**
- **Endpoint:** `POST /api/auth/login`
- **Request Body:**
```json
{
  "email": "budi@foodcourt.com",
  "password": "password123"
}
```
- **Response Sukses (200 OK):**
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
- **Response Gagal (401 Unauthorized / 400 Bad Request):**
```json
{
  "success": false,
  "error": "UnauthorizedError",
  "message": "Email atau kata sandi salah"
}
```

- [ ] **Step 1: Write LoginPage test**

Create `frontend/src/test/login.test.tsx`:
```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../pages/auth/LoginPage'
import { AuthProvider } from '../context/AuthContext'

describe('LoginPage', () => {
  it('renders email and password inputs with submit button', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByLabelText(/Email Pengguna/i)).toBeDefined()
    expect(screen.getByLabelText(/Kata Sandi/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Masuk ke Akun/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Build `LoginPage.tsx`**

Implement form with react-hook-form / state, calling `apiFetch('/api/auth/login')`, updating `authContext.login(token, user)` and routing based on `user.role`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/auth/LoginPage.tsx frontend/src/test/login.test.tsx
git commit -m "feat(auth): implement main login page with role-based redirection"
```

---

#### Task 2: Halaman Registrasi Customer Mandiri (`/register`)

**Files:**
- Create: `frontend/src/pages/auth/RegisterPage.tsx`
- Modify: `frontend/src/App.tsx`

**Fungsi Halaman & Keterangan:**
Memungkinkan pengunjung/pembeli mendaftar akun pelanggan baru secara mandiri melalui web mobile-first. Role secara otomatis dikunci ke `"customer"` di frontend sehingga publik tidak bisa mendaftar sebagai admin/tenant secara ilegal. Begitu sukses, pelanggan langsung diarahkan untuk masuk atau otomatis auto-login.

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`max-w-md mx-auto`)
- `Input`, `Label` (`rounded-[18px]`)
- `Button` (`rounded-[18px]`)
- `Sonner` Toast

**Form Fields & Input yang Harus Diisi:**

| Nama Field | Tipe Input | Label UI | Placeholder | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `text` | Nama Lengkap | `Contoh: Rizky Ramadhan` | Wajib, min 2 karakter, maks 50 karakter | "Nama minimal 2 karakter" |
| `email` | `email` | Alamat Email | `rizky@gmail.com` | Wajib, format email valid | "Format email tidak valid" |
| `password` | `password` | Kata Sandi | `Minimal 6 karakter` | Wajib, min 6 karakter | "Kata sandi minimal 6 karakter" |
| `confirmPassword` | `password` | Ulangi Kata Sandi | `Masukkan kembali kata sandi` | Wajib, harus sama persis dengan `password` | "Konfirmasi kata sandi tidak cocok" |

**API Request & Response Specification:**
- **Endpoint:** `POST /api/auth/register`
- **Request Body:**
```json
{
  "name": "Rizky Ramadhan",
  "email": "rizky@gmail.com",
  "password": "password123",
  "role": "customer"
}
```
- **Response Sukses (201 Created):**
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "89b51c22-34ef-49a0-bc11-a88990112233",
    "name": "Rizky Ramadhan",
    "email": "rizky@gmail.com",
    "role": "customer",
    "createdAt": "2026-10-22T12:30:00.000Z",
    "updatedAt": "2026-10-22T12:30:00.000Z"
  }
}
```

- [ ] **Step 1: Build `RegisterPage.tsx`**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/auth/RegisterPage.tsx
git commit -m "feat(auth): implement customer self-registration page"
```

---

#### Task 3: Dialog Registrasi User Internal oleh Admin (`UserRegisterDialog`)

**Files:**
- Create: `frontend/src/components/admin/UserRegisterDialog.tsx`
- Modify: `frontend/src/pages/superadmin/SuperAdminUsersPage.tsx`

**Fungsi Halaman/Modal & Keterangan:**
Digunakan di dalam dashboard internal Super Admin (`/app/super-admin/users`) atau Admin Food Court untuk membuat akun resmi bagi staf baru, pengelola food court, atau pemilik kios tenant. Hanya dapat dibuka oleh akun terotorisasi.

**Komponen shadcn/ui:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (`rounded-[24px]`)
- `Input`, `Label` (`rounded-[18px]`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (Pemilihan role)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`)

**Form Fields & Input yang Harus Diisi Admin:**

| Nama Field | Tipe Input | Label UI | Opsi / Default | Aturan Validasi |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `text` | Nama Lengkap Staf / Tenant | Placeholder: `Ahmad Fauzi` | Wajib, min 2 karakter |
| `email` | `email` | Email Kerja Akun | Placeholder: `ahmad@foodcourt.com` | Wajib, format email valid |
| `password` | `password` | Kata Sandi Sementara | Placeholder: `Minimal 6 karakter` | Wajib, min 6 karakter |
| `role` | `Select` dropdown | Peran Akses (Role) | • `Admin Food Court` (`admin-food-court`)<br>• `Tenant / Pemilik Kios` (`tenant`)<br>• `Super Admin` (`admin`)<br>• `Customer` (`customer`) | Wajib dipilih salah satu |

**API Request & Response Specification:**
- **Endpoint:** `POST /api/auth/register`
- **Request Body:**
```json
{
  "name": "Pak Bambang Rawon",
  "email": "bambang.rawon@foodcourt.com",
  "password": "rawonPassword123",
  "role": "tenant"
}
```
- **Response Sukses (201 Created):**
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "91a1e0b5-7c9b-4a57-b08e-5bdf8e983058",
    "name": "Pak Bambang Rawon",
    "email": "bambang.rawon@foodcourt.com",
    "role": "tenant",
    "createdAt": "2026-10-22T12:35:00.000Z"
  }
}
```

- [ ] **Step 1: Build `UserRegisterDialog.tsx`**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/UserRegisterDialog.tsx
git commit -m "feat(auth): implement admin user registration dialog component"
```

---

#### Task 4: Session Resolver, Header Profile Pill & Halaman Profil Akun (`/app/profile`)

**Files:**
- Create: `frontend/src/components/layout/HeaderProfilePill.tsx`
- Create: `frontend/src/pages/auth/ProfilePage.tsx`
- Modify: `frontend/src/context/AuthContext.tsx`

**Fungsi Fitur & Keterangan:**
1. **Resolver Sesi Global (`GET /api/auth/me`)**: Saat aplikasi dibuka atau di-refresh, frontend memanggil endpoint ini untuk memvalidasi token JWT yang tersimpan. Jika token tidak valid / kadaluarsa (401), token dibersihkan dan pengguna diarahkan ke `/login`.
2. **Header Profile Pill**: Komponen avatar/nama di sudut kanan atas dashboard internal dengan dropdown menu.
3. **Halaman Profil Akun (`/app/profile`)**: Menampilkan rincian identitas pengguna, hak akses, dan opsi keluar.

**Komponen shadcn/ui:**
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`
- `Badge` (Solid `#171717` untuk Admin, Soft `#f5f5f5` untuk Tenant/Manager)
- `Card`, `CardContent`, `CardHeader` (`rounded-[24px]`)
- `Button` (`rounded-[18px]`)

**API Request & Response Specification:**
- **Endpoint:** `GET /api/auth/me` with header `Authorization: Bearer <token>`
- **Response Sukses (200 OK):**
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
- **Response Gagal (401 Unauthorized):**
```json
{
  "success": false,
  "error": "UnauthorizedError",
  "message": "Authentication required. Please login."
}
```

- [ ] **Step 1: Update `AuthContext.tsx` with `/api/auth/me` session check on mount**
- [ ] **Step 2: Build `HeaderProfilePill.tsx` and `ProfilePage.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/HeaderProfilePill.tsx frontend/src/pages/auth/ProfilePage.tsx frontend/src/context/AuthContext.tsx
git commit -m "feat(auth): implement session resolver, profile pill, and profile page"
```

---

### Phase 2: Food Courts (`/api/food-courts`)

Modul Food Courts mengelola lokasi fisik food court, penugasan manajer, pengelompokan stan tenant, serta identitas lokasi bagi meja makan dan pelanggan. Berdasarkan pemindaian `backend/README.md` dan modul `backend/modules/food-courts/`, terdapat 5 endpoint utama:
- `POST /api/food-courts` — Pendaftaran lokasi food court baru (otomatis slug unik)
- `GET /api/food-courts` — Daftar food court (filter `?status=ACTIVE&search=...`)
- `GET /api/food-courts/:id` — Detail food court lengkap dengan relasi manager, tenants, dan tables
- `PUT /api/food-courts/:id` — Pembaruan profil, telepon, alamat, logo, atau status
- `DELETE /api/food-courts/:id` — Penghapusan food court beserta relasi datanya (Super Admin only)
- Serta endpoint pembantu relasi: `GET /api/food-court/:id/tenant` — Daftar seluruh stan tenant di food court terkait

#### Matriks Hak Akses & Interaksi Food Court Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) | **Akses Penuh (CRUD)**:<br>• `GET /api/food-courts`<br>• `POST /api/food-courts`<br>• `GET /api/food-courts/:id`<br>• `PUT /api/food-courts/:id`<br>• `DELETE /api/food-courts/:id` | • Layar Master Food Court Global (`/app/super-admin/food-courts`) memantau semua cabang.<br>• Sheet Rincian Cabang (`FoodCourtDetailSheet`) melihat tenant & meja di cabang tersebut.<br>• Modal Dialog Universal (`FoodCourtDialog`) tambah cabang baru & edit cabang manapun.<br>• Modal konfirmasi bahaya sebelum eksekusi `DELETE /api/food-courts/:id`. |
| **Admin Food Court** (`admin-food-court`) | **Akses Terisolasi Cabang Milik Sendiri**:<br>• `GET /api/food-courts` (otomatis filter `managerId = user.id`)<br>• `POST /api/food-courts` (onboarding cabang pertama)<br>• `GET /api/food-courts/:id` (hanya cabang sendiri)<br>• `PUT /api/food-courts/:id` (hanya cabang sendiri)<br>• *`DELETE` ditolak `403 Forbidden`* | • Jika belum punya cabang (`data.length === 0`): Tampil **Onboarding Wizard** "Daftarkan Cabang Food Court Anda".<br>• Jika sudah ada cabang: Layar Profil & Pengaturan Cabang (`/app/admin/food-court`).<br>• Kartu statistik ringkasan stan aktif dan kapasitas meja makan.<br>• Formulir pembaruan profil lokasi cabang.<br>• *Tombol Hapus Food Court ditiadakan total*. |
| **Tenant / Kios** (`tenant`) | **Ditolak `403 Forbidden`** pada seluruh `/api/food-courts`. | • Route Guard mencegat akses ke `/app/admin/food-court` $\rightarrow$ redirect ke `/app/tenant/kds` dengan toast peringatan.<br>• Indikator Konteks Cabang (`FoodCourtContextPill`) di topbar/sidebar: "🏢 Beroperasi di: [Nama Cabang Food Court] • Stan [Nomor Stan]" bersumber dari data profil tenant. |
| **Customer** (`customer`) & **Public / Guest** | **Ditolak `403 Forbidden`** pada endpoint internal `/api/food-courts`. Akses info food court diperoleh secara publik via `GET /api/tables/scan/:qrToken`. | • Saat scan meja QR (`/s/:qrToken`), frontend merender **Branding Header Food Court** (`FoodCourtCustomerHeader`) berisi Avatar Logo Cabang, Nama Food Court, Alamat, dan Nomor Meja aktif.<br>• Akses ke rute admin internal otomatis diarahkan ke halaman login. |

---

#### Task 5: Master Manajemen & Detail Food Court Global untuk Super Admin (`/app/super-admin/food-courts`)

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminFoodCourtsPage.tsx`
- Create: `frontend/src/components/superadmin/FoodCourtDetailSheet.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/superadmin_foodcourts.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar kendali tingkat tinggi untuk Super Admin dalam memantau, mencari, melihat rincian isi, dan mengelola seluruh cabang food court di platform. Menampilkan data tabular multi-lokasi, statistik jumlah tenant dan meja per food court, informasi manajer penanggung jawab, sheet rincian cabang, serta aksi create, edit, dan delete.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` (Dividers hairline `#e5e5e5`)
- `Card` (Container Paper `#ffffff`, radius `rounded-[24px]`, shadow card)
- `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` (`rounded-l-[24px]`)
- `Input` (Search filter, radius `rounded-[18px]`, background `#f5f5f5`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (Filter status)
- `Badge` (Solid `#171717` untuk `ACTIVE`, Soft `#f5f5f5` untuk `INACTIVE`)
- `Button` (Primary `#0a0a0a` untuk `+ Tambah Food Court`, Outline `#e5e5e5` untuk Detail & Edit, Destructive `#e7000b` untuk Hapus)
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`
- `Sonner` (Toast notifikasi sukses/gagal)

**Kolom Tabel & Informasi yang Ditampilkan:**

| Kolom Tabel | Sumber Field API | Keterangan Tampilan UI |
| :--- | :--- | :--- |
| **Logo & Nama Cabang** | `item.logo`, `item.name`, `item.slug` | Avatar logo bundar 36px + Nama tebal 14px + Slug URL font mono kecil di bawahnya |
| **Alamat** | `item.address` | Teks alamat lengkap maksimal 2 baris (truncate) warna `#737373` |
| **Telepon** | `item.phone` | Nomor kontak telepon pengelola food court |
| **Manajer Penanggung Jawab** | `item.manager.name`, `item.manager.email` | Nama dan email admin food court yang ditugaskan |
| **Stan & Meja** | `item.tenants.length`, `item.tables.length` | Badge counter: `X Stan` / `Y Meja` |
| **Status Operasional** | `item.status` | Badge pill: `ACTIVE` (hijau/solid) vs `INACTIVE` (soft gray) |
| **Aksi** | - | Tombol icon: `Detail` (sheet), `Edit` (dialog), dan `Hapus` (alert dialog) |

**Drawer Rincian Cabang (`FoodCourtDetailSheet`):**
Ketika baris tabel atau tombol `Detail` diklik, sheet samping terbuka dan memanggil `GET /api/food-courts/:id` untuk menampilkan:
1. **Header Profil**: Logo food court, nama cabang, slug mono pill, alamat lengkap, nomor telepon, dan status operasional.
2. **Kartu Manajer Cabang**: Menampilkan nama manajer (`manager.name`), email kerja (`manager.email`), dan ID akun pengelola.
3. **Tab "Daftar Stan Tenant" (`tenants: []`)**: Menampilkan daftar seluruh stan yang menyewa di cabang ini (nama gerai, nomor stan, dan status buka stan).
4. **Tab "Daftar Meja Makan" (`tables: []`)**: Menampilkan daftar nomor meja makan (`tableNumber`), kapasitas kursi, dan status meja saat ini.

**Aksi & Tombol pada Halaman:**
1. **Tombol "+ Daftarkan Food Court Baru"** (`Button variant="primary"`): Membuka `FoodCourtDialog` mode create.
2. **Input Search Filter**: Filter instan berdasarkan nama atau slug cabang (`?search=Grand`).
3. **Filter Dropdown Status**: Filter data berdasarkan `Semua Status`, `ACTIVE`, atau `INACTIVE`.
4. **Tombol "Hapus Cabang"**: Membuka `AlertDialog` konfirmasi hapus permanen sebelum memanggil `DELETE /api/food-courts/:id`.

**API Request & Response Specification:**
- **Mengambil Daftar Food Court:** `GET /api/food-courts?status=ACTIVE&search=Grand`
  - Header: `Authorization: Bearer <superAdminToken>`
  - **Response Sukses (200 OK):**
```json
{
  "data": [
    {
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
      "manager": {
        "id": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
        "name": "Budi Santoso",
        "email": "budi@foodcourt.com",
        "role": "admin-food-court"
      },
      "tenants": [
        {
          "id": "59b40097-4007-42f0-94cb-fa225916ca11",
          "name": "Warung Rawon Bu Siti",
          "stallNumber": "STAN-A01",
          "isOpen": true
        }
      ],
      "tables": [
        {
          "id": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
          "tableNumber": "T-01",
          "capacity": 4,
          "status": "available"
        }
      ]
    }
  ]
}
```

- **Mengambil Detail Rincian Cabang:** `GET /api/food-courts/18f9185a-0d17-48f8-a128-40960538a7c1`
  - Header: `Authorization: Bearer <superAdminToken>`
  - **Response Sukses (200 OK):** Mengembalikan objek tunggal food court lengkap dengan array `manager`, `tenants`, dan `tables`.

- **Menghapus Cabang Food Court:** `DELETE /api/food-courts/18f9185a-0d17-48f8-a128-40960538a7c1`
  - Header: `Authorization: Bearer <superAdminToken>`
  - **Response Sukses (200 OK):**
```json
{
  "success": true,
  "message": "Food court deleted successfully"
}
```
  - **Response Gagal (404 Not Found):**
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Food court not found"
}
```

- [ ] **Step 1: Write `superadmin_foodcourts.test.tsx` verifying table rendering and search**
- [ ] **Step 2: Build `SuperAdminFoodCourtsPage.tsx` and `FoodCourtDetailSheet.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminFoodCourtsPage.tsx frontend/src/components/superadmin/FoodCourtDetailSheet.tsx frontend/src/test/superadmin_foodcourts.test.tsx
git commit -m "feat(food-courts): implement super admin global food courts management and detail sheet"
```

---

#### Task 6: Dialog Buat & Edit Food Court Universal (`FoodCourtDialog`)

**Files:**
- Create: `frontend/src/components/superadmin/FoodCourtDialog.tsx`
- Modify: `frontend/src/pages/superadmin/SuperAdminFoodCourtsPage.tsx`
- Modify: `frontend/src/pages/admin/FoodCourtProfilePage.tsx`

**Fungsi Komponen Modal & Keterangan:**
Modal dialog universal yang dapat beroperasi dalam 2 mode:
1. **Mode Create**: Digunakan untuk mendaftarkan lokasi food court baru via `POST /api/food-courts`. Sistem backend secara otomatis menghasilkan slug unik dari field `name`.
2. **Mode Edit**: Digunakan untuk memperbarui nama, alamat, telepon, logo, atau status operasional cabang via `PUT /api/food-courts/:id`.
3. **Live Slug Preview**: Menyediakan kalkulasi pratinjau slug secara langsung di frontend agar pengguna mengetahui URL publik yang akan terbentuk.
4. **Penanganan Error Slug Duplikat (`409 Conflict`)**: Jika slug nama food court sudah pernah digunakan oleh food court lain, frontend menangkap error 409 dan menampilkan feedback merah pada input nama.

**Komponen shadcn/ui:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`, `rounded-[18px]`)
- `Sonner` (Toast notifikasi)

**Form Fields & Input yang Harus Diisi:**

| Nama Field | Tipe Input | Label UI | Placeholder / Opsi | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `text` | Nama Resmi Cabang Food Court | `Contoh: Tunjungan Plaza Food Court Level 5` | Wajib diisi, min 2 karakter, maks 150 karakter | "Nama food court minimal 2 karakter" |
| `slugPreview` | `text` (Read-only) | Estimasi Slug URL Publik | `tunjungan-plaza-food-court-level-5` | Dihasilkan otomatis secara live dari input `name` | - |
| `address` | `textarea` | Alamat Lengkap Lokasi | `Jl. Embong Malang No. 7-21, Surabaya` | Opsional, teks multi-baris | - |
| `phone` | `text` / `tel` | Nomor Telepon Pengelola | `081234567890` | Opsional, maksimal 30 karakter | "Nomor telepon maksimal 30 karakter" |
| `logo` | `url` / `text` | URL Gambar Logo / Banner | `https://example.com/logo-tp.jpg` | Opsional, format URL valid | "Format URL gambar tidak valid" |
| `status` | `Select` dropdown | Status Operasional | • `Aktif (ACTIVE)`<br>• `Nonaktif (INACTIVE)` | Default: `ACTIVE` (Hanya dapat diubah saat mode Edit) | - |

**Aksi & Tombol pada Dialog:**
1. **Tombol "Batal"** (`Button variant="secondary"`): Menutup modal tanpa menyimpan data.
2. **Tombol "Simpan Cabang Food Court"** (`Button variant="primary"`): Mengirim request `POST` atau `PUT`. Menampilkan status loading `"Menyimpan Data..."` dan mendisable input saat proses berlangsung.

**API Request & Response Specification:**
- **Mendaftarkan Cabang Baru (Create):** `POST /api/food-courts`
  - Header: `Authorization: Bearer <token>`
  - **Request Body:**
```json
{
  "name": "East Coast Center Food Court",
  "address": "Jl. Kejawan Putih Tambak No. 2, Surabaya",
  "phone": "081122334455",
  "logo": "https://example.com/east-coast.jpg"
}
```
  - **Response Sukses (201 Created):**
```json
{
  "message": "Food court registered successfully",
  "data": {
    "id": "29f9185a-0d17-48f8-a128-40960538a888",
    "managerId": "7ca34b7f-20bf-4bfb-8eb5-a50d2bb2d6f7",
    "name": "East Coast Center Food Court",
    "slug": "east-coast-center-food-court",
    "address": "Jl. Kejawan Putih Tambak No. 2, Surabaya",
    "phone": "081122334455",
    "logo": "https://example.com/east-coast.jpg",
    "status": "ACTIVE",
    "createdAt": "2026-10-22T13:00:00.000Z",
    "updatedAt": "2026-10-22T13:00:00.000Z"
  }
}
```
  - **Response Gagal Konflik Slug (409 Conflict):**
```json
{
  "success": false,
  "error": "ConflictError",
  "message": "Food court with this slug already exists"
}
```

- **Memperbarui Data Cabang (Update):** `PUT /api/food-courts/29f9185a-0d17-48f8-a128-40960538a888`
  - Header: `Authorization: Bearer <token>`
  - **Request Body:**
```json
{
  "name": "East Coast Center Food Court @Lantai 3",
  "phone": "081999888777",
  "status": "ACTIVE"
}
```
  - **Response Sukses (200 OK):**
```json
{
  "message": "Food court updated successfully",
  "data": {
    "id": "29f9185a-0d17-48f8-a128-40960538a888",
    "name": "East Coast Center Food Court @Lantai 3",
    "slug": "east-coast-center-food-court-lantai-3",
    "status": "ACTIVE",
    "updatedAt": "2026-10-22T13:05:00.000Z"
  }
}
```

- [ ] **Step 1: Build `FoodCourtDialog.tsx` with live slug generator and error handling**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/superadmin/FoodCourtDialog.tsx
git commit -m "feat(food-courts): implement universal FoodCourtDialog for create and update flows"
```

---

#### Task 7: Layar Onboarding & Profil Pengaturan Food Court untuk Admin Food Court (`/app/admin/food-court`)

**Files:**
- Create: `frontend/src/pages/admin/FoodCourtProfilePage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/admin_foodcourt.test.tsx`

**Fungsi Halaman & Keterangan:**
Pusat operasional cabang khusus bagi pengguna dengan role `admin-food-court`.
- **Dua Kondisi Antarmuka Berdasarkan Status Data (`GET /api/food-courts`)**:
  - **Kasus 1: Onboarding State (Belum Memiliki Food Court / `data.length === 0`)**:
    - Terjadi ketika admin food court baru login pertama kali dan belum mendaftarkan cabang food court.
    - Menampilkan **Onboarding Card** yang ramah: "Selamat Datang! Mulai dengan Mendaftarkan Cabang Food Court Anda".
    - Menyediakan form input pendaftaran cabang (`POST /api/food-courts`). Backend secara otomatis menetapkan `managerId = user.id`. Begitu berhasil dibuat, antarmuka langsung beralih ke layar manajemen aktif.
  - **Kasus 2: Active Management State (Sudah Memiliki Food Court / `data.length > 0`)**:
    - Menampilkan Ringkasan Header: Nama food court, slug URL publik (read-only), dan badge status operasional.
    - Menampilkan 3 Kartu Metrik Ringkas:
      1. Total Stan Tenant Terdaftar (`tenants.length`).
      2. Total Meja Makan Aktif (`tables.length`).
      3. Info Akun Manajer Penanggung Jawab (`manager.name` & `manager.email`).
    - Formulir Pengaturan Profil Cabang: Memperbarui nama cabang, alamat fisik, nomor kontak telepon, URL logo, dan status operasional (`PUT /api/food-courts/:id`).
    - Bagian "Daftar Stan Tenant Cabang": Menampilkan ringkasan stan aktif di cabang ini yang diambil dari endpoint `GET /api/food-court/:id/tenant` lengkap dengan nomor stan dan jam buka/tutup.
- **Isolasi Keamanan (RBAC)**:
  - Tombol **Hapus Food Court ditiadakan sama sekali** dari antarmuka `admin-food-court` karena hak hapus hanya dimiliki oleh Super Admin (`admin`).
  - Backend memproteksi setiap panggilan `PUT /api/food-courts/:id`. Jika manajer mencoba memperbarui ID food court lain, backend menolak dengan `403 Forbidden ("You do not have permission to update this food court")`.

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Badge` (Solid `#171717` untuk `ACTIVE`, Soft `#f5f5f5` untuk `INACTIVE`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a`, `rounded-[18px]`)
- `Table`, `TableHeader`, `TableRow`, `TableCell` (Daftar stan tenant ringkas)
- `Sonner` (Toast notifikasi sukses/gagal)

**Informasi & Form Fields yang Diisi oleh Admin Food Court:**

| Bagian Layar | Nama Field | Tipe UI | Placeholder / Opsi | Aturan Validasi |
| :--- | :--- | :--- | :--- | :--- |
| **Identitas Cabang** | `name` | `Input` text | `Grand City Food Court @Lantai 2` | Wajib, min 2 karakter |
| **Slug Publik** | `slug` | Badge Mono | `grand-city-food-court-lantai-2` | Read-only (Dihasilkan backend) |
| **Kontak Operasional** | `phone` | `Input` text | `081234567890` | Opsional, maks 30 karakter |
| **Alamat Fisik** | `address` | `Textarea` | `Jl. Pemuda No. 10 Lantai 2, Surabaya` | Opsional, teks bebas |
| **Logo Cabang** | `logo` | `Input` text | `https://example.com/logo.jpg` | Opsional, format URL valid |
| **Status Buka** | `status` | `Select` | • `Aktif (ACTIVE)`<br>• `Nonaktif (INACTIVE)` | Default: `ACTIVE` |

**Aksi & Tombol pada Halaman:**
1. **Tombol "Daftarkan Cabang Food Court"** (Muncul di mode onboarding): Mengirim `POST /api/food-courts`.
2. **Tombol "Simpan Perubahan Profil"** (Muncul di mode aktif): Mengirim `PUT /api/food-courts/:id`.
3. **Tombol "Batal / Reset"**: Mengembalikan nilai input sesuai data yang tersimpan di server.
4. **Link Cepat "Kelola Tenant Cabang Ini"**: Mengarahkan ke rute `/app/admin/tenants`.

**API Request & Response Specification:**
- **Mengambil Profil Cabang Kelolaan:** `GET /api/food-courts`
  - Header: `Authorization: Bearer <adminFoodCourtToken>`
  - Backend otomatis memfilter dan mengembalikan hanya 1 food court milik manajer.
  - Jika belum ada cabang: Mengembalikan array kosong `[]`.
- **Onboarding Cabang Baru:** `POST /api/food-courts`
  - Header: `Authorization: Bearer <adminFoodCourtToken>`
  - Request body sama seperti Task 6. Backend otomatis mengaitkan `managerId = user.id`.
- **Update Profil Cabang:** `PUT /api/food-courts/18f9185a-0d17-48f8-a128-40960538a7c1`
  - Header: `Authorization: Bearer <adminFoodCourtToken>`
  - **Request Body:**
```json
{
  "name": "Grand City Food Court @Lantai 2 - FoodFest",
  "address": "Jl. Pemuda No. 10 Lantai 2, Surabaya",
  "phone": "081234567899",
  "status": "ACTIVE"
}
```
  - **Response Sukses (200 OK):**
```json
{
  "message": "Food court updated successfully",
  "data": {
    "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "name": "Grand City Food Court @Lantai 2 - FoodFest",
    "status": "ACTIVE",
    "updatedAt": "2026-10-22T13:10:00.000Z"
  }
}
```
  - **Response Pelanggaran Akses (403 Forbidden):**
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You do not have permission to update this food court"
}
```

- **Mengambil Daftar Stan Tenant Cabang Ini:** `GET /api/food-court/18f9185a-0d17-48f8-a128-40960538a7c1/tenant`
  - Header: `Authorization: Bearer <adminFoodCourtToken>`
  - **Response Sukses (200 OK):**
```json
{
  "data": [
    {
      "id": "59b40097-4007-42f0-94cb-fa225916ca11",
      "name": "Warung Rawon Bu Siti",
      "stallNumber": "STAN-A01",
      "isOpen": true
    }
  ]
}
```

- [ ] **Step 1: Write `admin_foodcourt.test.tsx` for onboarding and profile view**
- [ ] **Step 2: Build `FoodCourtProfilePage.tsx` with onboarding switch and update form**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/FoodCourtProfilePage.tsx frontend/src/test/admin_foodcourt.test.tsx
git commit -m "feat(food-courts): implement onboarding and profile management for admin food court"
```

---

#### Task 7b: Food Court Context & Branding Header untuk Role Tenant & Customer (`FoodCourtContextPill`, `FoodCourtCustomerHeader`)

**Files:**
- Create: `frontend/src/components/layout/FoodCourtContextPill.tsx`
- Create: `frontend/src/components/customer/FoodCourtCustomerHeader.tsx`
- Modify: `frontend/src/components/layout/InternalSidebar.tsx`
- Modify: `frontend/src/components/auth/RoleGuard.tsx`
- Test: `frontend/src/test/foodcourt_role_guard.test.tsx`

**Fungsi Komponen & Keterangan:**
1. **Untuk Role Tenant (`tenant`)**:
   - Backend membatasi akses endpoint `/api/food-courts` untuk tenant (`403 Forbidden`).
   - Namun, staf kios dan pemilik stan tenant membutuhkan identitas lokasi yang jelas tentang food court tempat kios mereka berada.
   - Komponen `FoodCourtContextPill` disematkan pada Topbar / Sidebar portal tenant (`/app/tenant/*`):
     - Menampilkan indikator pill: `"🏢 Grand City Food Court @Lantai 2 • STAN-A01"`.
     - Nilai ini diambil dari data profil kios tenant yang terautentikasi (`tenant.foodCourtId`).
   - **RoleGuard Protection**: Jika pengguna ber-role `tenant` mencoba membuka tautan `/app/admin/food-court` atau `/app/super-admin/food-courts`, router `RoleGuard` segera menolak dan mengarahkan kembali ke `/app/tenant/kds` disertai notifikasi toast `"Akses Ditolak: Anda tidak memiliki izin mengelola food court"`.
2. **Untuk Role Customer (`customer`) & Public / Guest**:
   - Pelanggan dan pengunjung umum membaca identitas food court ketika memindai QR Code di meja makan via `GET /api/tables/scan/:qrToken`.
   - Komponen `FoodCourtCustomerHeader` bertindak sebagai Brand Banner utama di aplikasi mobile customer (`/s/:qrToken`):
     - Avatar Logo Food Court bundar (`h-12 w-12 rounded-[18px]`, background `#ffffff`, border hairline).
     - Nama Food Court (Display font 20px, semi-bold `#0a0a0a`).
     - Badge Nomor Meja Aktif (`rounded-[18px] bg-[#0a0a0a] text-[#ffffff] px-3 py-1 text-xs font-mono`).
     - Alamat Ringkas Food Court (Font 12px `#737373`).
   - Menjamin pembeli memiliki kejelasan visual mutlak bahwa pesanan mereka diproses di lokasi food court dan meja yang tepat.

**Komponen shadcn/ui:**
- `Badge` (`rounded-[18px]`)
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Card` (`rounded-[24px]`, border `#e5e5e5`)
- `Skeleton` (Placeholder pemuatan data saat QR discan)

**API Request & Response Specification:**
- **Resolving Food Court Brand Saat Scan Meja Customer:** `GET /api/tables/scan/qr_1727227654321_abc123`
  - Akses: Public (Tanpa token)
  - **Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
    "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "tableNumber": "T-01",
    "qrToken": "qr_1727227654321_abc123",
    "capacity": 4,
    "status": "available",
    "foodCourt": {
      "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "name": "Grand City Food Court @Lantai 2",
      "slug": "grand-city-food-court-lantai-2",
      "address": "Jl. Pemuda No. 10, Surabaya",
      "phone": "081234567890",
      "logo": "https://example.com/logo.jpg"
    }
  }
}
```

- [ ] **Step 1: Write `foodcourt_role_guard.test.tsx` verifying route interception for tenant and customer**
- [ ] **Step 2: Build `FoodCourtContextPill.tsx` and `FoodCourtCustomerHeader.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/FoodCourtContextPill.tsx frontend/src/components/customer/FoodCourtCustomerHeader.tsx frontend/src/test/foodcourt_role_guard.test.tsx
git commit -m "feat(food-courts): implement food court context pill for tenants and branding header for customers"
```

---

---

### Phase 3: Tenants / Kios (`/api/tenants`, `/api/food-court/:id/tenant`)

Modul Tenants mengelola gerai/kios makanan dan minuman yang beroperasi di dalam food court. Sesuai `backend/README.md` dan modul `backend/modules/tenants/`, modul ini memvalidasi keunikan nomor stan (`stallNumber`) agar tidak bertabrakan pada stan yang aktif di cabang yang sama.

#### Matriks Hak Akses & Interaksi Tenant Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) | **Akses Penuh Global (CRUD)**:<br>• `GET /api/tenants` (Semua tenant platform)<br>• `POST /api/tenants` (Buat tenant di cabang manapun)<br>• `GET /api/tenants/:id`<br>• `PUT /api/tenants/:id`<br>• `DELETE /api/tenants/:id` | • **Layar Master Tenant Global** (`/app/super-admin/tenants`): Tabel seluruh stan lintas cabang dengan filter dropdown food court dan tombol hapus tenant permanen.<br>• **Dialog Tenant**: Penugasan cabang (`foodCourtId`) dan pemilik akun (`ownerId`). |
| **Admin Food Court** (`admin-food-court`) | **Akses Terisolasi Cabang Kelolaan**:<br>• `GET /api/tenants` (Otomatis dibatasi ke cabang kelolaannya)<br>• `POST /api/tenants` (Hanya untuk cabangnya)<br>• `PUT /api/tenants/:id` (Hanya stan di cabangnya)<br>• `GET /api/food-court/:id/tenant`<br>• *`DELETE` ditolak `403 Forbidden`* | • **Layar Manajemen Stan Cabang** (`/app/admin/tenants`): Tabel stan tenant di food court kelolaannya.<br>• **Dialog Onboarding Stan**: Input nomor stan, jam operasional, dan akun tenant.<br>• *Tanpa tombol hapus stan*. |
| **Tenant / Kios** (`tenant`) | **Akses Profil Stan Milik Sendiri**:<br>• `GET /api/tenants/:id` (Detail profil stan miliknya)<br>• `PUT /api/tenants/:id` (Hanya stan miliknya)<br>• `DELETE /api/tenants/:id` (Hapus gerai miliknya)<br>• *`GET /api/tenants` global ditolak `403 Forbidden`* | • **Layar Profil & Jam Operasional Kios** (`/app/tenant/profile`): Switch instan buka/tutup toko (`isOpen`), jam buka-tutup, deskripsi, dan logo stan.<br>• *Nomor stan dan cabang food court bersifat read-only* (hanya dapat diubah pengelola cabang). |
| **Customer** (`customer`) & **Public / Guest** | **Akses Publik Informasi Kios**:<br>• `GET /api/tenants/:id` (Melihat profil gerai, daftar kategori & menu)<br>• `GET /api/food-court/:id/tenant/public` (Katalog stan saat scan QR meja) | • **Kartu Stan Tenant** pada katalog belanja pembeli mobile (`/s/:qrToken`): Nama kios, nomor stan, status buka/tutup, dan jam layanan.<br>• Stan yang sedang tutup (`isOpen: false`) ditandai badge abu-abu dan tidak dapat dipesan. |

---

#### Task 8: Backend Enablers: Public Tenant List & Tenant Self-Resolution

**Files:**
- Modify: `backend/modules/tenants/index.ts`
- Modify: `backend/modules/tenants/service.ts`
- Test: `backend/test/tenants.test.ts`

**Fungsi Endpoint & Keterangan:**
1. **Public Tenant List (`GET /api/food-court/:id/tenant/public`)**: Memungkinkan pelanggan yang memindai QR meja dapat mengambil daftar stan tenant yang aktif di food court tersebut tanpa memerlukan header `Authorization: Bearer`.
2. **Tenant Self-Resolution (`GET /api/tenants/mine`)**: Memudahkan antarmuka web tenant (`/app/tenant/*`) untuk langsung mengetahui ID stan miliknya berdasarkan token login (`user.id === ownerId`) tanpa harus menebak ID UUID stan.

**API Request & Response Specification:**
- **Public Tenant List:** `GET /api/food-court/18f9185a-0d17-48f8-a128-40960538a7c1/tenant/public`
  - Akses: Public (Tanpa token)
  - **Response Sukses (200 OK):**
```json
{
  "data": [
    {
      "id": "59b40097-4007-42f0-94cb-fa225916ca11",
      "name": "Warung Rawon Bu Siti",
      "slug": "warung-rawon-bu-siti",
      "stallNumber": "STAN-A01",
      "isOpen": true,
      "openingTime": "09:00:00",
      "closingTime": "21:00:00",
      "logo": "https://example.com/rawon.jpg"
    }
  ]
}
```

- **Tenant Self-Resolution:** `GET /api/tenants/mine`
  - Header: `Authorization: Bearer <tenantToken>`
  - **Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "59b40097-4007-42f0-94cb-fa225916ca11",
    "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "name": "Warung Rawon Bu Siti",
    "stallNumber": "STAN-A01",
    "isOpen": true,
    "foodCourt": {
      "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "name": "Grand City Food Court @Lantai 2"
    }
  }
}
```

- [ ] **Step 1: Write backend tests for public tenant listing and self-resolution**
- [ ] **Step 2: Implement `/api/food-court/:id/tenant/public` and `/api/tenants/mine` in Elysia**
- [ ] **Step 3: Commit**

```bash
git add backend/modules/tenants/index.ts backend/modules/tenants/service.ts backend/test/tenants.test.ts
git commit -m "feat(tenants): add public tenant listing and tenant self-resolution endpoints"
```

---

#### Task 9: Layar Onboarding & Manajemen Stan Tenant oleh Admin Food Court (`/app/admin/tenants`)

**Files:**
- Create: `frontend/src/pages/admin/AdminTenantsPage.tsx`
- Create: `frontend/src/components/admin/TenantFormDialog.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/admin_tenants.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar operasional bagi Admin Food Court untuk mengelola stan/kios yang beroperasi di food court miliknya.
- Menampilkan data tabular seluruh stan di cabang kelolaannya (`GET /api/tenants`).
- Mendaftarkan stan tenant baru dan menugaskan akun login pemilik kios (`ownerId`).
- Memvalidasi keunikan nomor stan (`stallNumber`). Jika nomor stan sudah dipakai oleh stan aktif lain di food court tersebut, backend mengembalikan `400 BadRequestError` yang langsung dihighlight merah pada input.
- Opsi toggle instan status buka/tutup stan (`isOpen`) langsung dari baris tabel.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (`rounded-[24px]`)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (Pemilihan akun pemilik stan)
- `Switch` (`rounded-[18px]` untuk toggle status buka stan)
- `Badge` (Solid `#171717` untuk `Buka`, Soft `#f5f5f5` untuk `Tutup`)
- `Button` (Primary `#0a0a0a` & Outline `#e5e5e5`, `rounded-[18px]`)
- `Sonner` (Toast notifikasi)

**Form Fields pada Dialog Onboarding / Edit Stan (`TenantFormDialog`):**

| Nama Field | Tipe Input | Label UI | Placeholder / Opsi | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `text` | Nama Stan / Gerai Makanan | `Contoh: Warung Rawon Bu Siti` | Wajib, min 2 karakter, maks 100 karakter | "Nama stan minimal 2 karakter" |
| `stallNumber` | `text` | Nomor Stan / Lokasi Kios | `STAN-A01` | Wajib, min 1 karakter, maks 20 karakter | "Nomor stan wajib diisi" |
| `ownerId` | `Select` dropdown | Akun Pemilik Kios (Tenant) | Daftar user ber-role `tenant` | Wajib dipilih salah satu | "Pilih akun pemilik kios" |
| `description` | `textarea` | Deskripsi Menu & Keahlian | `Spesialis rawon daging sapi empal khas Surabaya` | Opsional, maks 500 karakter | "Deskripsi maksimal 500 karakter" |
| `openingTime` | `time` | Jam Buka Operasional | `09:00` | Format `HH:mm:ss` | "Format jam buka tidak valid" |
| `closingTime` | `time` | Jam Tutup Operasional | `21:00` | Format `HH:mm:ss` | "Format jam tutup tidak valid" |
| `isOpen` | `Switch` | Status Operasional Saat Ini | Toggle `Aktif Buka` / `Tutup` | Default: `true` | - |
| `logo` | `url` / `text` | URL Logo / Foto Stan | `https://example.com/logo-rawon.jpg` | Opsional, format URL valid | "Format URL gambar tidak valid" |

**Aksi & Tombol pada Halaman:**
1. **Tombol "+ Daftarkan Stan Baru"** (`Button variant="primary"`): Membuka `TenantFormDialog` mode create.
2. **Switch Buka/Tutup di Tabel**: Memanggil `PUT /api/tenants/:id` dengan `{ "isOpen": !currentStatus }` secara optimistik.
3. **Tombol "Edit Stan"**: Membuka modal dengan data stan terisi.

**API Request & Response Specification:**
- **Mendaftarkan Stan Baru:** `POST /api/tenants`
  - Header: `Authorization: Bearer <adminFoodCourtToken>`
  - **Request Body:**
```json
{
  "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
  "name": "Warung Rawon Bu Siti",
  "stallNumber": "STAN-A01",
  "description": "Rawon empal daging sapi khas Surabaya",
  "ownerId": "91a1e0b5-7c9b-4a57-b08e-5bdf8e983058",
  "isOpen": true,
  "openingTime": "09:00:00",
  "closingTime": "21:00:00"
}
```
  - **Response Sukses (201 Created):**
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
  - **Response Error Konflik Stan (400 Bad Request):**
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Stall number 'STAN-A01' is already occupied in this food court"
}
```

- [ ] **Step 1: Write `admin_tenants.test.tsx` verifying tenant list and stall uniqueness validation**
- [ ] **Step 2: Build `AdminTenantsPage.tsx` and `TenantFormDialog.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminTenantsPage.tsx frontend/src/components/admin/TenantFormDialog.tsx frontend/src/test/admin_tenants.test.tsx
git commit -m "feat(tenants): implement admin food court tenants management and onboarding dialog"
```

---

#### Task 10: Layar Profil & Jam Operasional Kios Tenant (`/app/tenant/profile`)

**Files:**
- Create: `frontend/src/pages/tenant/TenantProfilePage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/tenant_profile.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar pengaturan mandiri bagi pemilik gerai ber-role `tenant` untuk memperbarui informasi warung/kiosnya.
- Mengambil data stan miliknya melalui `GET /api/tenants/mine` atau `GET /api/tenants/:id`.
- **Kendali Status Operasional Real-Time**: Switch besar `Stan Sedang Buka / Tutup` (`isOpen`). Jika stan di-set tutup, pembeli tidak dapat memesan menu stan ini di halaman pemesanan QR.
- **Pengaturan Jam Buka/Tutup**: Jam buka (`openingTime`) dan jam tutup (`closingTime`).
- **Data Terkunci (Read-Only)**: Nomor stan (`stallNumber`) dan nama food court (`foodCourt.name`) tidak dapat diubah oleh pemilik stan sendiri (harus melalui pengelola food court).

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Switch` (`rounded-[18px]`, ukuran besar dengan label indikator dinamis)
- `Badge` (Solid `#171717` vs Soft `#f5f5f5`)
- `Button` (Primary `#0a0a0a`, `rounded-[18px]`)
- `Sonner` Toast

**Form Fields yang Diisi oleh Tenant:**

| Bagian Layar | Nama Field | Tipe UI | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| **Status Toko** | `isOpen` | `Switch` | Toggle buka/tutup toko. Memberi tahu dapur sedang melayani pesanan atau rehat. |
| **Identitas Kios** | `name` | `Input` text | Nama stan dagangan (Wajib, min 2 karakter) |
| **Deskripsi** | `description` | `Textarea` | Cerita kuliner / keunggulan masakan kios |
| **Jam Layanan** | `openingTime` | `Input` time | Jam buka gerai (Format 24 jam `HH:mm`) |
| **Jam Layanan** | `closingTime` | `Input` time | Jam tutup gerai (Format 24 jam `HH:mm`) |
| **Logo / Banner**| `logo` | `Input` text | URL foto profil kios |
| **Nomor Stan** | `stallNumber` | Badge Mono | *Read-only* (Dikelola oleh pengelola food court) |
| **Cabang Lokasi**| `foodCourt.name` | Badge Pill | *Read-only* (Nama food court tempat beroperasi) |

**API Request & Response Specification:**
- **Update Profil Gerai:** `PUT /api/tenants/59b40097-4007-42f0-94cb-fa225916ca11`
  - Header: `Authorization: Bearer <tenantToken>`
  - **Request Body:**
```json
{
  "name": "Warung Rawon Bu Siti Asli Surabaya",
  "description": "Rawon empal sapi kuah gurih hitam pekat dengan sambal terasi & telur asin",
  "isOpen": true,
  "openingTime": "08:30:00",
  "closingTime": "21:30:00"
}
```
  - **Response Sukses (200 OK):**
```json
{
  "message": "Tenant updated successfully",
  "data": {
    "id": "59b40097-4007-42f0-94cb-fa225916ca11",
    "name": "Warung Rawon Bu Siti Asli Surabaya",
    "isOpen": true,
    "openingTime": "08:30:00",
    "closingTime": "21:30:00"
  }
}
```

- [ ] **Step 1: Write `tenant_profile.test.tsx` verifying store status toggle and profile update**
- [ ] **Step 2: Build `TenantProfilePage.tsx` with live open/closed switch**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tenant/TenantProfilePage.tsx frontend/src/test/tenant_profile.test.tsx
git commit -m "feat(tenants): implement tenant self-service profile and open-status management"
```

---

#### Task 11: Master Tenant Global & Filter Cabang untuk Super Admin (`/app/super-admin/tenants`)

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/superadmin_tenants.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar kendali Super Admin untuk mengawasi seluruh gerai tenant yang terdaftar di seluruh cabang food court di platform.
- Menampilkan data tabular multi-cabang (`GET /api/tenants`).
- Filter dropdown food court untuk memilah gerai per lokasi cabang.
- Filter toggle status toko (`isOpen: true | false`).
- Aksi hapus tenant permanen via `DELETE /api/tenants/:id` dengan modal konfirmasi bahaya.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card` (`rounded-[24px]`)
- `Input` (Pencarian nama stan/pemilik, `rounded-[18px]`, background `#f5f5f5`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (Filter cabang food court)
- `Badge` (Solid `#171717` vs Soft `#f5f5f5`)
- `Button` (Destructive `#e7000b` untuk Hapus stan)
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`

**API Request & Response Specification:**
- **Fetch Global Tenants:** `GET /api/tenants?foodCourtId=...&isOpen=true`
  - Header: `Authorization: Bearer <superAdminToken>`
  - Response 200: Mengembalikan array seluruh tenant di platform.
- **Hapus Tenant:** `DELETE /api/tenants/59b40097-4007-42f0-94cb-fa225916ca11`
  - Header: `Authorization: Bearer <superAdminToken>`
  - Response 200: `{ "success": true, "message": "Tenant deleted successfully" }`

- [ ] **Step 1: Write `superadmin_tenants.test.tsx` verifying multi-court tenant listing and delete modal**
- [ ] **Step 2: Build `SuperAdminTenantsPage.tsx` with multi-filter table**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx frontend/src/test/superadmin_tenants.test.tsx
git commit -m "feat(tenants): implement super admin global tenant supervision and deletion"
```

---

### Phase 4: Menus & Kategori (`/api/menus`)

Modul Menus mengatur hierarki kategori makanan/minuman, item sajian, harga integer Rupiah, stok, ketersediaan menu (`isAvailable`), dan katalog belanja multi-tenant untuk pelanggan. Sesuai `backend/README.md` dan modul `backend/modules/menus/`, modul ini memvalidasi bahwa setiap item menu dan kategori terkunci pada `tenantId` tertentu untuk mencegah kontaminasi data antar kios.

#### Matriks Hak Akses & Interaksi Menu Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) | **Akses Penuh Global (CRUD)**:<br>• `GET /api/menus` (Semua menu semua cabang)<br>• `POST /api/menus`<br>• `PUT /api/menus/:id`<br>• `DELETE /api/menus/:id`<br>• `POST /api/menus/categories` | • Memantau master menu global lintas food court.<br>• Mampu mengedit atau menghapus item menu bermasalah dari kios manapun. |
| **Admin Food Court** (`admin-food-court`) | **Akses Terisolasi Cabang Kelolaan**:<br>• `GET /api/menus` (Hanya menu dari stan di cabangnya)<br>• `POST /api/menus` (Untuk stan di cabangnya)<br>• `PUT /api/menus/:id` (Hanya menu stan di cabangnya)<br>• *Ditolak `403` jika mengakses menu di luar cabangnya* | • Layar Monitoring Menu Cabang: Memeriksa variasi kuliner dan rentang harga di food court kelolaannya.<br>• Membantu kios membuat atau merevisi menu jika diperlukan. |
| **Tenant / Kios** (`tenant`) | **Akses Menu Kios Milik Sendiri**:<br>• `GET /api/menus` (Otomatis hanya menu stan miliknya)<br>• `POST /api/menus` (Buat menu kiosnya)<br>• `PUT /api/menus/:id` (Update menu kiosnya)<br>• `DELETE /api/menus/:id` (Hapus menu kiosnya)<br>• `POST /api/menus/categories` (Buat kategori stan miliknya) | • **Layar Manajemen Menu Kios** (`/app/tenant/menus`): Tabel master menu gerai, switch ketersediaan instan (`isAvailable`), pengatur stok cepat, dan dialog kategori.<br>• *Ditolak `403` jika mencoba mengedit atau menghapus menu stan lain*. |
| **Customer** (`customer`) & **Public / Guest** | **Akses Publik Katalog Belanja**:<br>• *`GET /api/menus` manajemen ditolak `403 Forbidden`*<br>• `GET /api/menus/tenant/:tenantId` (Katalog per tenant)<br>• `GET /api/menus/categories/:tenantId` (Katalog per kategori)<br>• `GET /api/menus/:id` (Detail item) | • **Katalog Menu Multi-Tenant Mobile** (`/s/:qrToken`): Pengelompokan kuliner per stan dan per kategori, modal rincian porsi + instruksi khusus dapur, dan integrasi keranjang belanja. |

---

#### Task 12: Layar Manajemen Menu & Stok Cepat Tenant (`/app/tenant/menus`)

**Files:**
- Create: `frontend/src/pages/tenant/TenantMenusPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/tenant_menus.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar operasional utama bagi pengelola gerai ber-role `tenant` untuk memantau seluruh katalog makanannya.
- Menampilkan data tabular seluruh item menu yang dimiliki stan (`GET /api/menus`).
- **Toggle Ketersediaan Instan (`isAvailable`)**: Switch 1-klik di setiap baris tabel. Jika stok habis di dapur, tenant dapat langsung menonaktifkannya sehingga otomatis hilang dari pilihan pembeli di meja.
- **Pencarian & Filter Kategori**: Filter cepat berdasarkan kategori masakan (`Makanan Utama`, `Minuman`, `Snack`, dll) dan pencarian nama menu.
- Tombol aksi cepat: `+ Tambah Menu Baru` dan `Kelola Kategori`.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (`rounded-[24px]`)
- `Input` (Pencarian menu, `rounded-[18px]`, background `#f5f5f5`)
- `Switch` (`rounded-[18px]` untuk ketersediaan instan)
- `Badge` (Solid `#171717` untuk `Tersedia`, Soft `#f5f5f5` untuk `Habis`)
- `Button` (Primary `#0a0a0a` & Outline `#e5e5e5`, `rounded-[18px]`)
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel` (Konfirmasi hapus menu)
- `Sonner` Toast

**Kolom Tabel & Informasi yang Ditampilkan:**

| Kolom Tabel | Sumber Field API | Keterangan Tampilan UI |
| :--- | :--- | :--- |
| **Foto & Nama Menu** | `item.imageUrl`, `item.name` | Thumbnail foto 48px `rounded-[18px]` + Nama menu tebal 14px + deskripsi ringkas |
| **Kategori** | `item.category.name` | Badge pill soft `#f5f5f5` kategori menu |
| **Harga Jual** | `item.price` | Format Rupiah integer (`Rp 32.000`) font mono |
| **Stok Porsi** | `item.stock` | Counter angka stok sisa dengan tombol cepat `+` dan `-` |
| **Ketersediaan** | `item.isAvailable` | Switch aktif/nonaktif (`isAvailable: true | false`) |
| **Aksi** | - | Tombol icon `Edit` (buka dialog) dan `Hapus` (destructive dialog) |

**API Request & Response Specification:**
- **Mengambil Daftar Menu Kios:** `GET /api/menus?search=Rawon&isAvailable=true`
  - Header: `Authorization: Bearer <tenantToken>`
  - **Response Sukses (200 OK):**
```json
{
  "data": [
    {
      "id": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
      "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
      "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
      "name": "Rawon Komplit Empal",
      "description": "Nasi rawon kuah hitam dengan daging empal gurih & telur asin",
      "price": 32000,
      "stock": 25,
      "isAvailable": true,
      "imageUrl": "/images/rawon.jpg",
      "category": {
        "id": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
        "name": "Makanan Utama"
      }
    }
  ]
}
```

- **Toggle Ketersediaan Cepat:** `PUT /api/menus/90d1bf43-e692-4917-8e6f-fcb802619bb2`
  - Header: `Authorization: Bearer <tenantToken>`
  - Request Body: `{ "isAvailable": false }`
  - Response 200: Mengembalikan data menu terupdate.

- [ ] **Step 1: Write `tenant_menus.test.tsx` verifying menu listing, category filter, and availability toggle**
- [ ] **Step 2: Build `TenantMenusPage.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tenant/TenantMenusPage.tsx frontend/src/test/tenant_menus.test.tsx
git commit -m "feat(menus): implement tenant menu management and instant stock availability toggles"
```

---

#### Task 13: Dialog CRUD Menu & Dialog Manajemen Kategori

**Files:**
- Create: `frontend/src/components/tenant/MenuFormDialog.tsx`
- Create: `frontend/src/components/tenant/CategoryManagerDialog.tsx`
- Modify: `frontend/src/pages/tenant/TenantMenusPage.tsx`
- Test: `frontend/src/test/menu_dialogs.test.tsx`

**Fungsi Komponen Modal & Keterangan:**
1. **`MenuFormDialog` (Tambah & Edit Menu)**:
   - Menangani pembuatan menu baru (`POST /api/menus`) atau pengubahan menu (`PUT /api/menus/:id`).
   - Validasi ketat harga dalam integer Rupiah (tanpa desimal/koma sen).
   - Validasi kategori: Hanya menampilkan kategori yang dibuat oleh stan tenant tersebut.
2. **`CategoryManagerDialog` (Manajemen Kategori)**:
   - Mengambil daftar kategori stan via `GET /api/menus/categories/:tenantId`.
   - Membuat kategori baru via `POST /api/menus/categories` (misal: "Makanan Berat", "Minuman Dingin", "Paket Hemat").

**Komponen shadcn/ui:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (Dropdown kategori)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`)
- `Sonner` Toast

**Form Fields pada `MenuFormDialog`:**

| Nama Field | Tipe Input | Label UI | Placeholder / Opsi | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `text` | Nama Menu Makanan / Minuman | `Contoh: Rawon Komplit Empal` | Wajib, min 2 karakter, maks 150 karakter | "Nama menu minimal 2 karakter" |
| `categoryId` | `Select` dropdown | Kategori Menu | Daftar kategori milik stan ini | Wajib dipilih salah satu | "Pilih kategori menu" |
| `price` | `number` / `text` | Harga Jual (Rupiah) | `32000` | Wajib, bilangan bulat positif $\ge 0$ | "Harga minimal Rp 0 (angka bulat)" |
| `stock` | `number` | Stok Awal Harian | `50` | Opsional, integer $\ge 0$ | "Stok tidak boleh minus" |
| `description` | `textarea` | Deskripsi Porsi & Rasa | `Nasi kuah hitam daging sapi empal & telur asin` | Opsional, maks 500 karakter | - |
| `imageUrl` | `url` / `text` | Foto Sajian Menu | `https://example.com/rawon.jpg` | Opsional, format URL valid | "Format URL gambar tidak valid" |
| `isAvailable` | `Switch` | Status Ketersediaan | Toggle `Tersedia Dijual` / `Habis` | Default: `true` | - |

**API Request & Response Specification:**
- **Membuat Kategori Baru:** `POST /api/menus/categories`
  - Header: `Authorization: Bearer <tenantToken>`
  - Request Body: `{ "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11", "name": "Minuman Segar" }`
  - Response 201: `{ "message": "Category created successfully", "data": { "id": "...", "name": "Minuman Segar" } }`

- **Membuat Menu Baru:** `POST /api/menus`
  - Header: `Authorization: Bearer <tenantToken>`
  - **Request Body:**
```json
{
  "tenantId": "59b40097-4007-42f0-94cb-fa225916ca11",
  "categoryId": "7a35368a-6b80-45c1-9018-b80c3547b7c5",
  "name": "Rawon Komplit Empal",
  "description": "Nasi rawon kuah hitam dengan daging empal gurih & telur asin",
  "price": 32000,
  "imageUrl": "https://example.com/rawon.jpg",
  "isAvailable": true
}
```
  - **Response Sukses (201 Created):**
```json
{
  "message": "Menu item created successfully",
  "data": {
    "id": "90d1bf43-e692-4917-8e6f-fcb802619bb2",
    "name": "Rawon Komplit Empal",
    "price": 32000,
    "isAvailable": true
  }
}
```

- [ ] **Step 1: Write `menu_dialogs.test.tsx` verifying form input validations and integer price formatting**
- [ ] **Step 2: Build `MenuFormDialog.tsx` and `CategoryManagerDialog.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tenant/MenuFormDialog.tsx frontend/src/components/tenant/CategoryManagerDialog.tsx frontend/src/test/menu_dialogs.test.tsx
git commit -m "feat(menus): implement MenuFormDialog and CategoryManagerDialog with validation"
```

---

#### Task 14: Layar Katalog Menu Gabungan untuk Customer (`/s/:qrToken`)

**Files:**
- Create: `frontend/src/pages/customer/CustomerMenuPage.tsx`
- Create: `frontend/src/components/customer/MenuItemCard.tsx`
- Create: `frontend/src/components/customer/ItemDetailModal.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/customer_menu.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar utama bagi pelanggan yang duduk di meja makan food court setelah memindai QR code meja (`/s/:qrToken`).
- **Pengelompokan Multi-Tenant**: Menampilkan seluruh stan yang buka di food court tersebut. Pelanggan dapat memfilter menu berdasarkan stan favorit atau melihat seluruh sajian gabungan.
- **Pencarian Cepat Menu**: Filter pencarian instan nama makanan/minuman (`search`).
- **Kartu Menu Elegan (`MenuItemCard`)**: Foto sajian tajam, nama menu, harga formatted Rupiah (`formatRupiah(price)`), nama stan penyedia, badge status ketersediaan, dan tombol `+ Tambah`.
- **Modal Detail Sajian & Custom Notes (`ItemDetailModal`)**:
  - Foto besar dan deskripsi lengkap.
  - Counter jumlah pesanan (`quantity`).
  - Textarea instruksi khusus dapur (`specialInstructions`, contoh: *"Kuah dipisah, jangan terlalu asin, ekstra sambal"*).
  - Tombol simpan ke keranjang belanja lokal.

**Komponen shadcn/ui:**
- `Card`, `CardContent`, `CardFooter` (`rounded-[24px]`)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (`rounded-[24px]`)
- `Input`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`, `rounded-[18px]`)
- `Skeleton` (Animasi loading kartu menu)

**API Request & Response Specification:**
- **Mengambil Menu per Stan:** `GET /api/menus/categories/:tenantId`
  - Akses: Public (Tanpa token)
  - **Response Sukses (200 OK):** Mengembalikan array kategori lengkap dengan array menu yang tersedia di dalamnya.

- [ ] **Step 1: Write `customer_menu.test.tsx` verifying multi-tenant menu catalog and item modal**
- [ ] **Step 2: Build `CustomerMenuPage.tsx`, `MenuItemCard.tsx`, and `ItemDetailModal.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/customer/CustomerMenuPage.tsx frontend/src/components/customer/MenuItemCard.tsx frontend/src/components/customer/ItemDetailModal.tsx frontend/src/test/customer_menu.test.tsx
git commit -m "feat(menus): implement mobile multi-tenant menu catalog and item detail modal for customers"
```

---

### Phase 5: Meja Food Court (`/api/tables`)

Modul Tables mengatur titik temu fisik antara pelanggan, sesi makan (*dining sessions*), dan token QR unik (`qrToken`). Sesuai `backend/README.md` dan modul `backend/modules/tables/`, sistem menyediakan mekanisme scan QR publik tanpa login, pencetakan stiker meja fisik, regenerasi QR darurat untuk proteksi keamanan, serta audit riwayat sesi makan pelanggan.

#### Matriks Hak Akses & Interaksi Meja Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) & **Admin Food Court** (`admin-food-court`) | **Akses Penuh Manajemen Meja**:<br>• `GET /api/tables`<br>• `POST /api/tables`<br>• `GET /api/tables/:id`<br>• `PUT /api/tables/:id`<br>• `POST /api/tables/:id/regenerate-qr`<br>• `GET /api/tables/:id/sessions`<br>• `DELETE /api/tables/:id` | • **Layar Manajemen Meja Cabang** (`/app/admin/tables`): Grid kartu visual meja dan tabel status (`available`, `occupied`, `disabled`).<br>• **Modal Cetak QR Meja** (`QrPrintModal`): Desain kartu meja siap cetak.<br>• **Keamanan Reset QR**: Tombol regenerasi QR token meja.<br>• **Drawer Riwayat Sesi Makan** (`DiningSessionDrawer`): Melihat jejak pesanan dan pelanggan yang duduk di meja tersebut. |
| **Tenant / Kios** (`tenant`) | **Akses Pemantauan Status Meja**:<br>• `GET /api/tables` (Meja di cabangnya)<br>• `GET /api/tables/:id`<br>• `GET /api/tables/:id/sessions`<br>• *Dilarang membuat / mereset / menghapus meja* (`403`) | • Memeriksa ketersediaan meja makan saat pesanan masuk.<br>• Mengonfirmasi nomor meja pelanggan pengantar makanan. |
| **Customer** (`customer`) & **Public / Guest** | **Akses Publik Scan Meja**:<br>• `GET /api/tables/scan/:qrToken` (Tanpa token login)<br>• *Endpoint manajemen internal ditolak `403`* | • **Landing Page Scan Meja** (`/s/:qrToken`): Mengenali nomor meja dan lokasi cabang secara otomatis tanpa perlu input manual, lalu mengarahkan ke katalog menu.<br>• Menampilkan pesan ramah jika meja sedang `disabled` / dinonaktifkan staf. |

---

#### Task 15: Layar Manajemen Meja & Riwayat Sesi Makan (`/app/admin/tables`)

**Files:**
- Create: `frontend/src/pages/admin/AdminTablesPage.tsx`
- Create: `frontend/src/components/admin/DiningSessionDrawer.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/admin_tables.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar monitoring dan manajemen meja makan di food court.
- **Tampilan Grid & Tabel Meja**: Menampilkan nomor meja (`tableNumber`), kapasitas tempat duduk (`capacity`), dan indikator status:
  - `available` (Kosong / Siap Digunakan) — Badge Soft Gray `#f5f5f5`
  - `occupied` (Sedang Terisi Tamu / Sesi Aktif) — Badge Solid `#171717`
  - `disabled` (Dalam Perbaikan / Dinonaktifkan) — Badge Outline Terang
- **Aksi Cepat Ubah Status Meja**: Mengubah meja yang kotor menjadi `available` setelah dibersihkan staf, atau menonaktifkan meja (`disabled`).
- **Drawer Riwayat Sesi Makan (`DiningSessionDrawer`)**: Menampilkan riwayat transaksi meja makan via `GET /api/tables/:id/sessions`. Menyajikan kode sesi (`sessionCode`), daftar tamu (`participants`), dan pesanan makanan yang pernah dibuat di meja tersebut.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (`rounded-[24px]`)
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` (`rounded-l-[24px]`)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (`rounded-[18px]`)
- `Input` (`rounded-[18px]`, background `#f5f5f5`)
- `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Outline `#e5e5e5`)
- `Sonner` Toast

**Form Fields pada Modal Buat Meja Baru:**

| Nama Field | Tipe Input | Label UI | Placeholder / Opsi | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tableNumber` | `text` | Nomor / Kode Meja | `Contoh: T-01 / MEJA-A1` | Wajib, min 1 karakter, maks 20 karakter | "Nomor meja wajib diisi" |
| `capacity` | `number` | Kapasitas Kursi | `4` | Wajib, bilangan bulat $\ge 1$ | "Kapasitas minimal 1 orang" |
| `foodCourtId` | `Select` | Cabang Food Court | Terisi otomatis untuk Admin Food Court | Wajib | "Food court wajib dipilih" |

**API Request & Response Specification:**
- **Membuat Meja Baru:** `POST /api/tables`
  - Header: `Authorization: Bearer <adminToken>`
  - Request Body: `{ "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1", "tableNumber": "T-01", "capacity": 4 }`
  - Response 201: `{ "message": "Table created successfully", "data": { "id": "3be51a84-...", "tableNumber": "T-01", "qrToken": "qr_1727227654321_abc123", "capacity": 4, "status": "available" } }`

- **Melihat Riwayat Sesi Meja:** `GET /api/tables/3be51a84-1e08-410a-ba92-d9ee72a4f00b/sessions?limit=10`
  - Header: `Authorization: Bearer <adminToken>`
  - Response 200: Mengembalikan array riwayat dining sessions lengkap dengan `participants` dan `orders`.

- [ ] **Step 1: Write `admin_tables.test.tsx` verifying table listing, status change, and session drawer**
- [ ] **Step 2: Build `AdminTablesPage.tsx` and `DiningSessionDrawer.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminTablesPage.tsx frontend/src/components/admin/DiningSessionDrawer.tsx frontend/src/test/admin_tables.test.tsx
git commit -m "feat(tables): implement table management grid and dining session history drawer"
```

---

#### Task 16: Modal Cetak QR Meja & Reset QR Token (`QrPrintModal`, `POST /api/tables/:id/regenerate-qr`)

**Files:**
- Create: `frontend/src/components/admin/QrPrintModal.tsx`
- Modify: `frontend/src/pages/admin/AdminTablesPage.tsx`
- Test: `frontend/src/test/qr_print.test.tsx`

**Fungsi Komponen Modal & Keterangan:**
1. **Pencetakan Kartu Meja Fisik (`QrPrintModal`)**:
   - Menghasilkan tata letak stiker meja beresolusi tinggi yang siap dicetak ke printer fisik (`window.print()`).
   - Berisi Logo Food Court, Nomor Meja tebal (Geist 36px), QR Code terenkode URL lengkap pemesanan (`https://foodcourt.domain/s/{qrToken}`), dan instruksi ramah bagi pengunjung: *"Pindai QR ini untuk memesan makanan langsung dari meja Anda"*.
2. **Keamanan Reset QR Token (`Regenerate QR`)**:
   - Jika foto stiker QR meja tersebar di media sosial atau dimanfaatkan orang dari luar lokasi untuk membuat pesanan iseng, pengelola dapat menekan tombol `Reset Token QR`.
   - Memanggil `POST /api/tables/:id/regenerate-qr`. Token QR lama otomatis kedaluwarsa dan digantikan dengan token baru secara instan tanpa menghapus riwayat transaksi meja.

**Komponen shadcn/ui:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (`rounded-[24px]`)
- `Button` (Primary `#0a0a0a` untuk Cetak, Destructive `#e7000b` untuk Reset Token)
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel` (Konfirmasi reset token QR)
- `Sonner` Toast

**API Request & Response Specification:**
- **Mereset Token QR Meja:** `POST /api/tables/3be51a84-1e08-410a-ba92-d9ee72a4f00b/regenerate-qr`
  - Header: `Authorization: Bearer <adminToken>`
  - **Response Sukses (200 OK):**
```json
{
  "message": "QR Token regenerated successfully",
  "data": {
    "id": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
    "qrToken": "qr_t-01_newtoken987",
    "status": "available"
  }
}
```

- [ ] **Step 1: Write `qr_print.test.tsx` verifying print preview rendering and token reset action**
- [ ] **Step 2: Build `QrPrintModal.tsx` with print media styles and regenerate flow**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/QrPrintModal.tsx frontend/src/test/qr_print.test.tsx
git commit -m "feat(tables): implement printable physical QR modal and secure token regeneration"
```

---

#### Task 17: Landing Page Scan Meja Customer (`/s/:qrToken` Table Resolver)

**Files:**
- Create: `frontend/src/pages/customer/TableScanResolverPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/table_scan.test.tsx`

**Fungsi Halaman & Keterangan:**
Pintu gerbang otomatis saat kamera ponsel pengunjung memindai QR code fisik di meja makan.
- Menerima parameter `:qrToken` dari URL.
- Memanggil endpoint publik `GET /api/tables/scan/:qrToken` tanpa membutuhkan login.
- **Validasi Status Meja**:
  - Jika meja berstatus `available` atau `occupied`: Menyimpan identitas meja (`tableId`, `tableNumber`, `foodCourtId`, `foodCourtName`) ke penyimpanan lokal dan langsung mengarahkan ke katalog menu gabungan `/s/:qrToken`.
  - Jika meja berstatus `disabled`: Menampilkan kartu peringatan elegan: *"Meja Sedang Tidak Aktif. Meja ini sedang dalam pemeliharaan atau dipindahkan staf. Silakan gunakan meja lain."*
  - Jika token tidak valid / sudah di-reset: Menampilkan peringatan *"QR Code Meja Tidak Berlaku. Silakan hubungi staf food court."*

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`max-w-md mx-auto`, `rounded-[24px]`)
- `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a`, `rounded-[18px]`)
- `Skeleton` (Pemuatan data resolusi QR)

**API Request & Response Specification:**
- **Resolving QR Meja:** `GET /api/tables/scan/qr_1727227654321_abc123`
  - Akses: Public (Tanpa token)
  - **Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "3be51a84-1e08-410a-ba92-d9ee72a4f00b",
    "foodCourtId": "18f9185a-0d17-48f8-a128-40960538a7c1",
    "tableNumber": "T-01",
    "qrToken": "qr_1727227654321_abc123",
    "capacity": 4,
    "status": "available",
    "foodCourt": {
      "id": "18f9185a-0d17-48f8-a128-40960538a7c1",
      "name": "Grand City Food Court @Lantai 2",
      "address": "Jl. Pemuda No. 10, Surabaya"
    }
  }
}
```

- [ ] **Step 1: Write `table_scan.test.tsx` verifying scan resolution and disabled state rejection**
- [ ] **Step 2: Build `TableScanResolverPage.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/customer/TableScanResolverPage.tsx frontend/src/test/table_scan.test.tsx
git commit -m "feat(tables): implement public QR table scan resolver and table status gate"
```

---

### Phase 6: Pemesanan / Orders (`/api/orders`)

Modul Orders adalah jantung transaksi operasional food court. Sesuai `backend/README.md` dan modul `backend/modules/orders/`, modul ini menangani arsitektur pesanan multi-tier:
1. Menghubungkan pesanan ke sesi meja makan (`diningSession`), baik untuk pemesanan mandiri maupun pemesanan rombongan (`POST /api/orders/sessions/join`).
2. Membuat snapshot harga dan nama menu pada saat dipesan agar tidak berubah jika gerai mengubah harga di kemudian hari.
3. Memecah 1 pesanan utama multi-stan menjadi sub-order terpisah untuk masing-masing stan tenant (`tenantOrders`).
4. Menyediakan antrean masak real-time untuk dapur (KDS) dan pelacakan live publik tanpa login (`/track/:orderNumber`).
5. Otomatisasi pembebasan meja makan kembali menjadi `available` ketika pesanan diselesaikan (`PATCH /api/orders/:id/status` -> `COMPLETED`).

#### Matriks Hak Akses & Interaksi Pesanan Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) & **Admin Food Court** (`admin-food-court`) | **Akses Penuh Monitoring & Intervensi**:<br>• `GET /api/orders` (Semua pesanan di cabangnya)<br>• `GET /api/orders/:id` (Rincian lengkap pesanan)<br>• `PATCH /api/orders/:id/status` (Selesaikan/Batalkan pesanan)<br>• `POST /api/orders` | • **Layar Monitoring Pesanan Food Court** (`/app/admin/orders`): Tabel transaksi live seluruh stan, filter status pembayaran dan meja.<br>• **Dialog Rincian Tagihan & Sub-Order** (`OrderDetailDialog`).<br>• **Aksi Intervensi**: Selesaikan pesanan paksa (otomatis bebaskan meja) atau batalkan pesanan jika tamu kabur/batal. |
| **Tenant / Kios** (`tenant`) | **Akses Antrean Masak Dapur Gerai Sendiri**:<br>• `GET /api/orders` (Hanya pesanan yang memuat menu gerainya)<br>• `PATCH /api/orders/tenant-orders/:id/status` (Update cooking status)<br>• `PATCH /api/orders/items/:itemId/status` (Update status per porsi) | • **Layar Kitchen Display System (KDS) 3-Kolom** (`/app/tenant/kds`): Kanban antrean masak dapur (`QUEUED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`).<br>• Audio chime saat order baru masuk dan polling real-time 5 detik.<br>• *Dilarang melihat pesanan stan lain*. |
| **Customer** (`customer`) | **Akses Pembuatan Pesanan & Riwayat Belanja**:<br>• `POST /api/orders` (Buat pesanan meja multi-stan)<br>• `POST /api/orders/sessions/join` (Gabung sesi meja teman)<br>• `GET /api/orders` (Hanya riwayat pesanan akunnya)<br>• `GET /api/orders/:id` | • **Keranjang Belanja Drawer & Checkout** (`CartDrawer`, `/checkout`): Pengelompokan porsi per stan, hitung total Rupiah, dan submit order.<br>• **Modal Gabung Sesi Meja**: Bergabung ke meja aktif teman via QR code.<br>• **Layar Riwayat Belanja**: Arsip struk pesanan akun. |
| **Public / Guest** | **Akses Live Tracking Tanpa Login**:<br>• `GET /api/orders/track/:orderNumber` (Pelacakan publik nomor order)<br>• `POST /api/orders` (Pesan sebagai tamu dengan input nama) | • **Layar Live Tracking Masak Dapur** (`/track/:orderNumber`): Stepper progres masak real-time per stan dengan polling 5 detik dan alert popup saat makanan siap diambil. |

---

#### Task 18: Keranjang Belanja Multi-Tenant & Layar Checkout (`CartDrawer`, `/checkout`)

**Files:**
- Create: `frontend/src/components/customer/CartDrawer.tsx`
- Create: `frontend/src/pages/customer/CheckoutPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/checkout.test.tsx`

**Fungsi Halaman & Komponen:**
1. **Drawer Keranjang Belanja (`CartDrawer`)**:
   - Terbuka dari samping/bawah saat pembeli menekan tombol melayang *"Keranjang (X Item - Rp Total)"*.
   - Mengelompokkan item pesanan berdasarkan stan tenant masing-masing (misal: Sub-grup *Stan Rawon Bu Siti* dan *Stan Es Teh Manis*).
   - Menghitung subtotal per gerai dan total keseluruhan pesanan.
   - Tombol pengubah jumlah porsi (`+` / `-`) dan penghapus item.
2. **Layar Checkout (`/checkout`)**:
   - Memastikan nomor meja valid dari sesi scan QR.
   - Input identitas pemesan: `customerName` (wajib diisi nama asli pemanggil makanan) dan `notes` (opsional).
   - Opsi Rombongan (*Join Session*): Jika meja sudah memiliki sesi makan aktif yang dibuat oleh teman semeja, sistem menyediakan opsi menggabungkan pesanan ke sesi meja tersebut via `POST /api/orders/sessions/join`.
   - Mengirim request `POST /api/orders`. Setelah berhasil, mengarahkan pembeli langsung ke rute pembayaran atau live tracking `/track/:orderNumber`.

**Komponen shadcn/ui:**
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter` (`rounded-t-[24px]` di mobile)
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` (`rounded-[24px]`)
- `Input`, `Label`, `Textarea` (`rounded-[18px]`, background `#f5f5f5`)
- `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`, `rounded-[18px]`)
- `Sonner` Toast

**Form Fields pada Layar Checkout:**

| Nama Field | Tipe Input | Label UI | Placeholder / Opsi | Aturan Validasi | Keterangan Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `customerName` | `text` | Nama Pemesan / Pembeli | `Contoh: Rizky Ramadhan` | Wajib, min 2 karakter, maks 100 karakter | "Nama pemesan wajib diisi" |
| `tableNumber` | `text` | Nomor Meja Makan | `T-01` | Read-only (Terkunci dari scan meja) | - |
| `notes` | `textarea` | Catatan Tambahan Pesanan | `Pesanan makan siang rombongan` | Opsional, maks 255 karakter | - |

**API Request & Response Specification:**
- **Membuat Pesanan Baru (Checkout):** `POST /api/orders`
  - Header: Opsional `Authorization: Bearer <token>` (Dapat dipanggil oleh Customer login maupun Tamu)
  - **Request Body:**
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
  - **Response Sukses (201 Created):**
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

- [ ] **Step 1: Write `checkout.test.tsx` verifying multi-tenant cart groupings and checkout validation**
- [ ] **Step 2: Build `CartDrawer.tsx` and `CheckoutPage.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/customer/CartDrawer.tsx frontend/src/pages/customer/CheckoutPage.tsx frontend/src/test/checkout.test.tsx
git commit -m "feat(orders): implement multi-tenant cart drawer and checkout flow"
```

---

#### Task 19: Layar Kitchen Display System (KDS) Kanban 3-Kolom Tenant (`/app/tenant/kds`)

**Files:**
- Create: `frontend/src/pages/tenant/KitchenDisplayPage.tsx`
- Create: `frontend/src/components/tenant/KdsTicketCard.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/kds.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar antarmuka dapur real-time khusus bagi koki/staf gerai ber-role `tenant`.
- **Kanban Dapur 3-Kolom Responsif**:
  - Kolom 1: **Antre Masak (`QUEUED`)** — Pesanan baru yang telah terkonfirmasi lunas dan menunggu dimasak.
  - Kolom 2: **Sedang Dimasak (`PREPARING`)** — Masakan sedang diproses di wajan/dapur.
  - Kolom 3: **Siap Diambil / Selesai (`READY`)** — Makanan matang, siap disajikan atau diambil pelayan/pembeli.
- **Kartu Tiket Dapur (`KdsTicketCard`)**:
  - Header: Nomor Order (`ORD-...`), Nomor Meja tamu (`T-01`), timer durasi pesanan berjalan (contoh: `05:20`).
  - Body: Rincian item menu, porsi (`2x`), dan teks instruksi khusus yang dicetak tebal (contoh: *"Kuah dipisah, pedas"*).
  - Tombol Pindah Status 1-Klik:
    - Dari `QUEUED` $\rightarrow$ Tekan `"Mulai Masak"` memanggil `PATCH /api/orders/tenant-orders/:id/status` `{ cookingStatus: "PREPARING" }`.
    - Dari `PREPARING` $\rightarrow$ Tekan `"Selesai Masak"` memanggil `PATCH ...` `{ cookingStatus: "READY" }`.
    - Dari `READY` $\rightarrow$ Tekan `"Pesanan Diambil"` memanggil `PATCH ...` `{ cookingStatus: "COMPLETED" }`.
- **Real-Time Polling & Audio Chime**: Memanggil `GET /api/orders` setiap 5 detik (`refetchInterval: 5000`) dan membunyikan suara bel dapur halus saat ada pesanan baru masuk.

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` (`rounded-[24px]`)
- `Badge` (Solid `#171717` untuk Meja, Soft `#f5f5f5` untuk Durasi)
- `Button` (Primary `#0a0a0a` & Outline `#e5e5e5`, `rounded-[18px]`)
- `Sonner` Toast

**API Request & Response Specification:**
- **Update Status Memasak Antrean Dapur:** `PATCH /api/orders/tenant-orders/42e2b921-2e11-482a-a92c-55c4ea87f941/status`
  - Header: `Authorization: Bearer <tenantToken>`
  - Request Body: `{ "cookingStatus": "PREPARING" }`
  - Response 200: `{ "message": "Tenant order status updated successfully", "data": { "id": "...", "status": "PREPARING" } }`

- [ ] **Step 1: Write `kds.test.tsx` verifying kanban columns and cooking status stage progressions**
- [ ] **Step 2: Build `KitchenDisplayPage.tsx` and `KdsTicketCard.tsx` with 5s polling**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tenant/KitchenDisplayPage.tsx frontend/src/components/tenant/KdsTicketCard.tsx frontend/src/test/kds.test.tsx
git commit -m "feat(orders): implement 3-column kitchen display system (KDS) for tenant kitchens"
```

---

#### Task 20: Layar Live Tracking Status Masak Real-Time Customer (`/track/:orderNumber`)

**Files:**
- Create: `frontend/src/pages/customer/OrderTrackingPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/order_tracking.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar pelacakan pesanan publik yang dapat dibuka langsung oleh pembeli di ponselnya tanpa perlu login.
- Mengambil parameter `:orderNumber` dari URL (contoh: `/track/ORD-20260925-0001`).
- Memanggil endpoint publik `GET /api/orders/track/:orderNumber` dengan auto-polling setiap 5 detik.
- **Pelacakan Multi-Stan**: Karena 1 pesanan bisa memesan dari beberapa stan sekaligus, layar menampilkan kartu progres terpisah untuk setiap gerai tenant:
  - *Stan Rawon Bu Siti*: `PREPARING (Sedang Dimasak - Estimasi 8 Menit)`
  - *Stan Kopi Kenangan*: `READY (Minuman Siap Diambil di Kios)`
- **Alert Pengambilan Makanan**: Menampilkan dialog / banner mencolok ketika status pesanan beralih ke `READY` agar pembeli segera mengambil makanannya ke konter stan.

**Komponen shadcn/ui:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`max-w-md mx-auto`, `rounded-[24px]`)
- `Badge` (`rounded-[18px]`)
- `Progress` (Indikator bar progres masak 0% $\rightarrow$ 100%)
- `Button` (Outline `#e5e5e5`, `rounded-[18px]`)

**API Request & Response Specification:**
- **Pelacakan Live Pesanan:** `GET /api/orders/track/ORD-20260925-0001`
  - Akses: Public (Tanpa token)
  - **Response Sukses (200 OK):**
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

- [ ] **Step 1: Write `order_tracking.test.tsx` verifying multi-tenant stepper tracking and ready notification**
- [ ] **Step 2: Build `OrderTrackingPage.tsx` with 5s polling**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/customer/OrderTrackingPage.tsx frontend/src/test/order_tracking.test.tsx
git commit -m "feat(orders): implement public live order tracking and kitchen progress stepper"
```

---

#### Task 21: Layar Monitoring Pesanan Food Court & Intervensi Status (`/app/admin/orders`)

**Files:**
- Create: `frontend/src/pages/admin/AdminOrdersPage.tsx`
- Create: `frontend/src/components/admin/OrderDetailDialog.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/admin_orders.test.tsx`

**Fungsi Halaman & Keterangan:**
Layar kendali pesanan bagi Admin Food Court dan Super Admin.
- Menampilkan data tabel seluruh pesanan yang sedang berjalan di food court (`GET /api/orders`).
- Filter status pesanan (`PENDING_PAYMENT`, `PAID`, `COMPLETED`, `CANCELLED`) dan filter nomor meja.
- Dialog Rincian Pesanan (`OrderDetailDialog` via `GET /api/orders/:id`): Melihat daftar menu yang dipesan, catatan pelanggan, status pembayaran, dan status pengerjaan dapur tiap stan.
- **Tindakan Intervensi Pengelola**:
  - **Selesaikan Pesanan Manual**: Memanggil `PATCH /api/orders/:id/status` `{ status: "COMPLETED" }`. Sistem backend secara otomatis membebaskan meja makan menjadi `available` kembali.
  - **Batalkan Pesanan**: Memanggil `PATCH /api/orders/:id/status` `{ status: "CANCELLED" }` jika transaksi hangus atau pelanggan meninggalkan meja.

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card`, `CardHeader`, `CardTitle`, `CardContent` (`rounded-[24px]`)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (`rounded-[24px]`)
- `Select`, `Input`, `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Destructive `#e7000b`)
- `Sonner` Toast

**API Request & Response Specification:**
- **Update Status Pesanan Utama:** `PATCH /api/orders/76e33f38-2785-455b-8669-ce561a0d319a/status`
  - Header: `Authorization: Bearer <adminToken>`
  - Request Body: `{ "status": "COMPLETED" }`
  - Response 200: `{ "message": "Order status updated successfully", "data": { "id": "...", "status": "COMPLETED" } }`

- [ ] **Step 1: Write `admin_orders.test.tsx` verifying admin order monitor and table-release status patch**
- [ ] **Step 2: Build `AdminOrdersPage.tsx` and `OrderDetailDialog.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminOrdersPage.tsx frontend/src/components/admin/OrderDetailDialog.tsx frontend/src/test/admin_orders.test.tsx
git commit -m "feat(orders): implement admin order supervision monitor and table-releasing interventions"
```

---

### Phase 7: Pembayaran / Payments (`/api/payments`)

Modul Payments menangani penyelesaian transaksi keuangan pesanan food court. Sesuai `backend/README.md` dan modul `backend/modules/payments/`, modul ini mendukung dua gerbang transaksi:
1. **Midtrans Snap Gateway**: Menghasilkan `snapToken` dan `redirectUrl` untuk pembayaran digital modern (QRIS, e-Wallet GoPay/ShopeePay, dan Virtual Account Bank).
2. **Sinkronisasi Otomatis Tanpa Webhook Publik (`/sync`)**: Frontend secara otomatis memicu sinkronisasi status ke API Midtrans saat menerima callback `onSuccess` dari Midtrans Snap, sehingga sistem langsung terupdate menjadi lunas (`PAID`) tanpa bergantung pada URL webhook publik di lingkungan lokal/development.
3. **Pembayaran Langsung / Kasir (`POST /api/payments`)**: Pemrosesan pembayaran tunai (`CASH`) atau QRIS statis kasir.
4. **Otomatisasi Alur Dapur**: Begitu status pembayaran berubah menjadi `SUCCESS` / `PAID`, status pesanan beralih menjadi `CONFIRMED` dan tiket antrean masak otomatis diteruskan ke layar KDS dapur seluruh stan terkait.

#### Matriks Hak Akses & Interaksi Pembayaran Antar Seluruh Role (RBAC)

| Peran (Role) | Hak Akses Endpoint | Antarmuka Pengguna (UI View) & Perilaku Sistem |
| :--- | :--- | :--- |
| **Super Admin** (`admin`) & **Admin Food Court** (`admin-food-court`) | **Akses Monitoring Keuangan & Kasir**:<br>• `POST /api/payments` (Konfirmasi bayar kasir)<br>• `GET /api/payments/:orderId` (Bukti bayar)<br>• Rekap log transaksi seluruh gerai | • **Layar Rekap Transaksi & Pembayaran Cabang** (`/app/admin/payments`): Tabel log pembayaran live, filter metode (Midtrans/Cash), total omzet harian.<br>• **Modal Kasir**: Menerima pembayaran tunai dari tamu meja dan menerbitkan struk lunas. |
| **Tenant / Kios** (`tenant`) | **Akses Verifikasi Pembayaran Menu Stan**:<br>• `GET /api/payments/:orderId` (Bukti pembayaran pesanan gerainya)<br>• *Dilarang melihat transaksi stan lain* | • Menampilkan badge status pelunasan pada tiket KDS dapur.<br>• Melihat rincian subtotal pendapatan gerainya dari pesanan yang masuk. |
| **Customer** (`customer`) & **Public / Guest** | **Akses Pembayaran Pesanan**:<br>• `POST /api/payments/midtrans` (Buat transaksi Snap)<br>• `POST /api/payments/midtrans/:reference/sync`<br>• `POST /api/payments` (Bayar di kasir)<br>• `GET /api/payments/:orderId` | • **Modal Pembayaran & Midtrans Snap Popup** (`PaymentModal`): Pilihan QRIS / GoPay / ShopeePay / VA via popup Snap.<br>• **Modal Struk Digital** (`ReceiptModal`): Bukti sah pembayaran pesanan dengan nomor referensi transaksi. |

---

#### Task 22: Integrasi Midtrans Snap Popup & Sinkronisasi Pembayaran (`PaymentModal`, `/checkout`)

**Files:**
- Create: `frontend/src/components/customer/PaymentModal.tsx`
- Modify: `frontend/src/pages/customer/CheckoutPage.tsx`
- Modify: `frontend/index.html` (Inject script Midtrans Snap SDK sandbox)
- Test: `frontend/src/test/payment.test.tsx`

**Fungsi Komponen Modal & Keterangan:**
1. **Pemilihan Metode Pembayaran**:
   - Opsi 1: **Pembayaran Instan Online (Midtrans Snap)** — QRIS (GoPay, OVO, ShopeePay), Transfer Virtual Account (BCA, Mandiri, BRI, BNI).
   - Opsi 2: **Bayar Tunai di Kasir (Cash)** — Tamu membawa nomor order ke konter kasir food court.
2. **Alur Eksekusi Midtrans Snap**:
   - Frontend memanggil `POST /api/payments/midtrans` dengan body `{ "orderId": "..." }`.
   - Backend merespons dengan `snapToken`, `redirectUrl`, dan `paymentReference`.
   - Frontend memanggil `window.snap.pay(snapToken, { onSuccess, onPending, onError, onClose })`.
3. **Mekanisme Auto-Sync (`POST /api/payments/midtrans/:reference/sync`)**:
   - Di dalam callback `onSuccess` atau `onPending`, frontend otomatis memanggil endpoint sinkronisasi: `POST /api/payments/midtrans/{reference}/sync`.
   - Backend memverifikasi status pembayaran langsung ke server Midtrans, mengubah status payment menjadi `SUCCESS`, order menjadi `PAID`, dan antrean dapur menjadi `QUEUED`.
   - Pengguna langsung diarahkan ke layar live tracking `/track/:orderNumber` dengan notifikasi sukses.

**Komponen shadcn/ui:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` (`rounded-[24px]`)
- `Card` (Pilihan metode pembayaran, border hairline `#e5e5e5`)
- `Badge` (Solid `#171717` untuk Online, Soft `#f5f5f5` untuk Kasir)
- `Button` (Primary `#0a0a0a` & Secondary `#f5f5f5`, `rounded-[18px]`)
- `Sonner` Toast

**API Request & Response Specification:**
- **Membuat Transaksi Midtrans Snap:** `POST /api/payments/midtrans`
  - Akses: Public / Customer
  - **Request Body:**
```json
{
  "orderId": "76e33f38-2785-455b-8669-ce561a0d319a"
}
```
  - **Response Sukses (201 Created):**
```json
{
  "message": "Midtrans transaction created",
  "data": {
    "id": "pay-uuid-112233",
    "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
    "paymentReference": "ORD-20260925-0001-1760406000000",
    "amount": 64000,
    "status": "PENDING",
    "snapToken": "66e4fa55-1234-abcd-5678-ef0123456789",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/66e4fa55...",
    "clientKey": "SB-Mid-client-sample-key",
    "isProduction": false
  }
}
```

- **Sinkronisasi Otomatis Status Midtrans:** `POST /api/payments/midtrans/ORD-20260925-0001-1760406000000/sync`
  - Akses: Public / Customer
  - **Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "pay-uuid-112233",
    "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
    "paymentReference": "ORD-20260925-0001-1760406000000",
    "status": "SUCCESS",
    "amount": 64000,
    "paidAt": "2026-10-22T13:20:00.000Z"
  }
}
```

- **Pembayaran Langsung Kasir / Manual:** `POST /api/payments`
  - **Request Body:**
```json
{
  "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
  "method": "CASH",
  "amount": 64000,
  "reference": "CASH-KASIR-01"
}
```

- [ ] **Step 1: Write `payment.test.tsx` verifying Snap SDK trigger and post-payment sync callback**
- [ ] **Step 2: Build `PaymentModal.tsx` and integrate Midtrans Snap Script loader**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/customer/PaymentModal.tsx frontend/src/test/payment.test.tsx
git commit -m "feat(payments): implement Midtrans Snap popup integration and auto-sync verification"
```

---

#### Task 23: Layar Rekap Log Transaksi & Struk Pembayaran (`/app/admin/payments`, `ReceiptModal`)

**Files:**
- Create: `frontend/src/pages/admin/AdminPaymentsPage.tsx`
- Create: `frontend/src/components/payment/ReceiptModal.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/test/admin_payments.test.tsx`

**Fungsi Halaman & Keterangan:**
1. **Layar Rekap Transaksi Pembayaran (`/app/admin/payments`)**:
   - Digunakan oleh Admin Food Court dan Super Admin untuk memantau arus kas masuk seluruh gerai di food court.
   - Menampilkan ringkasan kartu metrik: Total Omzet Hari Ini (Rupiah), Jumlah Transaksi Berhasil (`SUCCESS`), dan Transaksi Menunggu (`PENDING`).
   - Tabel riwayat pembayaran: Waktu bayar, Nomor Order, Meja, Metode (`QRIS`, `MIDTRANS`, `CASH`, `TRANSFER`), Total Rupiah, Referensi Transaksi, Status, dan Tombol `Cetak Struk`.
   - Filter pencarian nomor order / referensi dan filter tanggal.
2. **Modal Struk Pembayaran Digital (`ReceiptModal`)**:
   - Memanggil `GET /api/payments/:orderId`.
   - Menampilkan bukti resmi transaksi bergaya receipt minimalis: Logo food court, nama cabang, nomor pesanan, nama tamu, daftar menu dan subtotal stan, metode pembayaran, stempel `LUNAS / PAID`, dan tombol `Cetak Struk` (`window.print()`).

**Komponen shadcn/ui:**
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Card`, `CardHeader`, `CardTitle`, `CardContent` (`rounded-[24px]`)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (`rounded-[24px]`)
- `Input`, `Select`, `Badge` (`rounded-[18px]`)
- `Button` (Primary `#0a0a0a` & Outline `#e5e5e5`)
- `Sonner` Toast

**API Request & Response Specification:**
- **Mengambil Rincian Bukti Pembayaran:** `GET /api/payments/76e33f38-2785-455b-8669-ce561a0d319a`
  - Header: `Authorization: Bearer <token>`
  - **Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "a90b4317-09d2-43d9-9528-662580a6c781",
    "orderId": "76e33f38-2785-455b-8669-ce561a0d319a",
    "method": "QRIS",
    "amount": 64000,
    "status": "SUCCESS",
    "reference": "ORD-20260925-0001-1760406000000",
    "paidAt": "2026-10-22T13:20:00.000Z",
    "order": {
      "orderNumber": "ORD-20260925-0001",
      "customerName": "Rizky Ramadhan",
      "table": {
        "tableNumber": "T-01"
      }
    }
  }
}
```

- [ ] **Step 1: Write `admin_payments.test.tsx` verifying payment log table and receipt modal rendering**
- [ ] **Step 2: Build `AdminPaymentsPage.tsx` and `ReceiptModal.tsx`**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminPaymentsPage.tsx frontend/src/components/payment/ReceiptModal.tsx frontend/src/test/admin_payments.test.tsx
git commit -m "feat(payments): implement admin payment transaction logs and digital receipt modal"
```

---

## Verification Plan

### Automated Tests
```bash
# 1. Backend tests verifying authentication, food court RBAC, and helpers
cd backend && bun test

# 2. Frontend type-check & linting
cd frontend && npm run build && npm run lint
```

### Manual Verification
1. **Super Admin Flow:** Login sebagai `admin` $\rightarrow$ Akses `/app/super-admin/food-courts` $\rightarrow$ Tambah food court baru $\rightarrow$ Tugaskan manajer food court $\rightarrow$ Edit profil $\rightarrow$ Verifikasi data muncul di tabel.
2. **Admin Food Court Flow:** Login sebagai `admin-food-court` $\rightarrow$ Akses `/app/admin/food-court` $\rightarrow$ Verifikasi hanya food court miliknya yang tampil $\rightarrow$ Ubah nomor telepon & alamat $\rightarrow$ Simpan $\rightarrow$ Verifikasi berhasil $\rightarrow$ Pastikan tombol hapus tidak ada.
3. **Tenant & Customer Protection Flow:** Login sebagai `tenant` atau buka rute `/app/admin/food-court` $\rightarrow$ Pastikan dialihkan ke halaman 403 Akses Ditolak.
