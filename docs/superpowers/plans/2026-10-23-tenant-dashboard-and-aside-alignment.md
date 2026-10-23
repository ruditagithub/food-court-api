# Tenant Dashboard & Aside Rail Navigation Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan seluruh pengalaman visual dashboard dan halaman operasional peran **Tenant** (`tenant`) dengan standar desain Bento Grid modern, Aside Rail Dock melayang, dan Top Header App Bar yang telah diterapkan pada Super Admin dan Admin Food Court, dengan penyesuaian menu navigasi berdasarkan hak akses RBAC di `backend/README.md`.

**Architecture:** Memperluas shell aplikasi terpadu di [`InternalLayout.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/InternalLayout.tsx) agar merangkul peran `tenant`, menambahkan konfigurasi navigasi 8 menu tenant pada [`SuperAdminRailAside.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/SuperAdminRailAside.tsx), mengadaptasi [`SuperAdminHeader.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/SuperAdminHeader.tsx) untuk menampilkan badge konteks gerai/stan kios, serta menyesuaikan [`DashboardPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/dashboard/DashboardPage.tsx) dengan metrik omzet, antrean KDS, dan status operasional gerai milik tenant.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React icons, Recharts, Vite.

## Global Constraints

- **Design System**: Mengikuti [DESIGN.md](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/DESIGN.md): bento grid `#f3f4f6`, squircle cards `rounded-[28px]`, palet monokromatik `#0a0a0a` & `#ffffff` dengan aksen status emerald/amber/red.
- **Icon Library**: Menggunakan `lucide-react` secara konsisten pada seluruh navigasi dan indikator UI.
- **RBAC Strictness**: Tenant dilarang memanggil endpoint global di luar hak aksesnya (seperti `/api/food-courts` yang 403). Gunakan `/api/tenants/mine`, `/api/menus/`, `/api/orders`, `/api/menus/categories`, dan `/api/tables`.
- **Zero Build Regressions**: `bun run build` harus selalu sukses dengan exit code 0 setelah setiap task.

---

## Hasil Pemindaian Hak Akses Tenant (`backend/README.md`)

| No Endpoint | Method | Path | Ruang Lingkup Role Tenant (`tenant`) | Penggunaan di Navigasi / UI |
| :---: | :---: | :--- | :--- | :--- |
| 4 | `GET` | `/api/auth/me` | Profil pemilik kios | Profil Akun & Identitas Sesi |
| 12 / mine | `GET` | `/api/tenants/mine` | Mengambil detail stan milik tenant sendiri | Header Context Stan & Dashboard Kios |
| 13 | `PUT` | `/api/tenants/{id}` | Update stan kios (jam buka/tutup, status `isOpen`) | Halaman Profil Kios (`/app/tenant/profile`) |
| 18 | `GET` | `/api/menus/` | Mengambil seluruh menu dari kios miliknya sendiri | Katalog Menu (`/app/tenant/menus`) |
| 19 / 24 / 25 | CRUD | `/api/menus/` | Tambah, update harga/stok, hapus menu kiosnya | Manajemen Menu & Varian |
| 20A / 22 / 22A / 22B | CRUD | `/api/menus/categories` | Kelola kategori menu gerai miliknya sendiri | Kategori Menu (`/app/categories`) |
| 26 | `GET` | `/api/tables/` | Melihat status meja di cabang tempat kios berada | Monitoring Meja Cabang (`/app/admin/tables`) |
| 32 | `GET` | `/api/orders/` | Riwayat pesanan yang masuk ke kiosnya (`tenantOrders`) | Rekap Pesanan (`/app/admin/orders`) |
| 37 | `PATCH`| `/api/orders/tenant-orders/{id}/status` | Update progres dapur (`QUEUED` -> `PREPARING` -> `READY` -> `COMPLETED`) | Layar Dapur KDS (`/app/tenant/kds`) |
| 38 | `PATCH`| `/api/orders/items/{itemId}/status` | Update status pengerjaan per item makanan | Layar Dapur KDS (`/app/tenant/kds`) |

---

## Struktur Navigasi Aside Rail Tenant (8 Menu)

1. **`LayoutDashboard`** ➔ `/app/dashboard`: **Ringkasan Omzet Gerai** (Metrik penjualan kios, antrean aktif, menu terlaris)
2. **`ChefHat`** ➔ `/app/tenant/kds`: **Layar Dapur (KDS)** (Kanban antrean masak langsung dapur kios)
3. **`UtensilsCrossed`** ➔ `/app/tenant/menus`: **Katalog Menu & Stok** (Manajemen hidangan, ketersediaan, stok)
4. **`FolderKanban`** ➔ `/app/categories`: **Kategori Menu Gerai** (Kelola kategori hidangan stan)
5. **`Calendar`** ➔ `/app/admin/orders`: **Rekap Pesanan Masuk** (Monitoring riwayat pesanan pelanggan stan)
6. **`Layers`** ➔ `/app/admin/tables`: **Status Meja Cabang** (Pemantauan meja makan terisi vs kosong di food court)
7. **`Store`** ➔ `/app/tenant/profile`: **Profil & Operasional Kios** (Informasi stan, jam buka/tutup, sakelar buka/tutup gerai)
8. **`Settings`** ➔ `/app/profile`: **Pengaturan Akun Pengguna** (Profil pemilik kios, kata sandi)

---

## File Map & Responsibilitas

- Modify: [`frontend/src/components/layout/InternalLayout.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/InternalLayout.tsx)
  - Mengikutsertakan `user?.role === 'tenant'` ke dalam modern shell bento (`#f3f4f6` canvas + `SuperAdminRailAside` + `SuperAdminHeader`).
- Modify: [`frontend/src/components/layout/SuperAdminRailAside.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/SuperAdminRailAside.tsx)
  - Menambahkan menu `navItems` khusus untuk `user?.role === 'tenant'` (8 item di atas dengan ikon `lucide-react` dan tooltip).
- Modify: [`frontend/src/components/layout/SuperAdminHeader.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/components/layout/SuperAdminHeader.tsx)
  - Menampilkan brand identity: `FC` + `Amici Food Court` + Subtitle `Tenant Partner`.
  - Menggantikan dropdown cabang dengan pill konteks kios: Nomor Stan & Nama Gerai + status badge live `Buka` / `Tutup`.
- Modify: [`frontend/src/pages/dashboard/DashboardPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/dashboard/DashboardPage.tsx)
  - Menambahkan data fetching role-aware untuk `tenant`: memanggil `/api/tenants/mine`, `/api/orders`, `/api/menus/`.
  - Menampilkan bento card khusus tenant: Total Omzet Stan, Pesanan Masuk, Antrean Dapur Sedang Dimasak, Menu Aktif, dan Status Operasional Kios.
- Modify: [`frontend/src/App.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/App.tsx)
  - Memperbarui `RoleGuard` pada rute `/app/admin/orders` dan `/app/admin/tables` agar menyertakan role `tenant` (sesuai izin endpoint 26 & 32 di `backend/README.md`).
- Modify: [`frontend/src/pages/admin/AdminOrdersPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/admin/AdminOrdersPage.tsx) & [`AdminTablesPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/admin/AdminTablesPage.tsx)
  - Penyesuaian UI role tenant: menyembunyikan tombol create/edit meja untuk role tenant (read-only), menyesuaikan judul header.
- Modify: [`frontend/src/pages/tenant/KitchenDisplayPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/tenant/KitchenDisplayPage.tsx), [`TenantMenusPage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/tenant/TenantMenusPage.tsx), & [`TenantProfilePage.tsx`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/frontend/src/pages/tenant/TenantProfilePage.tsx)
  - Memastikan seluruh kartu, tombol, dan bento container mengikuti standar squircle `rounded-[28px]`.

---

## Tasks

### Task 1: Integrasi Peran Tenant ke InternalLayout & Navigasi Aside Rail

**Files:**
- Modify: `frontend/src/components/layout/InternalLayout.tsx:28-85`
- Modify: `frontend/src/components/layout/SuperAdminRailAside.tsx:1-150`

- [ ] **Step 1: Modifikasi InternalLayout.tsx**
Perluas kondisi peran agar mencakup `tenant`:
```tsx
// frontend/src/components/layout/InternalLayout.tsx
const isUnifiedRole = user?.role === 'admin' || user?.role === 'admin-food-court' || user?.role === 'tenant'

if (isUnifiedRole) {
  // Render aside dock + header + bento container
}
```
Dan sesuaikan badge peran di header judul:
```tsx
<span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#0a0a0a] text-[#ffffff] font-semibold">
  {user?.role === 'admin-food-court' ? 'FOOD COURT MANAGER' : user?.role === 'tenant' ? 'TENANT PARTNER' : 'SUPER ADMIN'}
</span>
```

- [ ] **Step 2: Tambahkan Navigasi Khusus Tenant pada SuperAdminRailAside.tsx**
Import ikon `ChefHat` dari `lucide-react`. Buat array `tenantNavItems` yang rapi:
```tsx
const isTenant = user?.role === 'tenant'

const tenantNavItems = [
  {
    to: '/app/dashboard',
    label: 'Ringkasan Omzet Gerai',
    icon: LayoutDashboard,
    isActive: location.pathname === '/app/dashboard' || location.pathname === '/dashboard',
  },
  {
    to: '/app/tenant/kds',
    label: 'Layar Dapur (KDS)',
    icon: ChefHat,
    isActive: location.pathname.startsWith('/app/tenant/kds'),
  },
  {
    to: '/app/tenant/menus',
    label: 'Katalog Menu & Stok',
    icon: UtensilsCrossed,
    isActive: location.pathname.startsWith('/app/tenant/menus'),
  },
  {
    to: '/app/categories',
    label: 'Kategori Menu Gerai',
    icon: FolderKanban,
    isActive: location.pathname.startsWith('/app/categories'),
  },
  {
    to: '/app/admin/orders',
    label: 'Rekap Pesanan Masuk',
    icon: Calendar,
    isActive: location.pathname.startsWith('/app/admin/orders'),
  },
  {
    to: '/app/admin/tables',
    label: 'Status Meja Cabang',
    icon: Layers,
    isActive: location.pathname.startsWith('/app/admin/tables'),
  },
  {
    to: '/app/tenant/profile',
    label: 'Profil & Operasional Kios',
    icon: Store,
    isActive: location.pathname.startsWith('/app/tenant/profile'),
  },
  {
    to: '/app/profile',
    label: 'Pengaturan Akun Pengguna',
    icon: Settings,
    isActive: location.pathname.startsWith('/app/profile'),
  },
]
```

- [ ] **Step 3: Uji Build Frontend**
Jalankan `bun run build` di direktori `frontend`.
Ekspektasi: Pass (exit code 0).

---

### Task 2: Penyesuaian SuperAdminHeader untuk Tenant Context

**Files:**
- Modify: `frontend/src/components/layout/SuperAdminHeader.tsx:25-150`

- [ ] **Step 1: Ambil Data Kios untuk Tenant**
Di `SuperAdminHeader.tsx`, jika `user?.role === 'tenant'`, panggil `GET /api/tenants/mine` untuk mendapatkan nama kios, nomor stan, dan nama food court tempat bernaung.
```tsx
const isTenant = user?.role === 'tenant'
const [tenantInfo, setTenantInfo] = useState<any>(null)

useEffect(() => {
  if (isTenant) {
    const token = getToken()
    apiFetch<{ data: any }>('/api/tenants/mine', { token: token || undefined })
      .then((res) => { if (res?.data) setTenantInfo(res.data) })
      .catch((err) => console.warn('Gagal memuat tenant info:', err))
  }
}, [isTenant])
```

- [ ] **Step 2: Tampilkan Pill Konteks Kios di Header**
Gantikan dropdown filter cabang dengan pill stan kios ketika user adalah tenant:
```tsx
{isTenant ? (
  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a] shadow-xs ml-1 sm:ml-2">
    <Store className="w-3.5 h-3.5 text-[#10b981]" />
    <span className="truncate max-w-[160px] sm:max-w-[240px]">
      {tenantInfo?.stallNumber ? `${tenantInfo.stallNumber} - ` : ''}{tenantInfo?.name || 'Kios Mitra'}
    </span>
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
      tenantInfo?.isOpen !== false ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-neutral-600 bg-neutral-100 border-neutral-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tenantInfo?.isOpen !== false ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
      {tenantInfo?.isOpen !== false ? 'Buka' : 'Tutup'}
    </span>
  </div>
) : isFoodCourtManager ? ( ... ) : ( ... )}
```
Dan sesuaikan sub-judul brand:
```tsx
<span className="text-[10px] font-mono text-[#737373] leading-none">
  {isTenant ? 'Tenant Partner' : isFoodCourtManager ? 'Food Court Manager' : 'Super Admin Management'}
</span>
```

- [ ] **Step 3: Uji Build Frontend**
Jalankan `bun run build`. Ekspektasi: Berhasil tanpa error tipe.

---

### Task 3: Dashboard Khusus Peran Tenant di DashboardPage.tsx

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx:35-300`

- [ ] **Step 1: Data Fetching Khusus Tenant**
Di `DashboardPage.tsx`, periksa `user?.role === 'tenant'`. Jika peran tenant:
- Jangan panggil `/api/food-courts` atau `/api/tenants` global (keduanya akan 403 Forbidden).
- Panggil `GET /api/tenants/mine`, `GET /api/orders`, `GET /api/menus/`, dan `GET /api/tables`.
- Hitung metrik spesifik tenant:
  1. **Total Omzet Stan**: Penjumlahan subtotal pesanan stan dari `orders` (menggunakan `tenantOrders.subtotal`).
  2. **Antrean Dapur Aktif**: Pesanan dengan status `QUEUED` atau `PREPARING`.
  3. **Pesanan Selesai**: Pesanan dengan status `COMPLETED`.
  4. **Katalog Menu Aktif**: Jumlah menu dengan status `AVAILABLE` vs total menu.

- [ ] **Step 2: Render Bento Cards Khusus Tenant**
Ketika `isTenant`, tampilkan kartu ringkasan bento yang relevan untuk pemilik gerai:
- Kartu Saldo / Omzet Penjualan Stan dengan tombol pintas ke rekap pesanan.
- Kartu Antrean Dapur Langsung dengan tombol loncat ke Layar Dapur KDS (`/app/tenant/kds`).
- Kartu Menu & Ketersediaan Stok dengan tombol tambah menu baru.
- Kartu Status Operasional Kios (Buka / Tutup) dengan tombol kelola jam buka di Profil Kios.
- Tabel 5 Pesanan Terakhir yang masuk ke stan dengan status cooking dan nomor meja/takeaway.

- [ ] **Step 3: Uji Build Frontend**
Jalankan `bun run build`. Ekspektasi: Build sukses 100%.

---

### Task 4: Akses RBAC & Proteksi Rute Tenant di App.tsx dan Halaman Terkait

**Files:**
- Modify: `frontend/src/App.tsx:120-160`
- Modify: `frontend/src/pages/admin/AdminOrdersPage.tsx:50-70`
- Modify: `frontend/src/pages/admin/AdminTablesPage.tsx:40-80`

- [ ] **Step 1: Buka Akses RoleGuard untuk Tenant pada Orders & Tables**
Berdasarkan `backend/README.md`:
```tsx
// frontend/src/App.tsx
<Route
  path="/app/admin/orders"
  element={
    <RoleGuard allowedRoles={['admin-food-court', 'admin', 'tenant']}>
      <AdminOrdersPage />
    </RoleGuard>
  }
/>
<Route
  path="/app/admin/tables"
  element={
    <RoleGuard allowedRoles={['admin-food-court', 'admin', 'tenant']}>
      <AdminTablesPage />
    </RoleGuard>
  }
/>
```

- [ ] **Step 2: Sesuaikan Judul & Kontrol di AdminOrdersPage.tsx**
Jika `user?.role === 'tenant'`, sesuaikan judul:
- Judul: *"Rekap Pesanan Gerai"*
- Subtitle: *"Pantau seluruh pesanan yang masuk ke stan kuliner Anda, status pembayaran, dan riwayat meja"*
- Filter status pesanan tetap berfungsi presisi.

- [ ] **Step 3: Sesuaikan AdminTablesPage.tsx untuk Mode Read-Only Tenant**
Tenant berhak melihat denah dan ketersediaan meja cabang (`GET /api/tables`), namun tidak memiliki hak untuk menambah (`POST`), mengubah (`PUT`), atau menghapus (`DELETE`) meja.
- Sembunyikan tombol `+ Tambah Meja Baru`, tombol `Edit Meja`, tombol `Hapus Meja`, dan tombol `Regenerate QR` jika `user?.role === 'tenant'`.
- Tampilkan badge status meja ("Tersedia" / "Terisi" / "Nonaktif") secara elegan.

- [ ] **Step 4: Uji Build Frontend**
Jalankan `bun run build`. Ekspektasi: Berhasil 100%.

---

### Task 5: Polishing Visual Halaman KDS, Menu, dan Profil Kios

**Files:**
- Modify: `frontend/src/pages/tenant/KitchenDisplayPage.tsx`
- Modify: `frontend/src/pages/tenant/TenantMenusPage.tsx`
- Modify: `frontend/src/pages/tenant/TenantProfilePage.tsx`

- [ ] **Step 1: Selaraskan KitchenDisplayPage.tsx**
- Pastikan kartu tiket KDS menggunakan radius `rounded-[24px]` / `rounded-[28px]` dengan border `#e5e5e5`.
- Kolom kanban Dapur (Menunggu / Dimasak / Siap) terbungkus rapi dalam kontainer bento dengan counter badge yang modern.

- [ ] **Step 2: Selaraskan TenantMenusPage.tsx**
- Menggunakan 4 kartu bento metrik di bagian atas: Total Menu Gerai, Menu Tersedia, Menu Habis, Total Kategori.
- Grid katalog sajian dan dialog tambah/edit menu seragam dengan `SuperAdminMenusPage`.

- [ ] **Step 3: Selaraskan TenantProfilePage.tsx**
- Form profil gerai dikelompokkan ke dalam 2 kartu bento: Informasi Kios & Kontak, dan Pengaturan Jam Buka/Tutup Operasional.
- Sakelar toggle status gerai `isOpen` jelas dan responsif.

- [ ] **Step 4: Uji Build & Validasi Akhir**
Jalankan `bun run build`. Pastikan output dist bersih dan tidak ada peringatan TypeScript.

---

## Verification Plan

### Automated Tests
1. **Frontend Compilation & Typecheck**:
   ```bash
   cd frontend
   bun run build
   ```
   *Ekspektasi*: Exit code 0, 0 errors, bundling sukses.

### Manual Verification
1. **Login Sesi Tenant**:
   - Login menggunakan akun tenant (contoh: `siti@rawon.com` / `password123` atau akun tenant terdaftar).
   - Pastikan layout bento `#f3f4f6` langsung aktif dengan Aside Rail Dock di sebelah kiri dan Header modern di atas.
2. **Navigasi Aside Rail**:
   - Periksa 8 menu navigasi: Ringkasan Omzet, Layar Dapur (KDS), Katalog Menu, Kategori Menu, Rekap Pesanan, Status Meja, Profil Kios, Pengaturan Akun.
   - Klik setiap menu dan pastikan status ikon aktif menyala gelap (`bg-[#0a0a0a] text-white`).
3. **Pill Konteks Gerai di Header**:
   - Verifikasi header menampilkan nomor stan dan nama kios milik tenant beserta indikator status `Buka`/`Tutup`.
4. **Halaman Orders & Tables**:
   - Buka `/app/admin/orders`: Pastikan hanya menampilkan pesanan yang masuk ke kiosnya.
   - Buka `/app/admin/tables`: Pastikan hanya melihat meja cabang tanpa tombol aksi tambah/edit (read-only).
5. **Layar Dapur KDS**:
   - Buka `/app/tenant/kds`: Pastikan tiket antrean tampil responsif dan aksi ganti status masak dapur berfungsi lancar.
