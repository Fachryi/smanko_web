<?php
// ============================================================
// SMANKO – Helper Functions
// ============================================================

require_once __DIR__ . '/../config/database.php';

// ------------------------------------------------------------
// CORS Headers
// ------------------------------------------------------------
function setCORSHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    $allowedOrigins = [
        // Development
        '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',
        // Production
        '/^https?:\/\/smanko\.xo\.je$/',
        '/^https?:\/\/www\.smanko\.xo\.je$/',
    ];

    foreach ($allowedOrigins as $pattern) {
        if (preg_match($pattern, $origin)) {
            header("Access-Control-Allow-Origin: $origin");
            break;
        }
    }

    // Jika tidak ada Origin header (request langsung / same-origin), izinkan juga
    if (empty($origin)) {
        header('Access-Control-Allow-Origin: *');
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ------------------------------------------------------------
// JSON Response Helper
// ------------------------------------------------------------
function jsonResponse(mixed $data, int $statusCode = 200): never {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function successResponse(mixed $data = null, string $message = 'Berhasil', int $code = 200): never {
    $resp = ['status' => 'success', 'message' => $message];
    if ($data !== null) $resp['data'] = $data;
    jsonResponse($resp, $code);
}

function errorResponse(string $message, int $code = 400): never {
    jsonResponse(['status' => 'error', 'message' => $message], $code);
}

// ------------------------------------------------------------
// Auth: Validate Bearer Token
// ------------------------------------------------------------
function getAuthToken(): ?string {
    // Apache sering meng-strip header Authorization.
    // Coba semua sumber yang mungkin secara berurutan.
    $header = '';

    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        // Ketika PHP berjalan via mod_rewrite
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['HTTP_X_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_X_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        // Fallback: baca langsung dari Apache request headers
        $apacheHeaders = apache_request_headers();
        $header = $apacheHeaders['Authorization']
               ?? $apacheHeaders['authorization']
               ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/i', trim($header), $m)) {
        return trim($m[1]);
    }

    // Fallback terakhir: token via query string ?token=xxx
    // (digunakan jika hosting benar-benar memblokir Authorization header)
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }

    return null;
}

function requireAuth(): array {
    $token = getAuthToken();
    if (!$token) errorResponse('Token tidak ditemukan. Silakan login.', 401);

    $pdo = getDB();
    $stmt = $pdo->prepare("
        SELECT s.token, s.expires_at, u.id, u.nama, u.username, u.role, u.status
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row)              errorResponse('Token tidak valid.', 401);
    if ($row['status'] !== 'aktif') errorResponse('Akun dinonaktifkan.', 403);
    if (new DateTime() > new DateTime($row['expires_at'])) {
        // Hapus expired token
        $pdo->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
        errorResponse('Sesi sudah berakhir. Silakan login ulang.', 401);
    }

    return [
        'id'       => (int) $row['id'],
        'nama'     => $row['nama'],
        'username' => $row['username'],
        'role'     => $row['role'],
    ];
}

function requireRole(array $roles): array {
    $user = requireAuth();
    if (!in_array($user['role'], $roles, true)) {
        errorResponse('Anda tidak memiliki akses ke fitur ini.', 403);
    }
    return $user;
}

// ------------------------------------------------------------
// Token Generator
// ------------------------------------------------------------
function generateToken(): string {
    return bin2hex(random_bytes(32)); // 64 char hex
}

// ------------------------------------------------------------
// Get Request Body as array
// ------------------------------------------------------------
function getBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ------------------------------------------------------------
// Predikat dari nilai akhir
// ------------------------------------------------------------
function getPredikat(float $nilai): string {
    return match(true) {
        $nilai >= 90 => 'A (Istimewa)',
        $nilai >= 80 => 'B (Baik)',
        $nilai >= 70 => 'C (Cukup)',
        $nilai >= 60 => 'D (Kurang)',
        default      => 'E (Sangat Kurang)',
    };
}
