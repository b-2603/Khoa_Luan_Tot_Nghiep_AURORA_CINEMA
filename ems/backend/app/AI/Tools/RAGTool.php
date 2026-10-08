<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

class RAGTool implements AITool
{
    public function name(): string
    {
        return 'search_knowledge_base';
    }

    public function description(): string
    {
        return 'Tra cứu tài liệu nội bộ, quy trình vận hành SOP, xử lý sự cố POS, kỹ thuật TMS phòng chiếu, bảo trì EMS và nội quy rạp Aurora Cinemas.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Vấn đề hoặc từ khóa quy trình (Ví dụ: đổi vé, hoàn vé, lỗi POS125, mất tín hiệu máy chiếu, mô hình LAST, phân loại độ tuổi)'
                ],
                'category' => [
                    'type' => 'string',
                    'description' => 'Danh mục tài liệu: POS, TMS, EMS, NGHIEP-VU, QUY-DINH (tùy chọn)'
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
        $category = trim($arguments['category'] ?? '');

        $sql = "
            SELECT c.content, d.name AS doc_name, d.category
            FROM ai_document_chunks c
            JOIN ai_documents d ON c.document_id = d.id
            WHERE (c.content LIKE ? OR d.name LIKE ? OR d.content_summary LIKE ?)
        ";
        $params = ["%{$query}%", "%{$query}%", "%{$query}%"];

        if ($category !== '') {
            $sql .= " AND d.category = ?";
            $params[] = $category;
        }

        $sql .= " LIMIT 4";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $chunks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($chunks)) {
            // Loại bỏ các hư từ tiếng Việt để tìm từ khóa thực sự có ý nghĩa
            $stopWords = [
                'nếu', 'khi', 'làm', 'sao', 'thế', 'nào', 'như', 'cho', 'tôi', 'em', 'mình', 'bạn',
                'với', 'và', 'của', 'ở', 'tại', 'thì', 'bị', 'được', 'không', 'có', 'là', 'gì',
                'một', 'các', 'những', 'hãy', 'giúp', 'bảo', 'hỏi', 'xin', 'chào', 'ạ', 'nhé', 'nha',
                'xem', 'về', 'trong', 'ra', 'phải', 'đang', 'đã', 'sẽ', 'đi', 'lại', 'thấy'
            ];
            
            // Tìm các cụm từ quan trọng phổ biến trước
            $phrases = ['đổi vé', 'hoàn vé', 'hoàn tiền', 'khiếu nại', 'độ tuổi', 'mất hình', 'mất tiếng', 'máy chiếu', 'bán vé', 'bắp nước', 'sự cố', 'tiêu chuẩn'];
            $matchedPhrase = null;
            $lowerQ = mb_strtolower($query);
            foreach ($phrases as $ph) {
                if (mb_strpos($lowerQ, $ph) !== false) {
                    $matchedPhrase = $ph;
                    break;
                }
            }

            if ($matchedPhrase) {
                $stmtPh = $pdo->prepare("
                    SELECT c.content, d.name AS doc_name, d.category
                    FROM ai_document_chunks c
                    JOIN ai_documents d ON c.document_id = d.id
                    WHERE (c.content LIKE ? OR d.name LIKE ? OR d.content_summary LIKE ?)
                    LIMIT 3
                ");
                $stmtPh->execute(["%{$matchedPhrase}%", "%{$matchedPhrase}%", "%{$matchedPhrase}%"]);
                $chunks = $stmtPh->fetchAll(PDO::FETCH_ASSOC);
            }

            if (empty($chunks)) {
                $rawWords = preg_split('/[\s,\.\?\!\:\;]+/u', $lowerQ, -1, PREG_SPLIT_NO_EMPTY);
                $keywords = array_values(array_filter($rawWords, function($w) use ($stopWords) {
                    return mb_strlen($w) >= 2 && !in_array($w, $stopWords, true);
                }));

                if (!empty($keywords)) {
                    // Lấy tất cả chunks và tính điểm khớp
                    $allStmt = $pdo->query("
                        SELECT c.content, d.name AS doc_name, d.category
                        FROM ai_document_chunks c
                        JOIN ai_documents d ON c.document_id = d.id
                    ");
                    $allChunks = $allStmt->fetchAll(PDO::FETCH_ASSOC);
                    $scored = [];

                    foreach ($allChunks as $chunk) {
                        $targetText = mb_strtolower($chunk['content'] . ' ' . $chunk['doc_name'] . ' ' . $chunk['category']);
                        $score = 0;
                        foreach ($keywords as $kw) {
                            if (mb_strpos($targetText, $kw) !== false) {
                                $score++;
                            }
                        }
                        if ($score > 0) {
                            $chunk['score'] = $score;
                            $scored[] = $chunk;
                        }
                    }

                    if (!empty($scored)) {
                        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
                        $chunks = array_slice($scored, 0, 3);
                    }
                }
            }
        }

        return [
            'count' => count($chunks),
            'query' => $query,
            'results' => array_map(function ($c) {
                return [
                    'document' => $c['doc_name'],
                    'category' => $c['category'],
                    'sop_text' => $c['content'],
                ];
            }, $chunks),
        ];
    }
}
