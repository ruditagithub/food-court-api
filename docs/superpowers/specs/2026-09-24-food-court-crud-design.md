# Spesifikasi Desain: CRUD Food Court & Role Admin Food Court

- **Tanggal**: 2026-09-24
- **Status**: Disetujui
- **Topik**: Penambahan Modul CRUD Food Court, Pendaftaran Food Court Mandiri, dan Role `admin-food-court`

---

## 1. Ringkasan & Tujuan

Dokumen ini mendefinisikan spesifikasi untuk penambahan modul **Food Court CRUD** dan alur registrasi bertahap (*two-step registration*) bagi pengelola Food Court. Pengelola akan memiliki role baru yaitu `admin-food-court` yang berwenang mendaftarkan food court, mengelola data food court miliknya, serta mengelola stan/tenant dan meja makan yang bernaung di bawah food court tersebut.

---

## 2. Pembaruan Skema Database

### 2.1. Tabel `users`
Pembaruan enum `role` untuk menambahkan peran pengelola food court:
```typescript
mysqlEnum("role", ["admin", "admin-food-court", "tenant", "customer"])
```
- **`admin`**: Superadmin platform (akses penuh global ke semua entitas).
- **`admin-food-court`**: Pengelola Food Court tertentu.
- **`tenant`**: Pengelola gerai/stan makanan.
- **`customer`**: Pengunjung/pembeli.

### 2.2. Tabel `food_courts`
Penambahan kolom relasi `manager_id` (foreign key ke `users.id`):
```typescript
managerId: varchar("manager_id", { length: 36 })
  .references(() => users.id, { onDelete: "set null" }),
```
- Menghubungkan Food Court dengan user `admin-food-court` yang mendaftarkannya.
- Relasi Drizzle:
  - `foodCourts.manager -> one(users)`
  - `users.managedFoodCourts -> many(foodCourts)`

---

## 3. Matriks Hak Akses & Spesifikasi Endpoint (`/api/food-courts`)

Seluruh endpoint di bawah `/api/food-courts` diproteksi secara ketat:

| HTTP Method | Path | Role Akses | Keterangan & Perilaku |
|---|---|---|---|
| `POST` | `/api/food-courts` | `admin-food-court`, `admin` | **Daftar Food Court**: Mendaftarkan data profil food court baru. Field `managerId` otomatis diisi `user.id` dari token pemanggil. |
| `GET` | `/api/food-courts` | `admin-food-court`, `admin` | **List Food Court**: <br>- Jika pemanggil adalah `admin-food-court`, hanya mengembalikan data food court miliknya.<br>- Jika pemanggil adalah `admin`, mengembalikan daftar seluruh food court. |
| `GET` | `/api/food-courts/:id` | `admin` | **Detail Food Court**: Melihat informasi lengkap spesifik food court berdasarkan ID (khusus `admin`). |
| `PUT` | `/api/food-courts/:id` | `admin-food-court`, `admin` | **Update Food Court**: Memperbarui nama, alamat, telepon, logo, atau status. `admin-food-court` hanya dapat mengupdate food court miliknya. |
| `DELETE` | `/api/food-courts/:id` | `admin` | **Hapus / Nonaktifkan**: Mengubah status menjadi `INACTIVE` atau menghapus record food court (khusus `admin`). |

*(Catatan: Endpoint `/my` ditiadakan sesuai spesifikasi; query pada `GET /api/food-courts` otomatis menyesuaikan berdasarkan token context).*

---

## 4. Alur Kerja (User Journey)

1. **Langkah 1: Registrasi Akun Manajer**:
   - Pengguna mendaftar melalui `POST /api/auth/register` dengan `role: "admin-food-court"`.
   - Pengguna login melalui `POST /api/auth/login` untuk memperoleh JWT token dengan payload role `admin-food-court`.

2. **Langkah 2: Pendaftaran Profil Food Court**:
   - Manajer memanggil `POST /api/food-courts` menyertakan JWT token.
   - Sistem memvalidasi payload (`name`, `slug`, `address`, `phone`, `logo`) dan menyimpan record dengan `manager_id = user.id`.

3. **Langkah 3: Pengelolaan Stan Tenant & Meja**:
   - `admin-food-court` dapat memanggil `POST /api/tenants` dan `POST /api/tables` dengan cakupan otomatis terikat pada `food_court_id` miliknya.

---

## 5. DTO & Validasi Data (TypeBox)

```typescript
// CreateFoodCourtDTO
export const CreateFoodCourtDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 150, default: "Grand Food Market" }),
  slug: t.Optional(t.String({ minLength: 2, maxLength: 150 })),
  address: t.Optional(t.String({ default: "Jl. Sudirman No. 10" })),
  phone: t.Optional(t.String({ maxLength: 30, default: "08123456789" })),
  logo: t.Optional(t.String({ maxLength: 255 })),
});

// UpdateFoodCourtDTO
export const UpdateFoodCourtDTO = t.Partial(CreateFoodCourtDTO);
```

---

## 6. Rencana Pengujian

1. **Unit & Integration Test** (`test/food_courts.test.ts`):
   - Mendaftarkan user dengan role `admin-food-court`.
   - Menguji `POST /api/food-courts` oleh `admin-food-court` (berhasil).
   - Menguji pencegahan akses oleh role `customer` atau `tenant` (harus `403 Forbidden`).
   - Menguji `GET /api/food-courts` (hanya menampilkan food court milik manajer tersebut).
   - Menguji `GET /api/food-courts/:id` hanya bisa diakses oleh `admin`.
   - Menguji `PUT /api/food-courts/:id` oleh pemilik dan penolakan jika diakses oleh manajer food court lain.
