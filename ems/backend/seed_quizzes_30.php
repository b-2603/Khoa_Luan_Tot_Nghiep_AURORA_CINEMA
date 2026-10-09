<?php
// d:/EMS_AURORA/backend/seed_quizzes_30.php
// Reads quizzes_240.json and seeds MySQL database with 8 courses, 8 quizzes, and 240 questions (30 per quiz)

$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=aurora_ems;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$jsonContent = file_get_contents(__DIR__ . '/quizzes_240.json');
$data = json_decode($jsonContent, true);

if (!$data) {
    die("Error reading quizzes_240.json\n");
}

echo "Seeding courses...\n";
// Ensure courses 7 & 8 exist
$c7 = [
    7, 
    'Kỹ Thuật Vận Hành Máy Chiếu Laser 4K, IMAX & Hệ Thống Âm Thanh Dolby Atmos',
    'Làm chủ máy chiếu Laser RGB Christie/Barco, quản trị phân phối khóa KDM DCI và cân chỉnh âm thanh vòm Dolby Atmos 128 đối tượng.',
    'Kỹ Thuật Chiếu Phim',
    50,
    0,
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
    42,
    38
];

$c8 = [
    8,
    'Giám Sát Ca Trực Cinema Supervisor & Kiểm Soát Thất Thoát, An Toàn Vệ Sinh HACCP',
    'Nghiệp vụ Trưởng ca: Opening/Closing Checklist, kiểm soát thất thoát doanh thu POS, kiểm kê kho bắp nước và tiêu chuẩn an toàn thực phẩm HACCP.',
    'Quản Lý & Vận Hành',
    60,
    0,
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&auto=format&fit=crop&q=80',
    35,
    30
];

$courseStmt = $pdo->prepare("INSERT INTO courses (id, title, description, category, duration_minutes, is_ctkm, thumbnail, enrolled_count, completed_count, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), duration_minutes = VALUES(duration_minutes), updated_at = NOW()");

$courseStmt->execute($c7);
$courseStmt->execute($c8);

// Disable foreign key checks to safely refresh quizzes and questions
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$pdo->exec("DELETE FROM quiz_questions");
$pdo->exec("DELETE FROM quizzes");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

$quizInsertStmt = $pdo->prepare("INSERT INTO quizzes (id, course_id, title, pass_score, duration_minutes, is_ctkm, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");

$qQuestionStmt = $pdo->prepare("INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");

$totalQuestionsInserted = 0;

foreach ($data['quizzes'] as $q) {
    $quizInsertStmt->execute([
        $q['id'],
        $q['courseId'],
        $q['title'],
        $q['passScore'],
        $q['durationMinutes'],
        $q['isCtkm'] ? 1 : 0
    ]);
    
    echo "Inserted Quiz ID {$q['id']}: {$q['title']}\n";

    foreach ($q['questions'] as $qq) {
        $qQuestionStmt->execute([
            $q['id'],
            $qq['questionText'],
            json_encode($qq['options'], JSON_UNESCAPED_UNICODE),
            $qq['correctAnswerIndex'],
            $qq['explanation']
        ]);
        $totalQuestionsInserted++;
    }
}

echo "=================================================\n";
echo "SUCCESS: Seeded " . count($data['quizzes']) . " quizzes with $totalQuestionsInserted total questions into MySQL!\n";
$quizCount = $pdo->query("SELECT count(*) FROM quizzes")->fetchColumn();
$questionCount = $pdo->query("SELECT count(*) FROM quiz_questions")->fetchColumn();
echo "Verification - MySQL DB contains: $quizCount quizzes and $questionCount quiz questions.\n";
