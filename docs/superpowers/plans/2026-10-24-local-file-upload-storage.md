# Rencana Implementasi: Local Storage File Upload (Maksimal 1 MB)

> **Untuk Agentic Workers:** REQUIRED SUB-SKILL: Gunakan superpowers:executing-plans untuk mengimplementasikan plan ini langkah demi langkah (task-by-task). Setiap langkah menggunakan checkbox (`- [ ]`) untuk pemantauan progres.

**Tujuan:** Mengimplementasikan fitur penyimpanan file gambar lokal (Local Storage) di server backend Bun + ElysiaJS dengan pembatasan ketat 1 MB (1.048.576 bytes) baik di sisi client (Frontend pre-validation) maupun server (Backend validation), disertai mitigasi celah keamanan (Path Traversal, File Hijacking, MIME spoofing), dan integrasi komponen upload visual ke seluruh form terkait (Menu, Gerai, Food Court).

**Arsitektur:** Menggunakan native `Bun.write()` untuk I/O file penyimpanan super cepat dan `Bun.file()` untuk streaming static serving gambar publik. Frontend menyediakan komponen reusable `<ImageUploadInput />` dengan deteksi instan ukuran file sebelum upload dimulai, live preview thumbnail bento squircle, dan opsi beralih ke input URL manual.

**Tech Stack:** Bun runtime, ElysiaJS, TypeBox validation, React (TypeScript), TailwindCSS, Lucide Icons.

---

## Global Constraints

- **Batas Ukuran File:** Maksimal **1 MB** (1.048.576 Bytes). File > 1 MB **HARUS** ditolak langsung di browser (FE) sebelum terkirim ke server, dan **HARUS** divalidasi ulang di backend (BE).
- **Format Gambar yang Diizinkan:** Hanya `image/jpeg` (`.jpg`, `.jpeg`), `image/png` (`.png`), dan `image/webp` (`.webp`).
- **Penyimpanan:** Disimpan di direktori lokal backend `./uploads/{folder}/{filename}`.
- **Keamanan:**
  - Nama file klien tidak boleh dipakai mentah-mentah (wajib diganti dengan `timestamp + UUID`).
  - Proteksi Path Traversal pada endpoint static file serving (`GET /uploads/*`).
  - Header HTTP `X-Content-Type-Options: nosniff` saat serving file.
  - Endpoint upload `POST /api/upload` wajib memerlukan autentikasi (`requireAuth`).

---

## File Structure

### Backend
- **[NEW]** `backend/modules/upload/service.ts`: Logika penyimpanan file disk, pembuatan direktori rekursif, sanitasi nama file unik, dan pembuatan URL akses.
- **[NEW]** `backend/modules/upload/index.ts`: Controller ElysiaJS untuk `POST /api/upload` (terproteksi auth) dan `GET /uploads/*` (publik static file stream).
- **[MODIFY]** `backend/index.ts`: Mendaftarkan `uploadController` ke dalam pipeline instance Elysia.
- **[MODIFY]** `backend/.gitignore`: Menambahkan folder `uploads/` dan `backend/uploads/` agar aset testing tidak mengotori repositori git.
- **[MODIFY]** `backend/README.md`: Menambahkan dokumentasi spesifikasi endpoint `POST /api/upload` dan `GET /uploads/*`.

### Frontend
- **[NEW]** `frontend/src/components/ui/ImageUploadInput.tsx`: Komponen UI dropzone/file picker gambar reusable dengan deteksi ukuran file < 1 MB di FE, status loading, live thumbnail preview, dan tombol hapus/ganti.
- **[MODIFY]** `frontend/src/components/tenant/MenuFormDialog.tsx`: Mengganti input URL teks manual dengan `<ImageUploadInput folder="menus" />`.
- **[MODIFY]** `frontend/src/pages/superadmin/SuperAdminMenusPage.tsx`: Mengganti input URL teks menu di form modal Super Admin dengan `<ImageUploadInput folder="menus" />`.
- **[MODIFY]** `frontend/src/pages/tenant/TenantProfilePage.tsx`: Mengganti input URL logo kios dengan `<ImageUploadInput folder="tenants" />`.
- **[MODIFY]** `frontend/src/components/admin/TenantFormDialog.tsx`: Mengganti input URL logo stan di modal admin dengan `<ImageUploadInput folder="tenants" />`.
- **[MODIFY]** `frontend/src/components/superadmin/FoodCourtDialog.tsx`: Mengganti input URL logo cabang dengan `<ImageUploadInput folder="food-courts" />`.

---

## Rincian Fitur yang Memerlukan Upload File

```
+----------------------------------------------------------------------------------------------------+
| No | Fitur / Entitas         | Halaman FE                  | Field DB           | Target Folder    |
+----------------------------------------------------------------------------------------------------+
| 1  | Foto Menu Makanan       | /app/tenant/menus           | menus.imageUrl     | uploads/menus    |
|    |                         | /app/super-admin/menus      |                    |                  |
+----------------------------------------------------------------------------------------------------+
| 2  | Logo / Foto Gerai Kios  | /app/tenant/profile         | tenants.logo       | uploads/tenants  |
|    |                         | /app/super-admin/tenants    |                    |                  |
+----------------------------------------------------------------------------------------------------+
| 3  | Logo Cabang Food Court  | /app/super-admin/food-courts| food_courts.logo   | uploads/food-courts|
+----------------------------------------------------------------------------------------------------+
```

---

## Analisis Celah Keamanan & Mitigasi

1. **Path Traversal Attack (`../../etc/passwd`):**
   - *Risiko:* Penyerang meminta `GET /uploads/../../config/env.ts` untuk mencuri secret database / JWT.
   - *Mitigasi:* Menggunakan `path.resolve()` dan memastikan path file akhir diawali dengan path folder `./uploads` (`resolvedPath.startsWith(uploadRootDir)`). Jika melenceng, langsung return 403 Forbidden.
2. **File Execution / Web Shell (`malicious.php`, `script.sh`):**
   - *Risiko:* Penyerang mengunggah file berbahaya yang dieksekusi server.
   - *Mitigasi:*
     - Nama file klien diabaikan. Nama file selalu di-generate acak: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${whitelistedExt}`.
     - Ekstensi di-whitelist ketat: hanya `jpg`, `jpeg`, `png`, `webp`.
     - File disajikan sebagai binary statis dengan `Bun.file()` dan header `X-Content-Type-Options: nosniff`.
3. **DoS / Memory Exhaustion:**
   - *Risiko:* Penyerang mengunggah file 100 MB untuk menghabiskan RAM / disk server.
   - *Mitigasi:*
     - Validasi client-side memutus proses sebelum file dikirim.
     - TypeBox schema membatasi `maxSize: 1048576` (1 MB).
     - Handler controller memeriksa `file.size > 1048576` dan langsung melempar `BadRequestError`.

---

## Rencana Tugas (Task Decomposition)

### Task 1: Backend Service & Sanitasi Path File Lokal
**Files:**
- Create: `backend/modules/upload/service.ts`
- Modify: `backend/.gitignore`

- [ ] **Langkah 1.1**: Buat helper `localUploadService` di `backend/modules/upload/service.ts`:
  - Validasi direktori target (`uploads/menus`, `uploads/tenants`, `uploads/food-courts`).
  - Ekstrak dan whitelist ekstensi file (`jpg`, `jpeg`, `png`, `webp`).
  - Generate nama unik: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`.
  - Tulis file menggunakan `await Bun.write(targetPath, file)`.
  - Kembalikan objek `{ url, filename, size, mimeType }`.
- [ ] **Langkah 1.2**: Tambahkan `backend/uploads/` dan `uploads/` ke `.gitignore`.

---

### Task 2: Backend Upload Controller & Static File Serving
**Files:**
- Create: `backend/modules/upload/index.ts`
- Modify: `backend/index.ts`
- Modify: `backend/README.md`

- [ ] **Langkah 2.1**: Buat `uploadController` di `backend/modules/upload/index.ts`:
  - `POST /api/upload`: Proteksi dengan `requireAuth(user)`.
  - Validasi ketat TypeBox: `t.File({ maxSize: 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] })`.
  - Validasi runtime `file.size > 1048576` ➔ lempar `BadRequestError("Ukuran file melebihi batas maksimal 1 MB")`.
  - Format respon seragam `{ message: "...", data: { url, filename, size, mimeType } }`.
  - `GET /uploads/*`: Public endpoint. Validasi path traversal dengan `path.resolve` dan `startsWith(uploadDir)`. Kembalikan `Bun.file(filePath)` dengan header keamanan.
- [ ] **Langkah 2.2**: Daftarkan `uploadController` ke `app` di `backend/index.ts`.
- [ ] **Langkah 2.3**: Perbarui `backend/README.md` dengan dokumentasi endpoint upload.

---

### Task 3: Komponen Frontend `<ImageUploadInput />` dengan Pre-Validation 1 MB
**Files:**
- Create: `frontend/src/components/ui/ImageUploadInput.tsx`

- [ ] **Langkah 3.1**: Buat komponen `ImageUploadInput.tsx` dengan fitur:
  - Props: `value` (string), `onChange` (url: string), `folder` ('menus' | 'tenants' | 'food-courts'), `label`, `error`, `disabled`.
  - Deteksi instan sebelum upload:
    - Jika `file.size > 1 * 1024 * 1024` ➔ Batalkan, tampilkan alert/toast error: *"Ukuran file melebihi batas maksimal 1 MB (Terdeteksi X.XX MB). Silakan pilih file yang lebih kecil."*
    - Jika format bukan `image/jpeg`, `image/png`, `image/webp` ➔ Batalkan, tampilkan error format.
  - Menampilkan live thumbnail preview (`rounded-[18px]` bento style).
  - Indikator loading "Mengunggah..." saat proses request berlangsung.
  - Tombol hapus/ganti gambar.
  - Tab opsi beralih ke "Input URL Manual" agar URL eksternal tetap dapat digunakan secara fleksibel.

---

### Task 4: Integrasi Form Menu Makanan (Tenant & Super Admin)
**Files:**
- Modify: `frontend/src/components/tenant/MenuFormDialog.tsx`
- Modify: `frontend/src/pages/superadmin/SuperAdminMenusPage.tsx`

- [ ] **Langkah 4.1**: Ganti input URL teks manual di `MenuFormDialog.tsx` dengan:
  ```tsx
  <ImageUploadInput
    label="Foto Sajian Menu"
    folder="menus"
    value={imageUrl}
    onChange={setImageUrl}
    error={errors.imageUrl}
    disabled={isLoading}
  />
  ```
- [ ] **Langkah 4.2**: Ganti input URL teks manual di modal tambah/edit menu Super Admin (`SuperAdminMenusPage.tsx`) dengan `<ImageUploadInput folder="menus" value={formImageUrl} onChange={setFormImageUrl} />`.

---

### Task 5: Integrasi Form Profil Kios & Cabang Food Court
**Files:**
- Modify: `frontend/src/pages/tenant/TenantProfilePage.tsx`
- Modify: `frontend/src/components/admin/TenantFormDialog.tsx`
- Modify: `frontend/src/components/superadmin/FoodCourtDialog.tsx`

- [ ] **Langkah 5.1**: Di `TenantProfilePage.tsx`, ganti input teks logo kios dengan `<ImageUploadInput folder="tenants" value={logo} onChange={setLogo} label="Foto / Logo Gerai" />`.
- [ ] **Langkah 5.2**: Di `TenantFormDialog.tsx`, integrasikan `<ImageUploadInput folder="tenants" value={logo} onChange={setLogo} label="Logo Gerai Stan" />`.
- [ ] **Langkah 5.3**: Di `FoodCourtDialog.tsx`, integrasikan `<ImageUploadInput folder="food-courts" value={logo} onChange={setLogo} label="Logo Cabang Food Court" />`.

---

### Task 6: Verifikasi End-to-End & Build
**Files:**
- Test backend: curl / fetch test untuk upload valid & invalid (> 1 MB, wrong type, path traversal).
- Test frontend: `bun run build`.

- [ ] **Langkah 6.1**: Jalankan pengujian request upload file valid (< 1 MB) dan verifikasi file tersimpan di `./uploads/menus/`.
- [ ] **Langkah 6.2**: Uji penolakan file > 1 MB (pastikan ditolak di client FE dan di server BE dengan pesan error jelas).
- [ ] **Langkah 6.3**: Uji keamanan path traversal pada `GET /uploads/../../`.
- [ ] **Langkah 6.4**: Jalankan `bun run build` di frontend untuk memastikan tidak ada TypeScript error (exit code 0).
- [ ] **Langkah 6.5**: Buat dan perbarui laporan ringkasan di `walkthrough.md`.

---

## Verifikasi Manual Pengguna

1. Buka formulir Tambah Menu (`/app/tenant/menus`).
2. Pilih file foto dengan ukuran **> 1 MB** ➔ Verifikasi bahwa sistem langsung memunculkan pesan error penolakan **sebelum** proses upload berlangsung.
3. Pilih file foto dengan ukuran **< 1 MB** ➔ Verifikasi gambar berhasil terunggah, thumbnail pratinjau muncul, dan menu berhasil disimpan dengan URL lokal `http://localhost:3000/uploads/menus/...`.
4. Buka halaman katalog menu / kartu tenant ➔ Verifikasi gambar tampil jernih di browser.
