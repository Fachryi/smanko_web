<?php
// ============================================================
// /api/settings/kehadiran.php – Pengaturan Rentang Kehadiran
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {
case 'GET':
    $stmt = $pdo->query("SELECT * FROM setting_kehadiran ORDER BY urutan ASC");
    successResponse($stmt->fetchAll());

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body    = getBody();
    $kat     = trim($body['kategori']       ?? '');
    $min     = (float)($body['nilai_min']   ?? -1);
    $max     = (float)($body['nilai_max']   ?? -1);
    $konv    = (float)($body['nilai_konversi'] ?? 0);
    $urutan  = (int)($body['urutan']        ?? 99);
    if (!$kat || $min < 0 || $max < 0 || $konv <= 0) errorResponse('Semua field wajib diisi.', 422);
    if ($min > $max) errorResponse('Nilai min tidak boleh lebih besar dari nilai max.', 422);

    $pdo->prepare("INSERT INTO setting_kehadiran (kategori, nilai_min, nilai_max, nilai_konversi, urutan) VALUES (?, ?, ?, ?, ?)")
        ->execute([$kat, $min, $max, $konv, $urutan]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Kategori kehadiran ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();
    $fields = []; $params = [];
    if (isset($body['kategori']))        { $fields[] = 'kategori = ?';        $params[] = trim($body['kategori']); }
    if (isset($body['nilai_min']))       { $fields[] = 'nilai_min = ?';       $params[] = (float)$body['nilai_min']; }
    if (isset($body['nilai_max']))       { $fields[] = 'nilai_max = ?';       $params[] = (float)$body['nilai_max']; }
    if (isset($body['nilai_konversi'])) { $fields[] = 'nilai_konversi = ?';  $params[] = (float)$body['nilai_konversi']; }
    if (isset($body['urutan']))          { $fields[] = 'urutan = ?';          $params[] = (int)$body['urutan']; }
    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);
    $params[] = $id;
    $pdo->prepare("UPDATE setting_kehadiran SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    successResponse(null, 'Kategori kehadiran diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $pdo->prepare("DELETE FROM setting_kehadiran WHERE id = ?")->execute([$id]);
    successResponse(null, 'Kategori kehadiran dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
