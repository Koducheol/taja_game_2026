import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Edit2, Trash2, Save, X, ExternalLink, Copy, Check, Search, 
  BookOpen, ChevronLeft, Database, Info, RefreshCw, AlertCircle
} from "lucide-react";
import { WordTerm } from "../types";

interface TeacherDashboardProps {
  onClose: () => void;
  words: WordTerm[];
  onRefreshWords: () => Promise<void>;
}

export default function TeacherDashboard({ onClose, words, onRefreshWords }: TeacherDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("전체");
  
  // Forms
  const [isEditing, setIsEditing] = useState<string | null>(null); // Word ID
  const [formWord, setFormWord] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubject, setFormSubject] = useState(""); // simplified "교과 (또는 교과 단원)"
  const [formGrade, setFormGrade] = useState("공통");

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Extract unique subjects/categories for simple selection
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => {
      if (w.subject) set.add(w.subject.trim());
    });
    return Array.from(set).sort();
  }, [words]);

  // GAS Setup State
  const [gasUrl, setGasUrl] = useState("");
  const [originalGasUrl, setOriginalGasUrl] = useState("");
  const [gasSaving, setGasSaving] = useState(false);
  const [gasTemplate, setGasTemplate] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"words" | "scores" | "gas">("words");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Scores Log State
  const [scores, setScores] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    // Load config
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.gasUrl) {
          setGasUrl(data.gasUrl);
          setOriginalGasUrl(data.gasUrl);
        }
      })
      .catch((err) => console.error("Error loading config:", err));

    // Load GAS template
    fetch("/api/gas-template")
      .then((res) => res.text())
      .then((text) => setGasTemplate(text))
      .catch((err) => console.error("Error loading GAS template:", err));
  }, []);

  const fetchScores = async () => {
    setLoadingScores(true);
    try {
      const res = await fetch("/api/scores");
      if (res.ok) {
        const data = await res.json();
        // Support both backend payload formats
        if (data && Array.isArray(data.scores)) {
          setScores(data.scores);
        } else if (Array.isArray(data)) {
          setScores(data);
        }
      }
    } catch (e) {
      console.error("Failed to load scores:", e);
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    if (activeTab === "scores") {
      fetchScores();
    }
  }, [activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGasSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gasUrl: gasUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("구글 스프레드시트 GAS 연동 URL이 안전하게 저장되었습니다! 🚀");
        setOriginalGasUrl(gasUrl.trim());
        await onRefreshWords(); // Reload words from newly set GAS Web App
      } else {
        setErrorMsg(data.error || "설정 저장에 실패했습니다.");
      }
    } catch (err) {
      setErrorMsg("서버 통신 실패. 연동 URL을 확인해 주세요.");
    } finally {
      setGasSaving(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formWord.trim()) {
      setErrorMsg("교과와 단어를 모두 입력해주세요!");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: formWord.trim(),
          description: formDescription.trim() || "뜻풀이 없음",
          subject: formSubject.trim(),
          grade: "공통",
          chapter: formSubject.trim()
        }),
      });

      if (res.ok) {
        setSuccessMsg("새로운 교과 용어가 추가되었습니다! 🎈");
        setFormWord("");
        setFormDescription("");
        setShowAddForm(false);
        await onRefreshWords();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "용어 추가에 실패했습니다.");
      }
    } catch (err) {
      setErrorMsg("단어 저장 도중 통신 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (term: WordTerm) => {
    setIsEditing(term.id);
    setFormWord(term.word);
    setFormDescription(term.description);
    setFormSubject(term.subject || term.chapter || "");
    setFormGrade(term.grade || "공통");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleEditSave = async (id: string) => {
    if (!formSubject.trim() || !formWord.trim()) {
      setErrorMsg("교과와 핵심 단어는 필수로 입력해야 합니다.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/words/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: formWord.trim(),
          description: formDescription.trim() || "뜻풀이 없음",
          subject: formSubject.trim(),
          grade: formGrade || "공통",
          chapter: formSubject.trim()
        }),
      });

      if (res.ok) {
        setSuccessMsg("용어가 성공적으로 수정되었습니다! ✍️");
        setIsEditing(null);
        await onRefreshWords();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "용어 수정 실패");
      }
    } catch (err) {
      setErrorMsg("통신 오류로 용어를 수정하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/words/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMsg("용어가 성공적으로 삭제되었습니다! 🗑️");
        await onRefreshWords();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "용어 삭제 실패");
      }
    } catch (err) {
      setErrorMsg("삭제 도중 통신 오류가 발생했습니다.");
    }
  };

  // Filter words
  const filteredWords = words.filter((term) => {
    const matchesSearch = term.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          term.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (term.subject && term.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (term.chapter && term.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = selectedSubject === "전체" || term.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div id="teacher-dashboard" className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-indigo-600 px-6 py-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              id="exit-dashboard-btn"
              onClick={onClose}
              className="p-2 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
              title="처음으로 돌아가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
                🏫 교사 전용 관리 대시보드
              </h1>
              <p className="text-xs text-indigo-100 mt-1 font-semibold">
                아이들을 위한 교과 핵심 용어를 추가하고, 구글 스프레드시트(GAS)를 연동하여 영구 보존하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-500/50 border border-indigo-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              연동 상태: {originalGasUrl ? "구글 스프레드시트 (GAS)" : "로컬 파일 DB"}
            </span>
            <button
              id="refresh-dashboard-words-btn"
              onClick={onRefreshWords}
              className="p-2 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
              title="데이터 동기화"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row">
          <button
            id="tab-words-btn"
            onClick={() => setActiveTab("words")}
            className={`flex-1 py-4 text-center font-extrabold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "words"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 단어 세트 관리 ({words.length}개)
          </button>
          <button
            id="tab-scores-btn"
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-4 text-center font-extrabold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "scores"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📊 학생 학습 성적표 (실시간 기록)
          </button>
          <button
            id="tab-gas-btn"
            onClick={() => setActiveTab("gas")}
            className={`flex-1 py-4 text-center font-extrabold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "gas"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🔌 구글 스프레드시트 (GAS) 연동 설정
          </button>
        </div>

        {/* Messaging Feedback Box */}
        {(errorMsg || successMsg) && (
          <div className="p-4 border-b border-slate-100">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Word Set Management */}
        {activeTab === "words" && (
          <div className="p-6">
            {/* Filter and Add word row */}
            <div className="flex flex-col md:flex-row gap-3 justify-between mb-6">
              {/* Search Inputs */}
              <div className="flex flex-wrap gap-2 items-center flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="dashboard-search-input"
                    type="text"
                    placeholder="교과, 단어, 설명 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:bg-white outline-hidden bg-slate-50 transition-all font-medium"
                  />
                </div>

                {/* Subject Selector */}
                <select
                  id="dashboard-subject-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 cursor-pointer animate-pop"
                >
                  <option value="전체">교과: 전체</option>
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add New Term Toggle Button */}
              <button
                id="toggle-add-word-form-btn"
                onClick={() => {
                  const nextShow = !showAddForm;
                  setShowAddForm(nextShow);
                  setIsEditing(null);
                  setFormWord("");
                  setFormDescription("");
                  // 만약 특정 교과가 필터링된 상태라면 추가 폼에 자동으로 기본 교과를 채워줍니다!
                  setFormSubject(nextShow && selectedSubject !== "전체" ? selectedSubject : "");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? "닫기" : "새 교과 용어 등록"}
              </button>
            </div>

            {/* Form to Add New Term */}
            {showAddForm && (
              <form onSubmit={handleAddWord} className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 mb-6 space-y-4 animate-pop">
                <h3 className="text-sm font-extrabold text-indigo-700">🌱 새로운 초등학교 교과 용어 등록하기</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">교과 (또는 교과 단원)</label>
                    <input
                      id="form-subject-input"
                      list="existing-subjects"
                      type="text"
                      placeholder="예) 사회, 사회 - 1. 생물과 환경, 국어 5학년"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-hidden focus:border-indigo-500"
                    />
                    <datalist id="existing-subjects">
                      {uniqueSubjects.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-slate-400 mt-1">기존에 입력된 교과를 선택하거나 새로 입력할 수 있습니다.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">교과 단어 (여러 단어 쉼표나 줄바꿈 가능)</label>
                    <textarea
                      id="form-word-input"
                      rows={3}
                      placeholder="예) 민주주의, 독재정치, 박정희, 이승만, 투표, 직접선거&#10;(쉼표(,)나 엔터 줄바꿈으로 한꺼번에 여러 개의 단어를 등록할 수 있어요!)"
                      value={formWord}
                      onChange={(e) => setFormWord(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-hidden focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    id="cancel-add-word-btn"
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="py-2 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    id="submit-add-word-btn"
                    type="submit"
                    disabled={submitting}
                    className="py-2 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {submitting ? "저장 중..." : "서버에 등록 완료"}
                  </button>
                </div>
              </form>
            )}

            {/* Words Table/List */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500">
                    <th className="py-3 px-4 w-[240px]">교과 (또는 교과 단원)</th>
                    <th className="py-3 px-4 w-[180px]">핵심 단어</th>
                    <th className="py-3 px-4">쉬운 뜻 풀이 설명</th>
                    <th className="py-3 px-4 text-center w-[110px]">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-medium">
                  {filteredWords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-400 font-bold">
                        등록된 교과 용어가 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredWords.map((term) => {
                      const isOldTerm = term.grade && term.grade !== "전체" && term.grade !== "공통";
                      const displayCategory = isOldTerm 
                        ? `[${term.grade}] ${term.subject}${term.chapter && term.chapter !== "공통 단원" ? ` - ${term.chapter}` : ''}`
                        : term.subject;

                      return (
                        <tr key={term.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Subject / Chapter */}
                          <td className="py-3.5 px-4">
                            {isEditing === term.id ? (
                              <>
                                <input
                                  id={`edit-subject-${term.id}`}
                                  list="existing-subjects"
                                  type="text"
                                  value={formSubject}
                                  onChange={(e) => setFormSubject(e.target.value)}
                                  className="px-2 py-1.5 rounded bg-white border border-slate-200 text-xs font-bold w-full"
                                  placeholder="교과 또는 단원"
                                />
                                <datalist id="existing-subjects">
                                  {uniqueSubjects.map((sub) => (
                                    <option key={sub} value={sub} />
                                  ))}
                                </datalist>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/40">
                                  {displayCategory}
                                </span>
                                <button
                                  id={`add-word-to-subject-${term.id}`}
                                  type="button"
                                  onClick={() => {
                                    setFormSubject(term.subject || "");
                                    setShowAddForm(true);
                                    setIsEditing(null);
                                    setFormWord("");
                                    setFormDescription("");
                                    // 단어 입력창으로 스크롤 이동 및 포커스 유도
                                    setTimeout(() => {
                                      const inputEl = document.getElementById("form-word-input");
                                      if (inputEl) {
                                        inputEl.focus();
                                        inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }
                                    }, 150);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0"
                                  title={`"${term.subject}" 교과에 새 단어 추가하기`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Word name */}
                          <td className="py-3.5 px-4 font-extrabold text-slate-800">
                            {isEditing === term.id ? (
                              <input
                                id={`edit-word-input-${term.id}`}
                                type="text"
                                value={formWord}
                                onChange={(e) => setFormWord(e.target.value)}
                                className="px-2 py-1.5 rounded bg-white border border-slate-200 text-xs font-bold w-full"
                              />
                            ) : (
                              term.word
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-xs text-slate-500 leading-relaxed max-w-sm font-medium">
                            {isEditing === term.id ? (
                              <textarea
                                id={`edit-desc-input-${term.id}`}
                                rows={2}
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="px-2 py-1.5 rounded bg-white border border-slate-200 text-xs font-medium w-full resize-none"
                              />
                            ) : (
                              term.description
                            )}
                          </td>

                          {/* Admin Action Control Buttons */}
                          <td className="py-3.5 px-4">
                            {isEditing === term.id ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  id={`save-edit-${term.id}`}
                                  onClick={() => handleEditSave(term.id)}
                                  disabled={submitting}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer"
                                  title="수정 저장"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  id={`cancel-edit-${term.id}`}
                                  onClick={() => setIsEditing(null)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer"
                                  title="수정 취소"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : deletingId === term.id ? (
                              <div className="flex items-center justify-center gap-1 bg-rose-50 border border-rose-100 rounded-lg p-1 animate-pop">
                                <span className="text-[10px] font-extrabold text-rose-600 px-1 select-none">삭제할까요?</span>
                                <button
                                  id={`delete-confirm-${term.id}`}
                                  onClick={() => {
                                    handleDeleteWord(term.id);
                                    setDeletingId(null);
                                  }}
                                  className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center"
                                  title="예, 삭제합니다"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  id={`delete-cancel-${term.id}`}
                                  onClick={() => setDeletingId(null)}
                                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded cursor-pointer transition-colors flex items-center justify-center"
                                  title="취소"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  id={`edit-init-${term.id}`}
                                  onClick={() => handleEditInit(term)}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer flex items-center justify-center"
                                  title="수정하기"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  id={`delete-word-${term.id}`}
                                  onClick={() => setDeletingId(term.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg cursor-pointer flex items-center justify-center"
                                  title="삭제하기"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Student Learning Scores List */}
        {activeTab === "scores" && (
          <div className="p-6 space-y-6 animate-pop">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-indigo-50 border border-indigo-100 p-5 rounded-2xl gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-indigo-700">📊 학급 학습 결과 대시보드</h3>
                <p className="text-xs text-indigo-900/80 leading-relaxed mt-1 font-semibold">
                  우리 반 아이들이 공부한 실시간 타자 점수, 레벨, 타수(WPM), 정확도를 모니터링할 수 있습니다.
                </p>
              </div>
              <button
                id="refresh-scores-btn"
                onClick={fetchScores}
                disabled={loadingScores}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1 self-stretch md:self-auto justify-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingScores ? "animate-spin" : ""}`} />
                {loadingScores ? "불러오는 중..." : "실시간 새로고침"}
              </button>
            </div>

            {/* Simple stats banner */}
            {scores.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <span className="block text-[10px] text-slate-400 font-bold">누적 참여 횟수</span>
                  <span className="text-xl font-extrabold text-indigo-600 mt-1 block">{scores.length}회</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <span className="block text-[10px] text-slate-400 font-bold">최고 기록 점수</span>
                  <span className="text-xl font-extrabold text-pink-600 mt-1 block">
                    {Math.max(...scores.map(s => s.score || 0))}점
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <span className="block text-[10px] text-slate-400 font-bold">학급 평균 타수</span>
                  <span className="text-xl font-extrabold text-sky-600 mt-1 block">
                    {Math.round(scores.reduce((sum, s) => sum + (s.wpm || 0), 0) / scores.length)} 타
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <span className="block text-[10px] text-slate-400 font-bold">학급 평균 정확도</span>
                  <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                    {Math.round(scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length)}%
                  </span>
                </div>
              </div>
            )}

            {/* Score Logs Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500">
                      <th className="py-3 px-4">일시</th>
                      <th className="py-3 px-4">학생 닉네임</th>
                      <th className="py-3 px-4 w-[110px]">최종 점수</th>
                      <th className="py-3 px-4 w-[80px]">도달 레벨</th>
                      <th className="py-3 px-4 w-[90px]">평균 타수</th>
                      <th className="py-3 px-4 w-[90px]">평균 정확도</th>
                      <th className="py-3 px-4">공부한 범위</th>
                      <th className="py-3 px-4 w-[80px]">난이도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                    {loadingScores ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                          학생 점수 내역을 서버에서 수신하는 중입니다...
                        </td>
                      </tr>
                    ) : scores.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                          아직 기록된 학생 타자 연습 성적이 없습니다. <br />
                          첫 번째 게임 완료 시 기록이 자동으로 전송됩니다!
                        </td>
                      </tr>
                    ) : (
                      scores.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                            {s.timestamp ? new Date(s.timestamp).toLocaleString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "-"}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-800">
                            🎯 {s.nickname}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-pink-600 text-sm">
                            {s.score} 점
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-700">
                            Lv.{s.level}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-600">
                            {s.wpm} 타
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.accuracy >= 90 ? "bg-emerald-100 text-emerald-800" :
                              s.accuracy >= 80 ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {s.accuracy}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">[{s.grade} {s.subject}]</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              s.difficulty === "hard" ? "bg-rose-100 text-rose-800" :
                              s.difficulty === "easy" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                            }`}>
                              {s.difficulty === "hard" ? "매운맛" : s.difficulty === "easy" ? "순한맛" : "보통맛"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Google Apps Script Integration Setup */}
        {activeTab === "gas" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar Guide */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-indigo-700 flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    연동 방식 설명
                  </h3>
                  <p className="text-xs text-indigo-900/80 leading-relaxed mt-2.5 font-medium">
                    본 시스템은 교과 단어 데이터를 <strong>구글 시트(Google Sheets)</strong>와 완벽히 동기화할 수 있습니다. 
                  </p>
                  <p className="text-xs text-indigo-900/80 leading-relaxed mt-2 font-medium">
                    클라이언트 브라우저가 아닌 <strong>서버 백엔드가 API 프록시 역할</strong>을 수행하여 API 주소를 완벽히 은닉하므로 보안이 아주 강력합니다.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-amber-700 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    연동 전과 후의 차이
                  </h3>
                  <ul className="text-xs text-amber-950/80 space-y-1.5 mt-2.5 list-disc pl-4 font-medium">
                    <li><strong>연동 전:</strong> 서버 로컬 파일(words.json)에 단어가 임시 보관됩니다.</li>
                    <li><strong>연동 후:</strong> 용어가 구글 시트에 실시간 기록되어, 영구 소장이 가능하고 수동 관리가 용이합니다.</li>
                  </ul>
                </div>
              </div>

              {/* Main Script setting panel */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Configuration form */}
                <form onSubmit={handleSaveConfig} className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-extrabold text-slate-800">구글 배포 Web App URL 등록</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Google Apps Script Web App URL</label>
                    <input
                      id="gas-url-input"
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:bg-white focus:border-indigo-500 outline-hidden transition-all"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {originalGasUrl ? "✅ 현재 구글 시트 연동 상태입니다." : "❌ 현재 서버 로컬 캐시 사용 중입니다."}
                    </span>
                    <button
                      id="save-gas-url-btn"
                      type="submit"
                      disabled={gasSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {gasSaving ? "저장 중..." : "주소 등록 완료"}
                    </button>
                  </div>
                </form>

                {/* Step by step deployment */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-slate-800">🚀 구글 시트 연동을 위한 3단계 안내</h3>
                  
                  <div className="space-y-3.5 text-xs text-slate-600 font-medium leading-relaxed">
                    <div>
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-600">1</span>
                        구글 스프레드시트 만들기
                      </div>
                      <p className="pl-5 text-slate-500">
                        구글 드라이브에서 새 스프레드시트를 하나 만듭니다. 상단 메뉴에서 <strong>확장 프로그램 ➡️ Apps Script</strong>를 누르세요.
                      </p>
                    </div>

                    <div>
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-600">2</span>
                        스크립트 코드 붙여넣기
                      </div>
                      <p className="pl-5 text-slate-500 mb-2">
                        기존의 내용을 모두 지우고 아래의 스크립트 템플릿을 복사하여 그대로 붙여넣습니다.
                      </p>
                      
                      {/* Code Block display */}
                      <div className="pl-5 relative">
                        <pre className="bg-slate-900 text-slate-300 p-3.5 rounded-xl font-mono text-[10px] max-h-[160px] overflow-auto select-all leading-normal whitespace-pre-wrap">
                          {gasTemplate || "// 템플릿 코드를 로딩하는 중..."}
                        </pre>
                        <button
                          id="copy-gas-code-btn"
                          type="button"
                          onClick={handleCopyCode}
                          className="absolute right-3.5 top-3.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "복사됨!" : "코드 복사"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-600">3</span>
                        웹 앱 배포 및 링크 입력
                      </div>
                      <p className="pl-5 text-slate-500">
                        오른쪽 위 <strong>배포 ➡️ 새 배포</strong>를 누릅니다. <br/>
                        유형 선택 톱니바퀴에서 <strong>웹 앱</strong>을 클릭하고, 
                        액세스 권한을 <strong>모든 사용자(Anyone)</strong>로 설정한 뒤 배포를 실행합니다. <br/>
                        완료된 배포에서 생성된 <strong>웹 앱 URL</strong> 주소를 복사하여 위의 입력란에 등록하면 완료됩니다! 🎉
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
