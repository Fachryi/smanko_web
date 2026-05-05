-- ============================================================
-- Migration: Multi Prestasi per Penilaian (Opsi A)
-- Hapus UNIQUE constraint pada penilaian_prestasi.penilaian_id
-- agar satu penilaian bisa punya lebih dari 1 kejuaraan
-- Jalankan di phpMyAdmin atau command line MySQL
-- ============================================================

USE `smko_db`;

-- 1. Hapus UNIQUE constraint (bernama dari tabel definition)
ALTER TABLE `penilaian_prestasi` DROP INDEX `penilaian_id`;

-- 2. Tambah index biasa (non-unique) agar query tetap cepat
ALTER TABLE `penilaian_prestasi` ADD INDEX `idx_penilaian_id` (`penilaian_id`);

-- Selesai. Sekarang satu penilaian bisa memiliki banyak row prestasi.
-- Nilai prestasi yang dipakai = MAX(nilai) dari semua kejuaraan.
