<?php
// ============================================================
// /api/settings/bobot.php – Bobot Komponen Utama
// GET → ambil bobot saat ini
// PUT → update (total keterampilan+prestasi+kehadiran HARUS = 100)
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

switch ($method) {
case 'GET':
    $stmt = $pdo->query("SELECT * FROM setting_bobot_utama LIMIT 1");
    $row  = $stmt->fetch();
    if (!$row) {
        // Init default jika belum ada
        $pdo->exec("INSERT INTO setting_bobot_utama (bobot_keterampilan, bobot_prestasi, bobot_kehadiran) VALUES (50, 30, 20)");
        $row = ['id'=>1,'bobot_keterampilan'=>50,'bobot_prestasi'=>30,'bobot_kehadiran'=>20];
    }
    successResponse($row);

case 'PUT':
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);
    $body   = getBody();
    $skill  = (float)($body['bobot_keterampilan'] ?? 0);
    $prest  = (float)($body['bobot_prestasi']     ?? 0);
    $hadir  = (float)($body['bobot_kehadiran']    ?? 0);
    $total  = $skill + $prest + $hadir;

    if ($skill <= 0 || $prest <= 0 || $hadir <= 0)
        errorResponse('Semua bobot harus lebih dari 0%.', 422);
    if (abs($total - 100) > 0.01)
        errorResponse("Total bobot harus 100%. Saat ini: {$total}%.", 422);

    $pdo->prepare("UPDATE setting_bobot_utama SET bobot_keterampilan = ?, bobot_prestasi = ?, bobot_kehadiran = ? WHERE id = 1")
        ->execute([$skill, $prest, $hadir]);

    successResponse([
        'bobot_keterampilan' => $skill,
        'bobot_prestasi'     => $prest,
        'bobot_kehadiran'    => $hadir,
    ], 'Bobot komponen utama berhasil diperbarui.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
