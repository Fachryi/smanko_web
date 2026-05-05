<?php
// ============================================================
// /api/master/users.php – Manajemen Pengguna
// GET    → daftar semua user (admin) / profil sendiri (?me=1)
// POST   → tambah user baru (admin)
// PUT    → edit user (?id=N)
// DELETE → nonaktifkan user (?id=N, admin)
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();

// ------------------------------------------------------------------
switch ($method) {

// ── GET ────────────────────────────────────────────────────────────
case 'GET':
    $pdo = getDB();

    // Profil sendiri
    if ($_GET['me'] ?? false) {
        $stmt = $pdo->prepare("SELECT id, nama, username, role, status, created_at FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        successResponse($stmt->fetch());
    }

    // Hanya admin boleh lihat semua
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);

    $where  = [];
    $params = [];

    if (!empty($_GET['role'])) {
        $where[]  = 'role = ?';
        $params[] = $_GET['role'];
    }
    if (!empty($_GET['status'])) {
        $where[]  = 'status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['search'])) {
        $where[]  = '(nama LIKE ? OR username LIKE ?)';
        $s = '%' . $_GET['search'] . '%';
        $params[] = $s;
        $params[] = $s;
    }

    $sql = "SELECT id, nama, username, role, status, created_at FROM users";
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY nama ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    successResponse($stmt->fetchAll());

// ── POST ───────────────────────────────────────────────────────────
case 'POST':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body = getBody();

    $nama     = trim($body['nama']     ?? '');
    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    $role     = trim($body['role']     ?? '');

    if (!$nama || !$username || !$password || !$role)
        errorResponse('Semua field wajib diisi.', 422);

    $validRoles = ['admin', 'guru_olahraga', 'wakasek'];
    if (!in_array($role, $validRoles, true))
        errorResponse('Role tidak valid.', 422);

    if (strlen($password) < 6)
        errorResponse('Password minimal 6 karakter.', 422);

    $pdo = getDB();
    // Cek username unik
    $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$username]);
    if ($check->fetch()) errorResponse('Username sudah digunakan.', 409);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $pdo->prepare("INSERT INTO users (nama, username, password_hash, role) VALUES (?, ?, ?, ?)")
        ->execute([$nama, $username, $hash, $role]);

    $id = (int) $pdo->lastInsertId();
    successResponse(['id' => $id], 'Pengguna berhasil ditambahkan.', 201);

// ── PUT ────────────────────────────────────────────────────────────
case 'PUT':
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    // User hanya bisa edit diri sendiri (kecuali admin)
    if ($user['role'] !== 'admin' && $user['id'] !== $id)
        errorResponse('Akses ditolak.', 403);

    $pdo  = getDB();
    $body = getBody();

    $fields = [];
    $params = [];

    if (!empty($body['nama'])) {
        $fields[] = 'nama = ?';
        $params[] = trim($body['nama']);
    }
    if (!empty($body['username']) && $user['role'] === 'admin') {
        // Cek unik
        $chk = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $chk->execute([trim($body['username']), $id]);
        if ($chk->fetch()) errorResponse('Username sudah digunakan.', 409);
        $fields[] = 'username = ?';
        $params[] = trim($body['username']);
    }
    if (!empty($body['password'])) {
        if (strlen($body['password']) < 6) errorResponse('Password minimal 6 karakter.', 422);
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
    }
    if (!empty($body['role']) && $user['role'] === 'admin') {
        $validRoles = ['admin', 'guru_olahraga', 'wakasek'];
        if (!in_array($body['role'], $validRoles, true)) errorResponse('Role tidak valid.', 422);
        $fields[] = 'role = ?';
        $params[] = $body['role'];
    }
    if (!empty($body['status']) && $user['role'] === 'admin') {
        $fields[] = 'status = ?';
        $params[] = $body['status'];
    }

    if (!$fields) errorResponse('Tidak ada data yang diubah.', 422);

    $params[] = $id;
    $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?")
        ->execute($params);

    successResponse(null, 'Pengguna berhasil diperbarui.');

// ── DELETE ─────────────────────────────────────────────────────────
case 'DELETE':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    if ($id === $user['id']) errorResponse('Tidak bisa menonaktifkan akun sendiri.', 422);

    getDB()->prepare("UPDATE users SET status = 'nonaktif' WHERE id = ?")
           ->execute([$id]);

    successResponse(null, 'Pengguna berhasil dinonaktifkan.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
