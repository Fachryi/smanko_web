-- ============================================================
-- SMANKO – Sistem Informasi Rekapitulasi Nilai Cabang Olahraga
-- Sulawesi Selatan
-- Schema Version: 1.0
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

-- ------------------------------------------------------------
-- Buat database (jalankan terpisah jika sudah ada)
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `smko_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smko_db`;

-- ============================================================
-- TABEL: tahun_ajaran
-- ============================================================
CREATE TABLE `tahun_ajaran` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nama`       VARCHAR(20)  NOT NULL COMMENT 'Contoh: 2024/2025',
  `semester`   TINYINT      NOT NULL COMMENT '1 atau 2',
  `status`     ENUM('aktif','tutup') NOT NULL DEFAULT 'tutup',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_ta_semester` (`nama`, `semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: users
-- ============================================================
CREATE TABLE `users` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nama`          VARCHAR(100) NOT NULL,
  `username`      VARCHAR(50)  NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','guru_olahraga','wakasek') NOT NULL,
  `status`        ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: cabang_olahraga
-- ============================================================
CREATE TABLE `cabang_olahraga` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nama`       VARCHAR(100) NOT NULL,
  `kode`       VARCHAR(20)  NOT NULL UNIQUE,
  `deskripsi`  TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: siswa  (1 Siswa = 1 Cabor)
-- ============================================================
CREATE TABLE `siswa` (
  `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nisn`                VARCHAR(20)  NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa Nasional (10 digit)',
  `nis`                 VARCHAR(20)  NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa (lokal sekolah)',
  `nama`                VARCHAR(100) NOT NULL,
  `kelas`               VARCHAR(20)  NOT NULL COMMENT 'Contoh: X-A, XI-B',
  `jenis_kelamin`       ENUM('L','P') NOT NULL,
  `cabang_olahraga_id`  INT UNSIGNED NOT NULL,
  `status`              ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`cabang_olahraga_id`) REFERENCES `cabang_olahraga`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: guru_kelas (Penugasan Guru ke Kelas)
-- ============================================================
CREATE TABLE `guru_kelas` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT UNSIGNED NOT NULL,
  `kelas`           VARCHAR(20)  NOT NULL,
  `tahun_ajaran_id` INT UNSIGNED NOT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_guru_kelas` (`user_id`, `kelas`, `tahun_ajaran_id`),
  FOREIGN KEY (`user_id`)         REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: kriteria_keterampilan (Bobot Keterampilan per Cabor)
-- ============================================================
CREATE TABLE `kriteria_keterampilan` (
  `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `cabang_olahraga_id`  INT UNSIGNED NOT NULL,
  `nama`                VARCHAR(100) NOT NULL,
  `bobot`               DECIMAL(5,2) NOT NULL COMMENT 'Persentase 0-100',
  `urutan`              TINYINT NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`cabang_olahraga_id`) REFERENCES `cabang_olahraga`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: setting_prestasi (Global – Admin atur)
-- ============================================================
CREATE TABLE `setting_prestasi` (
  `id`        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tingkatan` VARCHAR(50)  NOT NULL UNIQUE COMMENT 'Internasional, Nasional, dst',
  `nilai`     DECIMAL(5,2) NOT NULL COMMENT 'Nilai mutlak 0-100',
  `urutan`    TINYINT NOT NULL DEFAULT 1,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: setting_kehadiran (Global – Admin atur)
-- ============================================================
CREATE TABLE `setting_kehadiran` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `kategori`        VARCHAR(50)  NOT NULL COMMENT 'Baik Sekali, Baik, Cukup, Kurang',
  `nilai_min`       DECIMAL(5,2) NOT NULL COMMENT 'Persentase kehadiran minimum',
  `nilai_max`       DECIMAL(5,2) NOT NULL COMMENT 'Persentase kehadiran maksimum',
  `nilai_konversi`  DECIMAL(5,2) NOT NULL COMMENT 'Nilai yang diberikan ke siswa',
  `urutan`          TINYINT NOT NULL DEFAULT 1,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (`nilai_min` <= `nilai_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: setting_bobot_utama (Global – Admin atur)
-- Hanya 1 baris, total bobot_keterampilan+bobot_prestasi+bobot_kehadiran = 100
-- ============================================================
CREATE TABLE `setting_bobot_utama` (
  `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `bobot_keterampilan`  DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  `bobot_prestasi`      DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `bobot_kehadiran`     DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: sessions (Token Auth)
-- ============================================================
CREATE TABLE `sessions` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `token`      VARCHAR(64)  NOT NULL UNIQUE,
  `expires_at` DATETIME     NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_token (`token`),
  INDEX idx_expires (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: penilaian_header
-- ============================================================
CREATE TABLE `penilaian_header` (
  `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `siswa_id`              INT UNSIGNED NOT NULL,
  `guru_id`               INT UNSIGNED NOT NULL,
  `tahun_ajaran_id`       INT UNSIGNED NOT NULL,
  `nilai_keterampilan`    DECIMAL(6,2) COMMENT 'Hasil weighted avg keterampilan',
  `nilai_prestasi`        DECIMAL(6,2) COMMENT 'Nilai dari setting_prestasi',
  `nilai_kehadiran`       DECIMAL(6,2) COMMENT 'Nilai konversi kehadiran',
  `nilai_akhir`           DECIMAL(6,2) COMMENT 'Weighted avg 3 komponen',
  `predikat`              VARCHAR(20),
  `status`                ENUM('draft','final') NOT NULL DEFAULT 'draft',
  `catatan`               TEXT,
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_penilaian` (`siswa_id`, `tahun_ajaran_id`),
  FOREIGN KEY (`siswa_id`)        REFERENCES `siswa`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`guru_id`)         REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: penilaian_keterampilan (Detail per kriteria)
-- ============================================================
CREATE TABLE `penilaian_keterampilan` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `penilaian_id`    INT UNSIGNED NOT NULL,
  `kriteria_id`     INT UNSIGNED NOT NULL,
  `nilai_mentah`    DECIMAL(5,2) NOT NULL COMMENT '0-100',
  `nilai_berbobot`  DECIMAL(6,4) NOT NULL COMMENT 'nilai_mentah * (bobot/100)',
  UNIQUE KEY `uq_detail` (`penilaian_id`, `kriteria_id`),
  FOREIGN KEY (`penilaian_id`) REFERENCES `penilaian_header`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`kriteria_id`)  REFERENCES `kriteria_keterampilan`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: penilaian_prestasi
-- ============================================================
CREATE TABLE `penilaian_prestasi` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `penilaian_id`    INT UNSIGNED NOT NULL UNIQUE,
  `nama_kejuaraan`  VARCHAR(255),
  `tingkatan`       VARCHAR(50) COMMENT 'Sesuai setting_prestasi.tingkatan',
  `peringkat`       VARCHAR(50) COMMENT 'Juara 1, Juara 2, dll',
  `bukti_foto`      VARCHAR(500) COMMENT 'Path file upload',
  `nilai`           DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  FOREIGN KEY (`penilaian_id`) REFERENCES `penilaian_header`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL: penilaian_kehadiran
-- ============================================================
CREATE TABLE `penilaian_kehadiran` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `penilaian_id`  INT UNSIGNED NOT NULL UNIQUE,
  `total_hadir`   INT NOT NULL DEFAULT 0,
  `total_sesi`    INT NOT NULL DEFAULT 1,
  `persentase`    DECIMAL(5,2) GENERATED ALWAYS AS (
                    CASE WHEN `total_sesi` > 0
                    THEN (`total_hadir` / `total_sesi`) * 100
                    ELSE 0 END
                  ) STORED,
  `nilai`         DECIMAL(5,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (`penilaian_id`) REFERENCES `penilaian_header`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tahun Ajaran
INSERT INTO `tahun_ajaran` (`nama`, `semester`, `status`) VALUES
('2024/2025', 1, 'tutup'),
('2024/2025', 2, 'aktif'),
('2025/2026', 1, 'tutup');

-- Users (password: 'password123' → hash bcrypt)
INSERT INTO `users` (`nama`, `username`, `password_hash`, `role`, `status`) VALUES
('Administrator', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'aktif'),
('Budi Santoso', 'guru_budi', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru_olahraga', 'aktif'),
('Sari Dewi', 'guru_sari', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru_olahraga', 'aktif'),
('Ahmad Rifai', 'guru_ahmad', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guru_olahraga', 'aktif'),
('Rina Hasanah', 'wakasek_rina', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'wakasek', 'aktif');

-- Cabang Olahraga
INSERT INTO `cabang_olahraga` (`nama`, `kode`, `deskripsi`) VALUES
('Sepak Bola', 'SEPAKBOLA', 'Cabang olahraga sepak bola'),
('Bulu Tangkis', 'BULUTANGKIS', 'Cabang olahraga bulu tangkis'),
('Karate', 'KARATE', 'Cabang olahraga karate'),
('Pencak Silat', 'PENCAKSILAT', 'Cabang olahraga pencak silat'),
('Renang', 'RENANG', 'Cabang olahraga renang'),
('Atletik', 'ATLETIK', 'Cabang olahraga atletik');

-- Kriteria Keterampilan – Sepak Bola (id=1)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(1, 'Teknik Dasar', 40.00, 1),
(1, 'Permainan', 30.00, 2),
(1, 'Fisik', 20.00, 3),
(1, 'Sikap', 10.00, 4);

-- Kriteria Keterampilan – Bulu Tangkis (id=2)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(2, 'Teknik Dasar', 35.00, 1),
(2, 'Strategi Permainan', 30.00, 2),
(2, 'Fisik & Kelincahan', 25.00, 3),
(2, 'Sikap & Sportivitas', 10.00, 4);

-- Kriteria Keterampilan – Karate (id=3)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(3, 'Kata (Jurus)', 40.00, 1),
(3, 'Kumite (Pertarungan)', 35.00, 2),
(3, 'Fisik & Kecepatan', 15.00, 3),
(3, 'Disiplin & Etika', 10.00, 4);

-- Kriteria Keterampilan – Pencak Silat (id=4)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(4, 'Teknik Jurus', 40.00, 1),
(4, 'Tanding', 30.00, 2),
(4, 'Fisik & Kelincahan', 20.00, 3),
(4, 'Sikap & Perilaku', 10.00, 4);

-- Kriteria Keterampilan – Renang (id=5)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(5, 'Teknik Gaya', 40.00, 1),
(5, 'Kecepatan', 35.00, 2),
(5, 'Daya Tahan', 15.00, 3),
(5, 'Sikap', 10.00, 4);

-- Kriteria Keterampilan – Atletik (id=6)
INSERT INTO `kriteria_keterampilan` (`cabang_olahraga_id`, `nama`, `bobot`, `urutan`) VALUES
(6, 'Teknik', 40.00, 1),
(6, 'Kecepatan/Jarak', 35.00, 2),
(6, 'Ketahanan', 15.00, 3),
(6, 'Sikap', 10.00, 4);

-- Siswa Sample
INSERT INTO `siswa` (`nisn`, `nis`, `nama`, `kelas`, `jenis_kelamin`, `cabang_olahraga_id`) VALUES
('9983456781', '2024001', 'Ahmad Fauzi', 'X-A', 'L', 1),
('9983456782', '2024002', 'Rizky Pratama', 'X-A', 'L', 1),
('9983456783', '2024003', 'Muhammad Iqbal', 'X-A', 'L', 2),
('9983456784', '2024004', 'Siti Nurhaliza', 'X-B', 'P', 2),
('9983456785', '2024005', 'Dewi Anggraini', 'X-B', 'P', 3),
('9983456786', '2024006', 'Andi Wijaya', 'X-B', 'L', 3),
('9983456787', '2024007', 'Bagas Setiawan', 'XI-A', 'L', 4),
('9983456788', '2024008', 'Nur Fadilah', 'XI-A', 'P', 4),
('9983456789', '2024009', 'Reza Maulana', 'XI-A', 'L', 5),
('9983456790', '2024010', 'Fitriani', 'XI-B', 'P', 5),
('9983456791', '2024011', 'Dani Kurniawan', 'XI-B', 'L', 6),
('9983456792', '2024012', 'Ayu Lestari', 'XI-B', 'P', 6);

-- Penugasan Guru ke Kelas (untuk tahun_ajaran_id=2 yang aktif)
INSERT INTO `guru_kelas` (`user_id`, `kelas`, `tahun_ajaran_id`) VALUES
(2, 'X-A', 2), (2, 'X-B', 2),
(3, 'XI-A', 2), (3, 'XI-B', 2),
(4, 'XII-A', 2);

-- Setting Prestasi (Global)
INSERT INTO `setting_prestasi` (`tingkatan`, `nilai`, `urutan`) VALUES
('Internasional', 100.00, 1),
('Nasional', 97.00, 2),
('Provinsi', 94.00, 3),
('Kabupaten/Kota', 90.00, 4),
('Kecamatan', 85.00, 5),
('Pelajar/Sekolah', 80.00, 6),
('Tidak Ada Prestasi', 75.00, 7);

-- Setting Kehadiran (Global)
INSERT INTO `setting_kehadiran` (`kategori`, `nilai_min`, `nilai_max`, `nilai_konversi`, `urutan`) VALUES
('Baik Sekali', 86.00, 100.00, 95.00, 1),
('Baik',        76.00, 85.99, 80.00, 2),
('Cukup',       60.00, 75.99, 67.00, 3),
('Kurang',       0.00, 59.99, 50.00, 4);

-- Setting Bobot Utama (Global – hanya 1 baris)
INSERT INTO `setting_bobot_utama` (`bobot_keterampilan`, `bobot_prestasi`, `bobot_kehadiran`) VALUES
(50.00, 30.00, 20.00);

COMMIT;
