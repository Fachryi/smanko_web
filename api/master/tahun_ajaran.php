<?php
// ============================================================
// /api/master/tahun_ajaran.php – Manajemen Tahun Ajaran
// Aturan: hanya 1 yang boleh berstatus 'aktif'
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {

case 'GET':
    if (!empty($_GET['aktif'])) {
        $stmt = $pdo->query("SELECT * FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");
        $row  = $stmt->fetch();
        if (!$row) errorResponse('Tidak ada tahun ajaran aktif.', 404);
        successResponse($row);
    }
    $stmt = $pdo->query("SELECT * FROM tahun_ajaran ORDER BY nama DESC, semester ASC");
    successResponse($stmt->fetchAll());

case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);

    // ── Auto-generate tahun ajaran berikutnya ──
    if (!empty($_GET['auto'])) {
        $lastTa = $pdo->query("SELECT * FROM tahun_ajaran ORDER BY nama DESC, semester DESC LIMIT 1")->fetch();
        if (!$lastTa) errorResponse('Belum ada tahun ajaran. Buat manual terlebih dahulu.', 404);

        preg_match('/^(\d{4})\/(\d{4})$/', $lastTa['nama'], $m);
        if (!$m) errorResponse('Format tahun ajaran tidak valid.', 500);

        if ($lastTa['semester'] == 1) {
            $namaBaru    = $lastTa['nama'];
            $semesterBaru = 2;
        } else {
            $tahun2      = (int)$m[2];
            $namaBaru    = $tahun2 . '/' . ($tahun2 + 1);
            $semesterBaru = 1;
        }

        $chk = $pdo->prepare("SELECT id FROM tahun_ajaran WHERE nama = ? AND semester = ?");
        $chk->execute([$namaBaru, $semesterBaru]);
        if ($chk->fetch()) {
            errorResponse("Tahun ajaran $namaBaru semester $semesterBaru sudah ada. Silakan aktifkan langsung.", 409);
        }

        $pdo->prepare("INSERT INTO tahun_ajaran (nama, semester, status) VALUES (?, ?, 'tutup')")
            ->execute([$namaBaru, $semesterBaru]);

        successResponse([
            'id'        => (int)$pdo->lastInsertId(),
            'nama'      => $namaBaru,
            'semester'  => $semesterBaru,
        ], "Tahun ajaran $namaBaru semester $semesterBaru berhasil ditambahkan.", 201);
    }

    // ── Manual create ──
    $body     = getBody();
    $nama     = trim($body['nama']     ?? '');
    $semester = (int)($body['semester'] ?? 0);
    $status   = $body['status'] ?? 'tutup';

    if (!$nama || !in_array($semester, [1, 2])) errorResponse('Nama dan semester (1/2) wajib diisi.', 422);

    // Cek duplikat
    $chk = $pdo->prepare("SELECT id FROM tahun_ajaran WHERE nama = ? AND semester = ?");
    $chk->execute([$nama, $semester]);
    if ($chk->fetch()) errorResponse("Tahun ajaran $nama semester $semester sudah ada.", 409);

    // Jika status aktif, nonaktifkan yang lain dulu
    if ($status === 'aktif') {
        $pdo->exec("UPDATE tahun_ajaran SET status = 'tutup'");
    }

    $pdo->prepare("INSERT INTO tahun_ajaran (nama, semester, status) VALUES (?, ?, ?)")
        ->execute([$nama, $semester, $status]);
    successResponse(['id' => (int)$pdo->lastInsertId()], 'Tahun ajaran berhasil ditambahkan.', 201);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    $body = getBody();

    // Aktivasi: set ini aktif, tutup semua yg lain
    if (isset($body['status'])) {
        if ($body['status'] === 'aktif') {
            // ── Validasi urutan: hanya 1 langkah maju/mundur ──
            $allTa = $pdo->query("SELECT id, nama, semester, status FROM tahun_ajaran ORDER BY nama ASC, semester ASC")->fetchAll();
            $targetKey = null;
            $activeKey = null;
            foreach ($allTa as $k => $ta) {
                if ($ta['status'] === 'aktif') $activeKey = $k;
                if ((int)$ta['id'] === $id)    $targetKey = $k;
            }
            if ($activeKey !== null && $targetKey !== null) {
                if (abs($targetKey - $activeKey) > 1) {
                    errorResponse('Tahun ajaran yang dipilih terlalu jauh dari tahun ajaran aktif. Hanya bisa aktivasi 1 langkah maju atau 1 langkah mundur.', 422);
                }
            }
            $pdo->exec("UPDATE tahun_ajaran SET status = 'tutup'");
        }
        $pdo->prepare("UPDATE tahun_ajaran SET status = ? WHERE id = ?")->execute([$body['status'], $id]);
        successResponse(null, 'Status tahun ajaran diperbarui.');
    }

    $fields = []; $params = [];
    if (isset($body['nama']))     { $fields[] = 'nama = ?';     $params[] = trim($body['nama']); }
    if (isset($body['semester'])) { $fields[] = 'semester = ?'; $params[] = (int)$body['semester']; }
    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);

    $params[] = $id;
    $pdo->prepare("UPDATE tahun_ajaran SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
    successResponse(null, 'Tahun ajaran diperbarui.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    // Cek apakah ada penilaian di tahun ini
    $chk = $pdo->prepare("SELECT id FROM penilaian_header WHERE tahun_ajaran_id = ? LIMIT 1");
    $chk->execute([$id]);
    if ($chk->fetch()) errorResponse('Tahun ajaran sudah memiliki data penilaian, tidak bisa dihapus.', 409);

    // Cek apakah aktif
    $ta = $pdo->prepare("SELECT status FROM tahun_ajaran WHERE id = ?");
    $ta->execute([$id]);
    $row = $ta->fetch();
    if ($row && $row['status'] === 'aktif') errorResponse('Tidak bisa menghapus tahun ajaran yang sedang aktif.', 409);

    $pdo->prepare("DELETE FROM tahun_ajaran WHERE id = ?")->execute([$id]);
    successResponse(null, 'Tahun ajaran berhasil dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
