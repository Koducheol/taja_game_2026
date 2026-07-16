export interface WordTerm {
  id: string;
  word: string;
  description: string;
  subject: string;
  grade: string;
  chapter?: string; // 단원명 (예: 사회 1단원)
}

export interface ScoreRecord {
  id?: string;
  timestamp: string;
  nickname: string;
  score: number;
  level: number;
  wpm: number;
  accuracy: number;
  grade: string;
  subject: string;
  difficulty: string;
}

export interface GameWord extends WordTerm {
  x: number; // percentage width (e.g. 10 to 80)
  y: number; // percentage height (0 to 100)
  speed: number; // drop speed per interval
  isBonus?: boolean; // indicates if the word gives a heart
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  level: number;
  correctCount: number;
  totalCount: number;
  wpm: number; // words per minute
  accuracy: number; // percentage
}
