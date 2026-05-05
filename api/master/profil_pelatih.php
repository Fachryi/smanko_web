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
    $sertifikasi = trim($_POST['sertifikasi'] ?? '');
    $pengalaman = trim($_POST['pengalaman'] ?? '');
    
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
        $uploadDir = __DIR__ . '/../../public/uploads/pelatih/';
        
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        if (move_uploaded_file($_FILES['foto']['tmp_name'], $uploadDir . $filename)) {
            $fotoPath = '/uploads/pelatih/' . $filename;
        } else {
            errorResponse('Gagal mengunggah foto.', 500);
        }
    }

    if ($id > 0) {
        // Update
        $params = [$cabang_id, $nama, $sertifikasi, $pengalaman];
        $sql = "UPDATE profil_pelatih SET cabang_olahraga_id = ?, nama = ?, sertifikasi = ?, pengalaman = ?";
        
        if ($fotoPath) {
            // hapus foto lama
            $oldStmt = $pdo->prepare("SELECT foto FROM profil_pelatih WHERE id = ?");
            $oldStmt->execute([$id]);
            $oldFoto = $oldStmt->fetchColumn();
            if ($oldFoto && file_exists(__DIR__ . '/../../public' . $oldFoto)) {
                @unlink(__DIR__ . '/../../public' . $oldFoto);
            }
            
            $sql .= ", foto = ?";
            $params[] = $fotoPath;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $pdo->prepare($sql)->execute($params);
        successResponse(null, 'Profil pelatih berhasil diperbarui.');
    } else {
        // Insert
        $pdo->prepare("INSERT INTO profil_pelatih (cabang_olahraga_id, nama, foto, sertifikasi, pengalaman) VALUES (?, ?, ?, ?, ?)")
            ->execute([$cabang_id, $nama, $fotoPath, $sertifikasi, $pengalaman]);
        successResponse(['id' => (int)$pdo->lastInsertId()], 'Profil pelatih berhasil ditambahkan.', 201);
    }
    break;

case 'DELETE':
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) errorResponse('ID tidak valid.', 422);
    
    // Hapus file foto
    $oldStmt = $pdo->prepare("SELECT foto FROM profil_pelatih WHERE id = ?");
    $oldStmt->execute([$id]);
    $oldFoto = $oldStmt->fetchColumn();
    if ($oldFoto && file_exists(__DIR__ . '/../../public' . $oldFoto)) {
        @unlink(__DIR__ . '/../../public' . $oldFoto);
    }
    
    $pdo->prepare("DELETE FROM profil_pelatih WHERE id = ?")->execute([$id]);
    successResponse(null, 'Profil pelatih berhasil dihapus.');
    break;

default:
    errorResponse('Method tidak diizinkan.', 405);
}
