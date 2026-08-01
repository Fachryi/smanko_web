-- ============================================================
-- Migrasi: Tabel setting_nomor_pertandingan
-- Perbaiki error 500 pada /api/settings/nomor-pertandingan.php
-- (Table 'smanko_web.setting_nomor_pertandingan' doesn't exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS setting_nomor_pertandingan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cabang_olahraga_id INT UNSIGNED NOT NULL,
  nama VARCHAR(255) NOT NULL,
  urutan INT NOT NULL DEFAULT 99,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cabang_olahraga (cabang_olahraga_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
