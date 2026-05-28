<?php
// ============================================================
// /api/wakasek/alumni_detail.php
// GET ?siswa_id=N → detail alumni: info siswa + riwayat nilai
//                    semua semester + semua prestasi
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Method tidak diizinkan.', 405);
$user = requireRole(['wakasek']);
$pdo  = getDB();

$siswaId = (int)($_GET['siswa_id'] ?? 0);
if (!$siswaId) errorResponse('siswa_id diperlukan.', 422);

// ── Info siswa ──────────────────────────────────────────────
$stmtSiswa = $pdo->prepare("
    SELECT s.id, s.nisn, s.nis, s.nama, s.kelas AS kelas_terakhir,
           s.jenis_kelamin, s.status,
           c.nama AS nama_cabang, c.kode AS kode_cabang
    FROM siswa s
    JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
    WHERE s.id = ?
");
$stmtSiswa->execute([$siswaId]);
$siswa = $stmtSiswa->fetch();

if (!$siswa) errorResponse('Siswa tidak ditemukan.', 404);
if ($siswa['status'] !== 'alumni') errorResponse('Siswa ini bukan alumni.', 422);

// ── Riwayat nilai semua semester ───────────────────────────
$stmtRiwayat = $pdo->prepare("
    SELECT
        ph.id               AS penilaian_id,
        ph.status,
        ROUND(ph.nilai_keterampilan, 2) AS nilai_keterampilan,
        ROUND(ph.nilai_prestasi, 2)     AS nilai_prestasi,
        ROUND(ph.nilai_kehadiran, 2)    AS nilai_kehadiran,
        ROUND(ph.nilai_akhir, 2)        AS nilai_akhir,
        ph.predikat,
        ph.catatan,
        COALESCE(ph.kelas, s.kelas)     AS kelas_saat_dinilai,
        ta.nama                         AS tahun_ajaran,
        ta.semester,
        u.nama                          AS nama_guru
    FROM penilaian_header ph
    JOIN siswa s           ON s.id  = ph.siswa_id
    JOIN tahun_ajaran ta   ON ta.id = ph.tahun_ajaran_id
    LEFT JOIN users u      ON u.id  = ph.guru_id
    WHERE ph.siswa_id = ?
    ORDER BY ta.nama ASC, ta.semester ASC
");
$stmtRiwayat->execute([$siswaId]);
$riwayat = $stmtRiwayat->fetchAll();

// ── Semua prestasi (semua tahun) ────────────────────────────
$stmtPrestasi = $pdo->prepare("
    SELECT
        pp.id              AS prestasi_id,
        pp.nama_kejuaraan,
        pp.tingkatan,
        pp.peringkat,
        pp.nilai           AS nilai_prestasi,
        pp.bukti_foto,
        pp.bulan,
        pp.created_at      AS tanggal_input,
        ta.nama            AS tahun_ajaran,
        ta.semester
    FROM penilaian_prestasi pp
    JOIN penilaian_header ph ON ph.id = pp.penilaian_id
    JOIN tahun_ajaran ta     ON ta.id = ph.tahun_ajaran_id
    WHERE ph.siswa_id = ?
      AND pp.tingkatan NOT IN ('Tidak Ada Prestasi', '')
      AND pp.tingkatan IS NOT NULL
    ORDER BY ta.nama DESC, pp.nilai DESC
");
$stmtPrestasi->execute([$siswaId]);
$prestasi = $stmtPrestasi->fetchAll();

successResponse([
    'siswa'   => $siswa,
    'riwayat' => $riwayat,
    'prestasi'=> $prestasi,
]);
