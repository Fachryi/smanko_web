<?php
// ============================================================
// /api/wakasek/alumni_list.php
// GET → daftar alumni (siswa dengan status='alumni')
// Filter: cabang_olahraga_id, search
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Method tidak diizinkan.', 405);
$user = requireRole(['wakasek']);
$pdo  = getDB();

$where   = ["s.status = 'alumni'"];
$params  = [];

$caborId = (int)($_GET['cabang_olahraga_id'] ?? 0);
$search  = trim($_GET['search'] ?? '');

if ($caborId) {
    $where[]  = 's.cabang_olahraga_id = ?';
    $params[] = $caborId;
}

if ($search !== '') {
    $where[]  = '(s.nama LIKE ? OR s.nisn LIKE ? OR s.nis LIKE ?)';
    $like     = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$whereClause = implode(' AND ', $where);

$sql = "
    SELECT
        s.id             AS siswa_id,
        s.nisn,
        s.nis,
        s.nama,
        s.kelas          AS kelas_terakhir,
        s.jenis_kelamin,
        c.id             AS cabang_olahraga_id,
        c.nama           AS nama_cabang,
        c.kode           AS kode_cabang,
        (
            SELECT ta.nama
            FROM penilaian_header ph
            JOIN tahun_ajaran ta ON ta.id = ph.tahun_ajaran_id
            WHERE ph.siswa_id = s.id
            ORDER BY ph.tahun_ajaran_id DESC
            LIMIT 1
        ) AS tahun_lulus,
        (
            SELECT COUNT(pp.id)
            FROM penilaian_header ph
            JOIN penilaian_prestasi pp ON pp.penilaian_id = ph.id
            WHERE ph.siswa_id = s.id
              AND pp.tingkatan NOT IN ('Tidak Ada Prestasi', '')
              AND pp.tingkatan IS NOT NULL
        ) AS total_prestasi,
        (
            SELECT ROUND(ph.nilai_akhir, 2)
            FROM penilaian_header ph
            WHERE ph.siswa_id = s.id
            ORDER BY ph.tahun_ajaran_id DESC
            LIMIT 1
        ) AS nilai_akhir_tertinggi
    FROM siswa s
    JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
    WHERE $whereClause
    ORDER BY s.nama ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$alumni = $stmt->fetchAll();

// Daftar cabang untuk filter
$caborStmt = $pdo->query("SELECT id, nama, kode FROM cabang_olahraga ORDER BY nama");
$caborList = $caborStmt->fetchAll();

successResponse([
    'alumni'      => $alumni,
    'total'       => count($alumni),
    'cabang_list' => $caborList,
]);
