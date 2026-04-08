import { Subject, Goal, StudySession, Badge, UserData } from "./types";

const KEYS = {
  subjects: "slapp_subjects",
  goals: "slapp_goals",
  sessions: "slapp_sessions",
  badges: "slapp_badges",
  user: "slapp_user",
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Subjects ──────────────────────────────────────────────
const DEFAULT_SUBJECTS: Subject[] = [
  { id: "1", name: "수학", color: "#6366f1", icon: "📐" },
  { id: "2", name: "영어", color: "#f59e0b", icon: "📖" },
  { id: "3", name: "과학", color: "#10b981", icon: "🔬" },
  { id: "4", name: "국어", color: "#ef4444", icon: "✏️" },
  { id: "5", name: "사회", color: "#8b5cf6", icon: "🌍" },
];

export const subjectStorage = {
  getAll: () => get<Subject[]>(KEYS.subjects, DEFAULT_SUBJECTS),
  save: (subjects: Subject[]) => set(KEYS.subjects, subjects),
  add: (subject: Subject) => {
    const all = subjectStorage.getAll();
    subjectStorage.save([...all, subject]);
  },
  remove: (id: string) => {
    subjectStorage.save(subjectStorage.getAll().filter((s) => s.id !== id));
  },
};

// ── Goals ─────────────────────────────────────────────────
export const goalStorage = {
  getAll: () => get<Goal[]>(KEYS.goals, []),
  save: (goals: Goal[]) => set(KEYS.goals, goals),
  add: (goal: Goal) => goalStorage.save([...goalStorage.getAll(), goal]),
  update: (id: string, patch: Partial<Goal>) => {
    goalStorage.save(
      goalStorage.getAll().map((g) => (g.id === id ? { ...g, ...patch } : g))
    );
  },
  remove: (id: string) => {
    goalStorage.save(goalStorage.getAll().filter((g) => g.id !== id));
  },
};

// ── Sessions ──────────────────────────────────────────────
export const sessionStorage = {
  getAll: () => get<StudySession[]>(KEYS.sessions, []),
  save: (sessions: StudySession[]) => set(KEYS.sessions, sessions),
  add: (session: StudySession) => {
    sessionStorage.save([...sessionStorage.getAll(), session]);
  },
  getByDate: (date: string) =>
    sessionStorage.getAll().filter((s) => s.date === date),
  getBySubject: (subjectId: string) =>
    sessionStorage.getAll().filter((s) => s.subjectId === subjectId),
  getTotalMinutesByDate: (date: string) =>
    sessionStorage
      .getByDate(date)
      .reduce((acc, s) => acc + s.duration, 0),
};

// ── Badges ────────────────────────────────────────────────
const DEFAULT_BADGES: Badge[] = [
  { id: "first_study", name: "첫 발걸음", description: "처음으로 학습 기록을 남겼어요!", icon: "🌱", unlockedAt: null },
  { id: "streak_3", name: "3일 연속", description: "3일 연속 공부했어요!", icon: "🔥", unlockedAt: null },
  { id: "streak_7", name: "일주일 챔피언", description: "7일 연속 공부했어요!", icon: "🏆", unlockedAt: null },
  { id: "total_60", name: "1시간 달성", description: "누적 1시간 공부했어요!", icon: "⏰", unlockedAt: null },
  { id: "total_600", name: "10시간 달성", description: "누적 10시간 공부했어요!", icon: "💪", unlockedAt: null },
  { id: "goal_complete", name: "목표 달성", description: "처음으로 목표를 완료했어요!", icon: "🎯", unlockedAt: null },
  { id: "level_5", name: "레벨 5 달성", description: "레벨 5에 도달했어요!", icon: "⭐", unlockedAt: null },
  { id: "all_subjects", name: "전과목 마스터", description: "5개 과목 모두 공부했어요!", icon: "📚", unlockedAt: null },
];

export const badgeStorage = {
  getAll: () => get<Badge[]>(KEYS.badges, DEFAULT_BADGES),
  save: (badges: Badge[]) => set(KEYS.badges, badges),
  unlock: (id: string) => {
    const all = badgeStorage.getAll();
    const badge = all.find((b) => b.id === id);
    if (!badge || badge.unlockedAt) return false;
    badgeStorage.save(
      all.map((b) => (b.id === id ? { ...b, unlockedAt: new Date().toISOString() } : b))
    );
    return true;
  },
};

// ── User ──────────────────────────────────────────────────
const DEFAULT_USER: UserData = {
  name: "학습자",
  level: 1,
  points: 0,
  totalMinutes: 0,
  streakDays: 0,
  lastStudyDate: null,
};

export const userStorage = {
  get: () => get<UserData>(KEYS.user, DEFAULT_USER),
  save: (user: UserData) => set(KEYS.user, user),
  addPoints: (pts: number) => {
    const user = userStorage.get();
    const newPoints = user.points + pts;
    const newLevel = Math.floor(newPoints / 100) + 1;
    userStorage.save({ ...user, points: newPoints, level: newLevel });
    return { newPoints, newLevel };
  },
  addMinutes: (minutes: number) => {
    const user = userStorage.get();
    const today = new Date().toISOString().split("T")[0];
    let streak = user.streakDays;

    if (user.lastStudyDate) {
      const last = new Date(user.lastStudyDate);
      const diff = Math.floor(
        (new Date(today).getTime() - last.getTime()) / 86400000
      );
      if (diff === 1) streak += 1;
      else if (diff > 1) streak = 1;
    } else {
      streak = 1;
    }

    userStorage.save({
      ...user,
      totalMinutes: user.totalMinutes + minutes,
      streakDays: streak,
      lastStudyDate: today,
    });
  },
};
