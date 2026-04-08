"use client";
import { useEffect, useState } from "react";
import { goalStorage, subjectStorage, sessionStorage as studySessionStorage, userStorage, badgeStorage } from "@/lib/storage";
import { Goal, Subject } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectId: "", title: "", targetMinutes: 60, deadline: "" });

  useEffect(() => {
    setGoals(goalStorage.getAll());
    const subs = subjectStorage.getAll();
    setSubjects(subs);
    setForm((f) => ({ ...f, subjectId: subs[0]?.id ?? "" }));
  }, []);

  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  const addGoal = () => {
    if (!form.title.trim() || !form.subjectId) return;
    const goal: Goal = {
      id: Date.now().toString(),
      subjectId: form.subjectId,
      title: form.title,
      targetMinutes: form.targetMinutes,
      deadline: form.deadline,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    goalStorage.add(goal);
    setGoals(goalStorage.getAll());
    setForm({ subjectId: subjects[0]?.id ?? "", title: "", targetMinutes: 60, deadline: "" });
    setShowForm(false);
  };

  const toggleComplete = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    goalStorage.update(id, { completed: !goal.completed });
    if (!goal.completed) {
      userStorage.addPoints(50);
      badgeStorage.unlock("goal_complete");
    }
    setGoals(goalStorage.getAll());
  };

  const removeGoal = (id: string) => {
    goalStorage.remove(id);
    setGoals(goalStorage.getAll());
  };

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">🎯 학습 목표</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow active:scale-95 transition-transform"
        >
          {showForm ? "취소" : "+ 새 목표"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700">새 목표 만들기</h2>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">과목</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setForm((f) => ({ ...f, subjectId: sub.id }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    form.subjectId === sub.id ? "text-white" : "bg-gray-100 text-gray-600"
                  }`}
                  style={form.subjectId === sub.id ? { backgroundColor: sub.color } : {}}
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
            <label className="text-xs text-gray-500 mb-1 block">목표 공부 시간 (분)</label>
            <div className="flex gap-2">
              {[30, 60, 120, 180].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, targetMinutes: m }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    form.targetMinutes === m
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            onClick={addGoal}
            className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow active:scale-95 transition-transform"
          >
            목표 추가하기
          </button>
        </div>
      )}

      {/* Active Goals */}
      <div className="space-y-3">
        <h2 className="font-bold text-gray-700">진행 중 ({active.length})</h2>
        {active.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-2xl">아직 목표가 없어요. 새 목표를 만들어보세요!</p>
        )}
        {active.map((goal) => {
          const sub = getSubject(goal.subjectId);
          const done = studySessionStorage.getBySubject(goal.subjectId).reduce((a, s) => a + s.duration, 0);
          const pct = Math.min(100, Math.round((done / goal.targetMinutes) * 100));
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
            : null;

          return (
            <div key={goal.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sub?.icon ?? "📚"}</span>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{goal.title}</div>
                    <div className="text-xs text-gray-500">
                      {sub?.name} · 목표 {goal.targetMinutes}분
                      {daysLeft !== null && (
                        <span className={daysLeft < 3 ? "text-red-500 ml-1" : "ml-1"}>
                          · D-{daysLeft}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleComplete(goal.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200"
                  >
                    완료
                  </button>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{done}분 / {goal.targetMinutes}분</span>
                <span className="font-medium" style={{ color: sub?.color }}>{pct}%</span>
              </div>
              <ProgressBar value={pct} color={sub?.color ?? "#6366f1"} height="8px" />
            </div>
          );
        })}
      </div>

      {/* Completed Goals */}
      {done.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-700">완료된 목표 ({done.length})</h2>
          {done.map((goal) => {
            const sub = getSubject(goal.subjectId);
            return (
              <div key={goal.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 opacity-70">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sub?.icon ?? "📚"}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-600 text-sm line-through">{goal.title}</div>
                    <div className="text-xs text-gray-400">{sub?.name} · {goal.targetMinutes}분 목표</div>
                  </div>
                  <span className="text-green-500 text-xl">✅</span>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
