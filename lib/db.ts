import { supabase } from "./supabase";
import { Profile, UserStats, StudySession, Goal, UnlockedBadge } from "./types";

// ── Profiles ─────────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return data ?? [];
}

export async function createProfile(p: Omit<Profile, "id">): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").insert(p).select().single();
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
