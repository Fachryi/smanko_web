<?php
// ============================================================
// /api/master/cabang.php – Manajemen Cabang Olahraga
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {

case 'GET':
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM cabang_olahraga WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $cabang = $stmt->fetch();
        if (!$cabang) errorResponse('Cabang olahraga tidak ditemukan.', 404);

        // Sertakan kriteria jika diminta
        if (!empty($_GET['with_kriteria'])) {
            $k = $pdo->prepare("SELECT * FROM kriteria_keterampilan WHERE cabang_olahraga_id = ? ORDER BY urutan");
            $k->execute([$cabang['id']]);
            $cabang['kriteria'] = $k->fetchAll();

            // Hitung total bobot
            $cabang['total_bobot'] = array_sum(array_column($cabang['kriteria'], 'bobot'));
        }
        successResponse($cabang);
    }

    $stmt = $pdo->query("
        SELECT c.*,
               (SELECT COUNT(*) FROM siswa s
                WHERE s.cabang_olahraga_id = c.id AND s.status = 'aktif') AS jumlah_siswa,
               (SELECT COUNT(*) FROM kriteria_keterampilan k
                WHERE k.cabang_olahraga_id = c.id) AS jumlah_kriteria
        FROM cabang_olahraga c
        ORDER BY c.nama ASC
    ");
    successResponse($stmt->fetchAll());

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body = getBody();
    $nama = trim($body['nama'] ?? '');
    $kode = strtoupper(trim($body['kode'] ?? ''));
    $desc = trim($body['deskripsi'] ?? '');

    if (!$nama || !$kode) errorResponse('Nama dan kode wajib diisi.', 422);

    $chk = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE kode = ?");
    $chk->execute([$kode]);
    if ($chk->fetch()) errorResponse('Kode cabang sudah digunakan.', 409);

    $pdo->prepare("INSERT INTO cabang_olahraga (nama, kode, deskripsi) VALUES (?, ?, ?)")
        ->execute([$nama, $kode, $desc]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Cabang olahraga berhasil ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();

    $fields = []; $params = [];
    if (isset($body['nama']))      { $fields[] = 'nama = ?';      $params[] = trim($body['nama']); }
    if (isset($body['kode']))      {
        $kode = strtoupper(trim($body['kode']));
        $chk  = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE kode = ? AND id != ?");
        $chk->execute([$kode, $id]);
        if ($chk->fetch()) errorResponse('Kode sudah digunakan.', 409);
        $fields[] = 'kode = ?'; $params[] = $kode;
    }
    if (isset($body['deskripsi'])) { $fields[] = 'deskripsi = ?'; $params[] = trim($body['deskripsi']); }

    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);
    $params[] = $id;
    $pdo->prepare("UPDATE cabang_olahraga SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    successResponse(null, 'Cabang olahraga diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    // Cek apakah ada siswa
    $chk = $pdo->prepare("SELECT id FROM siswa WHERE cabang_olahraga_id = ? LIMIT 1");
    $chk->execute([$id]);
    if ($chk->fetch()) errorResponse('Tidak bisa menghapus cabang yang masih memiliki siswa.', 409);

    $pdo->prepare("DELETE FROM cabang_olahraga WHERE id = ?")->execute([$id]);
    successResponse(null, 'Cabang olahraga berhasil dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
