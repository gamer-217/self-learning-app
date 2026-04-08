"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { getGoals, addGoal, updateGoal, deleteGoal, addPoints, unlockBadge, getUnlockedBadges, getSessions } from "@/lib/db";
import { Goal } from "@/lib/types";
import { SUBJECTS } from "@/lib/constants";
import ProgressBar from "@/components/ProgressBar";

export default function GoalsPage() {
  const router = useRouter();
  const { profile, refreshStats } = useProfile();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<{ subject_id: string; duration: number }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectIdx: 0, title: "", targetMinutes: 60, deadline: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { router.replace("/"); return; }
    Promise.all([getGoals(profile.id), getSessions(profile.id)]).then(([gs, ss]) => {
      setGoals(gs);
      setSessions(ss.map((s) => ({ subject_id: s.subject_id, duration: s.duration })));
      setLoading(false);
    });
  }, [profile]);

  const reload = async () => {
    if (!profile) return;
    const [gs, ss] = await Promise.all([getGoals(profile.id), getSessions(profile.id)]);
    setGoals(gs);
    setSessions(ss.map((s) => ({ subject_id: s.subject_id, duration: s.duration })));
  };

  const handleAdd = async () => {
    if (!profile || !form.title.trim()) return;
    const sub = SUBJECTS[form.subjectIdx];
    await addGoal({
      profile_id: profile.id,
      subject_id: sub.id,
      subject_name: sub.name,
      subject_icon: sub.icon,
      subject_color: sub.color,
      title: form.title.trim(),
      target_minutes: form.targetMinutes,
      deadline: form.deadline,
      completed: false,
    });
    setForm({ subjectIdx: 0, title: "", targetMinutes: 60, deadline: "" });
    setShowForm(false);
    await reload();
  };

  const handleComplete = async (goal: Goal) => {
    if (!profile) return;
    await updateGoal(goal.id, { completed: !goal.completed });
    if (!goal.completed) {
      await addPoints(profile.id, 50);
      const badges = await getUnlockedBadges(profile.id);
      if (!badges.find((b) => b.badge_id === "goal_complete")) {
        await unlockBadge(profile.id, "goal_complete");
      }
      refreshStats();
    }
    await reload();
  };

  const getProgress = (goal: Goal) => {
    const done = sessions
      .filter((s) => s.subject_id === goal.subject_id)
      .reduce((a, s) => a + s.duration, 0);
    return Math.min(100, Math.round((done / goal.target_minutes) * 100));
  };

  if (!profile || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-4xl animate-bounce">📚</div></div>;
  }

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">🎯 학습 목표</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow"
        >
          {showForm ? "취소" : "+ 새 목표"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700">새 목표 만들기</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">과목</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((sub, i) => (
                <button
                  key={sub.id}
                  onClick={() => setForm((f) => ({ ...f, subjectIdx: i }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    form.subjectIdx === i ? "text-white" : "bg-gray-100 text-gray-600"
                  }`}
                  style={form.subjectIdx === i ? { backgroundColor: sub.color } : {}}
                >
                  {sub.icon} {sub.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">목표 제목</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="예: 수학 2단원 복습하기"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">목표 공부 시간</label>
            <div className="flex gap-2">
              {[30, 60, 120, 180].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, targetMinutes: m }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                    form.targetMinutes === m ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m}분
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">마감일 (선택)</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow"
          >
            목표 추가하기
          </button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-bold text-gray-700">진행 중 ({active.length})</h2>
        {active.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-2xl">목표가 없어요. 새 목표를 만들어보세요!</p>
        )}
        {active.map((goal) => {
          const pct = getProgress(goal);
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
            : null;
          return (
            <div key={goal.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{goal.subject_icon}</span>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{goal.title}</div>
                    <div className="text-xs text-gray-500">
                      {goal.subject_name} · {goal.target_minutes}분 목표
                      {daysLeft !== null && (
                        <span className={daysLeft < 3 ? "text-red-500 ml-1" : "ml-1"}>
                          · D-{daysLeft}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleComplete(goal)} className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 font-medium">완료</button>
                  <button onClick={() => deleteGoal(goal.id).then(reload)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500">삭제</button>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{Math.round(pct * goal.target_minutes / 100)}분 / {goal.target_minutes}분</span>
                <span className="font-medium" style={{ color: goal.subject_color }}>{pct}%</span>
              </div>
              <ProgressBar value={pct} color={goal.subject_color} height="8px" />
            </div>
          );
        })}
      </div>

      {done.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-700">완료된 목표 ({done.length})</h2>
          {done.map((goal) => (
            <div key={goal.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 opacity-70">
              <div className="flex items-center gap-2">
                <span className="text-xl">{goal.subject_icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-600 text-sm line-through">{goal.title}</div>
                  <div className="text-xs text-gray-400">{goal.subject_name} · {goal.target_minutes}분 목표</div>
                </div>
                <span className="text-green-500 text-xl">✅</span>
                <button onClick={() => deleteGoal(goal.id).then(reload)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-400">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
