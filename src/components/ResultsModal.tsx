import { useEffect, useState, useRef } from "react";
import { Trophy, Zap, Compass, RefreshCw, Home, Heart, Award, CheckCircle, BookOpen } from "lucide-react";
import { GameStats, WordTerm } from "../types";

interface ResultsModalProps {
  stats: GameStats;
  config: {
    nickname: string;
    grade: string;
    subject: string;
  };
  correctTerms: WordTerm[];
  onRestart: () => void;
  onHome: () => void;
}

interface LeaderboardRecord {
  nickname: string;
  score: number;
  level: number;
  accuracy: number;
  wpm: number;
  subject: string;
  date: string;
}

export default function ResultsModal({ stats, config, correctTerms, onRestart, onHome }: ResultsModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const hasSaved = useRef(false);

  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    // Load and update leaderboard in localStorage
    const stored = localStorage.getItem("edutech_typing_leaderboard");
    let currentLeaderboard: LeaderboardRecord[] = stored ? JSON.parse(stored) : [];

    // Save current game score
    const newRecord: LeaderboardRecord = {
      nickname: config.nickname,
      score: stats.score,
      level: stats.level,
      accuracy: Math.round(stats.accuracy),
      wpm: Math.round(stats.wpm),
      subject: config.subject,
      date: new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };

    // Add new record
    currentLeaderboard.push(newRecord);

    // Filter out duplicates to clean up any past issues (by nickname, score, level, subject)
    const uniqueLeaderboard: LeaderboardRecord[] = [];
    const seen = new Set<string>();
    currentLeaderboard.forEach(record => {
      const key = `${record.nickname}-${record.score}-${record.level}-${record.subject}`;
      if (!seen.has(key)) {
        uniqueLeaderboard.push(record);
        seen.add(key);
      }
    });

    // Sort and slice to top 5
    uniqueLeaderboard.sort((a, b) => b.score - a.score);
    const finalLeaderboard = uniqueLeaderboard.slice(0, 5);

    localStorage.setItem("edutech_typing_leaderboard", JSON.stringify(finalLeaderboard));
    setLeaderboard(finalLeaderboard);
  }, [stats, config]);

  // Give cute kid-friendly feedback badges based on score
  const getFeedback = (score: number) => {
    if (score >= 2000) return { title: "타자의 달인! 👑", desc: "엄청나요! 초등학교 최고의 타자 장인이 탄생했습니다!", color: "text-amber-500 bg-amber-50" };
    if (score >= 1000) return { title: "척척 타자 박사! 🎓", desc: "훌륭한 실력이에요! 교과서 단어도 아주 잘 알고 있네요!", color: "text-indigo-600 bg-indigo-50" };
    if (score >= 500) return { title: "타자 꿈나무! 🌱", desc: "멋진 출발이에요! 조금만 더 하면 박사가 될 수 있어요!", color: "text-emerald-600 bg-emerald-50" };
    return { title: "연습 중! 🎈", desc: "한 판 더 도전해서 더 많은 점수를 얻어볼까요? 화이팅!", color: "text-slate-500 bg-slate-50" };
  };

  const feedback = getFeedback(stats.score);

  return (
    <div id="results-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto transform animate-pop my-4">
        
        {/* Banner with Trophy */}
        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-amber-100 rounded-full text-amber-500 mb-3 animate-bounce">
            <Trophy className="w-10 h-10 fill-amber-300" />
          </div>
          <h2 className="text-3xl font-display font-extrabold text-slate-800">참 잘했어요!</h2>
          <p className="text-sm text-slate-400 font-bold mt-1">
            {config.nickname} 친구, 재미있는 교과서 공부를 완료했어요!
          </p>
        </div>

        {/* Master Score Feedback */}
        <div className={`p-4 rounded-2xl border border-dashed text-center mb-6 ${feedback.color}`}>
          <div className="font-extrabold text-xl">{feedback.title}</div>
          <div className="text-xs font-semibold mt-1 opacity-90">{feedback.desc}</div>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Score */}
          <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl text-center">
            <div className="text-rose-500 flex justify-center mb-1"><Award className="w-5 h-5 fill-rose-100" /></div>
            <div className="text-[10px] text-rose-500 font-bold">최종 점수</div>
            <div className="text-xl font-mono font-extrabold text-rose-600 mt-0.5">{stats.score.toLocaleString()} 점</div>
          </div>

          {/* Level reached */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-center">
            <div className="text-indigo-500 flex justify-center mb-1"><Compass className="w-5 h-5 fill-indigo-100" /></div>
            <div className="text-[10px] text-indigo-500 font-bold">도달 레벨</div>
            <div className="text-xl font-display font-extrabold text-indigo-600 mt-0.5">Lv. {stats.level}</div>
          </div>

          {/* Speed WPM */}
          <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-2xl text-center">
            <div className="text-sky-500 flex justify-center mb-1"><Zap className="w-5 h-5 fill-sky-100" /></div>
            <div className="text-[10px] text-sky-500 font-bold">평균 타속</div>
            <div className="text-xl font-mono font-extrabold text-sky-600 mt-0.5">{Math.round(stats.wpm)} 타/분</div>
          </div>

          {/* Accuracy */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center">
            <div className="text-emerald-500 flex justify-center mb-1"><CheckCircle className="w-5 h-5 fill-emerald-100" /></div>
            <div className="text-[10px] text-emerald-500 font-bold">정확도</div>
            <div className="text-xl font-mono font-extrabold text-emerald-600 mt-0.5">{Math.round(stats.accuracy)}%</div>
          </div>
        </div>

        {/* Words Learned list & Leaderboard split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Learned Terms list */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              정복한 단어 사전 ({correctTerms.length}개)
            </h3>
            {correctTerms.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-slate-400 font-bold">
                맞춘 단어가 없습니다. <br/>다음에는 꼭 맞춰봐요! 🐾
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {correctTerms.map((term, i) => (
                  <div key={term.id + i} className="bg-slate-50 border border-slate-100 p-2 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-sm font-extrabold">
                        {term.subject}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{term.word}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      {term.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Leaderboard */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              명예의 전당 (Top 5)
            </h3>
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              {leaderboard.map((record, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                    record.nickname === config.nickname && record.score === stats.score
                      ? "bg-indigo-100/60 border border-indigo-200"
                      : "bg-white border border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                      index === 0 ? "bg-amber-100 text-amber-600" :
                      index === 1 ? "bg-slate-200 text-slate-600" :
                      index === 2 ? "bg-amber-50 text-amber-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-extrabold text-slate-700 truncate max-w-[80px]">{record.nickname}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{record.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold text-slate-600">
                    <span>Lv.{record.level}</span>
                    <span className="text-indigo-600">{record.score.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            id="home-btn-results"
            onClick={onHome}
            className="flex-1 py-3.5 px-4 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            처음으로
          </button>
          <button
            id="restart-btn-results"
            onClick={onRestart}
            className="flex-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            한 판 더 하기!
          </button>
        </div>

      </div>
    </div>
  );
}
