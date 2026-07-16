import React, { useState, useEffect, useCallback } from "react";
import MainMenu from "./components/MainMenu";
import TypingGame from "./components/TypingGame";
import ResultsModal from "./components/ResultsModal";
import TeacherDashboard from "./components/TeacherDashboard";
import { WordTerm, Difficulty, GameStats } from "./types";
import { GraduationCap, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

type Screen = "menu" | "game" | "results" | "teacher";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("menu");
  const [words, setWords] = useState<WordTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration of current game session
  const [gameConfig, setGameConfig] = useState<{
    nickname: string;
    grade: string;
    subject: string;
    chapter: string;
    difficulty: Difficulty;
  }>({
    nickname: "",
    grade: "전체",
    subject: "전체",
    chapter: "전체",
    difficulty: "medium",
  });

  // Stats of finished game
  const [finishedStats, setFinishedStats] = useState<GameStats>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    level: 1,
    correctCount: 0,
    totalCount: 0,
    wpm: 0,
    accuracy: 0,
  });

  // Word list of successful completions in current game
  const [correctTerms, setCorrectTerms] = useState<WordTerm[]>([]);

  // Teacher Authentication State
  const [showTeacherAuth, setShowTeacherAuth] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Clean and split any compound words from various data sources (e.g. legacy databases, GAS, local)
  const sanitizeWords = (rawWords: WordTerm[]): WordTerm[] => {
    if (!Array.isArray(rawWords)) return [];
    const sanitized: WordTerm[] = [];
    rawWords.forEach((item, itemIdx) => {
      if (!item || !item.word) return;
      const wordStr = String(item.word);
      const splitWords = wordStr
        .split(/,|\/|\\|\n/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      if (splitWords.length <= 1) {
        sanitized.push({
          ...item,
          id: item.id || `client-word-${Date.now()}-${itemIdx}-${Math.floor(Math.random() * 1000)}`,
          word: wordStr.trim(),
          chapter: (item.chapter || item.subject || "공통 단원").trim()
        });
      } else {
        splitWords.forEach((w, idx) => {
          sanitized.push({
            ...item,
            id: `${item.id || `client-split-${itemIdx}`}-${idx}`,
            word: w,
            chapter: (item.chapter || item.subject || "공통 단원").trim()
          });
        });
      }
    });
    return sanitized;
  };

  // Fetch words from backend Express API
  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/words");
      if (!response.ok) {
        throw new Error("서버에서 단어 정보를 가져오지 못했습니다.");
      }
      const data = await response.json();
      if (data && Array.isArray(data.words)) {
        setWords(sanitizeWords(data.words));
      } else {
        throw new Error("단어 데이터 형식이 잘못되었습니다.");
      }
    } catch (err: any) {
      setError(err.message || "단어 로딩 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleStartGame = (config: {
    nickname: string;
    grade: string;
    subject: string;
    chapter: string;
    difficulty: Difficulty;
  }) => {
    setGameConfig(config);
    setActiveScreen("game");
  };

  const handleFinishGame = (stats: GameStats, correct: WordTerm[]) => {
    setFinishedStats(stats);
    setCorrectTerms(correct);
    
    // Save nickname, score and results to the server
    fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname: gameConfig.nickname,
        score: stats.score,
        level: stats.level,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        grade: gameConfig.grade,
        subject: gameConfig.subject,
        difficulty: gameConfig.difficulty,
      }),
    }).catch((err) => console.error("Score submission error:", err));

    setActiveScreen("results");
  };

  const handleRestartGame = () => {
    setActiveScreen("game");
  };

  const handleExitToMenu = () => {
    setActiveScreen("menu");
  };

  const handleTeacherAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPassword === "teacher777") {
      setShowTeacherAuth(false);
      setTeacherPassword("");
      setAuthError("");
      setActiveScreen("teacher");
    } else {
      setAuthError("비밀번호가 맞지 않습니다! (Hint: teacher777) ❌");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Brand Navbar (Kinetic Minimalism Header) */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shadow-xs select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            onClick={handleExitToMenu} 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-black shadow-md group-hover:rotate-6 transition-transform">
              🎒
            </div>
            <div>
              <span className="font-display font-black text-xl text-slate-800 flex items-center gap-1">
                '생각솔솔~' 타자게임
                <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-100 animate-pulse" />
              </span>
              <p className="text-[10px] text-slate-400 font-bold tracking-tight">초등 필수 교과 용어 타자 학습 시스템</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-3">
            {activeScreen === "menu" && (
              <button
                id="header-teacher-btn"
                onClick={() => {
                  setShowTeacherAuth(true);
                  setTeacherPassword("");
                  setAuthError("");
                }}
                className="text-sm md:text-base font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-5 h-5" />
                교사 모드 ⚙️
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none font-sans">
            <div className="p-4 rounded-full bg-indigo-50 text-indigo-500 mb-4 animate-spin-slow">
              <RefreshCw className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">단어 사전 정보를 불러오는 중입니다...</h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">잠시만 기다려 주시면 재미있는 타자 공부가 시작됩니다!</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 select-none font-sans">
            <div className="p-4 rounded-full bg-rose-50 text-rose-500 mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">문제가 발생했습니다!</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed font-semibold">
              {error} <br/>
              데이터베이스 연결 상태를 확인하거나 네트워크를 점검해 주세요.
            </p>
            <button
              id="retry-fetch-btn"
              onClick={fetchWords}
              className="mt-4 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              다시 시도하기
            </button>
          </div>
        ) : (
          /* Screens Routing Controller */
          <div className="w-full">
            {activeScreen === "menu" && (
              <MainMenu 
                onStartGame={handleStartGame} 
                words={words}
              />
            )}

            {activeScreen === "game" && (
              <TypingGame
                config={gameConfig}
                words={words}
                onFinishGame={handleFinishGame}
                onExit={handleExitToMenu}
              />
            )}

            {activeScreen === "results" && (
              <ResultsModal
                stats={finishedStats}
                config={gameConfig}
                correctTerms={correctTerms}
                onRestart={handleRestartGame}
                onHome={handleExitToMenu}
              />
            )}

            {activeScreen === "teacher" && (
              <TeacherDashboard
                onClose={handleExitToMenu}
                words={words}
                onRefreshWords={fetchWords}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-100 py-5 text-center text-[11px] text-slate-400 font-bold select-none mt-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <span>🎒 '생각솔솔~' 타자게임 - 초등학생을 위한 교과서 연계 타자 학습 솔루션</span>
          <span>Copyright © 2026 '생각솔솔~' 타자게임. All Rights Reserved.</span>
        </div>
      </footer>

      {/* App-level Teacher Authentication Modal */}
      {showTeacherAuth && (
        <div id="teacher-app-login-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 transform animate-pop select-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <GraduationCap className="w-6.5 h-6.5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">교사 관리 모드 로그인</h3>
                <p className="text-xs text-slate-400 font-medium">교과서 단어 수정 및 학습 분석 결과 조회용</p>
              </div>
            </div>

            <form onSubmit={handleTeacherAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">교사용 관리 비밀번호</label>
                <input
                  id="teacher-password-input-app"
                  type="password"
                  placeholder="비밀번호를 입력하세요 (hint: teacher777)"
                  value={teacherPassword}
                  onChange={(e) => {
                    setTeacherPassword(e.target.value);
                    if (authError) setAuthError("");
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:bg-white focus:border-indigo-500 outline-hidden transition-all text-base text-center tracking-widest"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="text-xs text-rose-500 font-extrabold bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-center animate-pulse">
                  ⚠️ {authError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-teacher-auth-btn"
                  type="button"
                  onClick={() => {
                    setShowTeacherAuth(false);
                    setTeacherPassword("");
                    setAuthError("");
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors font-bold text-sm cursor-pointer"
                >
                  돌아가기
                </button>
                <button
                  id="submit-teacher-auth-btn"
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-bold text-sm shadow-sm cursor-pointer"
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
