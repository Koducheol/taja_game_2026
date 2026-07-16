import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory & Local File Cache Fallback
const WORDS_FILE_PATH = path.join(process.cwd(), "words.json");
const SCORES_FILE_PATH = path.join(process.cwd(), "scores.json");
const CONFIG_FILE_PATH = path.join(process.cwd(), "config.json");

const DEFAULT_WORDS = [
  // 과학
  { id: "sci-1", word: "광합성", description: "식물이 햇빛을 받아 스스로 양분을 만드는 일", subject: "과학", grade: "5학년", chapter: "1. 생물과 환경" },
  { id: "sci-2", word: "온도계", description: "물체의 따뜻하고 차가운 정도를 온도로 나타내는 도구", subject: "과학", grade: "3학년", chapter: "2. 물질의 성질과 열" },
  { id: "sci-3", word: "마찰력", description: "물체의 운동을 방해하는 힘", subject: "과학", grade: "6학년", chapter: "3. 여러 가지 힘" },
  { id: "sci-4", word: "지층", description: "자갈, 모래, 진흙 등이 쌓여 굳어진 여러 겹의 층", subject: "과학", grade: "4학년", chapter: "4. 지층과 화석" },
  { id: "sci-5", word: "화석", description: "먼 옛날 살았던 생물의 유해나 흔적이 지층에 남아있는 것", subject: "과학", grade: "4학년", chapter: "4. 지층과 화석" },
  { id: "sci-6", word: "증발", description: "액체 상태의 물이 기체 상태의 수증기로 변하는 현상", subject: "과학", grade: "4학년", chapter: "5. 물과 날씨" },
  { id: "sci-7", word: "중력", description: "지구가 물체를 아래로 끌어당기는 힘", subject: "과학", grade: "5학년", chapter: "3. 여러 가지 힘" },
  { id: "sci-8", word: "지진", description: "지각의 변동으로 땅이 흔들리고 갈라지는 현상", subject: "과학", grade: "4학년", chapter: "5. 물과 날씨" },
  { id: "sci-9", word: "태양계", description: "태양과 그 주위를 도는 행성들이 이루는 우주 공간", subject: "과학", grade: "5학년", chapter: "6. 지구와 달의 운동" },
  { id: "sci-10", word: "전도", description: "열이 접촉하고 있는 물체를 통해 이동하는 현상", subject: "과학", grade: "5학년", chapter: "2. 물질의 성질과 열" },

  // 사회
  { id: "soc-1", word: "공공기관", description: "주민들의 생활 편의와 복지를 위해 일하는 국가 기관", subject: "사회", grade: "4학년", chapter: "1. 지방 자치와 공공기관" },
  { id: "soc-2", word: "민주주의", description: "모든 국민이 나라의 주인으로서 권리를 갖는 정치 제도", subject: "사회", grade: "6학년", chapter: "2. 인권과 민주주의" },
  { id: "soc-3", word: "지방자치", description: "지역 주민들이 스스로 지역의 일을 처리하는 제도", subject: "사회", grade: "4학년", chapter: "1. 지방 자치와 공공기관" },
  { id: "soc-4", word: "헌법", description: "국민의 권리와 의무를 규정한 나라의 가장 으뜸가는 법", subject: "사회", grade: "6학년", chapter: "2. 인권과 민주주의" },
  { id: "soc-5", word: "독도", description: "경상북도 울릉군에 속한 우리나라 가장 동쪽의 섬", subject: "사회", grade: "5학년", chapter: "3. 국토와 기후" },
  { id: "soc-6", word: "기후", description: "어떤 지역에서 오랜 기간에 걸쳐 나타나는 평균적인 날씨 상태", subject: "사회", grade: "5학년", chapter: "3. 국토와 기후" },
  { id: "soc-7", word: "주민자치회", description: "주민들이 모여 동네 일을 상의하고 해결하는 모임", subject: "사회", grade: "4학년", chapter: "1. 지방 자치와 공공기관" },
  { id: "soc-8", word: "생산자", description: "생활에 필요한 물건을 만들거나 서비스를 제공하는 사람", subject: "사회", grade: "4학년", chapter: "4. 경제 활동과 선택" },
  { id: "soc-9", word: "인권", description: "사람이라면 누구나 태어나면서부터 존중받아야 할 권리", subject: "사회", grade: "5학년", chapter: "2. 인권과 민주주의" },
  { id: "soc-10", word: "삼국시대", description: "고구려, 백제, 신라가 경쟁하며 발전하던 역사적인 시대", subject: "사회", grade: "5학년", chapter: "5. 삼국의 성립과 발전" },

  // 수학
  { id: "math-1", word: "소수", description: "1보다 큰 자연수 중에서 1과 자신만을 약수로 가지는 수", subject: "수학", grade: "5학년", chapter: "1. 약수와 배수" },
  { id: "math-2", word: "분수", description: "전체를 똑같이 나눈 것 중의 일부분을 나타내는 수", subject: "수학", grade: "3학년", chapter: "2. 분수의 이해" },
  { id: "math-3", word: "정육면체", description: "크기가 같은 정사각형 여섯 개로 둘러싸인 입체도형", subject: "수학", grade: "5학년", chapter: "3. 여러 가지 도형" },
  { id: "math-4", word: "비례식", description: "두 비율이 같음을 나타내는 식", subject: "수학", grade: "6학년", chapter: "4. 비례식과 비율" },
  { id: "math-5", word: "원주율", description: "원의 지름에 대한 둘레의 비율로, 약 3.14", subject: "수학", grade: "6학년", chapter: "4. 비례식과 비율" },
  { id: "math-6", word: "예각", description: "0도보다 크고 90도보다 작은 각", subject: "수학", grade: "4학년", chapter: "3. 여러 가지 도형" },
  { id: "math-7", word: "대칭", description: "한 선이나 점을 중심으로 똑같은 모양이 마주보고 있는 것", subject: "수학", grade: "5학년", chapter: "3. 여러 가지 도형" },
  { id: "math-8", word: "올림", description: "구하려는 자리 미만의 수를 올려서 처리하는 어림수 방법", subject: "수학", grade: "5학년", chapter: "5. 수의 범위와 어림하기" },
  { id: "math-9", word: "약수", description: "어떤 수를 나누어떨어지게 하는 수", subject: "수학", grade: "5학년", chapter: "1. 약수와 배수" },
  { id: "math-10", word: "공배수", description: "두 개 이상의 자연수가 공통으로 가지는 배수", subject: "수학", grade: "5학년", chapter: "1. 약수와 배수" },

  // 국어
  { id: "kor-1", word: "비유", description: "어떤 현상이나 사물을 비슷한 다른 현상이나 사물에 빗대어 표현하는 것", subject: "국어", grade: "6학년", chapter: "1. 비유와 문학적 표현" },
  { id: "kor-2", word: "문맥", description: "글에서 앞뒤 구절이나 문장이 연결되어 나타나는 관계와 흐름", subject: "국어", grade: "5학년", chapter: "2. 문맥과 요약하기" },
  { id: "kor-3", word: "관용표현", description: "둘 이상의 낱말이 합쳐져 새로운 특별한 뜻을 나타내는 익은 표현", subject: "국어", grade: "5학년", chapter: "1. 비유와 문학적 표현" },
  { id: "kor-4", word: "주제", description: "지은이가 글이나 말을 통해 나타내고자 하는 가장 중심이 되는 생각", subject: "국어", grade: "3학년", chapter: "3. 글의 주제와 설명문" },
  { id: "kor-5", word: "띄어쓰기", description: "글을 쓸 때 낱말과 낱말 사이를 비우고 쓰는 맞춤법 규정", subject: "국어", grade: "3학년", chapter: "4. 바른 맞춤법과 쓰기" },
  { id: "kor-6", word: "고유어", description: "우리말에 본디부터 있던 단어나 그것을 바탕으로 새로 만들어진 말", subject: "국어", grade: "4학년", chapter: "5. 고유어의 아름다움" },
  { id: "kor-7", word: "설명문", description: "어떤 사실이나 지식을 이해하기 쉽게 풀어 쓴 글", subject: "국어", grade: "4학년", chapter: "3. 글의 주제와 설명문" },
  { id: "kor-8", word: "요약", description: "글의 핵심적인 내용을 간추려 짧게 정리하는 것", subject: "국어", grade: "5학년", chapter: "2. 문맥과 요약하기" },
  { id: "kor-9", word: "의성어", description: "사람이나 사물의 소리를 흉내 낸 말", subject: "국어", grade: "3학년", chapter: "6. 소리와 모양을 흉내 내요" },
  { id: "kor-10", word: "의태어", description: "사람이나 사물의 모양이나 행동을 흉내 낸 말", subject: "국어", grade: "3학년", chapter: "6. 소리와 모양을 흉내 내요" }
];

// Read dynamic Config URL
function getGASUrl(): string {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
      if (data.GAS_WEB_APP_URL) {
        return data.GAS_WEB_APP_URL.trim();
      }
    }
  } catch (e) {
    console.error("Failed to read config.json:", e);
  }
  return (process.env.GAS_WEB_APP_URL || "").trim();
}

// Save dynamic Config URL
function saveGASUrl(url: string) {
  try {
    const data = { GAS_WEB_APP_URL: url.trim() };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Failed to write config.json:", e);
    return false;
  }
}

// Helper to split any words that are grouped by commas, slashes, or newlines into clean individual words
function flattenWords(rawWords: any[]): any[] {
  if (!Array.isArray(rawWords)) return [];
  const flattened: any[] = [];
  rawWords.forEach((item, itemIdx) => {
    if (!item || !item.word) return;
    const wordStr = String(item.word);
    
    // Split words by commas (,), slashes (/), backslashes (\), or newlines (\n)
    const splitWords = wordStr
      .split(/,|\/|\\|\n/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (splitWords.length <= 1) {
      flattened.push({
        ...item,
        id: item.id || `word-${Date.now()}-${itemIdx}-${Math.floor(Math.random() * 1000)}`,
        word: wordStr.trim(),
        chapter: (item.chapter || item.subject || "공통 단원").trim()
      });
    } else {
      splitWords.forEach((w, idx) => {
        flattened.push({
          ...item,
          id: `${item.id || `split-${itemIdx}`}-${idx}`,
          word: w,
          chapter: (item.chapter || item.subject || "공통 단원").trim()
        });
      });
    }
  });
  return flattened;
}

// Helper to load words
function getWordsList(): any[] {
  try {
    if (!fs.existsSync(WORDS_FILE_PATH)) {
      const flattenedDefault = flattenWords(DEFAULT_WORDS);
      fs.writeFileSync(WORDS_FILE_PATH, JSON.stringify(flattenedDefault, null, 2), "utf8");
      return flattenedDefault;
    }
    const raw = fs.readFileSync(WORDS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return flattenWords(parsed);
  } catch (error) {
    console.error("Error reading words.json:", error);
    return flattenWords(DEFAULT_WORDS);
  }
}

// Helper to save words locally
function saveWordsList(words: any[]) {
  try {
    fs.writeFileSync(WORDS_FILE_PATH, JSON.stringify(words, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to words.json:", error);
  }
}

// Helper to load scores
function getScoresList(): any[] {
  try {
    if (!fs.existsSync(SCORES_FILE_PATH)) {
      fs.writeFileSync(SCORES_FILE_PATH, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    const raw = fs.readFileSync(SCORES_FILE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading scores.json:", error);
    return [];
  }
}

// Helper to save scores locally
function saveScoresList(scores: any[]) {
  try {
    fs.writeFileSync(SCORES_FILE_PATH, JSON.stringify(scores, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to scores.json:", error);
  }
}

// Synchronize with GAS (Dynamic Dual-Sheet Sync)
async function syncWithGAS(action: string, payload?: any): Promise<any> {
  const gasUrl = getGASUrl();
  if (!gasUrl) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout limit to allow for GAS cold starts

    if (action === "getWords") {
      const response = await fetch(`${gasUrl}?action=getWords`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as any;
        if (Array.isArray(data)) {
          const normalized = flattenWords(data);
          saveWordsList(normalized); // Sync local file cache with remote GAS
          return normalized;
        }
      }
    } else if (action === "saveWords") {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "saveWords",
          words: payload,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as any;
        if (data && data.success && Array.isArray(data.words)) {
          return data.words;
        }
      }
    } else if (action === "getScores") {
      const response = await fetch(`${gasUrl}?action=getScores`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as any;
        if (Array.isArray(data)) {
          saveScoresList(data);
          return data;
        }
      }
    } else if (action === "saveScore") {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "saveScore",
          score: payload,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as any;
        if (data && data.success) {
          return data.score;
        }
      }
    }
  } catch (error: any) {
    if (error && error.name === "AbortError") {
      console.log(`GAS Synchronization timed out for action: ${action}. Falling back to local cache.`);
    } else {
      console.log(`GAS Synchronization not available for action: ${action} (${error?.message || error}). Falling back to local cache.`);
    }
  }
  return null;
}

// GET Current Server Config
app.get("/api/config", (req, res) => {
  const gasUrl = getGASUrl();
  res.json({
    hasGasUrl: !!gasUrl,
    gasUrl: gasUrl // We'll share it with the teacher in the admin panel so they can see and manage it
  });
});

// UPDATE Server Config (Save GAS URL)
app.post("/api/config", (req, res) => {
  const { gasUrl } = req.body;
  if (gasUrl === undefined) {
    return res.status(400).json({ error: "gasUrl이 누락되었습니다." });
  }

  const success = saveGASUrl(gasUrl);
  if (success) {
    res.json({ success: true, hasGasUrl: !!gasUrl, gasUrl });
  } else {
    res.status(500).json({ error: "설정 저장에 실패했습니다." });
  }
});

// GET Words API
app.get("/api/words", async (req, res) => {
  // Try remote GAS first if available
  const gasWords = await syncWithGAS("getWords");
  if (gasWords) {
    return res.json({ source: "gas", words: gasWords });
  }
  // Otherwise serve local
  const localWords = getWordsList();
  res.json({ source: "local", words: localWords });
});

// SAVE/UPDATE Word
app.post("/api/words", async (req, res) => {
  const { word, description, subject, grade, chapter } = req.body;
  if (!word || !subject) {
    return res.status(400).json({ error: "교과와 단어는 필수 입력 사항입니다." });
  }

  // Split words by comma (,), newline (\n), or slash (/)
  const wordInput = String(word);
  const wordsToRegister = wordInput
    .split(/,|\n|\//)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  if (wordsToRegister.length === 0) {
    return res.status(400).json({ error: "등록할 단어가 없습니다." });
  }

  const currentWords = getWordsList();
  const desc = (description && description.trim()) ? description.trim() : "뜻풀이 없음";
  const finalGrade = grade || "공통";
  const finalChapter = (chapter || subject || "공통 단원").trim();
  const finalSubject = (subject || "공통").trim();

  const newEntries = wordsToRegister.map((w, index) => ({
    id: `custom-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
    word: w,
    description: desc,
    subject: finalSubject,
    grade: finalGrade,
    chapter: finalChapter,
  }));

  const updatedWords = [...currentWords, ...newEntries];
  saveWordsList(updatedWords);

  // Sync with GAS in background
  const gasResult = await syncWithGAS("saveWords", updatedWords);

  res.json({
    success: true,
    words: gasResult || updatedWords,
    source: gasResult ? "gas" : "local"
  });
});

// UPDATE Word Detail
app.put("/api/words/:id", async (req, res) => {
  const { id } = req.params;
  const { word, description, subject, grade, chapter } = req.body;

  if (!word || !subject) {
    return res.status(400).json({ error: "교과와 단어는 필수 입력 사항입니다." });
  }

  const currentWords = getWordsList();
  const index = currentWords.findIndex(w => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "단어를 찾을 수 없습니다." });
  }

  const desc = (description && description.trim()) ? description.trim() : "뜻풀이 없음";
  const finalGrade = grade || "공통";
  const finalChapter = (chapter || subject || "공통 단원").trim();
  const finalSubject = (subject || "공통").trim();

  currentWords[index] = { 
    id, 
    word: word.trim(), 
    description: desc, 
    subject: finalSubject, 
    grade: finalGrade,
    chapter: finalChapter
  };
  saveWordsList(currentWords);

  // Sync with GAS in background
  const gasResult = await syncWithGAS("saveWords", currentWords);

  res.json({
    success: true,
    words: gasResult || currentWords,
    source: gasResult ? "gas" : "local"
  });
});

// DELETE Word
app.delete("/api/words/:id", async (req, res) => {
  const { id } = req.params;
  const currentWords = getWordsList();
  const filteredWords = currentWords.filter(w => w.id !== id);

  saveWordsList(filteredWords);

  // Sync with GAS in background
  const gasResult = await syncWithGAS("saveWords", filteredWords);

  res.json({
    success: true,
    words: gasResult || filteredWords,
    source: gasResult ? "gas" : "local"
  });
});

// GET Scores List
app.get("/api/scores", async (req, res) => {
  const gasScores = await syncWithGAS("getScores");
  if (gasScores) {
    return res.json({ source: "gas", scores: gasScores });
  }
  const localScores = getScoresList();
  res.json({ source: "local", scores: localScores });
});

// POST Score Record (Nickname, Score and learning metrics)
app.post("/api/scores", async (req, res) => {
  const { nickname, score, level, wpm, accuracy, grade, subject, difficulty } = req.body;
  if (!nickname) {
    return res.status(400).json({ error: "닉네임이 입력되지 않았습니다." });
  }

  const currentScores = getScoresList();
  const newScore = {
    id: `score-${Date.now()}`,
    timestamp: new Date().toISOString(),
    nickname: nickname.trim(),
    score: Number(score) || 0,
    level: Number(level) || 1,
    wpm: Number(wpm) || 0,
    accuracy: Number(accuracy) || 0,
    grade: grade || "전체",
    subject: subject || "전체",
    difficulty: difficulty || "medium"
  };

  const updatedScores = [newScore, ...currentScores].slice(0, 500); // Limit to 500 records
  saveScoresList(updatedScores);

  // Send to GAS in background
  const gasResult = await syncWithGAS("saveScore", newScore);

  res.json({
    success: true,
    score: newScore,
    scores: updatedScores,
    source: gasResult ? "gas" : "local"
  });
});

// EXPORT GAS SCRIPT API - For Teachers to easily copy and paste into their Google Apps Script!
app.get("/api/gas-template", (req, res) => {
  const code = `/**
 * Google Apps Script Web App Template for 교과서 용어 타자 게임
 * 
 * 1. Open Google Sheets (https://sheets.google.com)
 * 2. Click 'Extensions' -> 'Apps Script'
 * 3. Replace the code in Code.gs with this script
 * 4. Click 'Deploy' -> 'New Deployment'
 * 5. Under 'Select type', select 'Web app'
 * 6. Set 'Execute as' to 'Me' and 'Who has access' to 'Anyone'
 * 7. Deploy, copy the Web App URL, and paste it into your server's .env file or direct in UI:
 *    GAS_WEB_APP_URL="https://script.google.com/macros/s/.../exec"
 */

const WORDS_SHEET = "Words";
const SCORES_SHEET = "Scores";

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function doGet(e) {
  const action = e.parameter.action || "getWords";
  
  if (action === "getScores") {
    const sheet = getOrCreateSheet(SCORES_SHEET, ["id", "timestamp", "nickname", "score", "level", "wpm", "accuracy", "grade", "subject", "difficulty"]);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    const headers = data[0];
    const scores = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      scores.push(item);
    }
    // Return newest first
    scores.reverse();
    return ContentService.createTextOutput(JSON.stringify(scores))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default: getWords
  const sheet = getOrCreateSheet(WORDS_SHEET, ["id", "word", "description", "subject", "grade", "chapter"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  const headers = data[0];
  const words = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    words.push(item);
  }
  return ContentService.createTextOutput(JSON.stringify(words))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === "saveWords") {
      const sheet = getOrCreateSheet(WORDS_SHEET, ["id", "word", "description", "subject", "grade", "chapter"]);
      sheet.clearContents();
      sheet.appendRow(["id", "word", "description", "subject", "grade", "chapter"]);
      
      const words = postData.words || [];
      if (words.length > 0) {
        const rows = words.map(w => [w.id, w.word, w.description, w.subject, w.grade, w.chapter || "공통 단원"]);
        sheet.getRange(2, 1, rows.length, 6).setValues(rows);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, words: words }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "saveScore") {
      const sheet = getOrCreateSheet(SCORES_SHEET, ["id", "timestamp", "nickname", "score", "level", "wpm", "accuracy", "grade", "subject", "difficulty"]);
      const s = postData.score || {};
      
      sheet.appendRow([
        s.id || "score_" + new Date().getTime(),
        s.timestamp || new Date().toISOString(),
        s.nickname || "꼬마 장인",
        s.score || 0,
        s.level || 1,
        s.wpm || 0,
        s.accuracy || 0,
        s.grade || "전체",
        s.subject || "전체",
        s.difficulty || "medium"
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, score: s }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(code);
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
