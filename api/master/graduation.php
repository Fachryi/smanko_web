<?php
// ============================================================
// /api/master/graduation.php – Proses Kelulusan Siswa Kelas 12
// GET    → daftar siswa per kelas (hanya kelas XII)
// POST   → proses kelulusan (set status = 'alumni')
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireRole(['admin']);
$pdo    = getDB();

switch ($method) {

// ── GET: Ambil daftar siswa kelas XII ────────────────────────
case 'GET':
    $kelas = trim($_GET['kelas'] ?? '');
    if (!$kelas) errorResponse('Kelas wajib dipilih.', 422);

    $stmt = $pdo->prepare("
        SELECT s.id, s.nisn, s.nis, s.nama, s.kelas, s.jenis_kelamin,
               c.nama AS nama_cabang, c.kode AS kode_cabang
        FROM siswa s
        JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
        WHERE s.kelas = ? AND s.status = 'aktif'
        ORDER BY s.nama ASC
    ");
    $stmt->execute([$kelas]);
    successResponse($stmt->fetchAll());
    break;

// ── POST: Eksekusi Kelulusan ─────────────────────────────────
case 'POST':
    $body    = getBody();
    $students = $body['students'] ?? [];

    if (empty($students)) errorResponse('Data tidak lengkap.', 422);

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE siswa SET status = 'alumni' WHERE id = ? AND status = 'aktif'");

        $count = 0;
        foreach ($students as $s) {
            $sid = (int)($s['id'] ?? 0);
            if (!$sid) continue;
            $upd->execute([$sid]);
            $count++;
        }

        $pdo->commit();
        successResponse(null, $count . ' siswa berhasil diluluskan.');
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse('Gagal memproses kelulusan: ' . $e->getMessage(), 500);
    }

default:
    errorResponse('Method tidak diizinkan.', 405);
}
