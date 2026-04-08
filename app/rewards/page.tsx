"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { getUnlockedBadges, getSessions, unlockBadge } from "@/lib/db";
import { UnlockedBadge } from "@/lib/types";
import { BADGES, SUBJECTS } from "@/lib/constants";
import ProgressBar from "@/components/ProgressBar";

export default function RewardsPage() {
  const router = useRouter();
  const { profile, stats, refreshStats } = useProfile();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ id: string; minutes: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { router.replace("/"); return; }
    Promise.all([getUnlockedBadges(profile.id), getSessions(profile.id)]).then(async ([badges, sessions]) => {
      setUnlockedBadges(badges);
      const stats = SUBJECTS.map((s) => ({
        id: s.id,
        minutes: sessions.filter((ss) => ss.subject_id === s.id).reduce((a, ss) => a + ss.duration, 0),
      }));
      setSubjectStats(stats);

      // Check all-subjects badge
      if (stats.every((s) => s.minutes > 0) && !badges.find((b) => b.badge_id === "all_subjects")) {
        await unlockBadge(profile.id, "all_subjects");
        const updated = await getUnlockedBadges(profile.id);
        setUnlockedBadges(updated);
      }

      setLoading(false);
      refreshStats();
    });
  }, [profile]);

  if (!profile || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-4xl animate-bounce">📚</div></div>;
  }

  const unlockedIds = new Set(unlockedBadges.map((b) => b.badge_id));
  const levelProgress = stats ? stats.points % 100 : 0;
  const maxMinutes = Math.max(...subjectStats.map((s) => s.minutes), 1);

  const rankLabel = (level: number) =>
    level >= 10 ? "마스터 👑" : level >= 7 ? "다이아 💎" : level >= 5 ? "골드 ⭐" : level >= 3 ? "실버 🥈" : "브론즈 🥉";

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <h1 className="text-2xl font-black text-gray-900">🏆 나의 보상</h1>

      {/* Level Card */}
      <div
        className="rounded-2xl p-5 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}88)` }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm opacity-80">나의 레벨</div>
            <div className="text-5xl font-black">Lv.{stats?.level ?? 1}</div>
            <div className="text-sm opacity-80 mt-1">{rankLabel(stats?.level ?? 1)}</div>
          </div>
          <div className="text-6xl">{profile.avatar}</div>
        </div>
        <ProgressBar value={levelProgress} color="rgba(255,255,255,0.8)" height="8px" />
        <div className="flex justify-between text-xs opacity-70 mt-1">
          <span>총 {stats?.points ?? 0}P</span>
          <span>다음 레벨까지 {100 - levelProgress}P</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-black">{Math.floor((stats?.total_minutes ?? 0) / 60)}h</div>
            <div className="text-xs opacity-70">총 공부</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-black">{stats?.streak_days ?? 0}일</div>
            <div className="text-xs opacity-70">연속 학습</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-black">{unlockedBadges.length}</div>
            <div className="text-xs opacity-70">획득 뱃지</div>
          </div>
        </div>
      </div>

      {/* Subject Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">과목별 학습량</h2>
        <div className="space-y-3">
          {SUBJECTS.map((sub) => {
            const stat = subjectStats.find((s) => s.id === sub.id);
            const minutes = stat?.minutes ?? 0;
            const pct = Math.round((minutes / maxMinutes) * 100);
            return (
              <div key={sub.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{sub.icon} {sub.name}</span>
                  <span className="text-gray-500">{minutes}분</span>
                </div>
                <ProgressBar value={pct} color={sub.color} height="8px" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">뱃지 ({unlockedBadges.length}/{BADGES.length})</h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((badge) => {
            const unlocked = unlockedIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`text-center p-3 rounded-2xl border ${
                  unlocked ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200 opacity-40"
                }`}
              >
                <div className={`text-3xl mb-1 ${!unlocked ? "grayscale" : ""}`}>{badge.icon}</div>
                <div className="text-xs font-bold text-gray-800">{badge.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{badge.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
