<?php
// ============================================================
// POST /api/auth/logout.php
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Method tidak diizinkan.', 405);

$token = getAuthToken();
if ($token) {
    getDB()->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
}
successResponse(null, 'Logout berhasil.');
