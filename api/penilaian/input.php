<?php
// ============================================================
// /api/penilaian/input.php
// GET  ?siswa_id=N&tahun_ajaran_id=N → ambil penilaian yg sudah ada
// POST → simpan/update penilaian lengkap (keterampilan+prestasi+kehadiran)
// Multi-prestasi: satu penilaian bisa punya N kejuaraan.
// Nilai prestasi yang dipakai = MAX(nilai) dari semua kejuaraan.
// ============================================================
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireRole(['guru_olahraga', 'admin', 'wakasek']);
$pdo    = getDB();

// ── Fungsi: Hitung nilai kehadiran dari persentase ─────────────
function hitungNilaiKehadiran(PDO $pdo, float $persentase): float {
    $stmt = $pdo->prepare("
        SELECT nilai_konversi FROM setting_kehadiran
        WHERE ? BETWEEN nilai_min AND nilai_max
        ORDER BY urutan LIMIT 1
    ");
    $stmt->execute([$persentase]);
    $row = $stmt->fetch();
    return $row ? (float)$row['nilai_konversi'] : 0.0;
}

// ── Fungsi: Hitung nilai akhir berbobot ────────────────────────
function hitungNilaiAkhir(PDO $pdo, float $keterampilan, float $prestasi, float $kehadiran): array {
    $bobot = $pdo->query("SELECT * FROM setting_bobot_utama LIMIT 1")->fetch();
    if (!$bobot) $bobot = ['bobot_keterampilan'=>50,'bobot_prestasi'=>30,'bobot_kehadiran'=>20];

    $nilaiAkhir = ($keterampilan * $bobot['bobot_keterampilan'] / 100)
                + ($prestasi    * $bobot['bobot_prestasi']     / 100)
                + ($kehadiran   * $bobot['bobot_kehadiran']    / 100);

    return [
        'nilai_akhir' => round($nilaiAkhir, 2),
        'predikat'    => getPredikat($nilaiAkhir),
        'bobot'       => $bobot,
    ];
}

switch ($method) {

// ── GET: Ambil penilaian yang sudah ada ────────────────────────
case 'GET':
    $siswaId  = (int)($_GET['siswa_id']  ?? 0);
    $taId     = (int)($_GET['tahun_ajaran_id'] ?? 0);
    if (!$siswaId || !$taId) errorResponse('siswa_id dan tahun_ajaran_id diperlukan.', 422);

    // Verifikasi akses dibebaskan untuk GET (semua guru & wakasek boleh melihat raport/PDF)
    // Proteksi edit (guru_kelas spesifik) tetap dijaga di sisi POST.

    $stmt = $pdo->prepare("
        SELECT ph.*,
               s.nama AS nama_siswa, s.nis, s.kelas, s.cabang_olahraga_id,
               c.nama AS nama_cabang, c.kode AS kode_cabang,
               ta.status AS tahun_ajaran_status,
               COALESCE(
                   (SELECT nama FROM profil_pelatih pp WHERE pp.id = s.pelatih_id LIMIT 1),
                   (SELECT nama FROM profil_pelatih pp WHERE pp.cabang_olahraga_id = s.cabang_olahraga_id ORDER BY id ASC LIMIT 1),
                   'Belum Ditugaskan'
               ) AS nama_pelatih
        FROM penilaian_header ph
        JOIN siswa s ON s.id = ph.siswa_id
        JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
        JOIN tahun_ajaran ta ON ta.id = ph.tahun_ajaran_id
        WHERE ph.siswa_id = ? AND ph.tahun_ajaran_id = ?
        LIMIT 1
    ");
    $stmt->execute([$siswaId, $taId]);
    $header = $stmt->fetch();

    if (!$header) {
        // Jika belum ada penilaian, tetap ambil status tahun ajaran
        $ta = $pdo->prepare("SELECT status FROM tahun_ajaran WHERE id = ?");
        $ta->execute([$taId]);
        $taRow = $ta->fetch();
        successResponse(['tahun_ajaran_status' => $taRow ? $taRow['status'] : 'tutup'], 'Belum ada penilaian.');
    }

    // Detail keterampilan
    $k = $pdo->prepare("
        SELECT pk.*, kk.nama AS nama_kriteria, kk.bobot
        FROM penilaian_keterampilan pk
        JOIN kriteria_keterampilan kk ON kk.id = pk.kriteria_id
        WHERE pk.penilaian_id = ?
        ORDER BY kk.urutan
    ");
    $k->execute([$header['id']]);
    $header['keterampilan'] = $k->fetchAll();

    // Detail prestasi — kembalikan SEMUA kejuaraan sebagai array
    $p = $pdo->prepare("
        SELECT * FROM penilaian_prestasi
        WHERE penilaian_id = ?
        ORDER BY nilai DESC
    ");
    $p->execute([$header['id']]);
    $prestasiList = $p->fetchAll();
    // Tetap kirim 'prestasi' (array) untuk kompatibilitas
    $header['prestasi_list'] = $prestasiList;
    // Backward compat: 'prestasi' = entry dengan nilai tertinggi
    $header['prestasi'] = count($prestasiList) > 0 ? $prestasiList[0] : null;

    // Detail kehadiran (agregat)
    $h = $pdo->prepare("SELECT * FROM penilaian_kehadiran WHERE penilaian_id = ?");
    $h->execute([$header['id']]);
    $header['kehadiran'] = $h->fetch() ?: null;

    // Detail kehadiran per bulan
    $hb = $pdo->prepare("
        SELECT bulan, tahun, total_sesi, total_hadir
        FROM penilaian_kehadiran_bulanan
        WHERE penilaian_id = ?
        ORDER BY tahun ASC, bulan ASC
    ");
    $hb->execute([$header['id']]);
    $header['kehadiran_bulanan'] = $hb->fetchAll();

    successResponse($header);

// ── POST: Simpan/Update penilaian ──────────────────────────────
case 'POST':
    // Cek apakah ada file upload (multipart) atau JSON
    $isMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');

    if ($isMultipart) {
        $body = $_POST;
    } else {
        $body = getBody();
    }

    $siswaId  = (int)($body['siswa_id']        ?? 0);
    $taId     = (int)($body['tahun_ajaran_id'] ?? 0);
    $status   = $body['status']   ?? 'draft';
    $catatan  = $body['catatan']  ?? '';

    if (!$siswaId || !$taId) errorResponse('siswa_id dan tahun_ajaran_id wajib diisi.', 422);

    // Cek apakah periode penilaian sedang TUTUP
    $taStmt = $pdo->prepare("SELECT status FROM tahun_ajaran WHERE id = ?");
    $taStmt->execute([$taId]);
    $taRow  = $taStmt->fetch();
    if ($taRow && $taRow['status'] === 'tutup') {
        errorResponse('Periode penilaian sudah ditutup. Data tidak dapat diubah.', 403);
    }

    // Ambil data siswa + cabang
    $siswaStmt = $pdo->prepare("
        SELECT s.*, c.id AS cabor_id FROM siswa s
        JOIN cabang_olahraga c ON c.id = s.cabang_olahraga_id
        WHERE s.id = ?
    ");
    $siswaStmt->execute([$siswaId]);
    $siswa = $siswaStmt->fetch();
    if (!$siswa) errorResponse('Siswa tidak ditemukan.', 404);

    // Verifikasi akses guru
    if ($user['role'] === 'guru_olahraga') {
        $chk = $pdo->prepare("
            SELECT id FROM guru_kelas
            WHERE user_id = ? AND kelas = ? AND tahun_ajaran_id = ?
        ");
        $chk->execute([$user['id'], $siswa['kelas'], $taId]);
        if (!$chk->fetch()) errorResponse('Anda tidak memiliki akses ke siswa di kelas ini.', 403);
    }

    // Cek penilaian sudah final (hanya admin yang bisa ubah)
    $existing = $pdo->prepare("SELECT * FROM penilaian_header WHERE siswa_id = ? AND tahun_ajaran_id = ?");
    $existing->execute([$siswaId, $taId]);
    $existingRow = $existing->fetch();

    if ($existingRow && $existingRow['status'] === 'final' && $user['role'] !== 'admin') {
        errorResponse('Penilaian sudah final. Hanya Admin yang bisa mengubah.', 403);
    }

    // ── 1. HITUNG KETERAMPILAN ──────────────────────────────────
    $kriteriaData = $body['keterampilan'] ?? [];
    if (is_string($kriteriaData)) $kriteriaData = json_decode($kriteriaData, true) ?? [];

    // Ambil semua kriteria untuk cabor ini
    $kriteriaStmt = $pdo->prepare("SELECT * FROM kriteria_keterampilan WHERE cabang_olahraga_id = ? ORDER BY urutan");
    $kriteriaStmt->execute([$siswa['cabor_id']]);
    $kriteriaList = $kriteriaStmt->fetchAll();

    $nilaiKeterampilan = 0;
    $detailKeterampilan = [];

    foreach ($kriteriaList as $k) {
        $nilaiMentah = null;
        foreach ($kriteriaData as $kd) {
            $kdArr = is_array($kd) ? $kd : (array)$kd;
            if ((int)($kdArr['kriteria_id'] ?? 0) === (int)$k['id']) {
                $nilaiMentah = (float)($kdArr['nilai'] ?? 0);
                break;
            }
        }
        if ($nilaiMentah === null) errorResponse("Nilai untuk kriteria '{$k['nama']}' belum diisi.", 422);
        if ($nilaiMentah < 0 || $nilaiMentah > 100) errorResponse("Nilai '{$k['nama']}' harus 0-100.", 422);

        $nilaiBerbobot = $nilaiMentah * ($k['bobot'] / 100);
        $nilaiKeterampilan += $nilaiBerbobot;
        $detailKeterampilan[] = [
            'kriteria_id'    => $k['id'],
            'nilai_mentah'   => $nilaiMentah,
            'nilai_berbobot' => round($nilaiBerbobot, 4),
        ];
    }
    $nilaiKeterampilan = round($nilaiKeterampilan, 2);

    // ── 2. MULTI PRESTASI ────────────────────────────────────────
    // prestasi_list: array of { tingkatan, nama_kejuaraan, predikat_juara }
    // Nilai prestasi yg digunakan = MAX(nilai) dari semua kejuaraan
    $prestasiListRaw = $body['prestasi_list'] ?? $body['prestasi'] ?? [];
    if (is_string($prestasiListRaw)) $prestasiListRaw = json_decode($prestasiListRaw, true) ?? [];

    // Normalisasi: pastikan selalu array of objects
    // Backward compat: jika dikirim sebagai objek tunggal, bungkus ke array
    if (isset($prestasiListRaw['tingkatan'])) {
        $prestasiListRaw = [$prestasiListRaw];
    }

    if (empty($prestasiListRaw)) {
        errorResponse('Minimal satu data prestasi wajib diisi.', 422);
    }

    // Ambil lookup nilai dari setting_prestasi
    $settingPrestasi = $pdo->query("SELECT tingkatan, nilai FROM setting_prestasi")->fetchAll(PDO::FETCH_KEY_PAIR);

    // Fallback value (Tidak Ada Prestasi / terendah)
    $fallbackNilai = min(array_values($settingPrestasi) ?: [75.0]);

    $detailPrestasi = [];
    $nilaiPrestasi  = 0;  // akan diisi dengan MAX

    foreach ($prestasiListRaw as $idx => $pr) {
        $prArr         = is_array($pr) ? $pr : (array)$pr;
        $tingkatan     = trim($prArr['tingkatan']     ?? '');
        $namaKej       = trim($prArr['nama_kejuaraan'] ?? '');
        $nomorPertandingan = trim($prArr['nomor_pertandingan'] ?? '');
        $predikatJuara = trim($prArr['predikat_juara'] ?? '');
        // Terima tanggal_prestasi (YYYY-MM-DD) atau fallback ke bulan lama
        $tanggalPrestasi = trim($prArr['tanggal_prestasi'] ?? '') ?: null;
        $bulan = null;
        if ($tanggalPrestasi) {
            // Validasi format tanggal
            $dt = DateTime::createFromFormat('Y-m-d', $tanggalPrestasi);
            if (!$dt || $dt->format('Y-m-d') !== $tanggalPrestasi) {
                $tanggalPrestasi = null;
            } else {
                $bulan = (int)$dt->format('n'); // ekstrak bulan untuk backward compat
            }
        } else {
            // Backward compat: bulan saja
            $bulan = (int)($prArr['bulan'] ?? 0) ?: null;
        }

        if (empty($tingkatan)) errorResponse("Tingkatan kejuaraan ke-" . ($idx + 1) . " wajib dipilih.", 422);

        $nilaiSetting = isset($settingPrestasi[$tingkatan])
            ? (float)$settingPrestasi[$tingkatan]
            : (float)$fallbackNilai;

        // Nilai prestasi = MAX dari semua kejuaraan
        if ($nilaiSetting > $nilaiPrestasi) {
            $nilaiPrestasi = $nilaiSetting;
        }

        $detailPrestasi[] = [
            'tingkatan'          => $tingkatan,
            'nama_kejuaraan'     => $namaKej,
            'nomor_pertandingan' => $nomorPertandingan,
            'predikat_juara'     => $predikatJuara,
            'bulan'              => $bulan,
            'tanggal_prestasi'   => $tanggalPrestasi,
            'nilai'              => $nilaiSetting,
            'bukti_foto'         => null,  // diisi di bawah jika ada file
        ];
    }

    // Handle file upload untuk masing-masing prestasi (index-based)
    // Key format: bukti_foto_0, bukti_foto_1, ...
    if ($isMultipart) {
        foreach ($detailPrestasi as $i => &$dp) {
            $fileKey = 'bukti_foto_' . $i;
            if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $file       = $_FILES[$fileKey];
                $maxSize    = 2 * 1024 * 1024;
                $allowedExt = ['jpg','jpeg','png','pdf'];
                $ext        = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

                if ($file['size'] > $maxSize)           errorResponse('Ukuran file maksimal 2 MB.', 422);
                if (!in_array($ext, $allowedExt, true)) errorResponse('Format file harus JPG, PNG, atau PDF.', 422);

                $uploadDir = dirname(__DIR__) . '/uploads/prestasi/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

                $fileName  = 'siswa_' . $siswaId . '_' . time() . '_' . $i . '.' . $ext;
                if (!move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
                    errorResponse('Gagal menyimpan file upload ke-' . ($i + 1) . '.', 500);
                }
                $dp['bukti_foto'] = 'uploads/prestasi/' . $fileName;
            }
        }
        unset($dp);
    }

    // Jika update (existingRow ada), pertahankan bukti_foto lama untuk entry yang tidak diganti
    if ($existingRow) {
        $oldFiles = $pdo->prepare("SELECT tingkatan, bukti_foto FROM penilaian_prestasi WHERE penilaian_id = ?");
        $oldFiles->execute([$existingRow['id']]);
        $oldFilesMap = [];
        foreach ($oldFiles->fetchAll() as $of) {
            // key by tingkatan untuk mencocokkan
            $oldFilesMap[$of['tingkatan']] = $of['bukti_foto'];
        }
        foreach ($detailPrestasi as &$dp) {
            if ($dp['bukti_foto'] === null && isset($oldFilesMap[$dp['tingkatan']])) {
                $dp['bukti_foto'] = $oldFilesMap[$dp['tingkatan']];
            }
        }
        unset($dp);
    }

    // ── 3. KEHADIRAN ────────────────────────────────────────────
    // Coba baca format baru: kehadiran_bulanan (array per bulan)
    $kehadiranBulananRaw = $body['kehadiran_bulanan'] ?? [];
    if (is_string($kehadiranBulananRaw)) $kehadiranBulananRaw = json_decode($kehadiranBulananRaw, true) ?? [];

    $detailBulanan  = [];
    $totalPertemuan = 0;
    $totalHadir     = 0;

    if (!empty($kehadiranBulananRaw)) {
        // Format baru: hitung total dari semua bulan
        foreach ($kehadiranBulananRaw as $kb) {
            $kbArr  = is_array($kb) ? $kb : (array)$kb;
            $bulan  = (int)($kbArr['bulan']       ?? 0);
            $tahun  = (int)($kbArr['tahun']       ?? date('Y'));
            $sesi   = max(0, (int)($kbArr['total_sesi']  ?? 0));
            $hadir  = max(0, (int)($kbArr['total_hadir'] ?? 0));

            if ($bulan < 1 || $bulan > 12) continue; // skip invalid
            if ($hadir > $sesi) errorResponse("Jumlah hadir bulan ke-{$bulan} melebihi total sesi.", 422);

            $totalPertemuan += $sesi;
            $totalHadir     += $hadir;
            $detailBulanan[] = ['bulan' => $bulan, 'tahun' => $tahun, 'total_sesi' => $sesi, 'total_hadir' => $hadir];
        }
        if (empty($detailBulanan)) errorResponse('Minimal satu bulan kehadiran wajib diisi.', 422);
    } else {
        // Backward compat: format lama (total langsung)
        $kehadiranData  = $body['kehadiran'] ?? [];
        if (is_string($kehadiranData)) $kehadiranData = json_decode($kehadiranData, true) ?? [];
        $totalPertemuan = (int)($kehadiranData['total_pertemuan'] ?? 0);
        $totalHadir     = (int)($kehadiranData['total_hadir']     ?? 0);
    }

    $totalPertemuan = max(1, $totalPertemuan);
    if ($totalHadir > $totalPertemuan) errorResponse('Jumlah hadir tidak boleh melebihi total pertemuan.', 422);

    $persentaseHadir = ($totalHadir / $totalPertemuan) * 100;
    $nilaiKehadiran  = hitungNilaiKehadiran($pdo, $persentaseHadir);

    // ── 4. NILAI AKHIR ──────────────────────────────────────────
    $akhir = hitungNilaiAkhir($pdo, $nilaiKeterampilan, $nilaiPrestasi, $nilaiKehadiran);

    // ── 5. SIMPAN KE DATABASE ───────────────────────────────────
    $pdo->beginTransaction();
    try {
        if ($existingRow) {
            // UPDATE header
            $pdo->prepare("
                UPDATE penilaian_header SET
                    guru_id            = ?,
                    kelas              = ?,
                    nilai_keterampilan = ?,
                    nilai_prestasi     = ?,
                    nilai_kehadiran    = ?,
                    nilai_akhir        = ?,
                    predikat           = ?,
                    status             = ?,
                    catatan            = ?
                WHERE id = ?
            ")->execute([
                $user['id'],
                $existingRow['kelas'] ?: $siswa['kelas'], // Pertahankan kelas riwayat
                $nilaiKeterampilan, $nilaiPrestasi, $nilaiKehadiran,
                $akhir['nilai_akhir'], $akhir['predikat'],
                $status, $catatan,
                $existingRow['id']
            ]);
            $penilaianId = $existingRow['id'];

            // Hapus detail lama
            $pdo->prepare("DELETE FROM penilaian_keterampilan WHERE penilaian_id = ?")->execute([$penilaianId]);
            $pdo->prepare("DELETE FROM penilaian_prestasi    WHERE penilaian_id = ?")->execute([$penilaianId]);
            $pdo->prepare("DELETE FROM penilaian_kehadiran   WHERE penilaian_id = ?")->execute([$penilaianId]);
        } else {
            // INSERT header
            $pdo->prepare("
                INSERT INTO penilaian_header
                    (siswa_id, guru_id, tahun_ajaran_id, kelas,
                     nilai_keterampilan, nilai_prestasi, nilai_kehadiran,
                     nilai_akhir, predikat, status, catatan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $siswaId, $user['id'], $taId, $siswa['kelas'],
                $nilaiKeterampilan, $nilaiPrestasi, $nilaiKehadiran,
                $akhir['nilai_akhir'], $akhir['predikat'],
                $status, $catatan
            ]);
            $penilaianId = (int)$pdo->lastInsertId();
        }

        // Insert detail keterampilan
        $insK = $pdo->prepare("INSERT INTO penilaian_keterampilan (penilaian_id, kriteria_id, nilai_mentah, nilai_berbobot) VALUES (?,?,?,?)");
        foreach ($detailKeterampilan as $dk) {
            $insK->execute([$penilaianId, $dk['kriteria_id'], $dk['nilai_mentah'], $dk['nilai_berbobot']]);
        }

        // Insert SEMUA prestasi (multi-row)
        $insP = $pdo->prepare("
            INSERT INTO penilaian_prestasi
                (penilaian_id, nama_kejuaraan, nomor_pertandingan, tingkatan, peringkat, bukti_foto, nilai, bulan, tanggal_prestasi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($detailPrestasi as $dp) {
            $insP->execute([
                $penilaianId,
                $dp['nama_kejuaraan'],
                $dp['nomor_pertandingan'],
                $dp['tingkatan'],
                $dp['predikat_juara'],
                $dp['bukti_foto'],
                $dp['nilai'],
                $dp['bulan'],
                $dp['tanggal_prestasi'],
            ]);
        }

        // Insert kehadiran agregat
        $pdo->prepare("
            INSERT INTO penilaian_kehadiran (penilaian_id, total_hadir, total_sesi, nilai)
            VALUES (?, ?, ?, ?)
        ")->execute([$penilaianId, $totalHadir, $totalPertemuan, $nilaiKehadiran]);

        // Insert / replace detail per bulan (hapus lama dulu)
        $pdo->prepare("DELETE FROM penilaian_kehadiran_bulanan WHERE penilaian_id = ?")->execute([$penilaianId]);
        if (!empty($detailBulanan)) {
            $insKB = $pdo->prepare("
                INSERT INTO penilaian_kehadiran_bulanan (penilaian_id, bulan, tahun, total_sesi, total_hadir)
                VALUES (?, ?, ?, ?, ?)
            ");
            foreach ($detailBulanan as $kb) {
                $insKB->execute([$penilaianId, $kb['bulan'], $kb['tahun'], $kb['total_sesi'], $kb['total_hadir']]);
            }
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse('Gagal menyimpan penilaian: ' . $e->getMessage(), 500);
    }

    successResponse([
        'penilaian_id'      => $penilaianId,
        'nilai_keterampilan'=> $nilaiKeterampilan,
        'nilai_prestasi'    => $nilaiPrestasi,
        'nilai_kehadiran'   => $nilaiKehadiran,
        'persentase_hadir'  => round($persentaseHadir, 2),
        'nilai_akhir'       => $akhir['nilai_akhir'],
        'predikat'          => $akhir['predikat'],
        'status'            => $status,
        'jumlah_prestasi'   => count($detailPrestasi),
    ], $existingRow ? 'Penilaian berhasil diperbarui.' : 'Penilaian berhasil disimpan.', $existingRow ? 200 : 201);

default:
    errorResponse('Method tidak diizinkan.', 405);
}
