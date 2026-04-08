"use client";
import { useEffect, useState } from "react";
import { getProfiles, getStats, getSessionsByDate, getGoals, getSessions } from "@/lib/db";
import { Profile, UserStats, Goal } from "@/lib/types";
import { SUBJECTS } from "@/lib/constants";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";

interface KidData {
  profile: Profile;
  stats: UserStats | null;
  todayMinutes: number;
  activeGoals: Goal[];
  subjectMinutes: { name: string; icon: string; color: string; minutes: number }[];
}

export default function ParentPage() {
  const [kids, setKids] = useState<KidData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKid, setSelectedKid] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const profiles = await getProfiles();
      if (profiles.length === 0) { setLoading(false); return; }

      const kidDataList = await Promise.all(
        profiles.map(async (profile) => {
          const [stats, todaySessions, goals, allSessions] = await Promise.all([
            getStats(profile.id),
            getSessionsByDate(profile.id, today),
            getGoals(profile.id),
            getSessions(profile.id),
          ]);
          const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
          const activeGoals = goals.filter((g) => !g.completed);
          const subjectMinutes = SUBJECTS.map((sub) => ({
            name: sub.name,
            icon: sub.icon,
            color: sub.color,
            minutes: allSessions
              .filter((s) => s.subject_id === sub.id)
              .reduce((a, s) => a + s.duration, 0),
          }));
          return { profile, stats, todayMinutes, activeGoals, subjectMinutes };
        })
      );
      setKids(kidDataList);
      if (kidDataList.length > 0) setSelectedKid(kidDataList[0].profile.id);
      setLoading(false);
    }
    load();
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    );
  }

  const selected = kids.find((k) => k.profile.id === selectedKid);

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">👨‍👩‍👧‍👦 부모님 대시보드</h1>
          <p className="text-sm text-gray-500">오늘: {today}</p>
        </div>
        <Link href="/" className="text-sm text-indigo-500 border border-indigo-200 px-3 py-1.5 rounded-full">
          ← 프로필로
        </Link>
      </div>

      {kids.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">👶</div>
          <p className="text-gray-500">아직 프로필이 없어요.</p>
          <Link href="/" className="mt-3 inline-block text-indigo-600 font-medium">프로필 만들기 →</Link>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-3">
            {kids.map((kid) => (
              <button
                key={kid.profile.id}
                onClick={() => setSelectedKid(kid.profile.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                  selectedKid === kid.profile.id
                    ? "shadow-lg scale-[1.01]"
                    : "bg-white shadow-sm"
                }`}
                style={
                  selectedKid === kid.profile.id
                    ? { backgroundColor: kid.profile.color + "15", border: `2px solid ${kid.profile.color}` }
                    : {}
                }
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: kid.profile.color + "22" }}
                >
                  {kid.profile.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">{kid.profile.name}</div>
                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                    <span>Lv.{kid.stats?.level ?? 1}</span>
                    <span>🔥{kid.stats?.streak_days ?? 0}일</span>
                    <span>오늘 {kid.todayMinutes}분</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black" style={{ color: kid.profile.color }}>
                    {kid.todayMinutes}분
                  </div>
                  <div className="text-xs text-gray-400">오늘</div>
                </div>
              </button>
            ))}
          </div>

          {/* Detailed View */}
          {selected && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-700 text-lg">
                {selected.profile.avatar} {selected.profile.name} 상세보기
              </h2>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "레벨", value: `Lv.${selected.stats?.level ?? 1}` },
                  { label: "포인트", value: `${selected.stats?.points ?? 0}P` },
                  { label: "총 시간", value: `${Math.floor((selected.stats?.total_minutes ?? 0) / 60)}h` },
                  { label: "연속", value: `${selected.stats?.streak_days ?? 0}일 🔥` },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="font-black text-gray-900 text-sm">{item.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Subject breakdown */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">과목별 누적 학습</h3>
                <div className="space-y-3">
                  {selected.subjectMinutes.map((sub) => {
                    const max = Math.max(...selected.subjectMinutes.map((s) => s.minutes), 1);
                    return (
                      <div key={sub.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{sub.icon} {sub.name}</span>
                          <span className="text-gray-500 font-medium">{sub.minutes}분</span>
                        </div>
                        <ProgressBar value={Math.round((sub.minutes / max) * 100)} color={sub.color} height="8px" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Goals */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">진행 중인 목표 ({selected.activeGoals.length})</h3>
                {selected.activeGoals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">목표가 없어요.</p>
                ) : (
                  <div className="space-y-3">
                    {selected.activeGoals.map((goal) => {
                      const done = selected.subjectMinutes.find((s) => s.name === goal.subject_name)?.minutes ?? 0;
                      const pct = Math.min(100, Math.round((done / goal.target_minutes) * 100));
                      const daysLeft = goal.deadline
                        ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
                        : null;
                      return (
                        <div key={goal.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{goal.subject_icon} {goal.title}</span>
                            <span className="text-gray-400 text-xs">
                              {pct}%{daysLeft !== null && ` · D-${daysLeft}`}
                            </span>
                          </div>
                          <ProgressBar value={pct} color={goal.subject_color} height="6px" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compare Today */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">오늘 학습 비교</h3>
            {kids.map((kid) => (
              <div key={kid.profile.id} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{kid.profile.avatar} {kid.profile.name}</span>
                  <span className="text-gray-500">{kid.todayMinutes}분</span>
                </div>
                <ProgressBar
                  value={Math.round((kid.todayMinutes / Math.max(...kids.map((k) => k.todayMinutes), 1)) * 100)}
                  color={kid.profile.color}
                  height="10px"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
