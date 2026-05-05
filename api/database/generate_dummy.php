<?php
$host = '127.0.0.1';
$db   = 'smko_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Insert Cabang Olahraga
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE cabang_olahraga;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $cabors = [
        ['Sepak Bola', 'SEPAKBOLA'],
        ['Bulu Tangkis', 'BULUTANGKIS'],
        ['Bola Basket', 'BASKET'],
        ['Bola Voli', 'VOLI'],
        ['Pencak Silat', 'SILAT'],
        ['Atletik', 'ATLETIK']
    ];

    $stmt = $pdo->prepare("INSERT INTO cabang_olahraga (nama, kode, deskripsi) VALUES (?, ?, ?)");
    foreach ($cabors as $c) {
        $stmt->execute([$c[0], $c[1], 'Dummy Deskripsi ' . $c[0]]);
    }

    // 2. Generate Students
    $classes = [
        'X-1', 'X-2', 'X-3', 'X-4', 'X-5',
        'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5',
        'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5'
    ];

    $firstNamesM = ['Andi', 'Budi', 'Candra', 'Deni', 'Eko', 'Fajar', 'Hadi', 'Iwan', 'Joko', 'Kevin'];
    $firstNamesF = ['Siti', 'Ayu', 'Rini', 'Dina', 'Eka', 'Fitri', 'Gita', 'Hesti', 'Ika', 'Jihan'];
    $lastNames = ['Pratama', 'Santoso', 'Wijaya', 'Kusuma', 'Lestari', 'Putra', 'Putri', 'Sari', 'Setiawan', 'Nugroho'];

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE siswa;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $nisCounter = 2024001;
    $stmtSiswa = $pdo->prepare("INSERT INTO siswa (nis, nama, kelas, jenis_kelamin, cabang_olahraga_id) VALUES (?, ?, ?, ?, ?)");

    foreach ($classes as $kelas) {
        for ($i = 1; $i <= 10; $i++) {
            $isMale = rand(0, 1);
            $jk = $isMale ? 'L' : 'P';
            $firstNames = $isMale ? $firstNamesM : $firstNamesF;
            
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $nama = $firstName . ' ' . $lastName;
            
            $caborId = rand(1, 6);
            
            $stmtSiswa->execute([strval($nisCounter), $nama, $kelas, $jk, $caborId]);
            $nisCounter++;
        }
    }

    echo "Sip, dummy data untuk cabang olahraga dan 150 siswa berhasil dibuat!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
