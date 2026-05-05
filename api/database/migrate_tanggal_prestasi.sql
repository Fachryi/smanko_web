-- ============================================================
-- Migrasi: Tambah kolom tanggal_prestasi ke penilaian_prestasi
-- Jalankan sekali di phpMyAdmin atau MySQL CLI
-- ============================================================

-- Tambah kolom tanggal_prestasi (nullable, backward compatible)
ALTER TABLE `penilaian_prestasi`
  ADD COLUMN IF NOT EXISTS `tanggal_prestasi` DATE NULL
    COMMENT 'Tanggal lengkap prestasi diraih (YYYY-MM-DD)'
    AFTER `bulan`;

-- Isi tanggal_prestasi dari data bulan lama yang sudah ada
-- (set ke tanggal 1 pada bulan tersebut, tahun default 2024)
UPDATE `penilaian_prestasi`
SET `tanggal_prestasi` = CONCAT('2024-', LPAD(`bulan`, 2, '0'), '-01')
WHERE `bulan` IS NOT NULL AND `bulan` > 0 AND `tanggal_prestasi` IS NULL;
