"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { addSession, addPoints, addStudyMinutes, getUnlockedBadges, unlockBadge, getStats, getSessions } from "@/lib/db";
import { SUBJECTS } from "@/lib/constants";
import { Subject } from "@/lib/types";

async function checkBadges(profileId: string) {
  const [stats, sessions, badges] = await Promise.all([
    getStats(profileId),
    getSessions(profileId),
    getUnlockedBadges(profileId),
  ]);
  const unlockedIds = badges.map((b) => b.badge_id);
  const tryUnlock = (id: string) => !unlockedIds.includes(id) && unlockBadge(profileId, id);

  if (sessions.length >= 1) tryUnlock("first_study");
  if (stats && stats.streak_days >= 3) tryUnlock("streak_3");
  if (stats && stats.streak_days >= 7) tryUnlock("streak_7");
  if (stats && stats.total_minutes >= 60) tryUnlock("total_60");
  if (stats && stats.total_minutes >= 600) tryUnlock("total_600");
  if (stats && stats.level >= 5) tryUnlock("level_5");
}

export default function TimerPage() {
  const router = useRouter();
  const { profile, refreshStats } = useProfile();
  const [selected, setSelected] = useState<Subject>(SUBJECTS[0]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile]);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!profile || seconds < 60) {
      showToast("최소 1분 이상 공부해야 기록할 수 있어요!");
      return;
    }
    const minutes = Math.floor(seconds / 60);
    const pts = Math.floor(minutes / 5) * 10;
    const today = new Date().toISOString().split("T")[0];

    await addSession({
      profile_id: profile.id,
      subject_id: selected.id,
      subject_name: selected.name,
      subject_icon: selected.icon,
      subject_color: selected.color,
      date: today,
      duration: minutes,
      note,
    });
    await addStudyMinutes(profile.id, minutes);
    await addPoints(profile.id, pts);
    await checkBadges(profile.id);
    refreshStats();

    setRunning(false);
    setSeconds(0);
    setNote("");
    showToast(`🎉 ${minutes}분 기록 완료! +${pts}P`);
  };

  if (!profile) return null;

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-black text-gray-900">⏱️ 학습 타이머</h1>

      {/* Subject Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-3">과목 선택</h2>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((sub) => (
            <button
              key={sub.id}
              onClick={() => !running && setSelected(sub)}
              disabled={running}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                selected.id === sub.id ? "text-white shadow-md scale-105" : "bg-gray-100 text-gray-600"
              }`}
              style={selected.id === sub.id ? { backgroundColor: sub.color } : {}}
            >
              {sub.icon} {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <div className="text-7xl font-black tabular-nums mb-6" style={{ color: selected.color }}>
          {fmt(seconds)}
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-8 py-3 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: selected.color }}
          >
            {running ? "⏸ 일시정지" : seconds > 0 ? "▶ 계속" : "▶ 시작"}
          </button>
          {seconds > 0 && !running && (
            <button
              onClick={() => { setRunning(false); setSeconds(0); }}
              className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-lg"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Save */}
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
            className="w-full py-3 rounded-2xl text-white font-bold text-lg shadow-lg"
            style={{ backgroundColor: selected.color }}
          >
            💾 기록 저장하기
          </button>
        </div>
      )}

      {seconds > 0 && seconds < 60 && !running && (
        <p className="text-center text-sm text-gray-400">1분 이상 공부해야 기록할 수 있어요.</p>
      )}

      <div className="bg-indigo-50 rounded-2xl p-4">
        <p className="text-sm text-indigo-700 font-medium">💡 5분 공부 = 10포인트!</p>
        <p className="text-xs text-indigo-500 mt-1">포인트를 모아 레벨을 올려보세요.</p>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
