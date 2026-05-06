<?php
// ============================================================
// /api/master/siswa.php – Manajemen Siswa
// GET    → daftar + filter
// POST   → tambah siswa (admin)
// PUT    → edit siswa (?id=N, admin)
// DELETE → hapus/nonaktifkan siswa (?id=N, admin)
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {

// ── GET ────────────────────────────────────────────────────────────
case 'GET':
    // Ambil satu siswa
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare("
            SELECT s.*, c.nama AS nama_cabang, c.kode AS kode_cabang,
                   p.nama AS nama_pelatih
            FROM siswa s
            JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
            LEFT JOIN profil_pelatih p ON p.id = s.pelatih_id
            WHERE s.id = ?
        ");
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) errorResponse('Siswa tidak ditemukan.', 404);
        successResponse($row);
    }

    $where  = ['1=1'];
    $params = [];

    if (!empty($_GET['kelas'])) {
        $where[]  = 's.kelas = ?';
        $params[] = $_GET['kelas'];
    }
    if (!empty($_GET['cabang_olahraga_id'])) {
        $where[]  = 's.cabang_olahraga_id = ?';
        $params[] = (int)$_GET['cabang_olahraga_id'];
    }
    if (!empty($_GET['status'])) {
        $where[]  = 's.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['jenis_kelamin'])) {
        $where[]  = 's.jenis_kelamin = ?';
        $params[] = $_GET['jenis_kelamin'];
    }
    if (!empty($_GET['search'])) {
        $where[]  = '(s.nama LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)';
        $s = '%' . $_GET['search'] . '%';
        $params[] = $s;
        $params[] = $s;
        $params[] = $s;
    }

    // Guru hanya lihat siswa di kelas yang diampunya
    if ($user['role'] === 'guru_olahraga') {
        $kelasGuru = $pdo->prepare("SELECT kelas FROM guru_kelas WHERE user_id = ?");
        $kelasGuru->execute([$user['id']]);
        $kelasList = array_column($kelasGuru->fetchAll(), 'kelas');
        if (empty($kelasList)) {
            successResponse(['siswa' => [], 'total' => 0, 'kelas_list' => []]); // Guru belum ada penugasan
        }
        $placeholders = implode(',', array_fill(0, count($kelasList), '?'));
        $where[]  = "s.kelas IN ($placeholders)";
        $params   = array_merge($params, $kelasList);
    }

    $sql = "
        SELECT s.id, s.nisn, s.nis, s.nama, s.kelas, s.jenis_kelamin, s.status,
               c.id AS cabang_olahraga_id, c.nama AS nama_cabang, c.kode AS kode_cabang,
               s.pelatih_id, p.nama AS nama_pelatih,
               s.created_at
        FROM siswa s
        JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
        LEFT JOIN profil_pelatih p ON p.id = s.pelatih_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY s.kelas ASC, s.nama ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Juga kirim daftar kelas unik
    $rows = $stmt->fetchAll();

    // Ambil daftar kelas yang tersedia
    $kelasStmt = $pdo->query("SELECT DISTINCT kelas FROM siswa ORDER BY kelas");
    $kelasList = array_column($kelasStmt->fetchAll(), 'kelas');

    successResponse([
        'siswa'       => $rows,
        'total'       => count($rows),
        'kelas_list'  => $kelasList,
    ]);

// ── POST ───────────────────────────────────────────────────────────
case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body = getBody();

    $nisn              = trim($body['nisn']              ?? '');
    $nis               = trim($body['nis']               ?? '');
    $nama              = trim($body['nama']              ?? '');
    $kelas             = trim($body['kelas']             ?? '');
    $jk                = trim($body['jenis_kelamin']     ?? '');
    $cabangId          = (int)($body['cabang_olahraga_id'] ?? 0);
    $pelatihId         = (int)($body['pelatih_id']       ?? 0);

    if (!$nisn || !$nama || !$kelas || !$jk || !$cabangId)
        errorResponse('NISN, Nama, Kelas, Jenis Kelamin, dan Cabang Olahraga wajib diisi.', 422);

    if (!in_array($jk, ['L', 'P'], true)) errorResponse('Jenis kelamin tidak valid.', 422);

    // Cek batas maksimal 40 siswa per kelas
    $cekKapasitas = $pdo->prepare("SELECT COUNT(*) FROM siswa WHERE kelas = ? AND status = 'aktif'");
    $cekKapasitas->execute([$kelas]);
    $jumlahSiswaKelas = (int)$cekKapasitas->fetchColumn();
    if ($jumlahSiswaKelas >= 40) {
        errorResponse("Kelas $kelas sudah mencapai batas maksimal 40 siswa. Tidak dapat menambahkan siswa baru.", 422);
    }

    // Cek NISN
    $chkNisn = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
    $chkNisn->execute([$nisn]);
    if ($chkNisn->fetch()) errorResponse('NISN sudah terdaftar.', 409);

    // Cek NIS hanya jika diisi
    if ($nis !== '') {
        $chk = $pdo->prepare("SELECT id FROM siswa WHERE nis = ?");
        $chk->execute([$nis]);
        if ($chk->fetch()) errorResponse('NIS sudah terdaftar.', 409);
    }

    // Cek cabang valid
    $cek = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE id = ?");
    $cek->execute([$cabangId]);
    if (!$cek->fetch()) errorResponse('Cabang olahraga tidak ditemukan.', 404);

    // Cek pelatih valid jika diisi
    if ($pelatihId) {
        $cekP = $pdo->prepare("SELECT id FROM profil_pelatih WHERE id = ?");
        $cekP->execute([$pelatihId]);
        if (!$cekP->fetch()) errorResponse('Pelatih tidak ditemukan.', 404);
    }

    // Jika pelatih tidak diisi manual, cari otomatis dari cabor
    if (!$pelatihId) {
        $autoP = $pdo->prepare("SELECT id FROM profil_pelatih WHERE cabang_olahraga_id = ? LIMIT 1");
        $autoP->execute([$cabangId]);
        $autoRow = $autoP->fetch();
        $pelatihId = $autoRow ? (int)$autoRow['id'] : 0;
    }

    $pdo->prepare("INSERT INTO siswa (nisn, nis, nama, kelas, jenis_kelamin, cabang_olahraga_id, pelatih_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        ->execute([$nisn, $nis !== '' ? $nis : null, $nama, $kelas, $jk, $cabangId, $pelatihId ?: null]);
    $newId = (int)$pdo->lastInsertId();

    successResponse(['id' => $newId], 'Siswa berhasil ditambahkan.', 201);

// ── PUT ────────────────────────────────────────────────────────────
case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    $body   = getBody();
    $fields = [];
    $params = [];

    if (isset($body['nisn'])) {
        $newNisn = trim($body['nisn']);
        if (!$newNisn) errorResponse('NISN tidak boleh kosong.', 422);
        $chk = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ? AND id != ?");
        $chk->execute([$newNisn, $id]);
        if ($chk->fetch()) errorResponse('NISN sudah digunakan siswa lain.', 409);
        $fields[] = 'nisn = ?'; $params[] = $newNisn;
    }
    if (isset($body['nis'])) {
        $newNis = trim($body['nis']);
        // Cek duplikat hanya jika NIS diisi (bukan kosong)
        if ($newNis !== '') {
            $chk = $pdo->prepare("SELECT id FROM siswa WHERE nis = ? AND id != ?");
            $chk->execute([$newNis, $id]);
            if ($chk->fetch()) errorResponse('NIS sudah digunakan siswa lain.', 409);
        }
        $fields[] = 'nis = ?'; $params[] = $newNis !== '' ? $newNis : null;
    }
    if (isset($body['nama']))             { $fields[] = 'nama = ?';             $params[] = trim($body['nama']); }
    if (isset($body['kelas']))            { $fields[] = 'kelas = ?';            $params[] = trim($body['kelas']); }
    if (isset($body['jenis_kelamin']))    { $fields[] = 'jenis_kelamin = ?';    $params[] = $body['jenis_kelamin']; }
    if (isset($body['cabang_olahraga_id'])) {
        $fields[] = 'cabang_olahraga_id = ?';
        $params[] = (int)$body['cabang_olahraga_id'];
        // Auto-assign pelatih berdasarkan cabor baru
        $autoP = $pdo->prepare("SELECT id FROM profil_pelatih WHERE cabang_olahraga_id = ? LIMIT 1");
        $autoP->execute([(int)$body['cabang_olahraga_id']]);
        $autoRow = $autoP->fetch();
        $fields[] = 'pelatih_id = ?';
        $params[] = $autoRow ? (int)$autoRow['id'] : null;
    } elseif (isset($body['pelatih_id'])) {
        $fields[] = 'pelatih_id = ?';
        $params[] = (int)$body['pelatih_id'] ?: null;
    }
    if (isset($body['status']))           { $fields[] = 'status = ?';           $params[] = $body['status']; }

    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);

    $params[] = $id;
    $pdo->prepare("UPDATE siswa SET " . implode(', ', $fields) . " WHERE id = ?")
        ->execute($params);

    successResponse(null, 'Data siswa berhasil diperbarui.');

// ── DELETE ─────────────────────────────────────────────────────────
case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    // Cek apakah sudah ada penilaian
    $chk = $pdo->prepare("SELECT id FROM penilaian_header WHERE siswa_id = ? LIMIT 1");
    $chk->execute([$id]);
    if ($chk->fetch()) {
        // Soft delete saja
        $pdo->prepare("UPDATE siswa SET status = 'nonaktif' WHERE id = ?")->execute([$id]);
        successResponse(null, 'Siswa dinonaktifkan (sudah memiliki data penilaian).');
    }

    $pdo->prepare("DELETE FROM siswa WHERE id = ?")->execute([$id]);
    successResponse(null, 'Siswa berhasil dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
