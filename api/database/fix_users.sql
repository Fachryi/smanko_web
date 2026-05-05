-- Fix users table for SMANKO
-- Run this in phpMyAdmin or via mysql CLI

USE smko_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables that depend on users
DROP TABLE IF EXISTS penilaian_keterampilan;
DROP TABLE IF EXISTS penilaian_prestasi;
DROP TABLE IF EXISTS penilaian_kehadiran;
DROP TABLE IF EXISTS penilaian_header;
DROP TABLE IF EXISTS guru_kelas;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Recreate users table with correct SMANKO structure
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

-- Recreate sessions table
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

-- Recreate guru_kelas table
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

-- Recreate penilaian_header table
CREATE TABLE `penilaian_header` (
  `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `siswa_id`              INT UNSIGNED NOT NULL,
  `guru_id`               INT UNSIGNED NOT NULL,
  `tahun_ajaran_id`       INT UNSIGNED NOT NULL,
  `nilai_keterampilan`    DECIMAL(6,2),
  `nilai_prestasi`        DECIMAL(6,2),
  `nilai_kehadiran`       DECIMAL(6,2),
  `nilai_akhir`           DECIMAL(6,2),
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

-- Recreate penilaian_keterampilan
CREATE TABLE `penilaian_keterampilan` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `penilaian_id`    INT UNSIGNED NOT NULL,
  `kriteria_id`     INT UNSIGNED NOT NULL,
  `nilai_mentah`    DECIMAL(5,2) NOT NULL,
  `nilai_berbobot`  DECIMAL(6,4) NOT NULL,
  UNIQUE KEY `uq_detail` (`penilaian_id`, `kriteria_id`),
  FOREIGN KEY (`penilaian_id`) REFERENCES `penilaian_header`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`kriteria_id`)  REFERENCES `kriteria_keterampilan`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recreate penilaian_prestasi
CREATE TABLE `penilaian_prestasi` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `penilaian_id`    INT UNSIGNED NOT NULL UNIQUE,
  `nama_kejuaraan`  VARCHAR(255),
  `tingkatan`       VARCHAR(50),
  `peringkat`       VARCHAR(50),
  `bukti_foto`      VARCHAR(500),
  `nilai`           DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  FOREIGN KEY (`penilaian_id`) REFERENCES `penilaian_header`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recreate penilaian_kehadiran
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

-- Insert default users
-- password 'admin123' -> bcrypt hash generated via PHP password_hash()
INSERT INTO `users` (`nama`, `username`, `password_hash`, `role`, `status`) VALUES
('Administrator', 'admin',        '$2y$10$GQUaD706mqVyHA2DioKGJ.AZdPGW707nXfN0NjNJ42Gjbuu30lPVq', 'admin',         'aktif'),
('Budi Santoso',  'guru_budi',    '$2y$10$GQUaD706mqVyHA2DioKGJ.AZdPGW707nXfN0NjNJ42Gjbuu30lPVq', 'guru_olahraga', 'aktif'),
('Sari Dewi',     'guru_sari',    '$2y$10$GQUaD706mqVyHA2DioKGJ.AZdPGW707nXfN0NjNJ42Gjbuu30lPVq', 'guru_olahraga', 'aktif'),
('Ahmad Rifai',   'guru_ahmad',   '$2y$10$GQUaD706mqVyHA2DioKGJ.AZdPGW707nXfN0NjNJ42Gjbuu30lPVq', 'guru_olahraga', 'aktif'),
('Rina Hasanah',  'wakasek_rina', '$2y$10$GQUaD706mqVyHA2DioKGJ.AZdPGW707nXfN0NjNJ42Gjbuu30lPVq', 'wakasek',       'aktif');

-- Insert guru_kelas assignments (tahun_ajaran_id=2 = aktif)
INSERT INTO `guru_kelas` (`user_id`, `kelas`, `tahun_ajaran_id`) VALUES
(2, 'X-A', 2), (2, 'X-B', 2),
(3, 'XI-A', 2), (3, 'XI-B', 2),
(4, 'XII-A', 2);
