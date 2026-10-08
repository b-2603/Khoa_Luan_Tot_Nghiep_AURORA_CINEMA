<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

class MovieTool implements AITool
{
    public function name(): string
    {
        return 'search_movies';
    }

    public function description(): string
    {
        return 'Tìm kiếm thông tin phim đang chiếu hoặc sắp chiếu trong hệ thống rạp theo tên phim, thể loại hoặc đạo diễn.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Tên phim, thể loại hoặc từ khóa tìm kiếm (Ví dụ: Avatar, Mai, Dune, Nolan)'
                ],
            ],
            'required' => ['query'],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) {
            return ['error' => true, 'message' => 'Không có kết nối CSDL MySQL.'];
        }

        $query = trim($arguments['query'] ?? '');
        $cleanQuery = trim(preg_replace('/^(tìm kiếm phim|tìm phim|xem phim|thông tin phim|phim|tìm|review)\s+/ui', '', $query));
        if ($cleanQuery === '') $cleanQuery = $query;

        if ($cleanQuery === '') {
            $stmt = $pdo->query("SELECT id, title, original_title, genre, duration, age_rating, director, language, status, description FROM movies LIMIT 6");
            $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->prepare("
                SELECT id, title, original_title, genre, duration, age_rating, director, cast, language, country, status, description 
                FROM movies 
                WHERE title LIKE ? OR original_title LIKE ? OR genre LIKE ? OR director LIKE ? OR ? LIKE CONCAT('%', title, '%')
                LIMIT 10
            ");
            $like = "%{$cleanQuery}%";
            $stmt->execute([$like, $like, $like, $like, $query]);
            $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Nếu vẫn chưa thấy, tìm theo từ khóa chính
            if (empty($movies)) {
                $words = explode(' ', $cleanQuery);
                foreach ($words as $w) {
                    $w = trim($w);
                    if (mb_strlen($w) >= 3) {
                        $stmtW = $pdo->prepare("SELECT id, title, original_title, genre, duration, age_rating, director, cast, language, country, status, description FROM movies WHERE title LIKE ? OR original_title LIKE ? LIMIT 6");
                        $stmtW->execute(["%{$w}%", "%{$w}%"]);
                        $found = $stmtW->fetchAll(PDO::FETCH_ASSOC);
                        if (!empty($found)) {
                            $movies = $found;
                            break;
                        }
                    }
                }
            }
        }

        return [
            'count' => count($movies),
            'query' => $query,
            'movies' => $movies,
        ];
    }
}
