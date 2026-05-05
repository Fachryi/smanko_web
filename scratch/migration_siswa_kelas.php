<?php
require_once __DIR__ . '/../api/helpers/functions.php';

$pdo = getDB();

try {
    $pdo->beginTransaction();

    // 1. Create siswa_kelas table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `siswa_kelas` (
          `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `siswa_id`        INT UNSIGNED NOT NULL,
          `tahun_ajaran_id` INT UNSIGNED NOT NULL,
          `kelas`           VARCHAR(20)  NOT NULL,
          `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY `uq_siswa_ta` (`siswa_id`, `tahun_ajaran_id`),
          FOREIGN KEY (`siswa_id`) REFERENCES `siswa`(`id`) ON DELETE CASCADE,
          FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Table siswa_kelas created or already exists.\n";

    // 2. Migrate existing data for ACTIVE year
    // Get active TA
    $taStmt = $pdo->query("SELECT id FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");
    $taId = $taStmt->fetchColumn();

    if ($taId) {
        // Insert into siswa_kelas from siswa table
        $count = $pdo->exec("
            INSERT IGNORE INTO siswa_kelas (siswa_id, tahun_ajaran_id, kelas)
            SELECT id, $taId, kelas FROM siswa
        ");
        echo "Migrated $count student mappings to active academic year ($taId).\n";
        
        // Also migrate for Tuntup (Closed) years if there is assessment data
        // This is important because teacher panel might look back at closed years
        $taClosed = $pdo->query("SELECT id FROM tahun_ajaran WHERE status = 'tutup'")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($taClosed as $cid) {
            // Only migrate if assessment exists for that student in that year
            $count = $pdo->exec("
                INSERT IGNORE INTO siswa_kelas (siswa_id, tahun_ajaran_id, kelas)
                SELECT ph.siswa_id, ph.tahun_ajaran_id, s.kelas
                FROM penilaian_header ph
                JOIN siswa s ON s.id = ph.siswa_id
                WHERE ph.tahun_ajaran_id = $cid
            ");
            echo "Migrated $count student mappings for closed year ($cid) based on historical assessments.\n";
        }
    } else {
        echo "No active academic year found. Migration skipped.\n";
    }

    $pdo->commit();
    echo "Migration successful.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
