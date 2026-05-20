<?php
// ============================================================
// /api/penilaian/riwayat.php
// GET ?siswa_id=N
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Method tidak diizinkan.', 405);
$user = requireAuth();
$pdo  = getDB();

$siswaId = (int)($_GET['siswa_id'] ?? 0);
if (!$siswaId) errorResponse('siswa_id diperlukan.', 422);

// Ambil info siswa dasar
$stmtSiswa = $pdo->prepare("
    SELECT s.id, s.nis, s.nisn, s.nama, s.jenis_kelamin, s.kelas AS kelas_sekarang,
           c.nama AS nama_cabang, c.kode AS kode_cabang
    FROM siswa s
    JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
    WHERE s.id = ?
");
$stmtSiswa->execute([$siswaId]);
$siswa = $stmtSiswa->fetch();

if (!$siswa) errorResponse('Siswa tidak ditemukan.', 404);

// Ambil riwayat penilaian siswa
$stmtRiwayat = $pdo->prepare("
    SELECT
        ph.id AS penilaian_id,
        ph.status,
        ph.nilai_keterampilan,
        ph.nilai_prestasi,
        ph.nilai_kehadiran,
        ph.nilai_akhir,
        ph.predikat,
        ph.catatan,
        COALESCE(ph.kelas, s.kelas) AS kelas_saat_dinilai,
        ta.nama AS tahun_ajaran,
        ta.semester,
        u.nama AS nama_guru
    FROM penilaian_header ph
    JOIN siswa s ON s.id = ph.siswa_id
    JOIN tahun_ajaran ta ON ta.id = ph.tahun_ajaran_id
    LEFT JOIN users u ON u.id = ph.guru_id
    WHERE ph.siswa_id = ?
    ORDER BY ta.nama DESC, ta.semester DESC
");
$stmtRiwayat->execute([$siswaId]);
$riwayat = $stmtRiwayat->fetchAll();

successResponse([
    'siswa'   => $siswa,
    'riwayat' => $riwayat
]);
