<?php
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {
case 'GET':
    $cabangId = (int)($_GET['cabang_olahraga_id'] ?? 0);
    if ($cabangId) {
        $stmt = $pdo->prepare("
            SELECT n.*, c.nama AS nama_cabang
            FROM setting_nomor_pertandingan n
            JOIN cabang_olahraga c ON c.id = n.cabang_olahraga_id
            WHERE n.cabang_olahraga_id = ?
            ORDER BY n.urutan ASC
        ");
        $stmt->execute([$cabangId]);
    } else {
        $stmt = $pdo->query("
            SELECT n.*, c.nama AS nama_cabang
            FROM setting_nomor_pertandingan n
            JOIN cabang_olahraga c ON c.id = n.cabang_olahraga_id
            ORDER BY c.nama ASC, n.urutan ASC
        ");
    }
    successResponse($stmt->fetchAll());

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body      = getBody();
    $cabangId  = (int)($body['cabang_olahraga_id'] ?? 0);
    $nama      = trim($body['nama'] ?? '');
    $urutan    = (int)($body['urutan'] ?? 99);
    if (!$cabangId || !$nama) errorResponse('Cabang olahraga dan nama wajib diisi.', 422);

    $chk = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE id = ?");
    $chk->execute([$cabangId]);
    if (!$chk->fetch()) errorResponse('Cabang olahraga tidak ditemukan.', 404);

    $chk = $pdo->prepare("SELECT id FROM setting_nomor_pertandingan WHERE cabang_olahraga_id = ? AND nama = ?");
    $chk->execute([$cabangId, $nama]);
    if ($chk->fetch()) errorResponse('Nama sudah ada untuk cabang ini.', 409);

    $pdo->prepare("INSERT INTO setting_nomor_pertandingan (cabang_olahraga_id, nama, urutan) VALUES (?, ?, ?)")
        ->execute([$cabangId, $nama, $urutan]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Nomor pertandingan ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();
    $fields = []; $params = [];
    if (isset($body['cabang_olahraga_id'])) { $fields[] = 'cabang_olahraga_id = ?'; $params[] = (int)$body['cabang_olahraga_id']; }
    if (isset($body['nama']))               { $fields[] = 'nama = ?';               $params[] = trim($body['nama']); }
    if (isset($body['urutan']))             { $fields[] = 'urutan = ?';             $params[] = (int)$body['urutan']; }
    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);
    $params[] = $id;
    $pdo->prepare("UPDATE setting_nomor_pertandingan SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    successResponse(null, 'Nomor pertandingan diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0); if (!$id) errorResponse('ID tidak valid.', 422);
    $pdo->prepare("DELETE FROM setting_nomor_pertandingan WHERE id = ?")->execute([$id]);
    successResponse(null, 'Nomor pertandingan dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
