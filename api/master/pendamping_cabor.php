<?php
// ============================================================
// /api/master/pendamping_cabor.php
// GET  → publik, ambil pendamping berdasarkan ?cabang_id=X
//         tanpa param → semua data (untuk admin)
// POST → admin saja (create/update)
// DELETE → admin saja
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// Auto-create tabel jika belum ada
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `pendamping_cabor` (
        `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `cabang_olahraga_id`  INT UNSIGNED NOT NULL,
        `nama`                VARCHAR(150) NOT NULL,
        `nip`                 VARCHAR(30)  NOT NULL DEFAULT '',
        `kode_guru`           VARCHAR(30)  NOT NULL DEFAULT '',
        `is_utama`            TINYINT(1)   NOT NULL DEFAULT 0,
        `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_cabor` (`cabang_olahraga_id`),
        CONSTRAINT `fk_pendamping_cabor` FOREIGN KEY (`cabang_olahraga_id`)
            REFERENCES `cabang_olahraga`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

switch ($method) {

case 'GET':
    // Bisa diakses publik (untuk cetak raport)
    $cabang_id = isset($_GET['cabang_id']) ? (int)$_GET['cabang_id'] : 0;

    if ($cabang_id > 0) {
        // Untuk cetak raport: ambil satu pendamping berdasarkan cabor
        $stmt = $pdo->prepare("
            SELECT p.*, c.nama AS nama_cabang
            FROM pendamping_cabor p
            JOIN cabang_olahraga c ON c.id = p.cabang_olahraga_id
            WHERE p.cabang_olahraga_id = ?
            ORDER BY p.is_utama DESC, p.id ASC
            LIMIT 1
        ");
        $stmt->execute([$cabang_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        successResponse($row ?: null);
    } else {
        // Untuk admin: ambil semua
        $stmt = $pdo->query("
            SELECT p.*, c.nama AS nama_cabang
            FROM pendamping_cabor p
            JOIN cabang_olahraga c ON c.id = p.cabang_olahraga_id
            ORDER BY c.nama ASC
        ");
        successResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

case 'POST':
    $user = requireAuth();
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);

    $body      = getBody();
    $id        = (int)($body['id'] ?? 0);
    $cabang_id = (int)($body['cabang_olahraga_id'] ?? 0);
    $nama      = trim($body['nama']        ?? '');
    $nip       = trim($body['nip']         ?? '');
    $kode_guru = trim($body['kode_guru']   ?? '');
    $is_utama  = (int)($body['is_utama']   ?? 0);

    if (!$cabang_id) errorResponse('Cabang Olahraga wajib dipilih.', 422);
    if (!$nama)      errorResponse('Nama pendamping tidak boleh kosong.', 422);

    // Validasi cabor
    $chk = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE id = ?");
    $chk->execute([$cabang_id]);
    if (!$chk->fetch()) errorResponse('Cabang Olahraga tidak ditemukan.', 404);

    $pdo->beginTransaction();
    try {
        // Jika diset sebagai utama, reset yang lain di cabor yang sama
        if ($is_utama) {
            $pdo->prepare("UPDATE pendamping_cabor SET is_utama = 0 WHERE cabang_olahraga_id = ?")->execute([$cabang_id]);
        }

        if ($id > 0) {
            // Update
            $pdo->prepare("
                UPDATE pendamping_cabor
                SET cabang_olahraga_id = ?, nama = ?, nip = ?, kode_guru = ?, is_utama = ?
                WHERE id = ?
            ")->execute([$cabang_id, $nama, $nip, $kode_guru, $is_utama, $id]);
        } else {
            // Cek apakah ini pendamping pertama di cabor ini
            $chkFirst = $pdo->prepare("SELECT COUNT(*) FROM pendamping_cabor WHERE cabang_olahraga_id = ?");
            $chkFirst->execute([$cabang_id]);
            if ($chkFirst->fetchColumn() == 0) {
                $is_utama = 1; // Otomatis utama jika belum ada
            }

            // Insert
            $pdo->prepare("
                INSERT INTO pendamping_cabor (cabang_olahraga_id, nama, nip, kode_guru, is_utama)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([$cabang_id, $nama, $nip, $kode_guru, $is_utama]);
        }
        $pdo->commit();
        successResponse(null, 'Data pendamping cabor berhasil disimpan.', 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse('Gagal menyimpan data.', 500);
    }

case 'DELETE':
    $user = requireAuth();
    if ($user['role'] !== 'admin') errorResponse('Akses ditolak.', 403);

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);

    $pdo->prepare("DELETE FROM pendamping_cabor WHERE id = ?")->execute([$id]);
    successResponse(null, 'Data pendamping cabor berhasil dihapus.');

default:
    errorResponse('Method tidak diizinkan.', 405);
}
