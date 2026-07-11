<?php
// ============================================================
// GET /api/public/landing.php
// Endpoint PUBLIK (tanpa autentikasi) untuk Landing Page.
// Mengembalikan:
//   - cabor   : daftar cabang olahraga + pelatih utama
//   - klasemen: siswa berprestasi (sorted by nilai_akhir DESC)
//              + prestasi_list: semua kejuaraan per siswa
//   - stats   : ringkasan angka sekolah
// ============================================================
require_once __DIR__ . '/../config/database.php';

// ── CORS – izinkan semua origin (endpoint publik) ──────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method tidak diizinkan.']);
    exit;
}

$pdo = getDB();

// ── 1. Tahun Ajaran Aktif ──────────────────────────────────
$taRow = $pdo->query("SELECT id, nama, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1")->fetch();
$taId  = $taRow ? (int)$taRow['id'] : null;

// ── 2. Cabang Olahraga + Pelatih Utama ────────────────────
$cabangStmt = $pdo->query("
    SELECT
        c.id,
        c.nama,
        c.kode,
        c.deskripsi,
        (SELECT COUNT(*) FROM siswa s WHERE s.cabang_olahraga_id = c.id AND s.status = 'aktif') AS jumlah_siswa,
        (SELECT COUNT(*) FROM kriteria_keterampilan k WHERE k.cabang_olahraga_id = c.id) AS jumlah_kriteria,
        (SELECT COUNT(DISTINCT pp.id)
         FROM penilaian_prestasi pp
         JOIN penilaian_header ph ON ph.id = pp.penilaian_id
         JOIN siswa s ON s.id = ph.siswa_id
         WHERE s.cabang_olahraga_id = c.id) AS jumlah_prestasi
    FROM cabang_olahraga c
    ORDER BY c.nama ASC
");
$cabangList = $cabangStmt->fetchAll(PDO::FETCH_ASSOC);

// Pelatih utama per cabor
$pelatihStmt = $pdo->prepare("
    SELECT u.nama AS nama_guru, u.id AS guru_id, COUNT(*) AS jml
    FROM penilaian_header ph
    JOIN siswa s ON s.id = ph.siswa_id
    JOIN users u ON u.id = ph.guru_id
    WHERE s.cabang_olahraga_id = ?
    GROUP BY u.id, u.nama
    ORDER BY jml DESC
    LIMIT 1
");

// Siswa list per cabor
$siswaListStmt = $pdo->prepare("
    SELECT nama, kelas, jenis_kelamin
    FROM siswa
    WHERE cabang_olahraga_id = ? AND status = 'aktif'
    ORDER BY kelas ASC, nama ASC
");

// Profil pelatih per cabor
$profilPelatihStmt = $pdo->prepare("
    SELECT id, nama, foto, no_telepon, keterangan
    FROM profil_pelatih
    WHERE cabang_olahraga_id = ?
    ORDER BY id ASC
");

foreach ($cabangList as &$cabang) {
    $profilPelatihStmt->execute([$cabang['id']]);
    $cabang['profil_pelatih'] = $profilPelatihStmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($cabang['profil_pelatih'])) {
        $cabang['nama_pelatih'] = $cabang['profil_pelatih'][0]['nama'];
    } else {
        $cabang['nama_pelatih'] = 'Belum Ditugaskan';
    }
    
    $siswaListStmt->execute([$cabang['id']]);
    $cabang['siswa_list'] = $siswaListStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $cabang['jumlah_penilaian'] = 0;
}
unset($cabang);

// ── 3. Klasemen Siswa Berprestasi ─────────────────────────
$klasemenParams = [];
$taCond = '';
if ($taId) {
    $taCond = 'AND ph.tahun_ajaran_id = ?';
    $klasemenParams[] = $taId;
}

$klasemenStmt = $pdo->prepare("
    SELECT
        s.id            AS siswa_id,
        s.nama          AS nama_siswa,
        s.nis,
        s.kelas,
        s.jenis_kelamin,
        c.id            AS cabang_id,
        c.nama          AS nama_cabang,
        c.kode          AS kode_cabang,
        ROUND(ph.nilai_keterampilan, 1) AS keterampilan,
        ROUND(ph.nilai_prestasi, 1)     AS prestasi,
        ROUND(ph.nilai_kehadiran, 1)    AS kehadiran,
        ROUND(ph.nilai_akhir, 2)        AS total_skor,
        ph.predikat,
        ph.id           AS penilaian_id,
        ph.status       AS status_penilaian,
        COALESCE(ROUND(pk.persentase, 1), ph.nilai_kehadiran) AS persen_hadir,
        ta.nama         AS tahun_ajaran,
        ta.semester,
        COALESCE(
            (SELECT nama FROM profil_pelatih ppel WHERE ppel.id = s.pelatih_id LIMIT 1),
            (SELECT nama FROM profil_pelatih ppel WHERE ppel.cabang_olahraga_id = c.id ORDER BY ppel.id ASC LIMIT 1),
            'Belum Ditugaskan'
        ) AS nama_pelatih,
        COALESCE(
            (SELECT pp.tingkatan
             FROM penilaian_prestasi pp
             WHERE pp.penilaian_id = ph.id
               AND pp.tingkatan NOT IN ('Tidak Ada Prestasi','')
             ORDER BY pp.nilai DESC LIMIT 1),
            '-'
        ) AS prestasi_tingkatan
    FROM penilaian_header ph
    JOIN siswa s            ON s.id  = ph.siswa_id
    JOIN cabang_olahraga c  ON c.id  = s.cabang_olahraga_id
    JOIN tahun_ajaran ta    ON ta.id = ph.tahun_ajaran_id
    LEFT JOIN penilaian_kehadiran pk ON pk.penilaian_id = ph.id
    LEFT JOIN users u       ON u.id  = ph.guru_id
    WHERE s.status = 'aktif'
      AND ph.nilai_akhir IS NOT NULL
      $taCond
    ORDER BY ph.nilai_akhir DESC
");
$klasemenStmt->execute($klasemenParams);
$klasemenRaw = $klasemenStmt->fetchAll(PDO::FETCH_ASSOC);

// ── Ambil SEMUA detail prestasi per penilaian_id (1 query batch) ──
$penilaianIds = array_column($klasemenRaw, 'penilaian_id');
$prestasiMap  = [];

if (!empty($penilaianIds)) {
    $placeholders = implode(',', array_fill(0, count($penilaianIds), '?'));
    $ppStmt = $pdo->prepare("
        SELECT
            pp.penilaian_id,
            pp.nama_kejuaraan,
            pp.tingkatan,
            pp.peringkat,
            pp.bulan,
            pp.nilai       AS nilai_prestasi,
            pp.bukti_foto
        FROM penilaian_prestasi pp
        WHERE pp.penilaian_id IN ($placeholders)
        ORDER BY pp.nilai DESC, pp.bulan ASC
    ");
    $ppStmt->execute($penilaianIds);
    foreach ($ppStmt->fetchAll(PDO::FETCH_ASSOC) as $ppRow) {
        $pid = (int)$ppRow['penilaian_id'];
        $ppRow['nilai_prestasi'] = (float)$ppRow['nilai_prestasi'];
        $ppRow['bulan']          = $ppRow['bulan'] ? (int)$ppRow['bulan'] : null;
        $prestasiMap[$pid][]     = $ppRow;
    }
}

// Tambahkan rank + injeksi prestasi_list ke setiap siswa
$rank = 1;
foreach ($klasemenRaw as &$row) {
    $pid                    = (int)$row['penilaian_id'];
    $row['rank']            = $rank++;
    $row['keterampilan']    = (float)$row['keterampilan'];
    $row['prestasi']        = (float)$row['prestasi'];
    $row['kehadiran']       = (float)$row['kehadiran'];
    $row['total_skor']      = (float)$row['total_skor'];
    $row['persen_hadir']    = (float)$row['persen_hadir'];
    $row['prestasi_list']   = $prestasiMap[$pid] ?? [];

    // Hitung prestasi nyata (selain "Tidak Ada Prestasi")
    $row['jumlah_prestasi'] = count(array_filter(
        $row['prestasi_list'],
        fn($p) => !in_array($p['tingkatan'] ?? '', ['Tidak Ada Prestasi', '', null], true)
    ));
}
unset($row);

// ── 4. Stats Sekolah ──────────────────────────────────────
$statsStmt = $pdo->query("
    SELECT
        (SELECT COUNT(*) FROM siswa WHERE status = 'aktif') AS total_siswa,
        (SELECT COUNT(*) FROM cabang_olahraga) AS total_cabor,
        (SELECT COUNT(*) FROM profil_pelatih) AS total_pelatih
");
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

$prestasiStats = $pdo->query("
    SELECT COUNT(DISTINCT ph.siswa_id) AS total_berprestasi
    FROM penilaian_prestasi pp
    JOIN penilaian_header ph ON ph.id = pp.penilaian_id
    WHERE pp.tingkatan IN ('Nasional','Internasional')
")->fetch(PDO::FETCH_ASSOC);

$stats['total_berprestasi'] = (int)($prestasiStats['total_berprestasi'] ?? 0);
$stats['total_siswa']       = (int)$stats['total_siswa'];
$stats['total_cabor']       = (int)$stats['total_cabor'];
$stats['total_pelatih']     = (int)$stats['total_pelatih'];

// ── 5. Response ───────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => 'Berhasil',
    'data'    => [
        'tahun_ajaran' => $taRow,
        'cabor'        => $cabangList,
        'klasemen'     => $klasemenRaw,
        'stats'        => $stats,
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
