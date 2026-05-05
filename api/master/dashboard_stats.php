<?php
// ============================================================
// /api/master/dashboard_stats.php – Live Dashboard Stats
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

if ($method !== 'GET') {
    errorResponse('Method tidak diizinkan.', 405);
}

try {
    // 1. Total Siswa Aktif
    $siswaStmt = $pdo->query("SELECT COUNT(*) FROM siswa WHERE status = 'aktif'");
    $totalSiswa = (int)$siswaStmt->fetchColumn();

    // 2. Total Cabang Olahraga
    $caborStmt = $pdo->query("SELECT COUNT(*) FROM cabang_olahraga");
    $totalCabor = (int)$caborStmt->fetchColumn();

    // 3. Profil Pelatih
    $pelatihStmt = $pdo->query("SELECT COUNT(*) FROM profil_pelatih");
    $totalPelatih = (int)$pelatihStmt->fetchColumn();

    // 4. Tahun Ajaran Aktif
    $taStmt = $pdo->query("SELECT nama, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");
    $taAktif = $taStmt->fetch();

    successResponse([
        'total_siswa' => $totalSiswa,
        'total_cabor' => $totalCabor,
        'total_pelatih' => $totalPelatih,
        'tahun_ajaran' => $taAktif ? [
            'nama' => $taAktif['nama'],
            'semester' => (int)$taAktif['semester']
        ] : null
    ]);

} catch (PDOException $e) {
    errorResponse('Gagal mengambil statistik: ' . $e->getMessage(), 500);
}
