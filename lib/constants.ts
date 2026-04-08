import { Subject, BadgeDef } from "./types";

export const SUBJECTS: Subject[] = [
  { id: "math", name: "수학", color: "#6366f1", icon: "📐" },
  { id: "english", name: "영어", color: "#f59e0b", icon: "📖" },
  { id: "science", name: "과학", color: "#10b981", icon: "🔬" },
  { id: "korean", name: "국어", color: "#ef4444", icon: "✏️" },
  { id: "social", name: "사회", color: "#8b5cf6", icon: "🌍" },
];

export const BADGES: BadgeDef[] = [
  { id: "first_study", name: "첫 발걸음", description: "처음으로 학습 기록을 남겼어요!", icon: "🌱" },
  { id: "streak_3", name: "3일 연속", description: "3일 연속 공부했어요!", icon: "🔥" },
  { id: "streak_7", name: "일주일 챔피언", description: "7일 연속 공부했어요!", icon: "🏆" },
  { id: "total_60", name: "1시간 달성", description: "누적 1시간 공부했어요!", icon: "⏰" },
  { id: "total_600", name: "10시간 달성", description: "누적 10시간 공부했어요!", icon: "💪" },
  { id: "goal_complete", name: "목표 달성", description: "처음으로 목표를 완료했어요!", icon: "🎯" },
  { id: "level_5", name: "레벨 5 달성", description: "레벨 5에 도달했어요!", icon: "⭐" },
  { id: "all_subjects", name: "전과목 마스터", description: "5개 과목 모두 공부했어요!", icon: "📚" },
];

export const PROFILE_AVATARS = ["😊", "😎", "🦊", "🐯", "🐻", "🦁", "🐧", "🦄"];
export const PROFILE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];
