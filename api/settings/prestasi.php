<?php
// ============================================================
// /api/settings/prestasi.php – Pengaturan Tingkatan Prestasi
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {
case 'GET':
    $stmt = $pdo->query("SELECT * FROM setting_prestasi ORDER BY urutan ASC");
    successResponse($stmt->fetchAll());

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body     = getBody();
    $tingkatan = trim($body['tingkatan'] ?? '');
    $nilai     = (float)($body['nilai']    ?? 0);
    $urutan    = (int)($body['urutan']     ?? 99);
    if (!$tingkatan || $nilai <= 0) errorResponse('Tingkatan dan nilai wajib diisi.', 422);

    $chk = $pdo->prepare("SELECT id FROM setting_prestasi WHERE tingkatan = ?");
    $chk->execute([$tingkatan]);
    if ($chk->fetch()) errorResponse('Tingkatan sudah ada.', 409);

    $pdo->prepare("INSERT INTO setting_prestasi (tingkatan, nilai, urutan) VALUES (?, ?, ?)")
        ->execute([$tingkatan, $nilai, $urutan]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Tingkatan prestasi ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();
    $fields = []; $params = [];
    if (isset($body['tingkatan'])) { $fields[] = 'tingkatan = ?'; $params[] = trim($body['tingkatan']); }
    if (isset($body['nilai']))     { $fields[] = 'nilai = ?';     $params[] = (float)$body['nilai']; }
    if (isset($body['urutan']))    { $fields[] = 'urutan = ?';    $params[] = (int)$body['urutan']; }
    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);
    $params[] = $id;
    $pdo->prepare("UPDATE setting_prestasi SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    successResponse(null, 'Tingkatan prestasi diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $pdo->prepare("DELETE FROM setting_prestasi WHERE id = ?")->execute([$id]);
    successResponse(null, 'Tingkatan prestasi dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
