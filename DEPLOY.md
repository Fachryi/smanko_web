# 🚀 Panduan Deployment SMANKO Web App

> Panduan lengkap untuk men-deploy aplikasi SMANKO ke server hosting.  
> Aplikasi ini terdiri dari **Frontend (React/Vite)** + **Backend (PHP)** + **Database (MySQL)**.

---

## 📋 Daftar Isi

- [Prasyarat](#-prasyarat)
- [Langkah 1: Build Frontend](#-langkah-1-build-frontend)
- [Langkah 2: Siapkan Database](#-langkah-2-siapkan-database)
- [Langkah 3: Konfigurasi Backend](#-langkah-3-konfigurasi-backend)
- [Opsi A: InfinityFree (Gratis)](#-opsi-a-infinityfree-gratis)
- [Opsi B: Niagahoster / Rumahweb (Berbayar)](#-opsi-b-niagahoster--rumahweb-berbayar)
- [Opsi C: Railway (Modern, Gratis Terbatas)](#-opsi-c-railway-modern)
- [Troubleshooting](#-troubleshooting)

---

## ✅ Prasyarat

Pastikan tools berikut sudah tersedia di komputer Anda:

| Tool | Versi | Cek |
|------|-------|-----|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Git | ≥ 2 | `git --version` |

---

## 📦 Langkah 1: Build Frontend

Setiap kali ada perubahan kode, Anda harus melakukan build ulang sebelum upload.

```bash
# Masuk ke folder proyek
cd C:\xampp\htdocs\smanko_web

# Install dependencies (hanya pertama kali)
npm install

# Build untuk produksi
npm run build
```

✅ Setelah selesai, folder **`dist/`** akan terbentuk. Folder inilah yang akan di-upload ke server.

---

## 🗄️ Langkah 2: Siapkan Database

### Import Schema

1. Buka **phpMyAdmin** di hosting Anda
2. Buat database baru (catat namanya)
3. Klik tab **Import**
4. Pilih file: `api/database/schema.sql`
5. Klik **Go / Kirim**

### (Opsional) Import Data Contoh

Jika ingin data dummy sudah terisi:
1. Setelah schema ter-import, buka file `api/database/complete_tables.sql`
2. Import file tersebut juga

---

## ⚙️ Langkah 3: Konfigurasi Backend

Edit file `api/config/database.php` sesuai kredensial hosting Anda:

```php
<?php
define('DB_HOST', 'localhost');        // ← host database dari hosting
define('DB_NAME', 'nama_database');    // ← nama database yang dibuat
define('DB_USER', 'nama_user_db');     // ← username database
define('DB_PASS', 'password_db');      // ← password database
define('DB_CHARSET', 'utf8mb4');
```

> ⚠️ **Jangan commit perubahan file ini ke GitHub!** File ini sudah ada di `.gitignore`.

---

## 🟢 Opsi A: InfinityFree (Gratis)

**Cocok untuk:** Demo / Testing / Portofolio  
**Kelebihan:** Gratis, mudah  
**Kekurangan:** Performa terbatas, ada iklan di subdomain

### A1. Daftar & Buat Hosting

1. Buka [https://infinityfree.com](https://infinityfree.com) → **Register**
2. Setelah login → **Create Account** → pilih subdomain bebas (misal: `smanko.infinityfreeapp.com`)
3. Tunggu akun aktif (biasanya < 5 menit)

### A2. Buat Database MySQL

1. Masuk ke **Client Area** → klik **cPanel** pada hosting Anda
2. Cari menu **MySQL Databases**
3. Isi nama database (misal: `smanko_db`) → klik **Create Database**
4. Buat user baru → beri password kuat → klik **Create User**
5. Tambahkan user ke database → centang **ALL PRIVILEGES** → klik **Make Changes**
6. Catat informasi berikut:
   - **Host**: biasanya `sqlXXX.epizy.com` (tertera di cPanel)
   - **Database name**: `epizXXXX_smanko_db`
   - **Username**: `epizXXXX_user`
   - **Password**: password yang Anda buat

### A3. Import Database

1. Di cPanel → buka **phpMyAdmin**
2. Pilih database Anda di panel kiri
3. Klik tab **Import** → pilih file `api/database/schema.sql` → klik **Go**

### A4. Edit Konfigurasi

Edit `api/config/database.php` dengan data dari langkah A2.

### A5. Upload File

1. Di cPanel → buka **File Manager**
2. Masuk ke folder `htdocs` (atau `public_html`)
3. Upload file-file berikut:

```
Struktur yang harus di-upload ke htdocs/:
│
├── index.html          ← dari folder dist/
├── assets/             ← dari folder dist/assets/
├── *.jpg, *.png        ← file di folder dist/ (logo, dll)
│
├── api/                ← folder api/ dari proyek
│   ├── config/
│   ├── master/
│   ├── penilaian/
│   ├── public/
│   ├── settings/
│   ├── helpers/
│   └── uploads/
│
└── public/             ← folder public/ dari proyek (logo cabor, dll)
    ├── logo-smanko.jpg
    └── logo-cabor/
```

> 💡 **Tips Upload:** Zip dulu setiap folder, upload ZIP-nya, lalu extract di File Manager cPanel.

### A6. Buat File `.htaccess` untuk Routing React

Karena React menggunakan client-side routing, Anda perlu membuat file `.htaccess` di root `htdocs/`:

```apacheconf
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

Buat file ini via File Manager cPanel → klik **New File** → nama: `.htaccess`

---

## 🔵 Opsi B: Niagahoster / Rumahweb (Berbayar)

**Cocok untuk:** Produksi / Live system  
**Kelebihan:** Performa stabil, support bagus, domain custom  
**Harga:** Mulai Rp 10.000/bulan

### Langkah-langkah

Prosesnya **sama persis dengan InfinityFree** (Opsi A), karena keduanya menggunakan cPanel.

Perbedaannya:
- ✅ Tidak ada iklan
- ✅ Bisa pakai domain sendiri (misal: `smanko.sch.id`)
- ✅ Performa lebih baik
- ✅ Dukungan teknis via live chat

**Rekomendasi paket:** Hosting Starter (SSD) dari Niagahoster sudah cukup.

---

## 🟣 Opsi C: Railway (Modern)

**Cocok untuk:** Developer yang ingin deploy cepat via GitHub  
**Kelebihan:** Deploy otomatis dari GitHub, mendukung PHP  
**Kekurangan:** Free tier terbatas (500 jam/bulan)

> ⚠️ Railway lebih cocok untuk backend PHP saja. Frontend React sebaiknya di-deploy terpisah ke **Vercel** (gratis).

### C1. Deploy Frontend ke Vercel

1. Buka [https://vercel.com](https://vercel.com) → Login dengan GitHub
2. Klik **Add New Project** → Import repo `Fachryi/smanko_web`
3. Atur Build Settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Klik **Deploy**

> ⚠️ API calls ke `/api/` tidak akan berfungsi sampai backend juga di-deploy dan URL-nya diupdate.

### C2. Update URL API di Frontend

Edit file `src/lib/apiClient.ts`, ubah base URL ke domain backend Anda:

```typescript
const BASE_URL = 'https://backend-anda.railway.app/api'
// atau jika InfinityFree:
const BASE_URL = 'https://smanko.infinityfreeapp.com/api'
```

Lalu build ulang dan push ke GitHub.

---

## 🛠️ Troubleshooting

### ❌ Halaman putih setelah upload
**Solusi:** Pastikan file `.htaccess` sudah dibuat dengan isi yang benar (lihat Langkah A6).

### ❌ API error / Cannot connect to database
**Solusi:** Cek kembali isi `api/config/database.php`. Pastikan host, nama DB, user, dan password benar.

### ❌ Upload gambar gagal
**Solusi:** Pastikan folder `api/uploads/` dan `public/uploads/` memiliki permission **755** atau **777**.  
Di cPanel File Manager → klik kanan folder → **Change Permissions**.

### ❌ Login gagal meski password benar
**Solusi:** Pastikan tabel `users` sudah ter-import dengan benar. Cek di phpMyAdmin apakah tabel `users` berisi data.

### ❌ Error 500 Internal Server Error
**Solusi:** Aktifkan error reporting sementara dengan menambahkan di awal `api/config/database.php`:
```php
ini_set('display_errors', 1);
error_reporting(E_ALL);
```
Hapus setelah masalah ditemukan.

---

## 🔄 Update Aplikasi (Setelah Ada Perubahan)

Jika ada perubahan kode dan ingin mengupdate server:

```bash
# 1. Build ulang frontend
npm run build

# 2. Commit & push ke GitHub
git add .
git commit -m "update: deskripsi perubahan"
git push

# 3. Upload ulang folder dist/ ke server hosting
```

---

## 📞 Bantuan

Jika mengalami kendala deployment, pastikan Anda sudah:
- [ ] Membaca bagian Troubleshooting di atas
- [ ] Mengecek log error di cPanel → **Error Logs**
- [ ] Memastikan versi PHP di hosting adalah **PHP 7.4 atau lebih baru** (cek di cPanel → PHP Version)

---

<div align="center">
  <strong>SMANKO</strong> – SMA Negeri Khusus Keberbakatan Olahraga Sulawesi Selatan
</div>
