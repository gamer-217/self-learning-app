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
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
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
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "", teacher: "", color: "#6366f1", participants: [] as string[],
    type: "range" as "weekly" | "once" | "range",
    weekdays: [] as number[],
    time_start: "", time_end: "",
    date_start: "", date_end: "2099-12-31",
    is_completable: false,
  });

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

  const handleAddNewItem = async () => {
    if (!newItem.title || !newItem.date_start) return;
    await addScheduleItem(newItem);
    setItems(await getScheduleItems());
    setShowNewItemForm(false);
    setNewItem({ title: "", teacher: "", color: "#6366f1", participants: [], type: "range", weekdays: [], time_start: "", time_end: "", date_start: "", date_end: "2099-12-31", is_completable: false });
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
      <div className={`bg-white rounded-2xl shadow-sm ${compact ? "p-3" : "p-4"}`}
        style={{ borderLeft: `4px solid ${item.color}` }}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>{item.title}</div>
            {!compact && item.teacher && (
              <div className="text-xs text-gray-400 mt-0.5">👨‍🏫 {item.teacher}</div>
            )}
            {(item.time_start || item.time_end) && (
              <div className={`text-gray-500 mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>
                🕐 {item.time_start}{item.time_end ? `~${item.time_end}` : ""}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {names.map((name) => (
                <span key={name} className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
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
                className="text-red-400 text-xl leading-none">×</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">📅 스케줄</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowNewItemForm((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${showNewItemForm ? "bg-gray-100 text-gray-500" : "bg-indigo-600 text-white"}`}>
            {showNewItemForm ? "취소" : "＋ 새 일정"}
          </button>
          {items.length > 0 && (
            <button onClick={() => setEditMode((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border ${editMode ? "bg-red-50 border-red-300 text-red-500" : "border-gray-200 text-gray-400"}`}>
              {editMode ? "완료" : "편집"}
            </button>
          )}
          {items.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full disabled:opacity-50">
              {seeding ? "불러오는 중..." : "📥 기본 데이터"}
            </button>
          )}
        </div>
      </div>

      {/* 새 일정 추가 폼 */}
      {showNewItemForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-black text-gray-800">새 고정 일정 추가</h3>
          <input value={newItem.title} onChange={e => setNewItem(v => ({ ...v, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="일정 이름 (예: 수학학원)" />
          <input value={newItem.teacher} onChange={e => setNewItem(v => ({ ...v, teacher: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="선생님 / 장소 (선택)" />

          {/* 반복 유형 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-semibold">반복</label>
            <div className="flex gap-2">
              {([["weekly", "매주"], ["range", "기간"], ["once", "1회"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setNewItem(v => ({ ...v, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${newItem.type === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 요일 선택 (매주/기간) */}
          {(newItem.type === "weekly" || newItem.type === "range") && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-semibold">
                요일 {newItem.type === "range" ? "(비우면 매일)" : ""}
              </label>
              <div className="flex gap-1">
                {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                  <button key={i} onClick={() => setNewItem(v => ({
                    ...v, weekdays: v.weekdays.includes(i) ? v.weekdays.filter(x => x !== i) : [...v.weekdays, i]
                  }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${newItem.weekdays.includes(i) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"} ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}`}
                    style={newItem.weekdays.includes(i) ? {} : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 시작일/종료일 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block font-semibold">시작일</label>
              <input type="date" value={newItem.date_start} onChange={e => setNewItem(v => ({ ...v, date_start: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            {newItem.type !== "once" && (
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block font-semibold">종료일 (없으면 비워요)</label>
                <input type="date" value={newItem.date_end === "2099-12-31" ? "" : newItem.date_end}
                  onChange={e => setNewItem(v => ({ ...v, date_end: e.target.value || "2099-12-31" }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
            )}
          </div>

          {/* 시간 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block font-semibold">시작 시간</label>
              <input type="time" value={newItem.time_start} onChange={e => setNewItem(v => ({ ...v, time_start: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block font-semibold">종료 시간</label>
              <input type="time" value={newItem.time_end} onChange={e => setNewItem(v => ({ ...v, time_end: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          {/* 참여 아이들 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-semibold">참여 아이들 (비우면 전체)</label>
            <div className="flex gap-2">
              {profiles.map(p => (
                <button key={p.id} onClick={() => setNewItem(v => ({
                  ...v, participants: v.participants.includes(p.name)
                    ? v.participants.filter(n => n !== p.name)
                    : [...v.participants, p.name]
                }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${newItem.participants.includes(p.name) ? "text-white" : "bg-gray-100 text-gray-500"}`}
                  style={newItem.participants.includes(p.name) ? { backgroundColor: p.color } : {}}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-semibold">색상</label>
            <div className="flex gap-2">
              {["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4"].map(c => (
                <button key={c} onClick={() => setNewItem(v => ({ ...v, color: c }))}
                  className={`w-8 h-8 rounded-full transition-all ${newItem.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* 완료 체크 여부 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newItem.is_completable}
              onChange={e => setNewItem(v => ({ ...v, is_completable: e.target.checked }))}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm text-gray-700">완료 체크 가능 (숙제, 과제 등)</span>
          </label>

          <button onClick={handleAddNewItem}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm">저장</button>
        </div>
      )}

      {/* Kid filter tabs */}
      <div className="flex gap-1.5">
        {["전체", ...profiles.map(p => p.name)].map((name) => {
          const p = profiles.find(p => p.name === name);
          const active = selectedKid === name;
          return (
            <button key={name} onClick={() => setSelectedKid(name)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${active ? "text-white shadow-md" : "bg-white text-gray-500 shadow-sm"}`}
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
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === v ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}>
            {v === "daily" ? "일간" : v === "weekly" ? "주간" : "월간"}
          </button>
        ))}
      </div>

      {/* ── Daily View ── */}
      {view === "daily" && (
        <>
          <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl hover:bg-gray-100">‹</button>
            <div className="text-center">
              <div className="font-black text-gray-900 text-lg">
                {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 ({DAYS[currentDate.getDay()]})
              </div>
              {dateStr === todayStr && <div className="text-xs text-indigo-500 font-semibold mt-0.5">오늘</div>}
            </div>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl hover:bg-gray-100">›</button>
          </div>

          {/* 일정 변경 버튼 */}
          <div className="flex gap-2">
            <button onClick={() => { setOverrideType("add"); setOverrideTarget(null); setShowOverrideForm(true); }}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm">
              ＋ 일정 추가
            </button>
            {dailyEvents.length > 0 && (
              <>
                <button onClick={() => { setOverrideType("cancel"); setShowOverrideForm(true); }}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold shadow-sm">
                  ✕ 취소
                </button>
                <button onClick={() => { setOverrideType("modify"); setShowOverrideForm(true); }}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-sm">
                  ✏️ 변경
                </button>
              </>
            )}
          </div>

          {/* 일정 변경 폼 */}
          {showOverrideForm && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-black text-gray-800 text-base">
                {overrideType === "add" ? "➕ 일정 추가" : overrideType === "cancel" ? "✕ 일정 취소" : "✏️ 시간 변경"}
              </h3>

              {(overrideType === "cancel" || overrideType === "modify") && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-semibold">어떤 일정?</label>
                  <div className="space-y-1">
                    {dailyEvents.map((item) => {
                      const cancelled = overrides.some(o => o.schedule_id === item.id && o.type === "cancel" && o.date === dateStr);
                      if (cancelled) return null;
                      return (
                        <button key={item.id} onClick={() => setOverrideTarget(item)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${overrideTarget?.id === item.id ? "text-white" : "bg-gray-50 text-gray-700"}`}
                          style={overrideTarget?.id === item.id ? { backgroundColor: item.color } : {}}>
                          {item.title} {item.time_start && `(${item.time_start})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {overrideType === "add" && (
                <>
                  <input value={overrideForm.title} onChange={e => setOverrideForm(v => ({ ...v, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="일정 제목" />
                  <input value={overrideForm.teacher} onChange={e => setOverrideForm(v => ({ ...v, teacher: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="선생님 (선택)" />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-semibold">참여 아이들</label>
                    <div className="flex gap-2">
                      {profiles.map(p => (
                        <button key={p.id} onClick={() => setOverrideForm(v => ({
                          ...v, participants: v.participants.includes(p.name)
                            ? v.participants.filter(n => n !== p.name)
                            : [...v.participants, p.name]
                        }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${overrideForm.participants.includes(p.name) ? "text-white" : "bg-gray-100 text-gray-500"}`}
                          style={overrideForm.participants.includes(p.name) ? { backgroundColor: p.color } : {}}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {overrideType !== "cancel" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block font-semibold">시작 시간</label>
                    <input type="time" value={overrideForm.time_start} onChange={e => setOverrideForm(v => ({ ...v, time_start: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block font-semibold">종료 시간</label>
                    <input type="time" value={overrideForm.time_end} onChange={e => setOverrideForm(v => ({ ...v, time_end: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                </div>
              )}

              <input value={overrideForm.note} onChange={e => setOverrideForm(v => ({ ...v, note: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="메모 (선택)" />

              <div className="flex gap-2">
                <button onClick={() => { setShowOverrideForm(false); setOverrideTarget(null); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">취소</button>
                <button onClick={handleAddOverride}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">저장</button>
              </div>
            </div>
          )}

          {/* 오버라이드 표시 */}
          {overrides.filter(o => o.date === dateStr).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">오늘의 변경사항</div>
              {overrides.filter(o => o.date === dateStr).map(o => (
                <div key={o.id} className={`flex items-center gap-3 p-3 rounded-2xl ${o.type === "cancel" ? "bg-red-50 border border-red-200" : o.type === "modify" ? "bg-amber-50 border border-amber-200" : "bg-indigo-50 border border-indigo-200"}`}>
                  <span className="text-xl">{o.type === "cancel" ? "⛔" : o.type === "modify" ? "✏️" : "➕"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">{o.title}</div>
                    <div className="text-xs text-gray-500">
                      {o.type === "cancel" ? "오늘 취소됨" : o.type === "modify" ? `시간변경 → ${o.time_start}${o.time_end ? `~${o.time_end}` : ""}` : `추가: ${o.time_start || "시간미정"}`}
                      {o.note && ` · ${o.note}`}
                    </div>
                  </div>
                  <button onClick={() => deleteOverride(o.id).then(() => loadOverrides(dateStr))}
                    className="text-gray-300 hover:text-red-400 text-2xl w-8 h-8 flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}

          {/* 기존 일정 목록 */}
          {dailyEvents.length === 0 && overrides.filter(o => o.date === dateStr && o.type === "add").length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl mb-2">😴</div>
              <div className="text-sm">이 날은 일정이 없어요</div>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyEvents.map((item) => {
                const cancelled = overrides.some(o => o.schedule_id === item.id && o.type === "cancel" && o.date === dateStr);
                const modified = overrides.find(o => o.schedule_id === item.id && o.type === "modify" && o.date === dateStr);
                const displayItem = modified ? { ...item, time_start: modified.time_start, time_end: modified.time_end } : item;
                return (
                  <div key={item.id} className={cancelled ? "opacity-40 pointer-events-none" : ""}>
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
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl bg-white shadow-sm">‹</button>
            <span className="font-bold text-gray-800">
              {weekDates[0].getMonth() + 1}/{weekDates[0].getDate()} ~ {weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
            </span>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl bg-white shadow-sm">›</button>
          </div>

          {/* 요일별 행 - 모든 일정 표시 */}
          <div className="space-y-2">
            {weekDates.map((date, i) => {
              const ds = toDateStr(date);
              const isToday = ds === todayStr;
              const events = getEventsForDate(date);
              const dow = date.getDay();
              const isSat = dow === 6;
              const isSun = dow === 0;

              return (
                <div key={i}
                  className={`rounded-2xl overflow-hidden shadow-sm ${isToday ? "ring-2 ring-indigo-400" : ""}`}
                  onClick={() => { setCurrentDate(date); setView("daily"); }}>
                  {/* 요일 헤더 */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 ${isToday ? "bg-indigo-600" : isSun ? "bg-red-50" : isSat ? "bg-blue-50" : "bg-white"}`}>
                    <div className={`font-black text-lg w-8 text-center ${isToday ? "text-white" : isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-gray-800"}`}>
                      {date.getDate()}
                    </div>
                    <div className={`text-sm font-bold ${isToday ? "text-indigo-100" : isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-gray-400"}`}>
                      {DAYS[dow]}요일
                    </div>
                    {isToday && <span className="ml-auto text-xs text-indigo-200 font-semibold">오늘</span>}
                    {events.length === 0 && !isToday && (
                      <span className="ml-auto text-xs text-gray-300">일정 없음</span>
                    )}
                  </div>

                  {/* 일정 목록 */}
                  {events.length > 0 && (
                    <div className="bg-white px-3 py-2 space-y-1.5">
                      {events.map((item) => {
                        const names = getParticipantNames(item);
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 py-1">
                            <div className="w-1 rounded-full self-stretch" style={{ backgroundColor: item.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800 truncate">{item.title}</span>
                                {item.time_start && (
                                  <span className="text-xs text-gray-400 shrink-0">
                                    {item.time_start}{item.time_end ? `~${item.time_end}` : ""}
                                  </span>
                                )}
                              </div>
                              {item.teacher && (
                                <div className="text-xs text-gray-400">{item.teacher}</div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {names.map((name) => (
                                <span key={name}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold"
                                  style={{ backgroundColor: getProfileByName(name)?.color ?? "#9ca3af" }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Monthly View ── */}
      {view === "monthly" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl bg-white shadow-sm">‹</button>
            <span className="font-black text-gray-900 text-lg">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </span>
            <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-xl bg-white shadow-sm">›</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7">
              {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
                <div key={d} className={`text-center text-xs font-bold py-2 ${i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-gray-400"}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {monthDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-white min-h-[56px]" />;
                const ds = toDateStr(date);
                const isToday = ds === todayStr;
                const events = getEventsForDate(date);
                const uniqueColors = [...new Set(events.map((e) => e.color))];
                return (
                  <div key={ds}
                    className={`bg-white min-h-[56px] p-1.5 cursor-pointer ${isToday ? "bg-indigo-50" : ""}`}
                    onClick={() => { setCurrentDate(date); setView("daily"); }}>
                    <div className={`text-xs font-black text-center w-6 h-6 mx-auto flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}>
                      {date.getDate()}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                      {uniqueColors.slice(0, 5).map((c, ci) => (
                        <div key={ci} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    {events.length > 0 && (
                      <div className="text-[9px] text-gray-400 text-center mt-0.5">{events.length}개</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="flex flex-wrap gap-3 justify-center">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-gray-600 font-semibold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
