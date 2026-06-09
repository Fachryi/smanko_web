# SMANKO — Sistem Informasi Rekapitulasi Nilai Cabang Olahraga

**SMA Negeri Khusus Keberbakatan Olahraga Sulawesi Selatan**

---

## Daftar Isi

1. [Apa Itu SMANKO?](#1-apa-itu-smanko)
2. [Tujuan & Manfaat](#2-tujuan--manfaat)
3. [Teknologi yang Digunakan](#3-teknologi-yang-digunakan)
4. [Aktor dalam Sistem](#4-aktor-dalam-sistem)
5. [Activity Diagram — Interaksi Actor dengan Sistem](#5-activity-diagram--interaksi-aktor-dengan-sistem)
   - [5.1 Admin](#51-admin)
   - [5.2 Guru Olahraga](#52-guru-olahraga)
   - [5.3 Wakasek](#53-wakasek)
   - [5.4 Publik (Tanpa Login)](#54-publik-tanpa-login)
6. [Alur Penilaian End-to-End](#6-alur-penilaian-end-to-end)
7. [Matriks Interaksi Antar Aktor](#7-matriks-interaksi-antar-aktor)
8. [Evaluasi & Analisis Sistem](#8-evaluasi--analisis-sistem)

---

## 1. Apa Itu SMANKO?

**SMANKO** (Sistem Informasi Rekapitulasi Nilai Cabang Olahraga) adalah platform digital berbasis web yang dibangun khusus untuk **SMA Negeri Khusus Keberbakatan Olahraga Sulawesi Selatan**.

Sistem ini menangani seluruh siklus penilaian siswa berdasarkan cabang olahraga nya, mulai dari:

- **Input nilai** — keterampilan, prestasi, dan kehadiran
- **Kalkulasi otomatis** — nilai akhir berdasarkan bobot yang telah ditentukan
- **Monitoring & pelaporan** — dashboard eksekutif wakasek, cetak raport PDF, klasemen publik
- **Manajemen data** — siswa, guru, cabang olahraga, kelas, tahun ajaran

### Cara Kerja Penilaian

```
Nilai Akhir = (Nilai Keterampilan × Bobot_Keterampilan)
            + (Nilai Prestasi × Bobot_Prestasi)
            + (Nilai Kehadiran × Bobot_Kehadiran)
```

Dengan konfigurasi default:
| Komponen | Bobot | Cara Perolehan Nilai |
|----------|-------|----------------------|
| Keterampilan | **50%** | Rata-rata tertimbang dari nilai per kriteria (teknik dasar, fisik, taktik, dll) |
| Prestasi | **30%** | Nilai tertinggi dari seluruh kejuaraan yang diikuti (MAX) |
| Kehadiran | **20%** | Konversi persentase kehadiran berdasarkan rentang yang ditentukan |

Bobot ini dapat diubah oleh Admin kapan saja melalui halaman **Pengaturan**.

---

## 2. Tujuan & Manfaat

### Tujuan

| No | Tujuan | Keterangan |
|----|--------|------------|
| 1 | **Digitalisasi Penilaian** | Mengganti proses yang sebelumnya hanya tampil sebagai nilai olahraga diraport tanpa penilaian yang mendetail,dengan sistem yang terpusat |
| 2 | **Transparansi Nilai** | Siswa, guru, dan wakasek dapat memonitor nilai secara real-time |
| 3 | **Efisiensi Waktu** | guru tidak perlu hitung manual; wakasek tidak perlu minta laporan satu per satu |
| 4 | **Akurasi Data** | Kalkulasi otomatis mengurangi human error |
| 5. | **Dokumentasi Prestasi** | Setiap kejuaraan siswa terdokumentasi rapi (nama, tingkatan, predikat, bukti foto) |
| 6 | **Pelaporan Cepat** | Cetak raport & rekap PDF dalam hitungan detik |

### Manfaat per Role

| Role | Manfaat |
|------|---------|
| **Admin** | Satu panel untuk mengelola seluruh data master & konfigurasi sistem |
| **Guru** | Form input nilai yang terstruktur dengan kalkulasi real-time & upload bukti |
| **Wakasek** | Dashboard eksekutif interaktif tanpa perlu rekap manual dari guru |
| **Publik** | Akses klasemen & galeri prestasi tanpa login — meningkatkan citra sekolah |

---

## 3. Teknologi yang Digunakan

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | React 18 + TypeScript + Vite 5 | Antarmuka pengguna SPA (Single Page Application) |
| **Backend** | PHP 8 Native REST API | Logika bisnis, autentikasi, validasi, kalkulasi |
| **Database** | MySQL / MariaDB | Penyimpanan data terstruktur (13+ tabel) |
| **Routing** | React Router DOM v6 | Navigasi halaman frontend |
| **Charts** | Recharts | Grafik dashboard wakasek (bar, donut) |
| **Icons** | Lucide React | Ikon antarmuka |
| **Styling** | Vanilla CSS | Custom design system tanpa framework CSS |
| **PDF** | Print browser (`window.print`) via CSS | Cetak raport & rekap tanpa library pihak ketiga |
| **Server** | XAMPP (Apache + PHP + MySQL) | Lingkungan pengembangan lokal |

### Arsitektur Komunikasi

```
[Browser] ──React SPA──> [Vite Dev Server / Static Build]
     │                        │
     │  HTTP API Request       │ Proxy
     │  (Authorization: Bearer)│
     ▼                        ▼
[PHP REST API] ──PDO──> [MySQL Database]
     │
     │──> /api/auth/*         (Login, Logout)
     │──> /api/master/*       (CRUD master data)
     │──> /api/penilaian/*    (Input & rekap nilai)
     │──> /api/settings/*     (Bobot & konfigurasi)
     │──> /api/wakasek/*      (Dashboard & rekap)
     │──> /api/public/*       (Landing page publik)
```

---

## 4. Aktor dalam Sistem

| Role | Label | Jumlah Default | Akses |
|------|-------|----------------|-------|
| **`admin`** | Administrator | 1 akun | Full akses — kelola semua data & konfigurasi |
| **`guru_olahraga`** | Guru / Pelatih | 3 akun (Budi, Sari, Ahmad) | Input nilai untuk kelas yang diampu |
| **`wakasek`** | Wakasek Kesiswaan | 1 akun (Rina) | Dashboard read-only, rekap, data alumni |
| **Publik** | Pengunjung | — | Landing page tanpa login |

---

## 5. Activity Diagram — Interaksi Actor dengan Sistem

### 5.1 Admin

**Fase 0: Autentikasi**

```
┌──────────┐         ┌──────────┐
│  ADMIN   │         │  SISTEM  │
└────┬─────┘         └────┬─────┘
     │                    │
     │ 1. Buka halaman    │
     │    login           │
     │───────────────────>│
     │                    │ 2. Tampilkan form login
     │<───────────────────│
     │                    │
     │ 3. Input username  │
     │    & password      │
     │───────────────────>│
     │                    │ 4. Validasi kredensial
     │                    │    (bcrypt verify)
     │                    │
     │                    │ 5. Hapus session lama
     │                    │
     │                    │ 6. Buat token baru
     │                    │    (64-char hex, 8 jam)
     │                    │
     │ 7. Return token +  │
     │    role + user data│
     │<───────────────────│
     │                    │
     │ 8. Simpan token di │
     │    localStorage    │
     │                    │
     │ 9. Redirect ke     │
     │    Dashboard       │
     │───────────────────>│
     │                    │ 10. Query data summary
     │                    │     (jumlah siswa, cabor,
     │                    │      pelatih, TA aktif)
     │<───────────────────│
     │                    │
     │ 11. Tampilkan      │
     │     Dashboard      │
     │<───────────────────│
```

**Fase 1: Manajemen Tahun Ajaran**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Tahun Ajaran    │
  │─────────────────────────────>│
  │                              │ 2. Query SELECT * FROM tahun_ajaran
  │                              │    ORDER BY tahun DESC
  │                              │
  │ 3. Tampilkan daftar TA       │
  │    (list, status aktif/tutup)│
  │<─────────────────────────────│
  │                              │
  │ 4. Klik Tambah TA            │
  │    → Modal form              │
  │─────────────────────────────>│
  │                              │
  │ 5. Input:                    │
  │    - Tahun (cth: 2025/2026)  │
  │    - Semester (Ganjil/Genap) │
  │    - Status (Aktif/Tutup)    │
  │                              │
  │─────────────────────────────>│
  │                              │ 6. Validasi input
  │                              │    - Cek duplikat tahun + semester
  │                              │
  │                              │ 7. INSERT INTO tahun_ajaran
  │                              │
  │ 8. Return success + refresh  │
  │<─────────────────────────────│
```

**Fase 2: Manajemen Siswa**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Data Siswa      │
  │─────────────────────────────>│
  │                              │ 2. Query JOIN siswa, cabang_olahraga,
  │                              │    profil_pelatih, tahun_ajaran
  │                              │
  │ 3. Tampilkan tabel siswa     │
  │    + filter (kelas, cabor)   │
  │    + search (nama/NISN)      │
  │    + pagination              │
  │<─────────────────────────────│
  │                              │
  │ 4. Klik Tambah / Edit        │
  │─────────────────────────────>│
  │                              │
  │ 5. Input:                    │
  │    - NISN, NIS, Nama         │
  │    - Kelas (X, XI, XII)     │
  │    - Jenis Kelamin           │
  │    - Cabang Olahraga         │
  │    - Pelatih (dari cabor yg  │
  │      dipilih)                │
  │    - Status (Aktif)          │
  │                              │
  │─────────────────────────────>│
  │                              │ 6. Validasi & INSERT/UPDATE
  │                              │
  │ 7. Return success + refresh  │
  │<─────────────────────────────│
```

**Fase 3: Manajemen Kriteria Penilaian**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Kriteria        │
  │─────────────────────────────>│
  │                              │ 2. Query kriteria by cabor
  │                              │    JOIN cabang_olahraga
  │                              │
  │ 3. Tampilkan daftar kriteria │
  │    per cabor                 │
  │<─────────────────────────────│
  │                              │
  │ 4. Pilih cabor, lalu:        │
  │    Tambah kriteria baru:     │
  │    - Nama kriteria           │
  │      (cth: Teknik Dasar)     │
  │    - Bobot (cth: 40)         │
  │    - Urutan                  │
  │                              │
  │─────────────────────────────>│
  │                              │ 5. Validasi total bobot
  │                              │    (harus = 100% per cabor)
  │                              │
  │                              │ 6. INSERT INTO kriteria_keterampilan
  │                              │
  │ 7. Return success + refresh  │
  │<─────────────────────────────│
```

**Fase 4: Penugasan Guru ke Kelas**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Penugasan Guru  │
  │─────────────────────────────>│
  │                              │ 2. Query guru_olahraga + kelas + TA
  │                              │
  │ 3. Tampilkan daftar assign   │
  │<─────────────────────────────│
  │                              │
  │ 4. Pilih: Guru → Kelas → TA  │
  │─────────────────────────────>│
  │                              │ 5. INSERT INTO guru_kelas
  │                              │
  │ 6. Return success            │
  │<─────────────────────────────│
```

**Fase 5: Settings / Konfigurasi Sistem**

```
ADMIN                          SISTEM
  │                              │
  │─ Bobot Utama ───────────────>│
  │  Input: Keterampilan=50%     │
  │         Prestasi=30%         │  UPDATE setting_bobot_utama
  │         Kehadiran=20%        │
  │                              │
  │─ Tingkat Prestasi ──────────>│
  │  Edit nilai per tingkatan:   │  UPDATE setting_prestasi
  │  Internasional → 100         │
  │  Nasional → 90               │
  │  Daerah → 85                 │
  │  Kota → 80                   │
  │  Tidak Ada → 75              │
  │                              │
  │─ Rentang Kehadiran ─────────>│
  │  Edit interval & nilai:      │  UPDATE setting_kehadiran
  │  86-100% → Baik Sekali = 95 │
  │  71-85% → Baik = 85         │
  │  56-70% → Cukup = 75        │
  │  0-55% → Kurang = 60        │
  │                              │
  │─ Kepala Sekolah ────────────>│
  │  Nama + NIP                  │  UPDATE setting_sekolah
  │                              │
  │  Return success              │
  │<─────────────────────────────│
```

**Fase 6: Kenaikan Kelas Massal**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Kenaikan Kelas  │
  │─────────────────────────────>│
  │                              │ 2. Query kelas + siswa aktif
  │                              │
  │ 3. Pilih kelas asal          │
  │    (cth: X → XI)            │
  │─────────────────────────────>│
  │                              │ 4. Query siswa di kelas tsb
  │                              │
  │ 5. Tampilkan daftar siswa +  │
  │    dropdown target kelas     │
  │<─────────────────────────────│
  │                              │
  │ 6. Sesuaikan target kelas    │
  │    per siswa (jika perlu)    │
  │                              │
  │ 7. Klik "Proses Kenaikan"    │
  │─────────────────────────────>│
  │                              │ 8. BEGIN TRANSACTION
  │                              │ 9. UPDATE siswa SET kelas = target
  │                              │    WHERE id IN (...)
  │                              │ 10. COMMIT
  │                              │
  │ 11. Return success + jumlah  │
  │     siswa dinaikkan          │
  │<─────────────────────────────│
```

**Fase 7: Kelulusan (Alumni)**

```
ADMIN                          SISTEM
  │                              │
  │ 1. Buka menu Kelulusan       │
  │─────────────────────────────>│
  │                              │ 2. Query siswa kelas XII
  │                              │
  │ 3. Tampilkan daftar siswa    │
  │<─────────────────────────────│
  │                              │
  │ 4. Klik "Proses Kelulusan"   │
  │─────────────────────────────>│
  │                              │ 5. UPDATE siswa SET status = 'alumni'
  │                              │    WHERE kelas = 'XII' AND status = 'aktif'
  │                              │
  │ 6. Return success + jumlah   │
  │    siswa diluluskan          │
  │<─────────────────────────────│
```

**Kesimpulan Interaksi Admin:**
Admin berinteraksi dengan sistem dalam **12 area fungsional** — semuanya bersifat **CRUD (Create, Read, Update, Delete)** plus **proses batch** (kenaikan kelas & kelulusan). Admin adalah satu-satunya aktor yang bisa **menulis** ke data master.

---

### 5.2 Guru Olahraga

**Fase 0: Autentikasi**

```
GURU                             SISTEM
  │                              │
  │ 1. Login                     │
  │─────────────────────────────>│  Validasi → create session → return token
  │<─────────────────────────────│
  │                              │
  │ 2. Redirect ke Dashboard     │
  │─────────────────────────────>│  Query ringkasan:
  │<─────────────────────────────│  - Jumlah kelas diampu
  │                              │  - Jumlah siswa total
  │                              │  - Progress penilaian
```

**Fase 1: Input Nilai — Pemilihan Kelas**

```
GURU                             SISTEM
  │                              │
  │ 1. Buka menu Input Nilai     │
  │─────────────────────────────>│
  │                              │ 2. Query guru_kelas WHERE user_id = ?
  │                              │    JOIN tahun_ajaran WHERE aktif
  │                              │
  │ 3. Tampilkan daftar kelas    │
  │    + progress per kelas      │
  │    (cth: "Sudah 12/25 siswa")│
  │<─────────────────────────────│
  │                              │
  │ 4. Pilih salah satu kelas    │
  │─────────────────────────────>│
  │                              │ 5. Query siswa di kelas tsb
  │                              │    + penilaian_header (status draft/final
  │                              │      atau belum ada)
  │                              │
  │ 6. Tampilkan daftar siswa:   │
  │    [Nama] [NIS] [Status]     │
  │    [Aksi: Input/Edit/Lihat]  │
  │<─────────────────────────────│
```

**Fase 2: Form Penilaian Individual — Keterampilan**

```
GURU                             SISTEM
  │                              │
  │ 1. Pilih siswa → Input Nilai │
  │─────────────────────────────>│
  │                              │ 2. Query kriteria keterampilan
  │                              │    sesuai cabor siswa
  │                              │
  │ 3. Tampilkan form:           │
  │    ┌─────────────────────┐   │
  │    │ Kriteria    │ Bobot │   │
  │    │─────────────│───────│   │
  │    │ Teknik Dasar│  40%  │   │
  │    │ [nilai 0-100]       │   │
  │    │─────────────│───────│   │
  │    │ Fisik       │  30%  │   │
  │    │ [nilai 0-100]       │   │
  │    │─────────────│───────│   │
  │    │ Mental      │  30%  │   │
  │    │ [nilai 0-100]       │   │
  │    │═════════════╪═══════│   │
  │    │ TOTAL: 85.0         │   │
  │    └─────────────────────┘   │
  │<─────────────────────────────│
  │                              │
  │ 4. Input nilai per kriteria  │
  │─────────────────────────────>│
  │                              │ 5. Kalkulasi real-time:
  │                              │    nilai_keterampilan = ∑ (nilai × bobot/100)
  │                              │    (dihitung di frontend & backend)
  │                              │
  │ 6. Tampilkan total terkini   │
  │<─────────────────────────────│
  │                              │
  │ 7. Klik "Simpan"             │
  │─────────────────────────────>│
  │                              │ 8. INSERT penilaian_header (jika belum ada)
  │                              │    → dapat ID penilaian
  │                              │
  │                              │ 9. INSERT/UPDATE penilaian_keterampilan
  │                              │    per kriteria
  │                              │
  │ 10. Return success           │
  │<─────────────────────────────│
```

**Fase 3: Form Penilaian — Prestasi**

```
GURU                             SISTEM
  │                              │
  │ 1. Klik tab "Prestasi"       │
  │─────────────────────────────>│
  │                              │ 2. Query penilaian_prestasi
  │                              │    WHERE penilaian_id = ?
  │                              │
  │ 3. Tampilkan daftar prestasi │
  │    yang sudah diinput        │
  │    (jika ada)                │
  │<─────────────────────────────│
  │                              │
  │ 4. Klik "Tambah Prestasi"    │
  │─────────────────────────────>│
  │ 5. Modal form prestasi:      │
  │    - Tingkatan (dropdown):   │
  │      Internasional / Nasional│
  │      / Daerah / Kota /       │
  │      Tidak Ada               │
  │    - Nama Kejuaraan          │
  │    - Nomor Pertandingan      │
  │    - Tanggal                 │
  │    - Predikat Juara:         │
  │      Juara 1 / Juara 2 /     │
  │      Juara 3 / Harapan /     │
  │      Peserta                 │
  │    - Upload Bukti (foto)     │
  │─────────────────────────────>│
  │                              │ 6. Validasi: jika upload foto,
  │                              │    simpan ke /api/uploads/
  │                              │
  │                              │ 7. INSERT penilaian_prestasi
  │                              │    nilai = nilai_tingkatan (dari
  │                              │    setting_prestasi)
  │                              │
  │                              │ 8. UPDATE penilaian_header:
  │                              │    nilai_prestasi = MAX dari semua
  │                              │    prestasi siswa ini
  │                              │
  │ 9. Return success + refreshed│
  │<─────────────────────────────│
```

**Fase 4: Form Penilaian — Kehadiran**

```
GURU                             SISTEM
  │                              │
  │ 1. Klik tab "Kehadiran"      │
  │─────────────────────────────>│
  │                              │ 2. Query penilaian_kehadiran_bulanan
  │                              │
  │ 3. Tampilkan daftar kehadiran│
  │    per bulan (jika ada)      │
  │<─────────────────────────────│
  │                              │
  │ 4. Klik "Tambah Kehadiran"   │
  │─────────────────────────────>│
  │                              │
  │ 5. Pilih:                    │
  │    - Bulan (Jan-Des)         │
  │    - Tahun                   │
  │    - Total Sesi Latihan      │
  │    - Total Hadir             │
  │                              │
  │─────────────────────────────>│
  │                              │ 6. Hitung: persentase = hadir/sesi × 100%
  │                              │
  │                              │ 7. Konversi persentase ke nilai
  │                              │    berdasarkan setting_kehadiran:
  │                              │    - 86-100% → 95 (Baik Sekali)
  │                              │    - 71-85%  → 85 (Baik)
  │                              │    - 56-70%  → 75 (Cukup)
  │                              │    - 0-55%   → 60 (Kurang)
  │                              │
  │                              │ 8. INSERT penilaian_kehadiran_bulanan
  │                              │
  │                              │ 9. UPDATE penilaian_kehadiran:
  │                              │    agregat total_hadir, total_sesi
  │                              │    nilai_kehadiran = rata-rata nilai
  │                              │                              per bulan
  │                              │
  │ 10. Return success           │
  │<─────────────────────────────│
```

**Fase 5: Finalisasi Penilaian**

```
GURU                             SISTEM
  │                              │
  │ 1. Review semua komponen     │
  │    Keterampilan, Prestasi,   │
  │    Kehadiran sudah terisi    │
  │                              │
  │ 2. Klik tombol "Finalisasi"  │
  │─────────────────────────────>│
  │                              │
  │                              │ 3. Validasi: semua komponen terisi?
  │                              │    Jika belum → return error
  │                              │
  │                              │ 4. Kalkulasi nilai akhir:
  │                              │    nilai_keterampilan × bobot_keterampilan
  │                              │    + nilai_prestasi × bobot_prestasi
  │                              │    + nilai_kehadiran × bobot_kehadiran
  │                              │
  │                              │ 5. Tentukan predikat:
  │                              │    91-100 → A (Istimewa)
  │                              │    81-90  → B (Baik Sekali)
  │                              │    71-80  → C (Baik)
  │                              │    61-70  → D (Cukup)
  │                              │    0-60   → E (Kurang)
  │                              │
  │                              │ 6. UPDATE penilaian_header:
  │                              │    nilai_akhir = hasil kalkulasi
  │                              │    predikat = A/B/C/D/E
  │                              │    status = 'final'
  │                              │
  │ 7. Tampilkan konfirmasi:     │
  │    "Nilai berhasil di-       │
  │    finalkan. Tidak bisa      │
  │    diedit lagi."             │
  │<─────────────────────────────│
  │                              │
  │ 8. Klik "Cetak Raport"       │
  │    (opsional)                │
  │─────────────────────────────>│
  │                              │ 9. Query semua data penilaian
  │                              │    + data siswa + data sekolah
  │                              │
  │ 10. Render halaman raport    │
  │     + trigger window.print() │
  │<─────────────────────────────│
```

**Kesimpulan Interaksi Guru:**
Guru berinteraksi dengan sistem dalam **4 area utama**: melihat kelas, input 3 komponen nilai, finalisasi, dan cetak raport. Semua input bersifat **transaksional** — nilai langsung tersimpan & terkalkulasi real-time.

---

### 5.3 Wakasek

**Fase 0: Autentikasi**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Login                     │
  │─────────────────────────────>│  Validasi → create session → return token
  │<─────────────────────────────│
```

**Fase 1: Dashboard Eksekutif**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Buka Dashboard            │
  │─────────────────────────────>│
  │                              │
  │                              │ 2. Query parallel (multi-query):
  │                              │
  │                              │   a. SELECT COUNT(*) FROM siswa
  │                              │      WHERE status = 'aktif'
  │                              │      → Total Siswa Aktif
  │                              │
  │                              │   b. SELECT AVG(nilai_akhir)
  │                              │      FROM penilaian_header
  │                              │      JOIN tahun_ajaran WHERE aktif
  │                              │      WHERE status = 'final'
  │                              │      → Rata-rata Nilai
  │                              │
  │                              │   c. SELECT COUNT(*) FROM penilaian_prestasi
  │                              │      JOIN penilaian_header USING (penilaian_id)
  │                              │      JOIN tahun_ajaran WHERE aktif
  │                              │      → Jumlah Berprestasi
  │                              │
  │                              │   d. SELECT COUNT(*) FROM penilaian_header
  │                              │      WHERE status = 'final'
  │                              │      → Jumlah Final
  │                              │
  │                              │   e. Bar Chart: nilai per cabor
  │                              │      SELECT cabor.nama,
  │                              │        AVG(header.nilai_akhir),
  │                              │        AVG(keterampilan.nilai),
  │                              │        AVG(prestasi.nilai),
  │                              │        AVG(kehadiran.nilai)
  │                              │      GROUP BY cabor.id
  │                              │
  │                              │   f. Donut Chart: distribusi prestasi
  │                              │      SELECT prestasi.tingkatan,
  │                              │        COUNT(*)
  │                              │      GROUP BY tingkatan
  │                              │
  │                              │   g. Leaderboard: TOP 10 siswa
  │                              │      SELECT siswa.nama, header.nilai_akhir
  │                              │      WHERE status='final'
  │                              │      ORDER BY nilai_akhir DESC
  │                              │      LIMIT 10
  │                              │
  │                              │   h. Distribusi Predikat
  │                              │      SELECT header.predikat, COUNT(*)
  │                              │      GROUP BY predikat
  │                              │
  │                              │   i. Capaian Prestasi (filterable)
  │                              │      SELECT siswa.nama, cabor.nama,
  │                              │        prestasi.*
  │                              │      JOIN ...
  │                              │
  │ 3. Render dashboard lengkap:  │
  │    ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
  │    │ T │ │ R │ │ B │ │ F │ │
  │    │ o │ │ a │ │ e │ │ i │ │
  │    │ t │ │ t │ │ r │ │ n │ │
  │    │ a │ │ a │ │ p │ │ a │ │
  │    │ l │ │ta │ │re │ │ l │ │
  │    │   │ │   │ │st │ │   │ │
  │    │   │ │   │ │asi│ │   │ │
  │    └───┘ └───┘ └───┘ └───┘ │
  │                              │
  │    [Bar Chart per Cabor]     │
  │    ████████████████          │
  │    ████████████████          │
  │    ████████████████          │
  │    ████████████████          │
  │    Pencak Bulu Sepak Basket  │
  │    Silat Tangkis Bola        │
  │                              │
  │    [Donut Prestasi] [Leaderboard]│
  │    ╭─────╮ [1] 🥇 Siswa A  │
  │    │ ╭─╮ │ [2] 🥈 Siswa B  │
  │    │ ╰─╯ │ [3] 🥉 Siswa C  │
  │    ╰─────╯ ...              │
  │                              │
  │    [Distribusi Predikat]     │
  │    [████████] A  █████████  │
  │    [████]     B  ████       │
  │    [██]       C  ██         │
  │                              │
  │    [Tabel Capaian Prestasi]  │
  │    ┌──────┬─────┬──────────┐│
  │    │Nama  │Cabor│Kejuaraan ││
  │    ├──────┼─────┼──────────┤│
  │    │...   │...  │...       ││
  │    └──────┴─────┴──────────┘│
  │                              │
  │<─────────────────────────────│
```

**Fase 2: Drill-down Prestasi**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Klik salah satu segmen    │
  │    Donut Chart               │
  │    (misal: "Nasional")       │
  │─────────────────────────────>│
  │                              │
  │                              │ 2. Query detail siswa dalam segmen:
  │                              │    SELECT siswa.*, prestasi.*,
  │                              │      cabang_olahraga.nama AS cabor
  │                              │    WHERE prestasi.tingkatan = 'Nasional'
  │                              │
  │ 3. Tampilkan modal/list      │
  │    siswa dengan prestasi     │
  │    + bukti foto              │
  │    (lightbox preview)        │
  │<─────────────────────────────│
```

**Fase 3: Export PDF Rekap**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Klik "Export PDF"         │
  │─────────────────────────────>│
  │                              │ 2. Query semua data rekap:
  │                              │    - Seluruh siswa + nilai akhir
  │                              │    - Rekap prestasi per siswa
  │                              │    - Statistik umum
  │                              │
  │ 3. Render halaman rekap      │
  │    + trigger window.print()  │
  │<─────────────────────────────│
```

**Fase 4: Rekap Kehadiran**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Buka menu Rekap Kehadiran │
  │─────────────────────────────>│
  │                              │ 2. Query summary kehadiran
  │                              │    (agregat per siswa / per cabor)
  │                              │
  │ 3. Tampilkan filter:         │
  │    - Cabor                   │
  │    - Kelas                   │
  │    - Bulan                   │
  │<─────────────────────────────│
  │                              │
  │ 4. Pilih filter              │
  │─────────────────────────────>│
  │                              │ 5. Query detail sesuai filter
  │                              │
  │ 6. Tampilkan tabel kehadiran │
  │<─────────────────────────────│
```

**Fase 5: Data Alumni**

```
WAKASEK                          SISTEM
  │                              │
  │ 1. Buka menu Alumni          │
  │─────────────────────────────>│
  │                              │ 2. Query siswa WHERE status = 'alumni'
  │                              │
  │ 3. Tampilkan daftar alumni   │
  │    (search, filter)          │
  │<─────────────────────────────│
  │                              │
  │ 4. Klik detail alumni        │
  │─────────────────────────────>│
  │                              │ 5. Query histori penilaian
  │                              │    semua semester
  │                              │
  │ 6. Tampilkan histori nilai   │
  │    + tombol "Cetak Raport"   │
  │<─────────────────────────────│
```

**Kesimpulan Interaksi Wakasek:**
Wakasek adalah aktor **read-only** — hanya melihat, memfilter, mengekspor data. Tidak ada input atau modifikasi data. Dashboard eksekutif memberikan **helicopter view** tanpa perlu merekap manual dari guru.

---

### 5.4 Publik (Tanpa Login)

```
PENGUNJUNG                       SISTEM
  │                              │
  │ 1. Buka landing page         │
  │    (tanpa login)             │
  │─────────────────────────────>│
  │                              │
  │                              │ 2. Query multi-data:
  │                              │    - Cabang olahraga (aktif)
  │                              │    - Pelatih per cabor
  │                              │    - Klasemen siswa (TOP,
  │                              │      filter by cabor)
  │                              │    - Galeri prestasi (dengan bukti)
  │                              │
  │ 3. Render halaman:           │
  │    ┌──────────────────────┐  │
  │    │   🏆 SMANKO          │  │
  │    │   Hero Carousel      │  │
  │    ├──────────────────────┤  │
  │    │   Cabang Olahraga    │  │
  │    │   [Coverflow Cards]  │  │
  │    │   [Nama] [Deskripsi] │  │
  │    ├──────────────────────┤  │
  │    │   Pelatih            │  │
  │    │   [Foto] [Nama]      │  │
  │    ├──────────────────────┤  │
  │    │   Klasemen Siswa     │  │
  │    │   Filter Cabor ▼     │  │
  │    │   Search: [.......]  │  │
  │    │   ┌──┬─────┬─────┐   │  │
  │    │   │# │Nama │Nilai│   │  │
  │    │   ├──┼─────┼─────┤   │  │
  │    │   │1 │Siswa│ 95  │   │  │
  │    │   │2 │...  │ ... │   │  │
  │    │   └──┴─────┴─────┘   │  │
  │    ├──────────────────────┤  │
  │    │   Galeri Prestasi    │  │
  │    │   [Foto] [Foto] [F]  │  │
  │    │   Lightbox Preview   │  │
  │    ├──────────────────────┤  │
  │    │   Lokasi & Kontak    │  │
  │    └──────────────────────┘  │
  │<─────────────────────────────│
```

**Kesimpulan Interaksi Publik:**
Publik adalah aktor **pasif** — hanya menerima data yang ditampilkan sistem. Tidak ada autentikasi, tidak ada input. Berfungsi sebagai **etalase digital sekolah** untuk menunjukkan prestasi siswa.

---

## 6. Alur Penilaian End-to-End

Berikut alur lengkap satu siklus penilaian dari awal hingga akhir:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SIKLUS PENILAIAN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║  TAHAP 1 — PERSIAPAN (Dilakukan Admin)                       ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
│                                                                     │
│  1. Admin buat Tahun Ajaran baru + set semester aktif              │
│  2. Admin input/update data siswa (lengkap dengan cabor & pelatih) │
│  3. Admin atur kriteria keterampilan per cabor                     │
│  4. Admin atur bobot utama, tingkatan prestasi, rentang kehadiran  │
│  5. Admin buat akun guru & assign ke kelas                         │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║  TAHAP 2 — PELAKSANAAN (Dilakukan Guru)                      ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
│                                                                     │
│  6. Guru login & lihat kelas yang diampu                           │
│  7. Guru pilih siswa → input nilai keterampilan per kriteria       │
│  8. Guru input prestasi (bisa multi-entry) + upload bukti          │
│  9. Guru input kehadiran (bisa multi-bulan)                        │
│  10. Guru review & finalisasi → status = final (terkunci)          │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║  TAHAP 3 — MONITORING (Dilakukan Wakasek)                    ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
│                                                                     │
│  11. Wakasek lihat dashboard eksekutif (grafik & statistik)        │
│  12. Wakasek filter & drill-down data sesuai kebutuhan              │
│  13. Wakasek cetak rekap PDF jika diperlukan                       │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║  TAHAP 4 — AKHIR SEMESTER (Dilakukan Admin)                  ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
│                                                                     │
│  14. Admin proses Kelulusan (XII → Alumni)                    │
│  15. Admin proses Kenaikan Kelas (X→XI, XI→XII)                    │
│  16. Admin tutup tahun ajaran & buka semester baru                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Matriks Interaksi Antar Aktor

| Dari | Kepada | Jenis Interaksi | Media | Contoh |
|------|--------|-----------------|-------|--------|
| **Admin** | **Sistem** | Create, Read, Update, Delete | REST API | Tambah siswa, edit guru, atur bobot |
| **Admin** | **Guru** | Administratif (tidak langsung) | Melalui sistem | Buat akun, assign kelas, unlock penilaian |
| **Admin** | **Wakasek** | Administratif (tidak langsung) | Melalui sistem | Sediakan data untuk dashboard |
| **Guru** | **Sistem** | Create (input), Read, Update, Delete | REST API | Input nilai, finalisasi, cetak raport |
| **Guru** | **Admin** | Koordinasi manual (luar sistem) | Tatap muka / chat | Minta unlock penilaian |
| **Guru** | **Wakasek** | — (tidak langsung) | Melalui sistem | Wakasek lihat hasil input guru |
| **Wakasek** | **Sistem** | Read only | REST API | Lihat dashboard, export PDF |
| **Wakasek** | **Admin** | Koordinasi manual (luar sistem) | Tatap muka / chat | Minta data tambahan |
| **Wakasek** | **Guru** | — (tidak langsung) | Melalui sistem | Pantau progress penilaian guru |
| **Publik** | **Sistem** | Read only (tanpa auth) | REST API publik | Lihat klasemen, galeri prestasi |

### Diagram Interaksi

```
                    ┌──────────────────┐
                    │                  │
                    │     SISTEM       │
                    │   (Database +    │
                    │    REST API)     │
                    │                  │
                    └──┬───┬───┬───┬──┘
                       │   │   │   │
               ┌───────┘   │   │   └────────┐
               │           │   │            │
               ▼           ▼   ▼            ▼
         ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐
         │         │ │        │ │        │ │        │
         │ ADMIN   │ │  GURU  │ │WAKASEK │ │ PUBLIK │
         │         │ │        │ │        │ │        │
         └────┬────┘ └───┬────┘ └───┬────┘ └────────┘
              │          │          │
              │ (manual) │          │
              └──────────┴──────────┘
                 Koordinasi manual
                 (luar sistem)
```

---

## 8. Evaluasi & Analisis Sistem

### Yang Sudah Bagus ✅

| Aspek | Penjelasan |
|-------|------------|
| **Pemisahan Role Tegas** | Admin/Guru/Wakasek memiliki wewenang yang jelas dan tidak tumpang tindih. Masing-masing punya halaman & aksi spesifik. |
| **Alur Linier & Jelas** | Admin persiapkan → Guru input → Wakasek monitor. Alurnya natural dan mudah dipahami. |
| **Finalisasi Terkunci** | Mencegah perubahan setelah penilaian selesai. Menjamin integritas data raport. |
| **Bobot Konfigurabel** | Admin bisa ubah bobot kapan saja tanpa perubahan kode. Fleksibel mengikuti kebijakan sekolah. |
| **Multi-Prestasi** | Nilai = MAX dari semua kejuaraan. Adil — siswa dengan banyak prestasi tidak dirugikan. |
| **Upload Bukti** | Setiap prestasi bisa disertai foto sebagai bukti otentik. |
| **Multi-Bulan Kehadiran** | Detail per bulan memudahkan tracking kehadiran siswa. |
| **Dashboard Interaktif** | Wakasek bisa filter, drill-down, dan ekspor data tanpa merekap manual. |
| **Landing Page Publik** | Klasemen & galeri dapat diakses publik — meningkatkan branding sekolah. |
| **Kenaikan & Kelulusan Massal** | Satu klik untuk proses batch — efisien dibanding satu per satu. |

### Yang Perlu Diperhatikan ⚠️ / Potensi Kebingungan

| Masalah | Dampak | Saran Perbaikan |
|---------|--------|-----------------|
| **Tidak ada approval workflow** — setelah final, hanya admin bisa unlock | Guru harus menghubungi admin secara manual jika ada revisi nilai | Tambahkan fitur "Request Unlock" dari guru ke admin, atau approval 2-step (Guru Final → Wakasek Approve) |
| **Admin jadi bottleneck** | Semua operasi sensitif (buka kunci, kenaikan kelas, kelulusan) terpusat di satu orang | Beri wewenang terbatas ke Wakasek untuk unlock penilaian atau approve kenaikan kelas |
| **Tidak ada notifikasi** | Guru tidak tahu deadline; Wakasek tidak tahu kapan nilai selesai | Tambahkan sistem notifikasi (email/in-app) — misal: pengingat deadline pengisian nilai, notifikasi saat guru finalisasi |
| **Tidak ada audit trail** | Tidak tercatat siapa mengubah apa dan kapan | Tambahkan tabel log aktivitas (user_id, action, timestamp, detail) untuk setiap perubahan penting |
| **Cetak PDF via `window.print()`** | Tampilan tergantung browser, margin tidak konsisten, tidak bisa download file PDF native | Gunakan library PDF seperti jsPDF, html2pdf.js, atau generate PDF di backend dengan TCPDF/Dompdf |
| **Tidak ada rollback kenaikan kelas** | Jika salah pilih target kelas, tidak bisa dikembalikan secara massal | Tambahkan konfirmasi 2-step + opsi "Undo" dalam 24 jam, atau backup otomatis sebelum proses batch |
| **Tidak ada batas waktu semester** | Guru bisa input nilai semester lalu kapan saja setelah semester berganti | Sistem otomatis menutup akses input nilai semester lama saat semester baru diaktifkan admin |
| **Tidak ada role siswa** | Siswa tidak bisa melihat nilai mereka sendiri | Tambahkan role siswa dengan akses view-only ke nilai & raport pribadi |

### Skor Evaluasi

| Kriteria | Skor (1-10) | Catatan |
|----------|-------------|---------|
| **Kejelasan Alur** | 8/10 | Alur linier mudah diikuti, tapi kurang approval flow |
| **Pemisahan Tugas** | 9/10 | Role tegas & tidak tumpang tindih |
| **Kemudahan Penggunaan** | 7/10 | Form input cukup intuitif, dashboard wakasek interaktif |
| **Keamanan Data** | 7/10 | Token auth + bcrypt password, tapi belum ada audit trail |
| **Fleksibilitas** | 9/10 | Bobot konfigurabel, multi-cabor, multi-prestasi |
| **Pelaporan** | 7/10 | Dashboard bagus, PDF masih via window.print |
| **Skalabilitas** | 7/10 | Cocok untuk 1 sekolah, mungkin perlu optimasi jika data sangat besar |
| **Overall** | **7.7/10** | Sistem sudah solid untuk MVP, dengan beberapa ruang improvement |

### Rekomendasi Prioritas

| Prioritas | Improvement | Effort | Impact |
|-----------|------------|--------|--------|
| 🔴 **Tinggi** | Approval workflow + Request Unlock | Sedang | Tinggi |
| 🔴 **Tinggi** | Audit trail (log aktivitas) | Rendah | Tinggi |
| 🟡 **Sedang** | Notifikasi (in-app / email) | Sedang | Sedang |
| 🟡 **Sedang** | Export PDF native (backend) | Sedang | Sedang |
| 🟢 **Rendah** | Dashboard siswa (view-only) | Rendah | Rendah |
| 🟢 **Rendah** | Batas waktu semester otomatis | Rendah | Sedang |

---

> **Catatan:** File ini dibuat untuk keperluan presentasi Sistem SMANKO. Untuk informasi lebih detail, lihat dokumentasi teknis di folder `docs/` dan struktur kode di folder `api/` serta `src/`.

---

*Dokumen ini disusun oleh Fachry Paryansyah — Pengembang Sistem SMANKO*
