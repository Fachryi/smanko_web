<?php
// ============================================================
// /api/penilaian/status_kelas.php
// GET ?kelas=X-A&tahun_ajaran_id=N
// → daftar siswa di kelas + status penilaian masing-masing
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Method tidak diizinkan.', 405);
$user = requireRole(['guru_olahraga', 'admin']);
$pdo  = getDB();

$kelas = trim($_GET['kelas']        ?? '');
$taId  = (int)($_GET['tahun_ajaran_id'] ?? 0);

if (!$kelas || !$taId) errorResponse('kelas dan tahun_ajaran_id diperlukan.', 422);

// Guru: verifikasi punya akses ke kelas ini
if ($user['role'] === 'guru_olahraga') {
    $chk = $pdo->prepare("SELECT id FROM guru_kelas WHERE user_id=? AND kelas=?");
    $chk->execute([$user['id'], $kelas]);
    if (!$chk->fetch()) errorResponse('Anda tidak ditugaskan ke kelas ini.', 403);
}

// Ambil status tahun ajaran
$taStmt = $pdo->prepare("SELECT nama, semester, status FROM tahun_ajaran WHERE id = ?");
$taStmt->execute([$taId]);
$taRow  = $taStmt->fetch();
if (!$taRow) errorResponse('Tahun ajaran tidak ditemukan.', 404);

$stmt = $pdo->prepare("
    SELECT
        s.id, s.nisn, s.nis, s.nama, s.jenis_kelamin, s.kelas,
        c.nama AS nama_cabang, c.kode AS kode_cabang,
        ph.id          AS penilaian_id,
        ph.nilai_akhir,
        ph.predikat,
        ph.status      AS status_penilaian,
        ph.updated_at  AS tanggal_input
    FROM siswa s
    JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
    LEFT JOIN penilaian_header ph
           ON ph.siswa_id = s.id AND ph.tahun_ajaran_id = ?
    WHERE s.kelas = ? AND s.status = 'aktif'
    ORDER BY s.nama ASC
");
$stmt->execute([$taId, $kelas]);
$rows   = $stmt->fetchAll();

$total       = count($rows);
$sudahDinilai = count(array_filter($rows, fn($r) => $r['penilaian_id'] !== null));

successResponse([
    'kelas'         => $kelas,
    'total'         => $total,
    'sudah_dinilai' => $sudahDinilai,
    'belum_dinilai' => $total - $sudahDinilai,
    'tahun_ajaran'  => [
        'id'       => $taId,
        'nama'     => $taRow['nama'],
        'semester' => (int)$taRow['semester'],
        'status'   => $taRow['status'],
    ],
    'siswa'         => $rows,
]);
