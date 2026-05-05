<?php
// ============================================================
// /api/master/promotion.php – Proses Kenaikan/Pindah Kelas Massal
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireRole(['admin']);
$pdo    = getDB();

switch ($method) {

// ── GET: Ambil daftar siswa untuk diproses ────────────────────────
case 'GET':
    $taId       = (int)($_GET['source_ta_id'] ?? 0);
    $kelas      = trim($_GET['kelas'] ?? '');
    $targetTaId = (int)($_GET['target_ta_id'] ?? 0);

    if (!$taId || !$kelas) errorResponse('Tahun ajaran asal dan kelas wajib dipilih.', 422);

    $sql = "
        SELECT 
            s.id, s.nis, s.nama,
            s.kelas AS kelas_lama,
            NULL AS target_kelas_exist
        FROM siswa s
        WHERE s.kelas = ? AND s.status = 'aktif'
        ORDER BY s.nama ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$kelas]);
    successResponse($stmt->fetchAll());
    break;

// ── POST: Eksekusi Pindah Kelas ────────────────────────────────────
case 'POST':
    $body = getBody();
    $targetTaId = (int)($body['target_ta_id'] ?? 0);
    $students   = $body['students'] ?? []; // Array of { id, target_kelas }

    if (!$targetTaId || empty($students)) errorResponse('Data tidak lengkap.', 422);

    $pdo->beginTransaction();
    try {
        // Update kelas langsung di tabel siswa (karena siswa_kelas tidak tersedia)
        $updSiswa = $pdo->prepare("UPDATE siswa SET kelas = ? WHERE id = ? AND status = 'aktif'");

        $count = 0;
        foreach ($students as $s) {
            $sid = (int)$s['id'];
            $tk  = trim($s['target_kelas']);
            if (!$sid || !$tk) continue;

            $updSiswa->execute([$tk, $sid]);
            $count++;
        }

        $pdo->commit();
        successResponse(null, $count . ' siswa berhasil diproses.');
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse('Gagal memproses kenaikan kelas: ' . $e->getMessage(), 500);
    }

default:
    errorResponse('Method tidak diizinkan.', 405);
}
