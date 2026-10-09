// d:/EMS_AURORA/backend/sync_mock_data.js
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'quizzes_240.json');
const mockDataPath = path.join(__dirname, '../frontend/src/services/mockData.ts');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Format Quiz[] TypeScript code
const formattedQuizzes = data.quizzes.map(q => {
  return {
    id: `quiz-${q.id}`,
    courseId: `crs-${q.courseId}`,
    courseTitle: q.courseTitle,
    title: q.title,
    passScore: q.passScore,
    durationMinutes: q.durationMinutes,
    isCtkm: Boolean(q.isCtkm),
    questions: q.questions.map((qq, idx) => ({
      id: `q-${q.id}${String(idx + 1).padStart(2, '0')}`,
      questionText: qq.questionText,
      options: qq.options,
      correctAnswerIndex: qq.correctAnswerIndex,
      explanation: qq.explanation
    }))
  };
});

const quizzesTs = 'export const INITIAL_QUIZZES: Quiz[] = ' + JSON.stringify(formattedQuizzes, null, 2) + ';\n';

let mockContent = fs.readFileSync(mockDataPath, 'utf8');

const regex = /export const INITIAL_QUIZZES: Quiz\[\] = \[[\s\S]*?\n\];\n/;

if (!regex.test(mockContent)) {
  console.error("Could not find INITIAL_QUIZZES in mockData.ts");
  process.exit(1);
}

mockContent = mockContent.replace(regex, quizzesTs);
fs.writeFileSync(mockDataPath, mockContent, 'utf8');
console.log("Updated mockData.ts with all 8 quizzes and 240 questions successfully!");
