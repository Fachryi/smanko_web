<?php
// ============================================================
// POST /api/auth/login.php
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Method tidak diizinkan.', 405);

$body = getBody();
$username = trim($body['username'] ?? '');
$password = trim($body['password'] ?? '');

if (!$username || !$password) errorResponse('Username dan password wajib diisi.', 422);

$pdo = getDB();
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    errorResponse('Username atau password salah.', 401);
}
if ($user['status'] !== 'aktif') {
    errorResponse('Akun Anda telah dinonaktifkan. Hubungi administrator.', 403);
}

// Hapus session lama user ini
$pdo->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$user['id']]);

$token     = generateToken();
$expiresAt = (new DateTime())->modify('+8 hours')->format('Y-m-d H:i:s');

$pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)")
    ->execute([$user['id'], $token, $expiresAt]);

successResponse([
    'token'      => $token,
    'expires_at' => $expiresAt,
    'user'       => [
        'id'       => (int) $user['id'],
        'nama'     => $user['nama'],
        'username' => $user['username'],
        'role'     => $user['role'],
    ],
], 'Login berhasil.', 200);
