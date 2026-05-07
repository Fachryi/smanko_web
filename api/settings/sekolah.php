<?php
// ============================================================
// /api/settings/sekolah.php – Profil Sekolah (Kepala Sekolah)
// GET  → publik, ambil data profil sekolah
// PUT  → hanya admin, update kepala sekolah
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// Pastikan tabel ada dan terisi default
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `setting_sekolah` (
        `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `kepala_sekolah_nama`   VARCHAR(150) NOT NULL DEFAULT 'A. Syamsualam, S.Pd., M.Si.',
        `kepala_sekolah_nip`    VARCHAR(30)  NOT NULL DEFAULT '198012202009041001',
        `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Inisialisasi baris default jika kosong
$count = $pdo->query("SELECT COUNT(*) FROM setting_sekolah")->fetchColumn();
if ($count == 0) {
    $pdo->exec("INSERT INTO setting_sekolah (kepala_sekolah_nama, kepala_sekolah_nip) VALUES ('A. Syamsualam, S.Pd., M.Si.', '198012202009041001')");
}

switch ($method) {

case 'GET':
    // Publik – tidak butuh auth
    $row = $pdo->query("SELECT * FROM setting_sekolah LIMIT 1")->fetch();
    successResponse($row);

case 'PUT':
    $user = requireAuth();
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak. Hanya admin yang dapat mengubah data ini.', 403);

    $body = getBody();
    $nama = trim($body['kepala_sekolah_nama'] ?? '');
    $nip  = trim($body['kepala_sekolah_nip']  ?? '');

    if (!$nama) errorResponse('Nama kepala sekolah tidak boleh kosong.', 422);
    if (!$nip)  errorResponse('NIP kepala sekolah tidak boleh kosong.', 422);

    $pdo->prepare("UPDATE setting_sekolah SET kepala_sekolah_nama = ?, kepala_sekolah_nip = ? WHERE id = 1")
        ->execute([$nama, $nip]);

    successResponse([
        'kepala_sekolah_nama' => $nama,
        'kepala_sekolah_nip'  => $nip,
    ], 'Data kepala sekolah berhasil diperbarui.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
