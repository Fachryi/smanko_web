<?php
// ============================================================
// GET /api/wakasek/rekap_kehadiran.php
// Rekap kehadiran siswa per semester yang sudah dinilai guru
// Lengkap dengan info cabor dan pendamping cabor
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$user = requireRole(['wakasek', 'admin']);
$pdo  = getDB();

// Auto-create pendamping_cabor jika belum ada (safety)
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `pendamping_cabor` (
        `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `cabang_olahraga_id`  INT UNSIGNED NOT NULL,
        `nama`                VARCHAR(150) NOT NULL,
        `nip`                 VARCHAR(30)  NOT NULL DEFAULT '',
        `kode_guru`           VARCHAR(30)  NOT NULL DEFAULT '',
        `is_utama`            TINYINT(1)   NOT NULL DEFAULT 0,
        `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_cabor` (`cabang_olahraga_id`),
        CONSTRAINT `fk_pendamping_cabor` FOREIGN KEY (`cabang_olahraga_id`)
            REFERENCES `cabang_olahraga`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$taId = (int)($_GET['tahun_ajaran_id'] ?? 0);
if (!$taId) {
    $r = $pdo->query("SELECT id FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1")->fetch();
    $taId = $r ? (int)$r['id'] : 0;
}
if (!$taId) errorResponse('Tidak ada tahun ajaran aktif.', 404);

// Ambil info semester dari tahun_ajaran
$taInfo = $pdo->prepare("SELECT nama, semester FROM tahun_ajaran WHERE id = ?");
$taInfo->execute([$taId]);
$ta = $taInfo->fetch(PDO::FETCH_ASSOC);
$semesterLabel = $ta ? 'Semester ' . $ta['semester'] . ' – ' . $ta['nama'] : 'Semester Aktif';
$semesterNum   = $ta ? (int)$ta['semester'] : 0;

// ── Rekap kehadiran per siswa ────────────────────────────────
$stmt = $pdo->prepare("
    SELECT
        s.id             AS siswa_id,
        s.nisn,
        s.nis,
        s.nama           AS nama_siswa,
        s.kelas,
        s.jenis_kelamin,
        co.id            AS cabang_olahraga_id,
        co.nama          AS nama_cabang,
        co.kode          AS kode_cabang,
        ph.id            AS penilaian_id,
        ph.status        AS status_penilaian,
        ta.semester,
        ta.nama          AS nama_tahun_ajaran,
        pk.total_sesi,
        pk.total_hadir,
        COALESCE(pk.persentase, 0)  AS persentase_hadir,
        ph.nilai_kehadiran,
        u.nama           AS nama_penilai,
        COALESCE(pd.nama, '')       AS pendamping_nama,
        COALESCE(pd.nip,  '')       AS pendamping_nip,
        COALESCE(pd.kode_guru, '')  AS pendamping_kode_guru
    FROM penilaian_header ph
    JOIN siswa s              ON s.id  = ph.siswa_id
    JOIN cabang_olahraga co   ON co.id = s.cabang_olahraga_id
    JOIN tahun_ajaran ta      ON ta.id = ph.tahun_ajaran_id
    JOIN users u              ON u.id  = ph.guru_id
    LEFT JOIN penilaian_kehadiran pk ON pk.penilaian_id = ph.id
    LEFT JOIN pendamping_cabor pd    ON pd.cabang_olahraga_id = co.id AND pd.is_utama = 1
    WHERE ph.tahun_ajaran_id = ?
    ORDER BY co.nama ASC, s.kelas ASC, s.nama ASC
");
$stmt->execute([$taId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ── Ringkasan per cabor ───────────────────────────────────
$stmt2 = $pdo->prepare("
    SELECT
        co.id             AS cabang_olahraga_id,
        co.nama           AS nama_cabang,
        co.kode           AS kode_cabang,
        COUNT(DISTINCT s.id)         AS total_siswa_dinilai,
        ROUND(AVG(pk.persentase), 1) AS avg_kehadiran,
        SUM(pk.total_sesi)           AS total_sesi_all,
        SUM(pk.total_hadir)          AS total_hadir_all,
        COALESCE(pd.nama, '')        AS pendamping_nama,
        COALESCE(pd.nip, '')         AS pendamping_nip
    FROM penilaian_header ph
    JOIN siswa s              ON s.id  = ph.siswa_id
    JOIN cabang_olahraga co   ON co.id = s.cabang_olahraga_id
    LEFT JOIN penilaian_kehadiran pk ON pk.penilaian_id = ph.id
    LEFT JOIN pendamping_cabor pd    ON pd.cabang_olahraga_id = co.id AND pd.is_utama = 1
    WHERE ph.tahun_ajaran_id = ?
    GROUP BY co.id, co.nama, co.kode, pd.nama, pd.nip
    ORDER BY co.nama ASC
");
$stmt2->execute([$taId]);
$ringkasanCabor = $stmt2->fetchAll(PDO::FETCH_ASSOC);

successResponse([
    'tahun_ajaran_id' => $taId,
    'semester_label'  => $semesterLabel,
    'semester_num'    => $semesterNum,
    'rekap'           => $rows,
    'ringkasan_cabor' => $ringkasanCabor,
]);
