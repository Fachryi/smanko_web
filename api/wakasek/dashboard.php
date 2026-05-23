<?php
// ============================================================
// GET /api/wakasek/dashboard.php
// Dashboard "Helicopter View" untuk Wakasek Kesiswaan
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';

setCORSHeaders();
$user = requireRole(['wakasek', 'admin']);
$pdo  = getDB();

// ── Tahun Ajaran ──────────────────────────────────────────
$taId = (int)($_GET['tahun_ajaran_id'] ?? 0);
if (!$taId) {
    $r = $pdo->query("SELECT id FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1")->fetch();
    $taId = $r ? (int)$r['id'] : 0;
}
if (!$taId) errorResponse('Tidak ada tahun ajaran aktif.', 404);

// ── 1. Overview Stats ─────────────────────────────────────
$stmt = $pdo->prepare("
    SELECT
        (SELECT COUNT(*) FROM siswa WHERE status = 'aktif') AS total_siswa,
        COUNT(DISTINCT ph.id)                               AS total_dinilai,
        (
            SELECT COUNT(DISTINCT ph_sub.siswa_id)
            FROM penilaian_header ph_sub
            JOIN penilaian_prestasi pp_sub ON pp_sub.penilaian_id = ph_sub.id
            WHERE ph_sub.tahun_ajaran_id = ? AND pp_sub.tingkatan NOT IN ('Tidak Ada Prestasi', '')
        )                                                   AS total_siswa_berprestasi,
        ROUND(AVG(ph.nilai_akhir), 2)                       AS rata_rata,
        ROUND(MAX(ph.nilai_akhir), 2)                       AS tertinggi,
        ROUND(MIN(ph.nilai_akhir), 2)                       AS terendah,
        SUM(CASE WHEN ph.status = 'final' THEN 1 ELSE 0 END) AS total_final
    FROM penilaian_header ph
    WHERE ph.tahun_ajaran_id = ?
");
$stmt->execute([$taId, $taId]);
$overview = $stmt->fetch();

// ── 2. Per Cabang Olahraga (Bar Chart) ───────────────────
$stmt = $pdo->prepare("
    SELECT
        co.id   AS cabang_id,
        co.nama AS cabang,
        co.kode,
        COUNT(DISTINCT s.id)                     AS total_siswa,
        COUNT(DISTINCT ph.id)                    AS total_dinilai,
        COALESCE(ROUND(AVG(ph.nilai_keterampilan), 2), 0) AS avg_keterampilan,
        COALESCE(ROUND(AVG(ph.nilai_prestasi), 2), 0)     AS avg_prestasi,
        COALESCE(ROUND(AVG(ph.nilai_kehadiran), 2), 0)    AS avg_kehadiran,
        COALESCE(ROUND(AVG(ph.nilai_akhir), 2), 0)        AS avg_akhir,
        COALESCE(ROUND(MAX(ph.nilai_akhir), 2), 0)        AS max_akhir,
        COALESCE(ROUND(MIN(ph.nilai_akhir), 2), 0)        AS min_akhir
    FROM cabang_olahraga co
    LEFT JOIN siswa s  ON s.cabang_olahraga_id = co.id AND s.status = 'aktif'
    LEFT JOIN penilaian_header ph ON ph.siswa_id = s.id AND ph.tahun_ajaran_id = ?
    GROUP BY co.id, co.nama, co.kode
    HAVING total_dinilai > 0
    ORDER BY avg_akhir DESC
");
$stmt->execute([$taId]);
$perCabang = $stmt->fetchAll();

// ── 3. Prestasi Distribusi (Donut + Drill-down) ───────────
$stmt = $pdo->prepare("
    SELECT pp.tingkatan, COUNT(*) AS jumlah
    FROM penilaian_prestasi pp
    JOIN penilaian_header ph ON ph.id = pp.penilaian_id AND ph.tahun_ajaran_id = ?
    WHERE pp.tingkatan NOT IN ('Tidak Ada Prestasi', '')
    GROUP BY pp.tingkatan
    ORDER BY FIELD(pp.tingkatan,
        'Internasional','Nasional','Provinsi','Kabupaten/Kota','Pelajar/Sekolah'
    )
");
$stmt->execute([$taId]);
$prestasiDist = $stmt->fetchAll();

// Siswa detail per tingkatan (untuk drill-down)
$stmt = $pdo->prepare("
    SELECT
        pp.tingkatan,
        s.id AS siswa_id, s.nama, s.nis, COALESCE(ph.kelas, s.kelas) AS kelas, s.jenis_kelamin,
        co.nama AS nama_cabang,
        pp.nama_kejuaraan, pp.peringkat, pp.bukti_foto,
        ROUND(ph.nilai_akhir, 2) AS nilai_akhir, ph.predikat
    FROM penilaian_prestasi pp
    JOIN penilaian_header ph ON ph.id = pp.penilaian_id AND ph.tahun_ajaran_id = ?
    JOIN siswa s  ON s.id  = ph.siswa_id
    JOIN cabang_olahraga co ON co.id = s.cabang_olahraga_id
    WHERE pp.tingkatan NOT IN ('Tidak Ada Prestasi', '')
    ORDER BY pp.tingkatan, ph.nilai_akhir DESC
");
$stmt->execute([$taId]);
$prestasiDetail = $stmt->fetchAll();

// Kelompokkan siswa per tingkatan
$prestasiByTingkatan = [];
foreach ($prestasiDetail as $row) {
    $prestasiByTingkatan[$row['tingkatan']][] = $row;
}
foreach ($prestasiDist as &$d) {
    $d['siswa'] = $prestasiByTingkatan[$d['tingkatan']] ?? [];
}
unset($d);

// ── 4. Kehadiran Per Kelas (Stacked Bar) ─────────────────
$stmt = $pdo->prepare("
    SELECT
        s.kelas,
        SUM(CASE WHEN pk.persentase >= 90                          THEN 1 ELSE 0 END) AS baik_sekali,
        SUM(CASE WHEN pk.persentase >= 75 AND pk.persentase < 90   THEN 1 ELSE 0 END) AS baik,
        SUM(CASE WHEN pk.persentase >= 60 AND pk.persentase < 75   THEN 1 ELSE 0 END) AS sedang,
        SUM(CASE WHEN pk.persentase <  60                          THEN 1 ELSE 0 END) AS kurang,
        ROUND(AVG(pk.persentase), 1)                                                   AS avg_persen
    FROM penilaian_kehadiran pk
    JOIN penilaian_header ph ON ph.id = pk.penilaian_id AND ph.tahun_ajaran_id = ?
    JOIN siswa s ON s.id = ph.siswa_id
    GROUP BY s.kelas
    ORDER BY s.kelas
");
$stmt->execute([$taId]);
$kehadiranKelas = $stmt->fetchAll();

// ── 5. Top Performers – Leaderboard ──────────────────────
$stmt = $pdo->prepare("
    SELECT
        s.id AS siswa_id, s.nisn, s.nama, s.nis, COALESCE(ph.kelas, s.kelas) AS kelas, s.jenis_kelamin,
        co.nama  AS nama_cabang, co.kode AS kode_cabang,
        ROUND(ph.nilai_akhir, 2)          AS nilai_akhir,
        ph.predikat, ph.status,
        ROUND(ph.nilai_keterampilan, 2)   AS nilai_keterampilan,
        ROUND(ph.nilai_prestasi, 2)       AS nilai_prestasi,
        ROUND(ph.nilai_kehadiran, 2)      AS nilai_kehadiran,
        COALESCE((SELECT tingkatan FROM penilaian_prestasi pp WHERE pp.penilaian_id = ph.id ORDER BY nilai DESC LIMIT 1), '-') AS prestasi_tingkatan
    FROM penilaian_header ph
    JOIN siswa s            ON s.id   = ph.siswa_id
    JOIN cabang_olahraga co ON co.id  = s.cabang_olahraga_id
    WHERE ph.tahun_ajaran_id = ?
    ORDER BY ph.nilai_akhir DESC
    LIMIT 10
");
$stmt->execute([$taId]);
$topPerformers = $stmt->fetchAll();

// ── 6. Distribusi Predikat (Untuk info card & chart) ─────
$stmt = $pdo->prepare("
    SELECT predikat, COUNT(*) AS jumlah
    FROM penilaian_header
    WHERE tahun_ajaran_id = ?
    GROUP BY predikat
    ORDER BY FIELD(predikat,
        'A (Istimewa)','B (Baik)','C (Cukup)','D (Kurang)','E (Sangat Kurang)'
    )
");
$stmt->execute([$taId]);
$predikatDist = $stmt->fetchAll();

// ── 7. Semua siswa (untuk export PDF rekap penuh) ────────
$stmt = $pdo->prepare("
    SELECT
        s.id AS siswa_id, s.nisn, s.nama, s.nis, COALESCE(ph.kelas, s.kelas) AS kelas, s.jenis_kelamin,
        co.nama  AS nama_cabang, co.kode AS kode_cabang,
        ROUND(ph.nilai_keterampilan, 2)  AS nilai_keterampilan,
        ROUND(ph.nilai_prestasi, 2)      AS nilai_prestasi,
        ROUND(ph.nilai_kehadiran, 2)     AS nilai_kehadiran,
        ROUND(ph.nilai_akhir, 2)         AS nilai_akhir,
        ph.predikat, ph.status,
        COALESCE((SELECT tingkatan FROM penilaian_prestasi pp WHERE pp.penilaian_id = ph.id ORDER BY nilai DESC LIMIT 1), '-')  AS prestasi_tingkatan,
        COALESCE(ROUND(pk.persentase,1), 0) AS persen_hadir,
        u.nama AS nama_guru
    FROM penilaian_header ph
    JOIN siswa s            ON s.id   = ph.siswa_id
    JOIN cabang_olahraga co ON co.id  = s.cabang_olahraga_id
    JOIN users u            ON u.id   = ph.guru_id
    LEFT JOIN penilaian_kehadiran pk ON pk.penilaian_id = ph.id
    WHERE ph.tahun_ajaran_id = ?
    ORDER BY COALESCE(ph.kelas, s.kelas), ph.nilai_akhir DESC
");
$stmt->execute([$taId]);
$allSiswa = $stmt->fetchAll();

successResponse([
    'tahun_ajaran_id' => $taId,
    'overview'        => $overview,
    'per_cabang'      => $perCabang,
    'prestasi_dist'   => $prestasiDist,
    'kehadiran_kelas' => $kehadiranKelas,
    'top_performers'  => $topPerformers,
    'predikat_dist'   => $predikatDist,
    'all_siswa'       => $allSiswa,
]);
