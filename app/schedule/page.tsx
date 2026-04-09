"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getScheduleItems, addScheduleItem, deleteScheduleItem,
  getCompletions, toggleCompletion, getProfiles,
  getOverridesForDate, addOverride, deleteOverride,
} from "@/lib/db";
import { ScheduleItem, ScheduleCompletion, Profile, ScheduleOverride } from "@/lib/types";
import { DEFAULT_SCHEDULES } from "@/lib/scheduleData";
import { useProfile } from "@/context/ProfileContext";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0
  const days: (Date | null)[] = Array(startDow).fill(null);
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function SchedulePage() {
  const { profile } = useProfile();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [completions, setCompletions] = useState<ScheduleCompletion[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedKid, setSelectedKid] = useState<string>("전체");
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideType, setOverrideType] = useState<"add" | "cancel" | "modify">("add");
  const [overrideTarget, setOverrideTarget] = useState<ScheduleItem | null>(null);
  const [overrideForm, setOverrideForm] = useState({ title: "", teacher: "", color: "#6366f1", participants: [] as string[], time_start: "", time_end: "", note: "" });

  const todayStr = toDateStr(new Date());

  useEffect(() => {
    Promise.all([getScheduleItems(), getProfiles(), getCompletions(todayStr), getOverridesForDate(todayStr)]).then(
      ([its, prs, comps, ovs]) => {
        setItems(its);
        setProfiles(prs);
        setCompletions(comps);
        setOverrides(ovs);
        setLoading(false);
      }
    );
  }, [todayStr]);

  const loadCompletions = async (date: string) => {
    const c = await getCompletions(date);
    setCompletions((prev) => [...prev.filter((x) => x.date !== date), ...c]);
  };

  const loadOverrides = async (date: string) => {
    const o = await getOverridesForDate(date);
    setOverrides((prev) => [...prev.filter((x) => x.date !== date), ...o]);
  };

  const handleAddOverride = async () => {
    const ds = toDateStr(currentDate);
    if (overrideType === "add" && !overrideForm.title) return;
    if ((overrideType === "cancel" || overrideType === "modify") && !overrideTarget) return;
    await addOverride({
      date: ds,
      schedule_id: overrideTarget?.id ?? null,
      type: overrideType,
      title: overrideType === "add" ? overrideForm.title : (overrideTarget?.title ?? ""),
      teacher: overrideType === "add" ? overrideForm.teacher : (overrideTarget?.teacher ?? ""),
      color: overrideType === "add" ? overrideForm.color : (overrideTarget?.color ?? "#6366f1"),
      participants: overrideType === "add" ? overrideForm.participants : (overrideTarget?.participants ?? []),
      time_start: overrideForm.time_start || (overrideTarget?.time_start ?? ""),
      time_end: overrideForm.time_end || (overrideTarget?.time_end ?? ""),
      note: overrideForm.note,
    });
    setShowOverrideForm(false);
    setOverrideTarget(null);
    setOverrideForm({ title: "", teacher: "", color: "#6366f1", participants: [], time_start: "", time_end: "", note: "" });
    await loadOverrides(ds);
  };

  const getEventsForDate = (date: Date): ScheduleItem[] => {
    const ds = toDateStr(date);
    const dow = date.getDay();
    return items
      .filter((item) => {
        // 아이 필터
        if (selectedKid !== "전체") {
          const names = item.participants.length === 0 ? profiles.map(p => p.name) : item.participants;
          if (!names.includes(selectedKid)) return false;
        }
        if (item.type === "weekly") return item.weekdays.includes(dow);
        if (item.type === "once") return item.date_start === ds;
        if (item.type === "range")
          return ds >= item.date_start && ds <= item.date_end &&
            (item.weekdays.length === 0 || item.weekdays.includes(dow));
        return false;
      })
      .sort((a, b) => (a.time_start || "99:99").localeCompare(b.time_start || "99:99"));
  };

  const getProfileByName = (name: string) => profiles.find((p) => p.name === name);

  const getParticipantNames = (item: ScheduleItem) =>
    item.participants.length === 0 ? profiles.map((p) => p.name) : item.participants;

  const isCompleted = (scheduleId: string, profileId: string, date: string) =>
    completions.some((c) => c.schedule_id === scheduleId && c.profile_id === profileId && c.date === date);

  const handleToggle = async (item: ScheduleItem, profileId: string, date: string) => {
    await toggleCompletion(item.id, profileId, date);
    await loadCompletions(date);
  };

  const handleSeed = async () => {
    setSeeding(true);
    for (const s of DEFAULT_SCHEDULES) {
      await addScheduleItem(s);
    }
    setItems(await getScheduleItems());
    setSeeding(false);
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthDays = useMemo(
    () => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-4xl animate-bounce">📅</div>
      </div>
    );

  const dailyEvents = getEventsForDate(currentDate);
  const dateStr = toDateStr(currentDate);

  const EventCard = ({ item, date, compact = false }: { item: ScheduleItem; date: string; compact?: boolean }) => {
    const names = getParticipantNames(item);
    return (
      <div className={`bg-white rounded-xl shadow-sm ${compact ? "p-2" : "p-4"}`}
        style={{ borderLeft: `4px solid ${item.color}` }}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-gray-900 ${compact ? "text-xs" : "text-sm"}`}>{item.title}</div>
            {!compact && item.teacher && (
              <div className="text-xs text-gray-400 mt-0.5">👨‍🏫 {item.teacher}</div>
            )}
            {(item.time_start || item.time_end) && (
              <div className={`text-gray-500 mt-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>
                🕐 {item.time_start}{item.time_end ? `~${item.time_end}` : ""}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {names.map((name) => (
                <span key={name} className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: getProfileByName(name)?.color ?? "#9ca3af" }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {item.is_completable && !compact &&
              names.map((name) => {
                const p = getProfileByName(name);
                if (!p) return null;
                const done = isCompleted(item.id, p.id, date);
                return (
                  <button key={name} onClick={() => handleToggle(item, p.id, date)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    <span>{done ? "✅" : "⬜"}</span>
                    <span>{name}</span>
                  </button>
                );
              })}
            {editMode && (
              <button onClick={() => deleteScheduleItem(item.id).then(() => getScheduleItems().then(setItems))}
                className="text-red-400 text-lg leading-none">×</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">📅 스케줄</h1>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={() => setEditMode((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border ${editMode ? "bg-red-50 border-red-300 text-red-500" : "border-gray-200 text-gray-400"}`}>
              {editMode ? "완료" : "편집"}
            </button>
          )}
          {items.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full disabled:opacity-50">
              {seeding ? "불러오는 중..." : "📥 기본 스케줄 불러오기"}
            </button>
          )}
        </div>
      </div>

      {/* Kid filter tabs */}
      <div className="flex gap-2">
        {["전체", ...profiles.map(p => p.name)].map((name) => {
          const p = profiles.find(p => p.name === name);
          const active = selectedKid === name;
          return (
            <button key={name} onClick={() => setSelectedKid(name)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${active ? "text-white shadow-md" : "bg-white text-gray-500 shadow-sm"}`}
              style={active ? { backgroundColor: p?.color ?? "#6366f1" } : {}}>
              {name === "전체" ? "👨‍👩‍👧‍👦 전체" : `${p?.avatar ?? ""} ${name}`}
            </button>
          );
        })}
      </div>

      {/* View tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(["daily", "weekly", "monthly"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            {v === "daily" ? "일간" : v === "weekly" ? "주간" : "월간"}
          </button>
        ))}
      </div>

      {/* ── Daily View ── */}
      {view === "daily" && (
        <>
          <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}
              className="p-2 text-gray-400 text-xl">‹</button>
            <div className="text-center">
              <div className="font-bold text-gray-900">
                {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 ({DAYS[currentDate.getDay()]})
              </div>
              {dateStr === todayStr && <div className="text-xs text-indigo-500 font-medium">오늘</div>}
            </div>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }}
              className="p-2 text-gray-400 text-xl">›</button>
          </div>
          {/* 일정 변경 버튼 */}
          <div className="flex gap-2">
            <button onClick={() => { setOverrideType("add"); setOverrideTarget(null); setShowOverrideForm(true); }}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
              + 일정 추가
            </button>
            {dailyEvents.length > 0 && (
              <>
                <button onClick={() => { setOverrideType("cancel"); setShowOverrideForm(true); }}
                  className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold">
                  ✕ 일정 취소
                </button>
                <button onClick={() => { setOverrideType("modify"); setShowOverrideForm(true); }}
                  className="flex-1 py-2 bg-amber-100 text-amber-600 rounded-xl text-sm font-bold">
                  ✏️ 시간 변경
                </button>
              </>
            )}
          </div>

          {/* 일정 변경 폼 */}
          {showOverrideForm && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800">
                {overrideType === "add" ? "➕ 일정 추가" : overrideType === "cancel" ? "✕ 일정 취소" : "✏️ 시간 변경"}
              </h3>

              {/* 기존 일정 선택 (취소/변경 시) */}
              {(overrideType === "cancel" || overrideType === "modify") && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">어떤 일정?</label>
                  <div className="space-y-1">
                    {dailyEvents.map((item) => {
                      const cancelled = overrides.some(o => o.schedule_id === item.id && o.type === "cancel" && o.date === dateStr);
                      if (cancelled) return null;
                      return (
                        <button key={item.id} onClick={() => setOverrideTarget(item)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${overrideTarget?.id === item.id ? "text-white" : "bg-gray-50 text-gray-700"}`}
                          style={overrideTarget?.id === item.id ? { backgroundColor: item.color } : {}}>
                          {item.title} {item.time_start && `(${item.time_start})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 새 일정 제목/선생님 (추가 시) */}
              {overrideType === "add" && (
                <>
                  <input value={overrideForm.title} onChange={e => setOverrideForm(v => ({ ...v, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="일정 제목" />
                  <input value={overrideForm.teacher} onChange={e => setOverrideForm(v => ({ ...v, teacher: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="선생님 (선택)" />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">참여 아이들</label>
                    <div className="flex gap-2">
                      {profiles.map(p => (
                        <button key={p.id} onClick={() => setOverrideForm(v => ({
                          ...v, participants: v.participants.includes(p.name)
                            ? v.participants.filter(n => n !== p.name)
                            : [...v.participants, p.name]
                        }))}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${overrideForm.participants.includes(p.name) ? "text-white" : "bg-gray-100 text-gray-500"}`}
                          style={overrideForm.participants.includes(p.name) ? { backgroundColor: p.color } : {}}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 시간 (추가/변경 시) */}
              {overrideType !== "cancel" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                    <input type="time" value={overrideForm.time_start} onChange={e => setOverrideForm(v => ({ ...v, time_start: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                    <input type="time" value={overrideForm.time_end} onChange={e => setOverrideForm(v => ({ ...v, time_end: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <input value={overrideForm.note} onChange={e => setOverrideForm(v => ({ ...v, note: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="메모 (선택)" />

              <div className="flex gap-2">
                <button onClick={() => { setShowOverrideForm(false); setOverrideTarget(null); }}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">취소</button>
                <button onClick={handleAddOverride}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">저장</button>
              </div>
            </div>
          )}

          {/* 오버라이드 표시 */}
          {overrides.filter(o => o.date === dateStr).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500">오늘의 변경사항</div>
              {overrides.filter(o => o.date === dateStr).map(o => (
                <div key={o.id} className={`flex items-center gap-3 p-3 rounded-xl ${o.type === "cancel" ? "bg-red-50 border border-red-200" : o.type === "modify" ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                  <span className="text-lg">{o.type === "cancel" ? "✕" : o.type === "modify" ? "✏️" : "➕"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">{o.title}</div>
                    <div className="text-xs text-gray-500">
                      {o.type === "cancel" ? "취소됨" : o.type === "modify" ? `시간변경: ${o.time_start}${o.time_end ? `~${o.time_end}` : ""}` : `추가: ${o.time_start || "시간미정"}`}
                      {o.note && ` · ${o.note}`}
                    </div>
                  </div>
                  <button onClick={() => deleteOverride(o.id).then(() => loadOverrides(dateStr))}
                    className="text-gray-300 hover:text-red-400 text-xl">×</button>
                </div>
              ))}
            </div>
          )}

          {/* 기존 일정 목록 */}
          {dailyEvents.length === 0 && overrides.filter(o => o.date === dateStr && o.type === "add").length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl">
              이 날은 일정이 없어요
            </div>
          ) : (
            <div className="space-y-3">
              {dailyEvents.map((item) => {
                const cancelled = overrides.some(o => o.schedule_id === item.id && o.type === "cancel" && o.date === dateStr);
                const modified = overrides.find(o => o.schedule_id === item.id && o.type === "modify" && o.date === dateStr);
                const displayItem = modified ? { ...item, time_start: modified.time_start, time_end: modified.time_end } : item;
                return (
                  <div key={item.id} className={cancelled ? "opacity-40" : ""}>
                    {cancelled && <div className="text-xs text-red-500 font-medium mb-1 ml-1">⛔ 오늘 취소됨</div>}
                    {modified && <div className="text-xs text-amber-500 font-medium mb-1 ml-1">✏️ 시간 변경됨</div>}
                    <EventCard item={displayItem} date={dateStr} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Weekly View ── */}
      {view === "weekly" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}
              className="p-2 text-gray-500 text-xl">‹</button>
            <span className="text-sm font-medium text-gray-700">
              {weekDates[0].getMonth() + 1}/{weekDates[0].getDate()} ~{" "}
              {weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
            </span>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}
              className="p-2 text-gray-500 text-xl">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date, i) => {
              const ds = toDateStr(date);
              const isToday = ds === todayStr;
              const events = getEventsForDate(date);
              return (
                <div key={i}
                  className={`rounded-xl p-1.5 min-h-[80px] ${isToday ? "bg-indigo-50 ring-2 ring-indigo-400" : "bg-white"} shadow-sm`}
                  onClick={() => { setCurrentDate(date); setView("daily"); }}>
                  <div className={`text-center text-xs font-bold mb-1.5 ${isToday ? "text-indigo-600" : i === 6 ? "text-red-400" : i === 5 ? "text-blue-400" : "text-gray-600"}`}>
                    <div>{DAYS[date.getDay()]}</div>
                    <div className="font-black text-sm">{date.getDate()}</div>
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 4).map((item) => (
                      <div key={item.id}
                        className="rounded text-[8px] px-1 py-0.5 text-white leading-tight truncate"
                        style={{ backgroundColor: item.color }}>
                        {item.time_start && <span className="opacity-80">{item.time_start} </span>}
                        {item.title}
                      </div>
                    ))}
                    {events.length > 4 && (
                      <div className="text-[8px] text-gray-400 text-center">+{events.length - 4}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Participant legend */}
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-gray-600 font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Monthly View ── */}
      {view === "monthly" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
              className="p-2 text-gray-500 text-xl">‹</button>
            <span className="font-bold text-gray-900">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </span>
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
              className="p-2 text-gray-500 text-xl">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
              <div key={d} className={`text-center text-xs font-bold py-1 ${i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-gray-400"}`}>{d}</div>
            ))}
            {monthDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const ds = toDateStr(date);
              const isToday = ds === todayStr;
              const events = getEventsForDate(date);
              const uniqueColors = [...new Set(events.map((e) => e.color))];
              return (
                <div key={ds}
                  className={`rounded-xl p-1.5 min-h-[52px] cursor-pointer ${isToday ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-white"} shadow-sm`}
                  onClick={() => { setCurrentDate(date); setView("daily"); }}>
                  <div className={`text-xs font-bold text-center ${isToday ? "text-indigo-600" : "text-gray-700"}`}>
                    {date.getDate()}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {uniqueColors.slice(0, 4).map((c, ci) => (
                      <div key={ci} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-gray-600 font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
