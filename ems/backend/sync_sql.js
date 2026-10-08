// d:/EMS_AURORA/backend/sync_sql.js
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'quizzes_240.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Generate SQL lines for quizzes
const quizSqlRows = data.quizzes.map(q => {
  const isCtkm = q.isCtkm ? 1 : 0;
  return `(${q.id}, ${q.courseId}, '${q.title.replace(/'/g, "''")}', ${q.passScore}, ${q.durationMinutes}, ${isCtkm}, NOW(), NOW())`;
}).join(',\n');

// Generate SQL lines for quiz_questions
let questionCounter = 1;
const questionSqlRows = [];

data.quizzes.forEach(q => {
  q.questions.forEach(qq => {
    const qText = qq.questionText.replace(/'/g, "''");
    const opts = JSON.stringify(qq.options).replace(/'/g, "''");
    const exp = qq.explanation.replace(/'/g, "''");
    questionSqlRows.push(`(${questionCounter++}, ${q.id}, '${qText}', '${opts}', ${qq.correctAnswerIndex}, '${exp}', NOW(), NOW())`);
  });
});

const quizzesSection = `-- 4. Bài kiểm tra (Quizzes: 8 bộ đề thi nghiệp vụ)\nINSERT INTO \`quizzes\` (\`id\`, \`course_id\`, \`title\`, \`pass_score\`, \`duration_minutes\`, \`is_ctkm\`, \`created_at\`, \`updated_at\`) VALUES\n${quizSqlRows};\n\n-- 5. Câu hỏi trắc nghiệm (Quiz Questions: 240 câu hỏi nghiệp vụ rạp chiếu phim - 30 câu/đề)\nINSERT INTO \`quiz_questions\` (\`id\`, \`quiz_id\`, \`question_text\`, \`options\`, \`correct_answer_index\`, \`explanation\`, \`created_at\`, \`updated_at\`) VALUES\n${questionSqlRows.join(',\n')};\n`;

// Update database_aurora_ems.sql and backend/database/aurora_ems.sql
[
  path.join(__dirname, '../database_aurora_ems.sql'),
  path.join(__dirname, 'database/aurora_ems.sql')
].forEach(sqlPath => {
  if (fs.existsSync(sqlPath)) {
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const regex = /-- 4\. Bài kiểm tra \(Quizzes\)[\s\S]*?(?=-- 6\. Lịch sử làm bài thi)/;
    if (regex.test(sqlContent)) {
      sqlContent = sqlContent.replace(regex, quizzesSection + '\n');
      fs.writeFileSync(sqlPath, sqlContent, 'utf8');
      console.log(`Updated SQL file: ${sqlPath}`);
    } else {
      console.warn(`Could not match regex in ${sqlPath}`);
    }
  }
});
console.log("SQL files synced!");
