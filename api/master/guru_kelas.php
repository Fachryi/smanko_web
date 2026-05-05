<?php
// ============================================================
// /api/master/guru_kelas.php – Penugasan Guru ke Kelas
// GET    → lihat penugasan (?user_id=N atau semua)
// POST   → set penugasan guru (admin) – replace all
// DELETE → hapus penugasan spesifik
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {

case 'GET':
    if ($user['role'] !== 'admin' && $user['role'] !== 'wakasek') {
        // Guru lihat kelas sendiri — filter per tahun ajaran jika dikirim
        $taFilter = !empty($_GET['tahun_ajaran_id']) ? ' AND gk.tahun_ajaran_id = ?' : '';
        $taParam  = !empty($_GET['tahun_ajaran_id']) ? [(int)$_GET['tahun_ajaran_id']] : [];

        $stmt = $pdo->prepare("
            SELECT gk.*, ta.nama AS tahun_ajaran, ta.semester
            FROM guru_kelas gk
            JOIN tahun_ajaran ta ON ta.id = gk.tahun_ajaran_id
            WHERE gk.user_id = ?{$taFilter}
            ORDER BY ta.nama DESC, gk.kelas
        ");
        $stmt->execute(array_merge([$user['id']], $taParam));
        successResponse($stmt->fetchAll());
    }

    // Admin/Wakasek: lihat semua atau filter per guru
    $where  = ['1=1'];
    $params = [];
    if (!empty($_GET['user_id'])) {
        $where[]  = 'gk.user_id = ?';
        $params[] = (int)$_GET['user_id'];
    }
    if (!empty($_GET['tahun_ajaran_id'])) {
        $where[]  = 'gk.tahun_ajaran_id = ?';
        $params[] = (int)$_GET['tahun_ajaran_id'];
    }

    $stmt = $pdo->prepare("
        SELECT gk.id, gk.kelas, gk.user_id, gk.tahun_ajaran_id,
               u.nama AS nama_guru, u.username,
               ta.nama AS tahun_ajaran, ta.semester
        FROM guru_kelas gk
        JOIN users u         ON u.id  = gk.user_id
        JOIN tahun_ajaran ta ON ta.id = gk.tahun_ajaran_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY u.nama ASC, gk.kelas ASC
    ");
    $stmt->execute($params);
    successResponse($stmt->fetchAll());

case 'POST':
    // Body: { user_id: N, tahun_ajaran_id: N, kelas: ['X-A','X-B',...] }
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body          = getBody();
    $guruId        = (int)($body['user_id']          ?? 0);
    $tahunAjaranId = (int)($body['tahun_ajaran_id']  ?? 0);
    $kelasList     = $body['kelas'] ?? [];

    if (!$guruId || !$tahunAjaranId) errorResponse('user_id dan tahun_ajaran_id wajib diisi.', 422);
    if (!is_array($kelasList))       errorResponse('kelas harus berupa array.', 422);

    // Verifikasi guru
    $chk = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $chk->execute([$guruId]);
    $guruRow = $chk->fetch();
    if (!$guruRow || $guruRow['role'] !== 'guru_olahraga')
        errorResponse('User bukan guru olahraga.', 422);

    // Cek konflik kelas dengan guru lain
    if (!empty($kelasList)) {
        $placeholders = str_repeat('?,', count($kelasList) - 1) . '?';
        // Parameters: tahun_ajaran_id, ...kelas, guruId
        $checkParams = array_merge([$tahunAjaranId], $kelasList, [$guruId]);
        
        $chkKelas = $pdo->prepare("
            SELECT gk.kelas, u.nama 
            FROM guru_kelas gk
            JOIN users u ON u.id = gk.user_id 
            WHERE gk.tahun_ajaran_id = ? 
              AND gk.kelas IN ($placeholders)
              AND gk.user_id != ?
        ");
        $chkKelas->execute($checkParams);
        $conflict = $chkKelas->fetch();
        
        if ($conflict) {
            errorResponse("Kelas {$conflict['kelas']} sudah ditugaskan ke {$conflict['nama']}. Satu kelas hanya boleh ditugaskan ke satu guru.", 422);
        }
    }

    // Replace: hapus semua penugasan guru ini di tahun ajaran ini
    $pdo->prepare("DELETE FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?")
        ->execute([$guruId, $tahunAjaranId]);

    // Insert kelas-kelas baru
    $inserted = 0;
    if (!empty($kelasList)) {
        $ins = $pdo->prepare("INSERT INTO guru_kelas (user_id, kelas, tahun_ajaran_id) VALUES (?, ?, ?)");
        foreach ($kelasList as $kelas) {
            $kelas = trim($kelas);
            if ($kelas) {
                $ins->execute([$guruId, $kelas, $tahunAjaranId]);
                $inserted++;
            }
        }
    }

    successResponse(['kelas_ditugaskan' => $inserted], 'Penugasan kelas berhasil disimpan.');

case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    $pdo->prepare("DELETE FROM guru_kelas WHERE id = ?")->execute([$id]);
    successResponse(null, 'Penugasan kelas dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
