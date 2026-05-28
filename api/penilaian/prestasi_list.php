<?php
// ============================================================
// /api/penilaian/prestasi_list.php
// GET → daftar prestasi siswa (untuk tab Prestasi di RekapGuruPage)
// Filter: tahun_ajaran_id, cabang_olahraga_id, bulan, peringkat
// Hanya data dari kelas yang ditugaskan ke guru tersebut
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$user = requireRole(['guru_olahraga', 'admin', 'wakasek']);
$pdo  = getDB();

$taId    = (int)($_GET['tahun_ajaran_id']    ?? 0);
$caborId = (int)($_GET['cabang_olahraga_id'] ?? 0);
$bulan   = trim($_GET['bulan']    ?? '');   // format: 1-12
$juara   = trim($_GET['peringkat'] ?? '');   // misal: "Juara 1"

if (!$taId) errorResponse('tahun_ajaran_id diperlukan.', 422);

// Base query
$where = ['ph.tahun_ajaran_id = ?'];
$params = [$taId];

// Filter kelas (hanya kelas yg ditugaskan ke guru),
// atau data yang pernah diinput oleh guru tersebut
if ($user['role'] === 'guru_olahraga') {
    $where[] = "(COALESCE(ph.kelas, s.kelas) IN (
        SELECT kelas FROM guru_kelas
        WHERE user_id = ? AND tahun_ajaran_id = ?
    ) OR ph.guru_id = ?)";
    $params[] = $user['id'];
    $params[] = $taId;
    $params[] = $user['id'];
}

if ($caborId) {
    $where[] = 's.cabang_olahraga_id = ?';
    $params[] = $caborId;
}

if ($juara) {
    $where[] = 'pp.peringkat LIKE ?';
    $params[] = '%' . $juara . '%';
}

if ($bulan && is_numeric($bulan)) {
    $where[] = 'pp.bulan = ?';
    $params[] = (int)$bulan;
}

$whereClause = implode(' AND ', $where);

$sql = "
    SELECT
        pp.id            AS prestasi_id,
        pp.nama_kejuaraan,
        pp.bulan,
        pp.tingkatan,
        pp.peringkat,
        pp.nilai         AS nilai_prestasi,
        pp.bukti_foto,
        pp.created_at    AS tanggal_input,

        s.id             AS siswa_id,
        s.nis,
        s.nama           AS nama_siswa,
        COALESCE(ph.kelas, s.kelas) AS kelas,
        s.jenis_kelamin,

        c.nama           AS nama_cabang,
        c.kode           AS kode_cabang,

        u.nama           AS nama_guru,
        ta.nama          AS tahun_ajaran,
        ta.semester

    FROM penilaian_prestasi pp
    JOIN penilaian_header   ph ON ph.id  = pp.penilaian_id
    JOIN siswa              s  ON s.id   = ph.siswa_id AND s.status = 'aktif'
    JOIN cabang_olahraga    c  ON c.id   = s.cabang_olahraga_id
    JOIN users              u  ON u.id   = ph.guru_id
    JOIN tahun_ajaran       ta ON ta.id  = ph.tahun_ajaran_id
    WHERE $whereClause
      AND pp.tingkatan != 'Tidak Ada Prestasi'
      AND pp.tingkatan IS NOT NULL
      AND pp.tingkatan != ''
    ORDER BY pp.nilai DESC, s.nama ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Juga ambil daftar cabor yang tersedia untuk filter
$caborStmt = $pdo->query("SELECT id, nama, kode FROM cabang_olahraga ORDER BY nama");
$caborList = $caborStmt->fetchAll();

// Daftar peringkat unik yang ada
$peringkatStmt = $pdo->prepare("
    SELECT DISTINCT pp.peringkat
    FROM penilaian_prestasi pp
    JOIN penilaian_header ph ON ph.id = pp.penilaian_id
    WHERE ph.tahun_ajaran_id = ?
      AND pp.peringkat IS NOT NULL AND pp.peringkat != ''
    ORDER BY pp.peringkat
");
$peringkatStmt->execute([$taId]);
$peringkatList = $peringkatStmt->fetchAll(PDO::FETCH_COLUMN);

successResponse([
    'prestasi' => $rows,
    'total'    => count($rows),
    'cabor'    => $caborList,
    'peringkat'=> $peringkatList,
]);
