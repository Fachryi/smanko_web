<?php
// ============================================================
// /api/penilaian/rekap.php – Rekapitulasi Nilai
// GET → semua role (filtered by role)
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Method tidak diizinkan.', 405);
$user = requireAuth();
$pdo  = getDB();

$where  = ['1=1'];
$params = [];

// Filter tahun ajaran
if (!empty($_GET['tahun_ajaran_id'])) {
    $where[]  = 'ph.tahun_ajaran_id = ?';
    $params[] = (int)$_GET['tahun_ajaran_id'];
}
// Filter siswa
if (!empty($_GET['siswa_id'])) {
    $where[]  = 'ph.siswa_id = ?';
    $params[] = (int)$_GET['siswa_id'];
}
// Filter cabang
if (!empty($_GET['cabang_olahraga_id'])) {
    $where[]  = 's.cabang_olahraga_id = ?';
    $params[] = (int)$_GET['cabang_olahraga_id'];
}
// Filter kelas
if (!empty($_GET['kelas'])) {
    $where[]  = 'COALESCE(ph.kelas, s.kelas) = ?';
    $params[] = $_GET['kelas'];
}
// Filter status
if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
    $where[]  = 'ph.status = ?';
    $params[] = $_GET['status'];
}

// Semua role yang sudah terautentikasi bisa lihat semua penilaian (filtered by TA, kelas, status)

$sql = "
    SELECT
        ph.id AS penilaian_id,
        ph.status,
        ph.nilai_keterampilan,
        ph.nilai_prestasi,
        ph.nilai_kehadiran,
        ph.nilai_akhir,
        ph.predikat,
        ph.catatan,
        ph.created_at,
        ph.updated_at,
        s.id   AS siswa_id,
        s.nis,
        s.nama AS nama_siswa,
        s.kelas AS kelas_sekarang,
        COALESCE(ph.kelas, s.kelas) AS kelas,
        s.jenis_kelamin,
        s.status AS status_siswa,
        c.id   AS cabang_olahraga_id,
        c.nama AS nama_cabang,
        c.kode AS kode_cabang,
        ta.nama AS tahun_ajaran,
        ta.semester,
        u.nama AS nama_guru,
        pkh.total_hadir,
        pkh.total_sesi,
        pkh.persentase AS persentase_hadir
    FROM penilaian_header ph
    JOIN siswa s         ON s.id   = ph.siswa_id AND s.status = 'aktif'
    JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
    JOIN tahun_ajaran ta ON ta.id  = ph.tahun_ajaran_id
    JOIN users u         ON u.id   = ph.guru_id
    LEFT JOIN penilaian_kehadiran pkh ON pkh.penilaian_id = ph.id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY s.kelas, s.nama
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

// Statistik global
$nilaiAkhirArr = array_filter(array_column($data, 'nilai_akhir'), fn($v) => $v !== null);
$statistik = null;
if (count($nilaiAkhirArr)) {
    $predikatCount = array_count_values(array_column($data, 'predikat'));
    $perCabang = [];
    foreach ($data as $row) {
        $key = $row['nama_cabang'];
        if (!isset($perCabang[$key])) $perCabang[$key] = ['cabang'=>$key,'kode'=>$row['kode_cabang'],'nilai'=>[],'count'=>0];
        if ($row['nilai_akhir'] !== null) {
            $perCabang[$key]['nilai'][] = $row['nilai_akhir'];
            $perCabang[$key]['count']++;
        }
    }
    $perCabangResult = [];
    foreach ($perCabang as $c) {
        if (empty($c['nilai'])) continue;
        $perCabangResult[] = [
            'cabang'     => $c['cabang'],
            'kode'       => $c['kode'],
            'jumlah'     => $c['count'],
            'rata_rata'  => round(array_sum($c['nilai']) / count($c['nilai']), 2),
            'tertinggi'  => round(max($c['nilai']), 2),
            'terendah'   => round(min($c['nilai']), 2),
        ];
    }

    $statistik = [
        'total'         => count($data),
        'sudah_dinilai' => count($nilaiAkhirArr),
        'rata_rata'     => round(array_sum($nilaiAkhirArr) / count($nilaiAkhirArr), 2),
        'tertinggi'     => round(max($nilaiAkhirArr), 2),
        'terendah'      => round(min($nilaiAkhirArr), 2),
        'predikat'      => $predikatCount,
        'per_cabang'    => $perCabangResult,
    ];
}

successResponse(['data' => $data, 'statistik' => $statistik]);
