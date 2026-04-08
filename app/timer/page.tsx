"use client";
import { useEffect, useRef, useState } from "react";
import { subjectStorage, sessionStorage as studySessionStorage, userStorage, badgeStorage } from "@/lib/storage";
import { Subject } from "@/lib/types";

function checkAndUnlockBadges(totalMinutes: number, streakDays: number, sessionCount: number, completedGoals: number) {
  if (sessionCount === 1) badgeStorage.unlock("first_study");
  if (streakDays >= 3) badgeStorage.unlock("streak_3");
  if (streakDays >= 7) badgeStorage.unlock("streak_7");
  if (totalMinutes >= 60) badgeStorage.unlock("total_60");
  if (totalMinutes >= 600) badgeStorage.unlock("total_600");
  if (completedGoals >= 1) badgeStorage.unlock("goal_complete");
}

export default function TimerPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const subs = subjectStorage.getAll();
    setSubjects(subs);
    setSelectedSubject(subs[0] ?? null);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSave = () => {
    if (!selectedSubject || seconds < 60) {
      showToast("최소 1분 이상 공부해야 기록할 수 있어요!");
      return;
    }
    const minutes = Math.floor(seconds / 60);
    const today = new Date().toISOString().split("T")[0];
    const session = {
      id: Date.now().toString(),
      subjectId: selectedSubject.id,
      date: today,
      duration: minutes,
      note,
    };
    studySessionStorage.add(session);
    userStorage.addMinutes(minutes);
    userStorage.addPoints(Math.floor(minutes / 5) * 10); // 5분마다 10P

    const user = userStorage.get();
    const allSessions = studySessionStorage.getAll();
    checkAndUnlockBadges(user.totalMinutes, user.streakDays, allSessions.length, 0);

    setRunning(false);
    setSeconds(0);
    setNote("");
    setSaved(true);
    showToast(`🎉 ${minutes}분 기록 완료! +${Math.floor(minutes / 5) * 10}P`);
    setTimeout(() => setSaved(false), 3000);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(0);
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-black text-gray-900">⏱️ 학습 타이머</h1>

      {/* Subject Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-3">과목 선택</h2>
        <div className="flex flex-wrap gap-2">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => !running && setSelectedSubject(sub)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSubject?.id === sub.id
                  ? "text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={selectedSubject?.id === sub.id ? { backgroundColor: sub.color } : {}}
              disabled={running}
            >
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <div
          className="text-7xl font-black tabular-nums mb-6"
          style={{ color: selectedSubject?.color ?? "#6366f1" }}
        >
          {fmt(seconds)}
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-8 py-3 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: selectedSubject?.color ?? "#6366f1" }}
          >
            {running ? "⏸ 일시정지" : seconds > 0 ? "▶ 계속" : "▶ 시작"}
          </button>
          {seconds > 0 && !running && (
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-lg active:scale-95 transition-transform"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Note & Save */}
      {seconds >= 60 && !running && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700">메모 (선택)</h2>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={2}
            placeholder="오늘 뭘 공부했나요?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: selectedSubject?.color ?? "#6366f1" }}
          >
            💾 기록 저장하기
          </button>
        </div>
      )}

      {seconds > 0 && seconds < 60 && !running && (
        <p className="text-center text-sm text-gray-400">1분 이상 공부해야 기록할 수 있어요.</p>
      )}

      {/* Hint */}
      <div className="bg-indigo-50 rounded-2xl p-4">
        <p className="text-sm text-indigo-700 font-medium">💡 5분 공부 = 10포인트!</p>
        <p className="text-xs text-indigo-500 mt-1">포인트를 모아 레벨을 올려보세요.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium z-50 transition-all">
          {toast}
        </div>
      )}
    </div>
  );
}
