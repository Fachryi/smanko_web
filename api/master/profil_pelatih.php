<?php
require_once __DIR__ . '/../helpers/functions.php';
setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = requireAuth();
$pdo    = getDB();

if ($user['role'] !== 'admin') {
    errorResponse('Akses ditolak.', 403);
}

switch ($method) {
case 'GET':
    // Read list of pelatih profiles
    $stmt = $pdo->query("
        SELECT p.*, c.nama as nama_cabang 
        FROM profil_pelatih p
        JOIN cabang_olahraga c ON c.id = p.cabang_olahraga_id
        ORDER BY p.id DESC
    ");
    successResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    break;

case 'POST':
    // Handle both Create and Update (using a hidden _method=PUT field or direct POST with ID)
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    
    $nama = trim($_POST['nama'] ?? '');
    $cabang_id = (int)($_POST['cabang_olahraga_id'] ?? 0);
    $no_telepon = trim($_POST['no_telepon'] ?? '');
    $keterangan = trim($_POST['keterangan'] ?? '');
    
    if (!$nama || !$cabang_id) {
        errorResponse('Nama dan Cabang Olahraga wajib diisi.', 422);
    }
    
    // Validasi Cabor
    $chk = $pdo->prepare("SELECT id FROM cabang_olahraga WHERE id = ?");
    $chk->execute([$cabang_id]);
    if (!$chk->fetch()) {
        errorResponse('Cabang Olahraga tidak ditemukan.', 404);
    }

    // Handle Upload Foto
    $fotoPath = null;
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
        $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
        
        if (!in_array($ext, $allowedExts)) {
            errorResponse('Format foto harus JPG, PNG, atau WEBP.', 422);
        }
        
        $filename = uniqid('pelatih_') . '.' . $ext;
        $uploadDir = dirname(__DIR__) . '/uploads/pelatih/';
        
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        
        if (move_uploaded_file($_FILES['foto']['tmp_name'], $uploadDir . $filename)) {
            $fotoPath = '/api/uploads/pelatih/' . $filename;
        } else {
            errorResponse('Gagal mengunggah foto.', 500);
        }
    }

    if ($id > 0) {
        // Update
        $params = [$cabang_id, $nama, $no_telepon, $keterangan];
        $sql = "UPDATE profil_pelatih SET cabang_olahraga_id = ?, nama = ?, no_telepon = ?, keterangan = ?";
        
        if ($fotoPath) {
            // hapus foto lama
            $oldStmt = $pdo->prepare("SELECT foto FROM profil_pelatih WHERE id = ?");
            $oldStmt->execute([$id]);
            $oldFoto = $oldStmt->fetchColumn();
            if ($oldFoto) {
                // Remove '/api' prefix to get the relative path inside the api directory
                $relPath = str_replace('/api/', '/', $oldFoto);
                $fullPath = dirname(__DIR__) . $relPath;
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
            }
            
            $sql .= ", foto = ?";
            $params[] = $fotoPath;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $pdo->prepare($sql)->execute($params);

        // Sync: update semua siswa di cabor ini agar pelatih_id mengarah ke pelatih ini
        $pdo->prepare("UPDATE siswa SET pelatih_id = ? WHERE cabang_olahraga_id = ?")
            ->execute([$id, $cabang_id]);

        successResponse(null, 'Profil pelatih berhasil diperbarui.');
    } else {
        // Insert
        $pdo->prepare("INSERT INTO profil_pelatih (cabang_olahraga_id, nama, foto, no_telepon, keterangan) VALUES (?, ?, ?, ?, ?)")
            ->execute([$cabang_id, $nama, $fotoPath, $no_telepon, $keterangan]);
        $newId = (int)$pdo->lastInsertId();

        // Sync: assign pelatih baru ke semua siswa di cabor yang belum punya pelatih
        $pdo->prepare("UPDATE siswa SET pelatih_id = ? WHERE cabang_olahraga_id = ? AND pelatih_id IS NULL")
            ->execute([$newId, $cabang_id]);

        successResponse(['id' => $newId], 'Profil pelatih berhasil ditambahkan.', 201);
    }
    break;

case 'DELETE':
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    
    // Hapus file foto
    $oldStmt = $pdo->prepare("SELECT foto FROM profil_pelatih WHERE id = ?");
    $oldStmt->execute([$id]);
    $oldFoto = $oldStmt->fetchColumn();
    if ($oldFoto) {
        $relPath = str_replace('/api/', '/', $oldFoto);
        $fullPath = dirname(__DIR__) . $relPath;
        if (file_exists($fullPath)) {
            @unlink($fullPath);
        }
    }
    
    $pdo->prepare("DELETE FROM profil_pelatih WHERE id = ?")->execute([$id]);

    // Hapus referensi pelatih_id dari siswa yang menggunakan pelatih ini
    $pdo->prepare("UPDATE siswa SET pelatih_id = NULL WHERE pelatih_id = ?")->execute([$id]);

    successResponse(null, 'Profil pelatih berhasil dihapus.');
    break;

default:
    errorResponse('Method tidak diizinkan.', 405);
}
