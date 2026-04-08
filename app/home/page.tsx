"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { getSessionsByDate, getGoals, getSessions } from "@/lib/db";
import { StudySession, Goal } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { profile, stats, refreshStats } = useProfile();
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!profile) {
      router.replace("/");
      return;
    }
    Promise.all([
      getSessionsByDate(profile.id, today),
      getGoals(profile.id),
      getSessions(profile.id),
    ]).then(([ts, gs, as]) => {
      setTodaySessions(ts);
      setGoals(gs.filter((g) => !g.completed));
      setAllSessions(as);
      setLoading(false);
      refreshStats();
    });
  }, [profile, today]);

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
  const levelProgress = stats ? stats.points % 100 : 0;
  const pointsToNextLevel = 100 - levelProgress;

  const getGoalProgress = (goal: Goal) => {
    const done = allSessions
      .filter((s) => s.subject_id === goal.subject_id)
      .reduce((a, s) => a + s.duration, 0);
    return Math.min(100, Math.round((done / goal.target_minutes) * 100));
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            안녕,{" "}
            <span style={{ color: profile.color }}>
              {profile.avatar} {profile.name}
            </span>
            !
          </h1>
          <button
            onClick={() => { router.push("/"); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            프로필 바꾸기
          </button>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">연속 학습</div>
          <div className="text-2xl font-bold text-orange-500">{stats?.streak_days ?? 0}일 🔥</div>
        </div>
      </div>

      {/* Level Card */}
      <div
        className="rounded-2xl p-4 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}aa)` }}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs opacity-80">현재 레벨</div>
            <div className="text-3xl font-black">Lv.{stats?.level ?? 1}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">포인트</div>
            <div className="text-xl font-bold">{stats?.points ?? 0} P</div>
          </div>
        </div>
        <ProgressBar value={levelProgress} color="rgba(255,255,255,0.8)" height="6px" />
        <div className="text-xs opacity-70 mt-1">다음 레벨까지 {pointsToNextLevel}P</div>
      </div>

      {/* Today */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">오늘의 학습</h2>
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-indigo-600">{todayMinutes}</div>
            <div className="text-xs text-gray-500">분 공부</div>
          </div>
          <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-600">{todaySessions.length}</div>
            <div className="text-xs text-gray-500">번 기록</div>
          </div>
          <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-purple-600">
              {Math.floor((stats?.total_minutes ?? 0) / 60)}
            </div>
            <div className="text-xs text-gray-500">총 시간</div>
          </div>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">오늘 아직 기록이 없어요. 타이머를 시작해볼까요? ⏱️</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xl">{s.subject_icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{s.subject_name}</div>
                  {s.note && <div className="text-xs text-gray-400">{s.note}</div>}
                </div>
                <div className="text-sm font-bold" style={{ color: s.subject_color }}>{s.duration}분</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goals */}
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
              const pct = getGoalProgress(goal);
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{goal.subject_icon} {goal.title}</span>
                    <span className="text-gray-500">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={goal.subject_color} height="6px" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <Link
          href="/timer"
          className="text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: profile.color }}
        >
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
