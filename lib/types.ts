export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface UserStats {
  profile_id: string;
  level: number;
  points: number;
  total_minutes: number;
  streak_days: number;
  last_study_date: string | null;
}

export interface StudySession {
  id: string;
  profile_id: string;
  subject_id: string;
  subject_name: string;
  subject_icon: string;
  subject_color: string;
  date: string;
  duration: number;
  note: string;
}

export interface Goal {
  id: string;
  profile_id: string;
  subject_id: string;
  subject_name: string;
  subject_icon: string;
  subject_color: string;
  title: string;
  target_minutes: number;
  deadline: string;
  completed: boolean;
}

export interface UnlockedBadge {
  profile_id: string;
  badge_id: string;
  unlocked_at: string;
}
