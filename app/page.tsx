"use client";
import { useEffect, useState } from "react";
import { userStorage, sessionStorage as studySessionStorage, subjectStorage, goalStorage } from "@/lib/storage";
import { UserData, StudySession, Subject, Goal } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setUser(userStorage.get());
    setTodaySessions(studySessionStorage.getByDate(today));
    setSubjects(subjectStorage.getAll());
    setGoals(goalStorage.getAll().filter((g) => !g.completed));
  }, [today]);

  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
  const levelProgress = user ? user.points % 100 : 0;
  const pointsToNextLevel = user ? 100 - levelProgress : 100;

  const saveName = () => {
    if (!user) return;
    const updated = { ...user, name };
    userStorage.save(updated);
    setUser(updated);
    setEditingName(false);
  };

  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  if (!user) return null;

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input
                className="border rounded-lg px-2 py-1 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
              <button onClick={saveName} className="text-indigo-600 text-sm font-medium">저장</button>
            </div>
          ) : (
            <button onClick={() => { setName(user.name); setEditingName(true); }} className="text-left">
              <h1 className="text-xl font-bold text-gray-900">
                안녕, <span className="text-indigo-600">{user.name}</span>! 👋
              </h1>
              <p className="text-xs text-gray-400">이름을 눌러서 수정</p>
            </button>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">연속 학습</div>
          <div className="text-2xl font-bold text-orange-500">{user.streakDays}일 🔥</div>
        </div>
      </div>

      {/* Level Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs opacity-80">현재 레벨</div>
            <div className="text-3xl font-black">Lv.{user.level}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">포인트</div>
            <div className="text-xl font-bold">{user.points} P</div>
          </div>
        </div>
        <ProgressBar value={levelProgress} color="white" height="6px" />
        <div className="text-xs opacity-70 mt-1">다음 레벨까지 {pointsToNextLevel}P</div>
      </div>

      {/* Today Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">오늘의 학습</h2>
        <div className="flex gap-4 mb-3">
          <div className="flex-1 bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-indigo-600">{todayMinutes}</div>
            <div className="text-xs text-gray-500">분 공부</div>
          </div>
          <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-600">{todaySessions.length}</div>
            <div className="text-xs text-gray-500">번 기록</div>
          </div>
          <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-purple-600">{Math.floor(user.totalMinutes / 60)}</div>
            <div className="text-xs text-gray-500">총 시간</div>
          </div>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">오늘 학습 기록이 없어요. 타이머를 시작해볼까요? ⏱️</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.slice(-3).map((s) => {
              const sub = getSubject(s.subjectId);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-xl">{sub?.icon ?? "📚"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">{sub?.name ?? ""}</div>
                    {s.note && <div className="text-xs text-gray-400">{s.note}</div>}
                  </div>
                  <div className="text-sm font-bold" style={{ color: sub?.color ?? "#6366f1" }}>
                    {s.duration}분
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Goals */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-gray-800">진행 중인 목표</h2>
          <Link href="/goals" className="text-xs text-indigo-500 font-medium">전체 보기</Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">목표를 설정해보세요! 🎯</p>
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 3).map((goal) => {
              const sub = getSubject(goal.subjectId);
              const done = studySessionStorage.getBySubject(goal.subjectId).reduce((a, s) => a + s.duration, 0);
              const pct = Math.min(100, Math.round((done / goal.targetMinutes) * 100));
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {sub?.icon ?? "📚"} {goal.title}
                    </span>
                    <span className="text-gray-500">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={sub?.color ?? "#6366f1"} height="6px" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <Link href="/timer" className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-transform">
          <span className="text-2xl">⏱️</span>
          <div>
            <div className="font-bold text-sm">타이머 시작</div>
            <div className="text-xs opacity-80">공부 기록하기</div>
          </div>
        </Link>
        <Link href="/goals" className="bg-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-transform">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="font-bold text-sm">목표 설정</div>
            <div className="text-xs opacity-80">새 목표 만들기</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
