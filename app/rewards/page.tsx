"use client";
import { useEffect, useState } from "react";
import { badgeStorage, userStorage, sessionStorage as studySessionStorage, subjectStorage } from "@/lib/storage";
import { Badge, UserData, Subject } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";

export default function RewardsPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ id: string; minutes: number }[]>([]);

  useEffect(() => {
    setBadges(badgeStorage.getAll());
    setUser(userStorage.get());
    const subs = subjectStorage.getAll();
    setSubjects(subs);
    const stats = subs.map((s) => ({
      id: s.id,
      minutes: studySessionStorage.getBySubject(s.id).reduce((a, s) => a + s.duration, 0),
    }));
    setSubjectStats(stats);

    // Check all-subjects badge
    const allStudied = stats.every((s) => s.minutes > 0);
    if (allStudied) badgeStorage.unlock("all_subjects");
  }, []);

  const unlockedBadges = badges.filter((b) => b.unlockedAt);
  const lockedBadges = badges.filter((b) => !b.unlockedAt);
  const levelProgress = user ? user.points % 100 : 0;
  const pointsToNext = user ? 100 - levelProgress : 100;
  const maxMinutes = Math.max(...subjectStats.map((s) => s.minutes), 1);

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <h1 className="text-2xl font-black text-gray-900">🏆 나의 보상</h1>

      {/* Level & Points */}
      {user && (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm opacity-80">나의 레벨</div>
              <div className="text-5xl font-black">Lv.{user.level}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl">
                {user.level >= 10 ? "👑" : user.level >= 7 ? "💎" : user.level >= 5 ? "⭐" : user.level >= 3 ? "🥈" : "🥉"}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {user.level >= 10 ? "마스터" : user.level >= 7 ? "다이아" : user.level >= 5 ? "골드" : user.level >= 3 ? "실버" : "브론즈"}
              </div>
            </div>
          </div>
          <ProgressBar value={levelProgress} color="rgba(255,255,255,0.8)" height="8px" />
          <div className="flex justify-between text-xs opacity-70 mt-1">
            <span>총 {user.points}P</span>
            <span>다음 레벨까지 {pointsToNext}P</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl font-black">{Math.floor(user.totalMinutes / 60)}h</div>
              <div className="text-xs opacity-70">총 공부</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl font-black">{user.streakDays}일</div>
              <div className="text-xs opacity-70">연속 학습</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl font-black">{unlockedBadges.length}</div>
              <div className="text-xs opacity-70">획득 뱃지</div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">과목별 학습량</h2>
        <div className="space-y-3">
          {subjects.map((sub) => {
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
        <h2 className="font-bold text-gray-800 mb-4">획득한 뱃지 ({unlockedBadges.length}/{badges.length})</h2>
        {unlockedBadges.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">아직 뱃지가 없어요. 열심히 공부해봐요!</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {unlockedBadges.map((badge) => (
            <div key={badge.id} className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
              <div className="text-3xl mb-1">{badge.icon}</div>
              <div className="text-xs font-bold text-gray-800">{badge.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{badge.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">잠긴 뱃지</h2>
          <div className="grid grid-cols-3 gap-3">
            {lockedBadges.map((badge) => (
              <div key={badge.id} className="text-center p-3 bg-gray-50 border border-gray-200 rounded-2xl opacity-50">
                <div className="text-3xl mb-1 grayscale">{badge.icon}</div>
                <div className="text-xs font-bold text-gray-500">{badge.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
