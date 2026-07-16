import React, { useState, useEffect, useRef } from "react";
import { Heart, Volume2, VolumeX, Shield, Play, RotateCcw, AlertTriangle, ArrowLeft, Star, Lightbulb, Check, Trophy, Rocket, Crosshair, Zap, Cpu } from "lucide-react";
import { WordTerm, GameWord, Difficulty, GameStats } from "../types";
import { playSuccessSound, playComboSound, playLevelUpSound, playErrorSound, playLaserSound, playExplosionSound } from "../utils/audio";

interface TypingGameProps {
  config: {
    nickname: string;
    grade: string;
    subject: string;
    chapter: string;
    difficulty: Difficulty;
  };
  words: WordTerm[];
  onFinishGame: (stats: GameStats, correctTerms: WordTerm[]) => void;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface LaserAnim {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alpha: number;
  color: string;
}

// Game configuration modifiers based on difficulty
const DIFFICULTY_SETTINGS = {
  easy: { initialSpeed: 0.38, spawnInterval: 3800, maxWords: 4, points: 50 },
  medium: { initialSpeed: 0.65, spawnInterval: 2800, maxWords: 5, points: 120 },
  hard: { initialSpeed: 1.05, spawnInterval: 1800, maxWords: 7, points: 250 },
};

export default function TypingGame({ config, words, onFinishGame, onExit }: TypingGameProps) {
  // Game state
  const [activeWords, setActiveWords] = useState<GameWord[]>([]);
  const [inputText, setInputText] = useState("");
  const [health, setHealth] = useState(5); // 5 lives
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Statistics
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // For WPM calculation
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Game configuration modifiers based on difficulty
  const settings = React.useMemo(() => {
    const diff = config.difficulty || "medium";
    return DIFFICULTY_SETTINGS[diff] || DIFFICULTY_SETTINGS.medium;
  }, [config.difficulty]);

  // Learning feedback toast state
  const [lastFeedback, setLastFeedback] = useState<WordTerm | null>(null);
  const [feedbackTimer, setFeedbackTimer] = useState<NodeJS.Timeout | null>(null);

  // Words that have been correctly typed during this game
  const [correctTerms, setCorrectTerms] = useState<WordTerm[]>([]);

  // Canvas ref for particle explosions
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lasersRef = useRef<LaserAnim[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const healthRef = useRef(health);
  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  // Setup/Filtered pool of words for the game
  const gamePool = useRef<WordTerm[]>([]);

  // Build the game-specific words pool based on selected subject, grade and chapter
  useEffect(() => {
    let pool = [...words];
    if (config.grade !== "전체") {
      pool = pool.filter((w) => w.grade === config.grade);
    }
    if (config.subject !== "전체") {
      pool = pool.filter((w) => w.subject === config.subject);
    }
    if (config.chapter && config.chapter !== "전체") {
      pool = pool.filter((w) => w.chapter === config.chapter);
    }

    // Fallback if the selected filter results in empty set
    if (pool.length === 0) {
      pool = [...words];
    }
    gamePool.current = pool;

    // Start game automatically
    handleStart();

    return () => {
      stopGameLoops();
    };
  }, [words, config]);

  // Handle Game Audio helper
  const triggerAudio = (soundType: "success" | "combo" | "levelup" | "error" | "laser" | "explosion", data?: any) => {
    if (!soundEnabled) return;
    if (soundType === "success") {
      playSuccessSound(data?.highCombo);
    } else if (soundType === "combo") {
      playComboSound(data?.comboCount);
    } else if (soundType === "levelup") {
      playLevelUpSound();
    } else if (soundType === "error") {
      playErrorSound();
    } else if (soundType === "laser") {
      playLaserSound();
    } else if (soundType === "explosion") {
      playExplosionSound();
    }
  };

  // Particle Engine Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      if (boardRef.current && canvas) {
        canvas.width = boardRef.current.clientWidth;
        canvas.height = boardRef.current.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.alpha -= 0.02; // Fade
        p.size = Math.max(0, p.size - 0.05);

        if (p.alpha <= 0 || p.size <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Lasers
      const lasers = lasersRef.current;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.alpha -= 0.08; // Fast fade out

        if (l.alpha <= 0) {
          lasers.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(l.startX, l.startY);
        ctx.lineTo(l.endX, l.endY);
        ctx.stroke();
        
        // Add a glow effect
        ctx.globalAlpha = l.alpha * 0.5;
        ctx.lineWidth = 12;
        ctx.stroke();
        
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(updateParticles);
    };

    updateParticles();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive]);

  // Focus lock on typing input
  useEffect(() => {
    if (gameActive && !isPaused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameActive, isPaused, activeWords]);

  // Spawn and Fall Logic Loops
  useEffect(() => {
    if (!gameActive || isPaused) return;

    const tickRate = 50; // 50ms game ticks
    // Spawning interval scales faster as level increases (8% speed increase/shorter interval per level, not lower than 1000ms)
    const spawnRate = Math.max(1000, settings.spawnInterval * Math.pow(0.92, level - 1));

    // Word Falling Loop
    const fallInterval = setInterval(() => {
      setActiveWords((prev) => {
        if (prev.length === 0) return prev;
        let hitBottomCount = 0;
        const speedMultiplier = 1 + (level - 1) * 0.12; // 12% speed increase per level
        
        const updated = prev.map((w) => {
          const nextY = w.y + settings.initialSpeed * speedMultiplier;
          if (nextY >= 92) {
            hitBottomCount++;
            return null; // Flag for deletion
          }
          return { ...w, y: nextY };
        }).filter((w): w is GameWord => w !== null);

        if (hitBottomCount > 0) {
          triggerAudio("error");
          setHealth((h) => {
            const nextH = h - hitBottomCount;
            if (nextH <= 0) {
              endGame(updated, 0); // Game over
            }
            return Math.max(0, nextH);
          });
          setCombo(0); // Break combo
        }

        return updated;
      });
    }, tickRate);

    // Spawning Loop
    const spawnIntervalId = setInterval(() => {
      setActiveWords((prev) => {
        if (prev.length >= settings.maxWords) return prev;

        // Select a random word from the filtered pool
        const pool = gamePool.current;
        if (pool.length === 0) return prev;

        const randomTerm = pool[Math.floor(Math.random() * pool.length)];

        // Prevent duplication of active words on board
        if (prev.some((w) => w.word === randomTerm.word)) {
          return prev;
        }

        // Generate a random visual horizontal percentage (15% to 80%) to fit nicely within boundaries
        const xPos = 15 + Math.random() * 65;

        // Spawn bonus heart words ONLY when health is not full (some hearts are empty)
        const canSpawnBonus = healthRef.current < 5;
        const isBonusChance = canSpawnBonus && Math.random() < 0.15; // 15% chance for a heart bonus when health is < 5

        const newGameWord: GameWord = {
          ...randomTerm,
          x: xPos,
          y: 0,
          speed: settings.initialSpeed,
          isBonus: isBonusChance,
        };

        return [...prev, newGameWord];
      });
    }, spawnRate);

    return () => {
      clearInterval(fallInterval);
      clearInterval(spawnIntervalId);
    };
  }, [gameActive, isPaused, level, settings]);

  const handleStart = () => {
    setActiveWords([]);
    setInputText("");
    setHealth(5);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLevel(1);
    setCorrectCount(0);
    setTotalCount(0);
    setTotalCharsTyped(0);
    setCorrectTerms([]);
    setLastFeedback(null);
    startTimeRef.current = Date.now();
    setGameActive(true);
    setIsPaused(false);
  };

  const stopGameLoops = () => {
    setGameActive(false);
  };

  const endGame = (currentActiveWords: GameWord[], finalHealth: number) => {
    stopGameLoops();
    
    // Calculate final stats
    const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
    const finalWpm = elapsedMinutes > 0 ? (totalCharsTyped / 5) / elapsedMinutes : 0;
    const finalAccuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 100;

    const stats: GameStats = {
      score,
      combo,
      maxCombo,
      level,
      correctCount,
      totalCount,
      wpm: finalWpm,
      accuracy: finalAccuracy
    };

    onFinishGame(stats, correctTerms);
  };

  const createExplosion = (xPercent: number, yPercent: number, wordLength: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert percentages to actual canvas pixels
    const px = (xPercent / 100) * canvas.width;
    const py = (yPercent / 100) * canvas.height;

    // Explosion particles
    const particleColors = ["#fca5a5", "#fcd34d", "#fde047", "#bef264", "#cbd5e1"];
    const count = 25 + wordLength * 3;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // slightly upward launch
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        size: 3 + Math.random() * 5,
        alpha: 1,
      });
    }

    // Add laser
    const startX = canvas.width / 2;
    const startY = canvas.height; // From bottom center
    lasersRef.current.push({
      startX,
      startY,
      endX: px,
      endY: py,
      alpha: 1,
      color: "#38bdf8", // Sky blue laser
    });
  };

  const handleWordMatch = (matchingWordIndex: number, val: string) => {
    const matched = activeWords[matchingWordIndex];

    // 1. Trigger visuals and audio
    createExplosion(matched.x, matched.y, matched.word.length);
    
    const newCombo = combo + 1;
    setCombo(newCombo);
    if (newCombo > maxCombo) {
      setMaxCombo(newCombo);
    }

    triggerAudio("laser");
    setTimeout(() => triggerAudio("explosion"), 100);

    // Combo milestone triggers cute double audio ping
    if (newCombo % 5 === 0) {
      setTimeout(() => triggerAudio("combo", { comboCount: newCombo }), 200);
    } else {
      setTimeout(() => triggerAudio("success", { highCombo: newCombo >= 10 }), 200);
    }

    // 2. Score calculations with difficulty-weighted points and combo bonus
    const diff = config.difficulty || "medium";
    const comboBonusUnit = diff === "hard" ? 25 : diff === "medium" ? 15 : 5;
    const comboBonus = Math.floor(newCombo / 3) * comboBonusUnit;
    const basePoints = settings.points;
    const addedScore = basePoints + comboBonus;
    
    // Health bonus check
    if (matched.isBonus) {
      setHealth((h) => Math.min(5, h + 1));
    }

    const nextCorrectCount = correctCount + 1;

    setScore((s) => {
      const nextScore = s + addedScore;
      // Level Up Threshold: Every 600 points OR every 10 correct words triggers a level up!
      const levelFromScore = Math.floor(nextScore / 600) + 1;
      const levelFromCount = Math.floor(nextCorrectCount / 10) + 1;
      const nextLevel = Math.max(levelFromScore, levelFromCount);
      
      if (nextLevel > level) {
        setLevel(nextLevel);
        triggerAudio("levelup");
      }
      return nextScore;
    });

    // 3. Increment counters
    setCorrectCount(nextCorrectCount);
    setTotalCount((t) => t + 1);
    setTotalCharsTyped((prev) => prev + matched.word.length);
    setCorrectTerms((prev) => {
      // Prevent duplicate logs in study checklist
      if (prev.some((item) => item.id === matched.id)) return prev;
      return [...prev, matched];
    });

    // 4. Learning Feedback Toast
    showLearningFeedback(matched);

    // 5. Delete word from screen
    setActiveWords((prev) => prev.filter((_, i) => i !== matchingWordIndex));
    setInputText("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Prevent space character from being typed
      const val = inputText.trim();
      if (!val) return;

      const matchingWordIndex = activeWords.findIndex((w) => w.word === val);

      if (matchingWordIndex !== -1) {
        handleWordMatch(matchingWordIndex, val);
      } else {
        // Punish slightly on failed Enter/Space (miss) to teach accuracy
        triggerAudio("error");
        setCombo(0);
        setTotalCount((t) => t + 1);
        setInputText("");
      }
    }
  };

  const showLearningFeedback = (word: WordTerm) => {
    // Clear previous timer
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
    }

    setLastFeedback(word);

    // Keep educational definition visible for 4.5 seconds
    const timer = setTimeout(() => {
      setLastFeedback(null);
    }, 4500);

    setFeedbackTimer(timer);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Helper to check partial typed matches for on-screen character highlighting
  const getHighlightCount = (word: string) => {
    if (!inputText) return 0;
    if (word.startsWith(inputText)) {
      return inputText.length;
    }
    return 0;
  };

  return (
    <div id="typing-game" className="flex flex-col h-[85vh] max-w-5xl mx-auto px-4 select-none relative font-sans">
      
      {/* Top Header Panel (Score, Level, Combos, Speed) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-md border border-slate-100 mb-4 z-20">
        
        {/* Level and Lives */}
        <div className="flex items-center gap-3">
          <button
            id="exit-game-btn"
            onClick={onExit}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200 text-slate-500 font-bold text-xs flex items-center gap-1"
            title="기록을 저장하지 않고 처음 화면으로 돌아갑니다."
          >
            <ArrowLeft className="w-4 h-4" />
            그만두기
          </button>

          <button
            id="finish-game-btn"
            onClick={() => {
              if (confirm("지금까지 획득한 점수로 게임을 종료하고 결과를 기록할까요? 🏆")) {
                endGame(activeWords, health);
              }
            }}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="현재까지 획득한 점수를 명예의 전당에 저장하고 게임을 마칩니다."
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-300 animate-pulse shrink-0" />
            기록 저장하고 끝내기
          </button>

          {/* Level Badge */}
          <div className="bg-indigo-100 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-500" />
            레벨 {level}
          </div>

          {/* Heart Container */}
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
            {[...Array(5)].map((_, idx) => (
              <Heart
                key={idx}
                className={`w-4 h-4 transition-all duration-300 ${
                  idx < health ? "fill-rose-400 text-rose-500 scale-100" : "text-rose-200 scale-90"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic score dashboard */}
        <div className="flex items-center gap-4">
          
          {/* Running WPM speed */}
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 font-extrabold">현재 속도</div>
            <div className="text-sm font-mono font-extrabold text-slate-700">
              {Math.round(totalCharsTyped > 0 ? (totalCharsTyped / 5) / (((Date.now() - startTimeRef.current) || 1) / 60000) : 0)} <span className="text-[10px]">타/분</span>
            </div>
          </div>

          {/* Combo Multiplier Animation */}
          {combo > 0 && (
            <div className="animate-pop flex items-center gap-1 bg-amber-100 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-black shadow-xs">
              🔥 {combo} COMBO
            </div>
          )}

          {/* Score Badge */}
          <div className="bg-rose-500 text-white font-mono font-black px-4 py-2 rounded-2xl text-base shadow-sm min-w-[100px] text-center">
            {score.toLocaleString()} 점
          </div>

          {/* Sound, Pause Toggles */}
          <div className="flex gap-1 border-l border-slate-100 pl-3">
            <button
              id="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500"
              title="소리 켜기/끄기"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              id="pause-toggle-btn"
              onClick={handlePauseToggle}
              className="px-3 py-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-600 border border-slate-200 font-bold text-xs"
            >
              {isPaused ? "계속하기" : "일시정지"}
            </button>
          </div>

        </div>
      </div>

      {/* Main Canvas game zone (Words falling) */}
      <div 
        id="game-board-container"
        ref={boardRef}
        className="flex-1 bg-slate-950 rounded-3xl relative overflow-hidden border-2 border-slate-800 shadow-[inset_0_0_30px_rgba(0,0,0,1)] min-h-[350px] mb-4"
      >
        {/* Star background (simple CSS stars with twinkle) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 animate-twinkle opacity-70" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0))", backgroundSize: "200px 200px" }} />
          <div className="absolute inset-0 animate-twinkle opacity-50" style={{ animationDelay: "1s", backgroundImage: "radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 130px 80px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #ffffff, rgba(0,0,0,0))", backgroundSize: "250px 250px" }} />
          <div className="absolute inset-0 animate-twinkle opacity-30" style={{ animationDelay: "2s", backgroundImage: "radial-gradient(1px 1px at 10px 110px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 180px 20px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 80px 190px, #ffffff, rgba(0,0,0,0))", backgroundSize: "300px 300px" }} />
          
          {/* Animated Asteroids and Shooting Stars */}
          <div className="absolute top-0 right-0 text-5xl animate-asteroid-2 opacity-40 text-slate-600 drop-shadow-lg mix-blend-screen blur-[2px]">🌑</div>
          <div className="absolute top-1/4 left-1/4 text-2xl animate-asteroid-3 opacity-50 text-slate-500 drop-shadow-sm mix-blend-screen blur-[1px]">🪐</div>
          
          <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent animate-shooting-star blur-[1px]"></div>
          <div className="absolute top-0 right-0 w-48 h-[2px] bg-gradient-to-r from-transparent via-sky-300 to-transparent animate-shooting-star blur-[2px]" style={{ animationDelay: "4s" }}></div>
        </div>
        
        {/* Canvas overlay for sparkles and lasers */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Falling Words (Asteroids) */}
        {activeWords.map((w) => {
          const matchedLen = getHighlightCount(w.word);
          const isTarget = matchedLen > 0;

          return (
            <div
              key={w.id}
              id={`falling-word-${w.id}`}
              className={`absolute -translate-x-1/2 select-none px-4 py-3 border-b-4 border-r-2 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-all duration-75 flex flex-col items-center ${
                w.isBonus
                  ? "bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse"
                  : "bg-stone-700 text-stone-100 border-stone-900"
              } ${
                isTarget && w.isBonus
                  ? "ring-4 ring-rose-400 scale-[1.1] z-10"
                  : isTarget
                  ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-[1.05] z-10"
                  : ""
              }`}
              style={{
                left: `${w.x}%`,
                top: `${w.y}%`,
              }}
            >
              {/* Subject Small badge */}
              {w.isBonus ? (
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-600 rounded-full font-black tracking-wide uppercase mb-0.5 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" /> BONUS
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 bg-black/40 rounded-full font-black tracking-wide text-stone-300 uppercase mb-0.5 shadow-inner">
                  {w.subject}
                </span>
              )}

              {/* Word string with partial typing highlight */}
              <div className="text-base font-extrabold tracking-wider drop-shadow-md">
                {matchedLen > 0 ? (
                  <>
                    <span className={w.isBonus ? "text-rose-600 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]" : "text-sky-300 drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]"}>{w.word.substring(0, matchedLen)}</span>
                    <span className={w.isBonus ? "text-rose-900" : "text-stone-100"}>{w.word.substring(matchedLen)}</span>
                  </>
                ) : (
                  w.word
                )}
              </div>
            </div>
          );
        })}

        {/* Warning zone highlight at the bottom - Now Beautiful Blue Atmosphere Shield */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-sky-500/30 via-sky-500/10 to-transparent border-t-2 border-sky-400/60 z-0 pointer-events-none flex items-center justify-center shadow-[0_-8px_20px_rgba(56,189,248,0.25)]">
          <span className="text-[10px] text-sky-200 font-extrabold tracking-widest opacity-90 uppercase drop-shadow-[0_0_5px_rgba(56,189,248,0.8)] flex items-center gap-1.5 animate-pulse">
            <Shield className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
            푸른 대기권 방어 보호막 활성화 중 🛡️
          </span>
        </div>

        {/* Empty board state */}
        {activeWords.length === 0 && gameActive && !isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400 font-bold p-6">
            <span className="animate-bounce text-3xl mb-1">🚀</span>
            <p className="text-xs text-sky-200">소행성이 접근하고 있습니다!</p>
          </div>
        )}

        {/* Paused state overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30">
            <h3 className="text-2xl font-black mb-1">잠시 쉬는 중 ⏰</h3>
            <p className="text-xs text-slate-200 mb-4 font-semibold">언제든 다시 시작할 수 있어요!</p>
            <button
              id="resume-btn"
              onClick={handlePauseToggle}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-white" />
              게임 계속하기
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Learning Feedback (The Educational Definition Banner) */}
      <div className="h-[60px] mb-3 relative">
        {lastFeedback && (
          <div 
            id="learning-feedback-toast" 
            className="absolute inset-x-0 bottom-0 bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 shadow-xs flex items-center gap-3 animate-pop z-20"
          >
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 shrink-0">
              <Lightbulb className="w-4 h-4 fill-amber-300" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-700">배운 내용:</span>
                <span className="text-sm font-extrabold text-slate-800">{lastFeedback.word}</span>
                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1 rounded-sm">{lastFeedback.subject} ({lastFeedback.grade})</span>
              </div>
              <p className="text-xs text-slate-600 truncate font-semibold mt-0.5">{lastFeedback.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Spaceship Cockpit Control Console */}
      <div className={`relative p-5 rounded-2xl shadow-lg border-2 flex flex-col md:flex-row items-center gap-4 z-20 mb-2 overflow-hidden transition-all duration-300 ${
        inputText.length > 0 
          ? "bg-slate-900 border-cyan-500/80 shadow-[0_0_25px_rgba(6,182,212,0.3)]" 
          : "bg-slate-950 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
      }`}>
        {/* Futuristic digital grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Left Side: Spaceship Visuals & Engines */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            {/* Thruster flame glow when typing */}
            {inputText.length > 0 && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4.5 h-7 bg-gradient-to-t from-orange-600 via-amber-400 to-transparent rounded-full blur-[2px] animate-pulse"></div>
            )}
            <div className={`p-3 rounded-xl border flex items-center justify-center transition-all duration-300 ${
              inputText.length > 0
                ? "bg-cyan-950/80 border-cyan-400 text-cyan-400 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-engine-rumble"
                : "bg-slate-900/90 border-slate-700 text-slate-500"
            }`}>
              <Rocket className="w-6 h-6" />
            </div>
          </div>
          
          <div className="hidden sm:block text-left">
            <div className={`text-[9px] font-black tracking-widest uppercase transition-colors duration-300 ${
              inputText.length > 0 ? "text-cyan-400" : "text-slate-500"
            }`}>
              {inputText.length > 0 ? "⚡ ENGINE ACTIVE" : "🛰️ COCKPIT STANDBY"}
            </div>
            <div className="text-[11px] text-slate-400 font-extrabold flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full inline-block ${inputText.length > 0 ? "bg-cyan-400 animate-ping" : "bg-emerald-500"}`}></span>
              {inputText.length > 0 ? `출력 ${Math.min(100, 30 + inputText.length * 15)}%` : "대기 모드"}
            </div>
          </div>
        </div>

        {/* Center: Targeting input console computer */}
        <div className="flex-1 w-full relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <Crosshair className={`w-5 h-5 transition-colors duration-300 ${
              inputText.length > 0 ? "text-cyan-400 animate-spin-slow" : "text-slate-500"
            }`} />
          </div>
          
          <input
            id="typing-input-field"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={!gameActive || isPaused}
            placeholder={isPaused ? "일시 정지 중입니다." : "여기에 타자를 치고 엔터나 스페이스를 누르세요!"}
            className={`w-full pl-11 pr-5 py-3.5 rounded-xl border-2 font-extrabold text-lg transition-all duration-300 text-center tracking-wide outline-hidden ${
              inputText.length > 0
                ? "bg-cyan-950/40 border-cyan-400 text-cyan-200 placeholder:text-cyan-700/50 shadow-[inset_0_2px_8px_rgba(6,182,212,0.15)]"
                : "bg-slate-900/60 border-slate-800 text-slate-300 placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-900 focus:text-white"
            }`}
            autoComplete="off"
            autoFocus
          />

          {/* Futuristic bottom light bar */}
          <div className={`absolute bottom-0 inset-x-4 h-[2px] blur-[0.5px] transition-all duration-300 ${
            inputText.length > 0 ? "bg-cyan-400 scale-x-100" : "bg-transparent scale-x-50"
          }`}></div>
        </div>

        {/* Right Side: Telemetry / Focus display */}
        <div className="hidden md:flex items-center gap-4 border-l border-slate-800 pl-4 shrink-0 text-left">
          <div className="space-y-1">
            <div className="text-[9px] text-slate-500 font-black tracking-wider uppercase">SYSTEMS STATUS</div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-indigo-400 flex items-center gap-1 select-none">
                <Cpu className="w-3 h-3" /> APU: ON
              </div>
              <div className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1 select-none">
                <Zap className="w-3 h-3" /> WEAPON: OK
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
