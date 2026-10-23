# Desain Standardisasi Dashboard & Navigasi Admin Food Court

## 1. Latar Belakang & Tujuan
Menstandarisasi pengalaman visual dan fungsional peran **Admin Food Court** (`admin-food-court` / Manajer Cabang) agar setara dengan tampilan modern **Super Admin** yang mengacu pada [DESIGN.md](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/DESIGN.md) (aesthetic bento squircle radius `rounded-[28px]`, vertical sticky aside rail dock, floating header bar, dan canvas `#f3f4f6`).

Ruang lingkup Admin Food Court dirancang khusus untuk mengelola **satu cabang food court miliknya sendiri** (`managerId = user.id`), sesuai batasan RBAC di [backend/README.md](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/README.md).

---

## 2. Arsitektur Navigasi & Shell UI

### A. Role-Aware Aside Rail Dock (`AdminRailAside` / `FoodCourtAdminRailAside`)
Komponen vertikal floating dock di sisi kiri layar dengan spesifikasi:
- Ukuran lebar `w-14`, posisi `sticky top-6 h-[calc(100vh-3rem)] self-start z-30`.
- Kontainer `p-2 rounded-[28px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs`.
- 8 Item Navigasi Berdasarkan Rute Admin Food Court:
  1. `LayoutDashboard` ➔ `/app/dashboard` (Ringkasan Dashboard Cabang)
  2. `Building` ➔ `/app/admin/food-court` (Kelola Profil Cabang Saya)
  3. `Store` ➔ `/app/admin/tenants` (Daftar & Registrasi Stan Tenant Cabang)
  4. `UtensilsCrossed` ➔ `/app/super-admin/menus` (Katalog Menu Tenant Cabang)
  5. `Calendar` ➔ `/app/admin/orders` (Monitoring Seluruh Pesanan Cabang)
  6. `FileText` ➔ `/app/admin/payments` (Rekap Pembayaran & Settlement)
  7. `Layers` ➔ `/app/admin/tables` (Manajemen Meja QR Cabang)
  8. `Settings` ➔ `/app/profile` (Pengaturan Akun Manajer)
- Bagian bawah: Tombol Bantuan Swagger & Tombol Logout.

### B. Top Floating App Bar (`SuperAdminHeader` / `AdminHeader`)
- **Identitas**: Logo squircle emerald `FC` + `Amici Food Court` + subjudul label `Food Court Manager`.
- **Branch Context**: Menampilkan nama cabang yang dikelola (contoh: `Amici Food Court Grand City`) dengan badge status cabang aktif `● Cabang Aktif`. Tidak menampilkan dropdown filter lintas cabang global.
- **Cluster Kanan**: Tombol pencarian, notifikasi lonceng, status sistem, dan `HeaderProfilePill`.

---

## 3. Sentralisasi Melalui `InternalLayout.tsx`
`InternalLayout.tsx` diperluas untuk mengenali `user?.role === 'admin-food-court'`:
1. Menerapkan kanvas `#f3f4f6` dengan struktur responsif `p-3 sm:p-5 lg:p-6 gap-5`.
2. Menyajikan rail dock aside yang sesuai peran (`admin-food-court` vs `admin`).
3. Menampilkan top header seragam dengan label cabang yang dikelola.
4. Mendukung drawer navigasi mobile `< lg`.

Halaman yang otomatis terstandardisasi:
- `/app/admin/food-court` (Profil Cabang)
- `/app/admin/tenants` (Stan Tenant Cabang)
- `/app/admin/tables` (Meja QR Cabang)
- `/app/admin/orders` (Pesanan Cabang)
- `/app/admin/payments` (Rekap Pembayaran Cabang)
- `/app/super-admin/menus` (Katalog Menu Cabang)
- `/app/profile` (Profil Akun Manajer)

---

## 4. Transformasi Dashboard Bento (`DashboardPage.tsx`)
Pada `/app/dashboard`, data backend diambil secara otomatis sesuai hak akses:
- `GET /api/food-courts` ➔ 1 cabang milik manajer.
- `GET /api/tenants` ➔ Stan tenant di cabang tersebut.
- `GET /api/tables` ➔ Meja di cabang tersebut.
- `GET /api/orders` ➔ Pesanan di cabang tersebut.

**Komposisi Bento Grid (2 Kolom 7:5):**
- **Kolom Kiri (7 cols):**
  1. Kartu Total Omzet Cabang (Nominal Rupiah, status mata uang, tren).
  2. Quick Operations Action Bar (4 tombol navigasi cepat).
  3. Grafik Tren Penjualan Bulanan Cabang (Recharts bar chart).
  4. Tabel Stan Tenant di Cabang Saya (Nama stan, nomor kios, status buka/tutup, omzet).
- **Kolom Kanan (5 cols):**
  5. Kartu Detail & Status Operasional Cabang Saya.
  6. Okupansi Meja Makan Cabang (Kapasitas & persentase terisi).
  7. Feed Pesanan & Aktivitas Transaksi Terbaru di Cabang.

---

## 5. Rencana Verifikasi
1. **Pemeriksaan Tipe & Build**: Menjalankan `bun run build` di direktori `frontend` (harus exit code 0).
2. **Pengujian Peran Ganda**:
   - Login sebagai `admin@foodcourt.com` (Super Admin): Melihat seluruh cabang dan dropdown filter global.
   - Login sebagai `manager@foodcourt.com` (Admin Food Court): Melihat khusus cabangnya (*Grand City*), menu navigasi cabang, dan data scoped.
