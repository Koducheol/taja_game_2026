import React, { useState, useMemo, useEffect } from "react";
import { BookOpen, GraduationCap, Flame, Play, Settings, GraduationCap as TeacherIcon, Sparkles, Trophy, Award, Zap, Clock } from "lucide-react";
import { Difficulty, WordTerm } from "../types";
import { clientFetchScores } from "../utils/dataClient";

interface LeaderboardRecord {
  id?: string;
  nickname: string;
  score: number;
  level: number;
  wpm: number;
  accuracy: number;
  subject: string;
  grade?: string;
  difficulty?: string;
  date?: string;
}

interface MainMenuProps {
  onStartGame: (config: {
    nickname: string;
    grade: string;
    subject: string;
    chapter: string;
    difficulty: Difficulty;
  }) => void;
  words: WordTerm[];
}

export default function MainMenu({ onStartGame, words = [] }: MainMenuProps) {
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [grade, setGrade] = useState("전체");
  const [subject, setSubject] = useState("전체");
  const [chapter, setChapter] = useState("전체");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [loadingScores, setLoadingScores] = useState(true);

  // Fetch score rankings
  useEffect(() => {
    async function loadScores() {
      setLoadingScores(true);
      let combined: LeaderboardRecord[] = [];

      // 1. Try to load from localStorage first
      try {
        const stored = localStorage.getItem("edutech_typing_leaderboard");
        if (stored) {
          combined = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Local storage read error", e);
      }

      // 2. Load from server database (supports GAS synchronization)
      try {
        const data = await clientFetchScores();
        if (data && Array.isArray(data.scores)) {
          const serverScores: LeaderboardRecord[] = data.scores.map((s: any) => ({
            id: s.id,
            nickname: s.nickname,
            score: Number(s.score || 0),
            level: Number(s.level || 1),
            wpm: Number(s.wpm || 0),
            accuracy: Number(s.accuracy || 0),
            subject: s.subject || "전체",
            grade: s.grade || "전체",
            difficulty: s.difficulty || "medium",
            date: s.timestamp ? new Date(s.timestamp).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""
          }));

          // Merge server scores with local storage, avoiding duplicate records
          const existingKeys = new Set(combined.map(item => `${item.nickname}-${item.score}-${item.subject}`));
          serverScores.forEach(s => {
            const key = `${s.nickname}-${s.score}-${s.subject}`;
            if (!existingKeys.has(key)) {
              combined.push(s);
              existingKeys.add(key);
            }
          });
        }
      } catch (e) {
        console.error("Server leaderboard fetch error", e);
      }

      // Final strict deduplication by nickname, score, level, and subject to remove any double-saved records
      const uniqueCombined: LeaderboardRecord[] = [];
      const seenKeys = new Set<string>();
      combined.forEach(record => {
        const key = `${record.nickname}-${record.score}-${record.level}-${record.subject}`;
        if (!seenKeys.has(key)) {
          uniqueCombined.push(record);
          seenKeys.add(key);
        }
      });

      // Sort combined scores by score descending
      uniqueCombined.sort((a, b) => b.score - a.score);
      setLeaderboard(uniqueCombined);
      setLoadingScores(false);
    }

    loadScores();
  }, []);

  // Extract unique chapters based on selected grade and subject
  const availableChapters = useMemo(() => {
    let filtered = words;
    if (grade !== "전체") {
      filtered = filtered.filter((w) => w.grade === grade);
    }
    if (subject !== "전체") {
      filtered = filtered.filter((w) => w.subject === subject);
    }

    const uniqueChapters = new Set<string>();
    filtered.forEach((w) => {
      if (w.chapter) {
        uniqueChapters.add(w.chapter.trim());
      }
    });

    return Array.from(uniqueChapters).sort();
  }, [words, grade, subject]);

  // Reset chapter to "전체" if the selected chapter is no longer available in the filtered list
  useEffect(() => {
    if (chapter !== "전체" && !availableChapters.includes(chapter)) {
      setChapter("전체");
    }
  }, [grade, subject, availableChapters, chapter]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setNicknameError("닉네임을 꼭 입력해 주세요! 🎯 (너의 멋진 이름을 기다리고 있어!)");
      const inputEl = document.getElementById("nickname");
      if (inputEl) {
        inputEl.focus();
      }
      return;
    }
    setNicknameError("");
    onStartGame({
      nickname: nickname.trim(),
      grade,
      subject,
      chapter,
      difficulty,
    });
  };



  return (
    <div id="main-menu" className="flex flex-col items-center justify-center min-h-[85vh] py-8 px-4 font-sans select-none">
      {/* Playful Floating Hero Section */}
      <div className="text-center mb-8 animate-float">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-150 px-4 py-1.5 rounded-full text-indigo-600 text-sm font-semibold mb-4 shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300" />
          재미있는 초등 필수 교과어 학습!
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-extrabold tracking-tight text-slate-800 leading-tight">
          '생각솔솔~' <span className="text-indigo-600 relative inline-block">
            타자게임
            <span className="absolute left-0 bottom-1 w-full h-3 bg-indigo-100 -z-10 rounded-full"></span>
          </span>
        </h1>
        <p className="text-slate-500 mt-3 text-lg max-w-md mx-auto font-medium">
          단어를 치고, 설명을 읽으며, 손가락 훈련과 교과서 공부를 한 번에 끝내요! 🚀
        </p>
      </div>

      {/* Main Configurations & Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-5xl items-stretch">
        
        {/* Left Side: Main Configurations Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
          <form onSubmit={handleStart} className="space-y-6">
            {/* Nickname Input */}
            <div>
              <label htmlFor="nickname" className="block text-slate-700 font-bold mb-2 text-base">
                🎯 너의 멋진 닉네임을 적어줘!
              </label>
              <input
                id="nickname"
                type="text"
                placeholder="예) 타자왕세종, 척척학사"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value.slice(0, 10));
                  if (e.target.value.trim()) {
                    setNicknameError("");
                  }
                }}
                className={`w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 text-slate-700 font-bold focus:bg-white focus:border-indigo-500 outline-hidden transition-all text-lg placeholder:text-slate-400 ${
                  nicknameError ? "border-rose-500 bg-rose-50/10 focus:border-rose-600" : "border-slate-200"
                }`}
              />
              {nicknameError && (
                <p className="text-rose-600 text-xs font-extrabold mt-1.5 flex items-center gap-1 animate-pulse">
                  ⚠️ {nicknameError}
                </p>
              )}
            </div>

            {/* Chapter/Unit Selector */}
            <div>
              <label htmlFor="chapter-select" className="block text-slate-700 font-bold mb-2 text-base">
                📂 연습할 단원을 골라줘! (선생님이 만든 단원 수록)
              </label>
              <div className="relative">
                <select
                  id="chapter-select"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold focus:bg-white focus:border-indigo-500 outline-hidden transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="전체">🎒 전체 단원 공부하기 (등록된 전체 낱말)</option>
                  {availableChapters.map((ch) => (
                    <option key={ch} value={ch}>
                      📖 {ch}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div>
              <span className="block text-slate-700 font-bold mb-2 text-base">
                ⚡ 난이도 설정 (내려오는 속도)
              </span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "easy", label: "쉬움 🌱", desc: "단어가 천천히 내려와요" },
                  { id: "medium", label: "보통 🌲", desc: "도전하기 좋은 속도!" },
                  { id: "hard", label: "어려움 🔥", desc: "엄청나게 빨라요!" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    id={`diff-btn-${diff.id}`}
                    onClick={() => setDifficulty(diff.id as Difficulty)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                      difficulty === diff.id
                        ? "border-indigo-500 bg-indigo-50/40 text-indigo-700 shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-extrabold text-sm">{diff.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{diff.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Play Button */}
            <button
              id="start-game-btn"
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 cursor-pointer active:translate-y-0 mt-2"
            >
              <Play className="w-5 h-5 fill-white" />
              공부 게임 시작하기!
            </button>
          </form>

          {/* Small footer settings for Teacher Dashboard */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>🎮 타자 게임 & 교과 학습</span>
            <span className="text-slate-300 font-medium">화이팅! ✨</span>
          </div>
        </div>

        {/* Right Side: Hall of Fame (Leaderboard) Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
          <div className="w-full">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-50 pb-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500 shrink-0">
                <Trophy className="w-5 h-5 fill-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">명예의 전당 👑</h2>
                <p className="text-[11px] text-slate-400 font-bold">도전적인 친구들의 실시간 랭킹!</p>
              </div>
            </div>

            {loadingScores ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-medium text-xs">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                기록을 불러오고 있어요...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-xs text-slate-400 font-bold py-16">
                아직 등록된 기록이 없어요! <br/>첫 번째 주인공이 되어보세요! 🏆
              </div>
            ) : (
              /* Scrollable List: exactly 5 items fit visible max-height cleanly, scroll down to see more */
              <div className="space-y-2 max-h-[305px] overflow-y-auto pr-1 scrollbar-thin">
                {leaderboard.map((record, index) => {
                  return (
                    <div
                      key={record.id || index}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                        index === 0
                          ? "bg-amber-50/40 border-amber-200"
                          : index === 1
                          ? "bg-slate-50/70 border-slate-200"
                          : index === 2
                          ? "bg-orange-50/30 border-orange-100"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 max-w-[65%]">
                        {/* Ranking Badge */}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                          index === 0 ? "bg-amber-100 text-amber-700 font-black" :
                          index === 1 ? "bg-slate-200 text-slate-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {index + 1}
                        </span>
                        
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-700 truncate max-w-[70px]">{record.nickname}</span>
                            {/* Difficulty Tag */}
                            {record.difficulty === "hard" && (
                              <span className="text-[9px] bg-rose-50 text-rose-600 px-1 rounded-sm font-bold border border-rose-100">🔥어려움</span>
                            )}
                            {record.difficulty === "medium" && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded-sm font-bold border border-indigo-100">🌲보통</span>
                            )}
                            {record.difficulty === "easy" && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1 rounded-sm font-bold border border-emerald-100">🌱쉬움</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            <span>{record.grade || "공통"}</span>
                            <span>•</span>
                            <span className="truncate max-w-[85px]">{record.subject}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Details */}
                      <div className="flex flex-col items-end font-mono">
                        <span className="font-black text-slate-700 text-sm flex items-center gap-0.5">
                          {record.score.toLocaleString()}
                          <span className="text-[9px] font-bold text-indigo-600">점</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          Lv.{record.level} • {record.wpm}타
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Point Weight Guide Banner */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/30">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
              <Award className="w-4 h-4 fill-indigo-200" />
            </div>
            <div className="text-[10px] text-slate-500 font-semibold leading-normal">
              난이도가 높을수록(어려움 🔥) 획득하는 단어별 기본 점수와 콤보 보너스가 엄청나게 많아집니다! 최고 점수에 도전해보세요!
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
