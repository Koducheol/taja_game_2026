import { WordTerm } from "../types";
import defaultWords from "../../words.json";

// Default Google Apps Script Web App URL provided by the user
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyzNq6APBot3FD2G04cBnhR6gm-ajPjba2OdinkQ1_jVLNiE0zoxFiqLyKz77R8a6GVsA/exec";

export const getGasUrl = (): string => {
  const url = localStorage.getItem("gas_url");
  return url !== null ? url : DEFAULT_GAS_URL;
};

export const saveGasUrl = (url: string) => {
  localStorage.setItem("gas_url", url.trim());
};

// Helper to make POST request to GAS bypassing CORS preflight options
const postToGAS = async (gasUrl: string, payload: any): Promise<any> => {
  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // text/plain prevents OPTIONS preflight block
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("GAS POST communication error:", err);
  }
  return null;
};

// 1. WORDS API

export const clientFetchWords = async (): Promise<{ words: WordTerm[]; source: string }> => {
  const gasUrl = getGasUrl();

  // Try direct GAS query first
  if (gasUrl) {
    try {
      const response = await fetch(`${gasUrl}?action=getWords`, {
        mode: "cors",
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem("cached_words", JSON.stringify(data));
          return { words: data, source: "gas" };
        }
      }
    } catch (err) {
      console.warn("Direct GAS fetch failed, trying local endpoints...", err);
    }
  }

  // Try local Netlify/Express endpoint
  try {
    const response = await fetch("/.netlify/functions/words");
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.words)) {
        localStorage.setItem("cached_words", JSON.stringify(data.words));
        return { words: data.words, source: "backend" };
      }
    }
  } catch (err) {
    console.warn("Local backend words fetch failed, trying local cache...", err);
  }

  // Try client cache
  const cached = localStorage.getItem("cached_words");
  if (cached) {
    try {
      return { words: JSON.parse(cached), source: "local_cache" };
    } catch (e) {
      // Ignored
    }
  }

  // Fallback to static words.json
  return { words: defaultWords as WordTerm[], source: "static" };
};

export const clientAddWord = async (wordData: {
  word: string;
  description: string;
  subject: string;
  grade: string;
  chapter: string;
}): Promise<{ success: boolean; words?: WordTerm[]; error?: string }> => {
  // Update local state first
  const { words: currentWords } = await clientFetchWords();
  
  // Clean split words
  const wordInput = String(wordData.word);
  const wordsToRegister = wordInput
    .split(/,|\n|\//)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  if (wordsToRegister.length === 0) {
    return { success: false, error: "등록할 단어가 없습니다." };
  }

  const desc = wordData.description.trim() || "뜻풀이 없음";
  const finalGrade = wordData.grade || "공통";
  const finalChapter = (wordData.chapter || wordData.subject || "공통 단원").trim();
  const finalSubject = (wordData.subject || "공통").trim();

  const newEntries = wordsToRegister.map((w, index) => ({
    id: `custom-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
    word: w,
    description: desc,
    subject: finalSubject,
    grade: finalGrade,
    chapter: finalChapter,
  }));

  const updatedWords = [...currentWords, ...newEntries];
  localStorage.setItem("cached_words", JSON.stringify(updatedWords));

  // Sync to GAS
  const gasUrl = getGasUrl();
  if (gasUrl) {
    await postToGAS(gasUrl, {
      action: "saveWords",
      words: updatedWords,
    });
  }

  // Sync to local Express server if present in background
  try {
    fetch("/.netlify/functions/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wordData),
    }).catch(() => {});
  } catch (e) {}

  return { success: true, words: updatedWords };
};

export const clientEditWord = async (
  id: string,
  wordData: {
    word: string;
    description: string;
    subject: string;
    grade: string;
    chapter: string;
  }
): Promise<{ success: boolean; words?: WordTerm[]; error?: string }> => {
  const { words: currentWords } = await clientFetchWords();
  const index = currentWords.findIndex(w => w.id === id);

  if (index === -1) {
    return { success: false, error: "단어를 찾을 수 없습니다." };
  }

  const desc = wordData.description.trim() || "뜻풀이 없음";
  const finalGrade = wordData.grade || "공통";
  const finalChapter = (wordData.chapter || wordData.subject || "공통 단원").trim();
  const finalSubject = (wordData.subject || "공통").trim();

  currentWords[index] = {
    id,
    word: wordData.word.trim(),
    description: desc,
    subject: finalSubject,
    grade: finalGrade,
    chapter: finalChapter,
  };

  localStorage.setItem("cached_words", JSON.stringify(currentWords));

  // Sync to GAS
  const gasUrl = getGasUrl();
  if (gasUrl) {
    await postToGAS(gasUrl, {
      action: "saveWords",
      words: currentWords,
    });
  }

  // Sync to local Express server in background
  try {
    fetch(`/.netlify/functions/words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wordData),
    }).catch(() => {});
  } catch (e) {}

  return { success: true, words: currentWords };
};

export const clientDeleteWord = async (id: string): Promise<{ success: boolean; words?: WordTerm[] }> => {
  const { words: currentWords } = await clientFetchWords();
  const filteredWords = currentWords.filter(w => w.id !== id);

  localStorage.setItem("cached_words", JSON.stringify(filteredWords));

  // Sync to GAS
  const gasUrl = getGasUrl();
  if (gasUrl) {
    await postToGAS(gasUrl, {
      action: "saveWords",
      words: filteredWords,
    });
  }

  // Sync to local Express server in background
  try {
    fetch(`/.netlify/functions/words/${id}`, {
      method: "DELETE",
    }).catch(() => {});
  } catch (e) {}

  return { success: true, words: filteredWords };
};

// 2. SCORES API

export const clientFetchScores = async (): Promise<{ scores: any[]; source: string }> => {
  const gasUrl = getGasUrl();

  // Try direct GAS query first
  if (gasUrl) {
    try {
      const response = await fetch(`${gasUrl}?action=getScores`, {
        mode: "cors",
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          localStorage.setItem("cached_scores", JSON.stringify(data));
          return { scores: data, source: "gas" };
        }
      }
    } catch (err) {
      console.warn("Direct GAS scores fetch failed, trying local endpoints...", err);
    }
  }

  // Try local Netlify/Express endpoint
  try {
    const response = await fetch("/.netlify/functions/scores");
    if (response.ok) {
      const data = await response.json();
      const rawScores = data && Array.isArray(data.scores) ? data.scores : (Array.isArray(data) ? data : []);
      localStorage.setItem("cached_scores", JSON.stringify(rawScores));
      return { scores: rawScores, source: "backend" };
    }
  } catch (err) {
    console.warn("Local backend scores fetch failed, trying local cache...", err);
  }

  // Try client cache
  const cached = localStorage.getItem("cached_scores");
  if (cached) {
    try {
      return { scores: JSON.parse(cached), source: "local_cache" };
    } catch (e) {
      // Ignored
    }
  }

  return { scores: [], source: "none" };
};

export const clientSaveScore = async (score: any): Promise<{ success: boolean; score: any }> => {
  // Update local client cache
  const cached = localStorage.getItem("cached_scores");
  let scores: any[] = [];
  if (cached) {
    try {
      scores = JSON.parse(cached);
    } catch (e) {}
  }
  
  const formattedScore = {
    id: score.id || "score_" + Date.now(),
    timestamp: score.timestamp || new Date().toISOString(),
    nickname: score.nickname || "꼬마 장인",
    score: score.score || 0,
    level: score.level || 1,
    wpm: score.wpm || 0,
    accuracy: score.accuracy || 0,
    grade: score.grade || "전체",
    subject: score.subject || "전체",
    difficulty: score.difficulty || "medium",
  };

  scores.unshift(formattedScore); // Newest first
  localStorage.setItem("cached_scores", JSON.stringify(scores));

  // Sync to GAS
  const gasUrl = getGasUrl();
  if (gasUrl) {
    await postToGAS(gasUrl, {
      action: "saveScore",
      score: formattedScore,
    });
  }

  // Sync to local Express server in background
  try {
    fetch("/.netlify/functions/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
    }).catch(() => {});
  } catch (e) {}

  return { success: true, score: formattedScore };
};

// 3. GAS TEMPLATE CODE (Completely client-side available!)

export const getGasTemplateCode = (): string => {
  return `/**
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
};
