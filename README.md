# Amici Food Court Management System

Platform pemesanan dan manajemen operasional Food Court modern berbasis QR Code dan Multi-Tenant, lengkap dengan frontend web app (React + Vite + TailwindCSS) dan backend API performa tinggi (ElysiaJS + Bun + Drizzle ORM + MySQL).

---

## 🚀 Quick Start

### 1. Backend API
```bash
cd backend
bun install
bun run db:push
bun run seed   # Mengisi database dengan akun pengujian & data sampel
bun run dev    # Berjalan di http://localhost:3000
```
- **Swagger UI**: [http://localhost:3000/swagger](http://localhost:3000/swagger)

### 2. Frontend Web App
```bash
cd frontend
bun install
bun run dev    # Berjalan di http://localhost:5173
```
- **Halaman Login**: [http://localhost:5173/login](http://localhost:5173/login)
- **Dashboard Super Admin**: [http://localhost:5173/app/dashboard](http://localhost:5173/app/dashboard)

---

## 🔑 Akun Pengujian Seeder (Demo Credentials)

Seluruh akun default hasil seeding menggunakan kata sandi yang sama: **`password123`**.

| Role | Nama Pengguna | Email Login | Kata Sandi | Lingkup Hak Akses / Akses Fitur |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** (`admin`) | Super Admin Amici | `admin@foodcourt.com` | `password123` | Akses penuh global: cabang food court, seluruh stan kios, katalog menu global, meja QR, dan rekap pembayaran |
| **Admin Food Court** (`admin-food-court`) | Manajer Grand City | `manager@foodcourt.com` | `password123` | Mengelola cabang spesifik (*Amici Food Court Grand City*), meja cabang, dan stan kios di cabangnya |
| **Tenant** (`tenant`) | Ibu Siti (Warung Rawon) | `tenant@foodcourt.com` | `password123` | Mengelola stan (*Warung Rawon Bu Siti* / STAN-A01), kategori menu, stok menu, dan antrean pesanan dapur |
| **Customer** (`customer`) | Rizky Ramadhan | `customer@foodcourt.com` | `password123` | Pengunjung/pembeli. Scan QR meja, gabung sesi meja, pesan makanan lintas stan, dan checkout Midtrans |

---

## 🍽️ Data Sampel Seeder

- **Cabang**: `Amici Food Court Grand City` (`fc-grand-city-001`)
- **Stan Tenant**: `Warung Rawon Bu Siti` (Stan `STAN-A01`, `tnt-rawon-siti-001`)
- **Meja QR**:
  - `T-01` (Token QR: `QR-MEJA-T01-SURABAYA`, Kapasitas 4)
  - `T-02` (Token QR: `QR-MEJA-T02-SURABAYA`, Kapasitas 6)
- **Menu Sampel**:
  - `Rawon Daging Spesial` (Rp 32.000)
  - `Es Teh Manis Segar` (Rp 5.000)

---

## 📚 Dokumentasi Lengkap

- Dokumentasi API Backend & Matriks Endpoint RBAC: [`backend/README.md`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/backend/README.md)
- Design System & Guideline UI/UX: [`DESIGN.md`](file:///c:/Users/Nanda/Documents/Kuliah/Backend/food-court-api/DESIGN.md)
