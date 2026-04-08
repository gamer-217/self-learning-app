export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Goal {
  id: string;
  subjectId: string;
  title: string;
  targetMinutes: number;
  deadline: string; // ISO date string
  completed: boolean;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  duration: number; // minutes
  note: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export interface UserData {
  name: string;
  level: number;
  points: number;
  totalMinutes: number;
  streakDays: number;
  lastStudyDate: string | null;
}
