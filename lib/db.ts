import { supabase } from "./supabase";
import { Profile, UserStats, StudySession, Goal, UnlockedBadge, ScheduleItem, ScheduleCompletion, LessonTeacher, LessonSession, LessonPayment, ScheduleOverride } from "./types";

// ── Profiles ─────────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return data ?? [];
}

export async function createProfile(p: Omit<Profile, "id">): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").insert(p).select().single();
  if (error) throw new Error(error.message);
  if (data) {
    await supabase.from("user_stats").insert({ profile_id: data.id });
  }
  return data;
}

export async function deleteProfile(id: string): Promise<void> {
  await supabase.from("profiles").delete().eq("id", id);
}

// ── Stats ─────────────────────────────────────────────────
export async function getStats(profileId: string): Promise<UserStats | null> {
  const { data } = await supabase
    .from("user_stats")
    .select("*")
    .eq("profile_id", profileId)
    .single();
  return data;
}

export async function addPoints(profileId: string, pts: number): Promise<void> {
  const stats = await getStats(profileId);
  if (!stats) return;
  const newPoints = stats.points + pts;
  const newLevel = Math.floor(newPoints / 100) + 1;
  await supabase
    .from("user_stats")
    .update({ points: newPoints, level: newLevel })
    .eq("profile_id", profileId);
}

export async function addStudyMinutes(profileId: string, minutes: number): Promise<void> {
  const stats = await getStats(profileId);
  if (!stats) return;
  const today = new Date().toISOString().split("T")[0];
  let streak = stats.streak_days;

  if (stats.last_study_date) {
    const diff = Math.floor(
      (new Date(today).getTime() - new Date(stats.last_study_date).getTime()) / 86400000
    );
    if (diff === 1) streak += 1;
    else if (diff > 1) streak = 1;
  } else {
    streak = 1;
  }

  await supabase
    .from("user_stats")
    .update({ total_minutes: stats.total_minutes + minutes, streak_days: streak, last_study_date: today })
    .eq("profile_id", profileId);
}

// ── Sessions ──────────────────────────────────────────────
export async function getSessions(profileId: string): Promise<StudySession[]> {
  const { data } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSessionsByDate(profileId: string, date: string): Promise<StudySession[]> {
  const { data } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date);
  return data ?? [];
}

export async function addSession(session: Omit<StudySession, "id">): Promise<void> {
  await supabase.from("study_sessions").insert(session);
}

// ── Goals ─────────────────────────────────────────────────
export async function getGoals(profileId: string): Promise<Goal[]> {
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at");
  return data ?? [];
}

export async function addGoal(goal: Omit<Goal, "id">): Promise<void> {
  await supabase.from("goals").insert(goal);
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  await supabase.from("goals").update(patch).eq("id", id);
}

export async function deleteGoal(id: string): Promise<void> {
  await supabase.from("goals").delete().eq("id", id);
}

// ── Badges ────────────────────────────────────────────────
export async function getUnlockedBadges(profileId: string): Promise<UnlockedBadge[]> {
  const { data } = await supabase
    .from("unlocked_badges")
    .select("*")
    .eq("profile_id", profileId);
  return data ?? [];
}

export async function unlockBadge(profileId: string, badgeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("unlocked_badges")
    .insert({ profile_id: profileId, badge_id: badgeId });
  return !error;
}

// ── Schedule Items ─────────────────────────────────────────
export async function getScheduleItems(): Promise<ScheduleItem[]> {
  const { data } = await supabase.from("schedule_items").select("*").order("time_start");
  return data ?? [];
}

export async function addScheduleItem(item: Omit<ScheduleItem, "id">): Promise<void> {
  await supabase.from("schedule_items").insert(item);
}

export async function deleteScheduleItem(id: string): Promise<void> {
  await supabase.from("schedule_items").delete().eq("id", id);
}

// ── Schedule Completions ───────────────────────────────────
export async function getCompletions(date: string): Promise<ScheduleCompletion[]> {
  const { data } = await supabase.from("schedule_completions").select("*").eq("date", date);
  return data ?? [];
}

export async function toggleCompletion(scheduleId: string, profileId: string, date: string): Promise<void> {
  const { data } = await supabase
    .from("schedule_completions")
    .select("*")
    .eq("schedule_id", scheduleId)
    .eq("profile_id", profileId)
    .eq("date", date)
    .single();
  if (data) {
    await supabase.from("schedule_completions")
      .delete()
      .eq("schedule_id", scheduleId)
      .eq("profile_id", profileId)
      .eq("date", date);
  } else {
    await supabase.from("schedule_completions")
      .insert({ schedule_id: scheduleId, profile_id: profileId, date });
  }
}

// ── Lesson Teachers ────────────────────────────────────────
export async function getLessonTeachers(): Promise<LessonTeacher[]> {
  const { data } = await supabase.from("lesson_teachers").select("*").order("created_at");
  return data ?? [];
}

export async function createLessonTeacher(t: Omit<LessonTeacher, "id">): Promise<LessonTeacher | null> {
  const { data } = await supabase.from("lesson_teachers").insert(t).select().single();
  return data;
}

export async function updateLessonTeacher(id: string, patch: Partial<Omit<LessonTeacher, "id">>): Promise<void> {
  await supabase.from("lesson_teachers").update(patch).eq("id", id);
}

export async function deleteLessonTeacher(id: string): Promise<void> {
  await supabase.from("lesson_teachers").delete().eq("id", id);
}

// ── Lesson Sessions ────────────────────────────────────────
export async function getLessonSessions(teacherId: string): Promise<LessonSession[]> {
  const { data } = await supabase.from("lesson_sessions")
    .select("*").eq("teacher_id", teacherId).order("lesson_number");
  return data ?? [];
}

export async function addLessonSession(s: Omit<LessonSession, "id">): Promise<void> {
  await supabase.from("lesson_sessions").insert(s);
}

export async function updateLessonSession(id: string, patch: Partial<Omit<LessonSession, "id">>): Promise<void> {
  await supabase.from("lesson_sessions").update(patch).eq("id", id);
}

export async function deleteLessonSession(id: string): Promise<void> {
  await supabase.from("lesson_sessions").delete().eq("id", id);
}

// ── Lesson Payments ────────────────────────────────────────
export async function getLessonPayments(teacherId: string): Promise<LessonPayment[]> {
  const { data } = await supabase.from("lesson_payments")
    .select("*").eq("teacher_id", teacherId).order("paid_date");
  return data ?? [];
}

export async function addLessonPayment(p: Omit<LessonPayment, "id">): Promise<void> {
  await supabase.from("lesson_payments").insert(p);
}

// ── Schedule Overrides ─────────────────────────────────────
export async function getOverridesForDate(date: string): Promise<ScheduleOverride[]> {
  const { data } = await supabase.from("schedule_overrides").select("*").eq("date", date);
  return data ?? [];
}

export async function addOverride(o: Omit<ScheduleOverride, "id">): Promise<void> {
  await supabase.from("schedule_overrides").insert(o);
}

export async function deleteOverride(id: string): Promise<void> {
  await supabase.from("schedule_overrides").delete().eq("id", id);
}
