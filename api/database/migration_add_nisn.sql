-- ============================================================
-- SMANKO – Migration: Penambahan Kolom NISN ke Tabel siswa
-- Jalankan file ini di phpMyAdmin → Tab SQL
-- ============================================================

USE `smko_db`;

-- Langkah 1: Tambah kolom nisn (nullable dulu agar bisa diisi)
ALTER TABLE `siswa`
  ADD COLUMN `nisn` VARCHAR(20) NULL
  AFTER `id`;

-- Langkah 2: Isi NISN otomatis untuk semua siswa yang sudah ada
-- Format: NISN = 10 digit, diawali '998' + ID yang di-pad 7 digit
UPDATE `siswa`
SET `nisn` = CONCAT('998', LPAD(`id`, 7, '0'))
WHERE `nisn` IS NULL;

-- Langkah 3: Jadikan NOT NULL + UNIQUE setelah semua baris terisi
ALTER TABLE `siswa`
  MODIFY COLUMN `nisn` VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY `uq_nisn` (`nisn`);

-- Verifikasi (opsional – hapus tanda komentar jika ingin cek)
-- SELECT id, nisn, nis, nama FROM siswa ORDER BY id;
