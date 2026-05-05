<?php
// ============================================================
// /api/master/kriteria.php – Kriteria Keterampilan per Cabor
// Validasi: total bobot per cabang HARUS = 100%
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {

case 'GET':
    $cabangId = (int)($_GET['cabang_olahraga_id'] ?? 0);
    if (!$cabangId) errorResponse('cabang_olahraga_id diperlukan.', 422);

    $stmt = $pdo->prepare("
        SELECT k.*, c.nama AS nama_cabang
        FROM kriteria_keterampilan k
        JOIN cabang_olahraga c ON c.id = k.cabang_olahraga_id
        WHERE k.cabang_olahraga_id = ?
        ORDER BY k.urutan ASC
    ");
    $stmt->execute([$cabangId]);
    $rows = $stmt->fetchAll();

    $totalBobot = array_sum(array_column($rows, 'bobot'));

    successResponse([
        'kriteria'    => $rows,
        'total_bobot' => round((float)$totalBobot, 2),
        'valid'       => abs($totalBobot - 100) < 0.01,
    ]);

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body     = getBody();
    $cabangId = (int)($body['cabang_olahraga_id'] ?? 0);
    $nama     = trim($body['nama'] ?? '');
    $bobot    = (float)($body['bobot'] ?? 0);
    $urutan   = (int)($body['urutan'] ?? 99);

    if (!$cabangId || !$nama || $bobot <= 0) errorResponse('Field tidak lengkap.', 422);
    if ($bobot > 100) errorResponse('Bobot tidak boleh lebih dari 100%.', 422);

    // Cek total bobot setelah penambahan
    $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(bobot),0) AS total FROM kriteria_keterampilan WHERE cabang_olahraga_id = ?");
    $sumStmt->execute([$cabangId]);
    $currentTotal = (float)$sumStmt->fetchColumn();

    if (($currentTotal + $bobot) > 100.01)
        errorResponse("Total bobot akan menjadi " . round($currentTotal + $bobot, 2) . "%. Melebihi 100%.", 422);

    $pdo->prepare("INSERT INTO kriteria_keterampilan (cabang_olahraga_id, nama, bobot, urutan) VALUES (?, ?, ?, ?)")
        ->execute([$cabangId, $nama, $bobot, $urutan]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Kriteria berhasil ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();

    // Ambil data lama
    $old = $pdo->prepare("SELECT * FROM kriteria_keterampilan WHERE id = ?");
    $old->execute([$id]);
    $oldRow = $old->fetch();
    if (!$oldRow) errorResponse('Kriteria tidak ditemukan.', 404);

    $newBobot  = isset($body['bobot']) ? (float)$body['bobot'] : (float)$oldRow['bobot'];
    $newNama   = isset($body['nama'])  ? trim($body['nama'])    : $oldRow['nama'];
    $newUrutan = isset($body['urutan'])? (int)$body['urutan']   : (int)$oldRow['urutan'];

    // Validasi total bobot (exclude baris yang diedit)
    $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(bobot),0) FROM kriteria_keterampilan WHERE cabang_olahraga_id = ? AND id != ?");
    $sumStmt->execute([$oldRow['cabang_olahraga_id'], $id]);
    $otherTotal = (float)$sumStmt->fetchColumn();

    if (($otherTotal + $newBobot) > 100.01)
        errorResponse("Total bobot menjadi " . round($otherTotal + $newBobot, 2) . "%. Melebihi 100%.", 422);

    $pdo->prepare("UPDATE kriteria_keterampilan SET nama = ?, bobot = ?, urutan = ? WHERE id = ?")
        ->execute([$newNama, $newBobot, $newUrutan, $id]);

    successResponse(null, 'Kriteria berhasil diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    // Cek apakah kriteria sudah dipakai di penilaian
    $chk = $pdo->prepare("SELECT id FROM penilaian_keterampilan WHERE kriteria_id = ? LIMIT 1");
    $chk->execute([$id]);
    if ($chk->fetch()) errorResponse('Kriteria sudah digunakan dalam penilaian, tidak bisa dihapus.', 409);

    $pdo->prepare("DELETE FROM kriteria_keterampilan WHERE id = ?")->execute([$id]);
    successResponse(null, 'Kriteria berhasil dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
