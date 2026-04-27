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

export interface ScheduleItem {
  id: string;
  title: string;
  teacher: string;
  color: string;
  participants: string[]; // profile names, [] = all
  type: "weekly" | "once" | "range";
  weekdays: number[]; // 0=Sun,1=Mon...6=Sat
  time_start: string;
  time_end: string;
  date_start: string;
  date_end: string;
  is_completable: boolean;
}

export interface ScheduleCompletion {
  schedule_id: string;
  profile_id: string;
  date: string;
}

export interface LessonTeacher {
  id: string;
  name: string;
  subject: string;
  fee_per_session: number | null;
  fee_monthly: number | null;
  payment_day: number | null;
  hours_per_session?: number | null;
  notes: string;
}

export interface LessonSession {
  id: string;
  teacher_id: string;
  lesson_number: number;
  date: string;
  time_start: string;
  participants: string[];
  notes: string;
}

export interface LessonPayment {
  id: string;
  teacher_id: string;
  amount: number;
  paid_date: string;
  note: string;
}

export interface ScheduleOverride {
  id: string;
  date: string;
  schedule_id: string | null; // null for 'add' type
  type: "add" | "cancel" | "modify";
  title: string;
  teacher: string;
  color: string;
  participants: string[];
  time_start: string;
  time_end: string;
  note: string;
}
