<?php
// File debug sementara - HAPUS setelah selesai debug
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode([
    'HTTP_AUTHORIZATION'          => $_SERVER['HTTP_AUTHORIZATION']          ?? '(KOSONG)',
    'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '(KOSONG)',
    'apache_request_headers'      => function_exists('apache_request_headers') 
                                      ? apache_request_headers() 
                                      : 'fungsi tidak ada',
    'all_server_keys_with_auth'   => array_filter(
        array_keys($_SERVER), 
        fn($k) => stripos($k, 'auth') !== false
    ),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
