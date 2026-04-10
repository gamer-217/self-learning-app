"use client";
import { useEffect, useState } from "react";
import {
  getLessonTeachers, createLessonTeacher,
  getLessonSessions, addLessonSession, deleteLessonSession,
  getLessonPayments, addLessonPayment,
} from "@/lib/db";
import { LessonTeacher, LessonSession, LessonPayment } from "@/lib/types";
import { DEFAULT_TEACHERS, DEFAULT_SESSIONS, DEFAULT_PAYMENTS, JIAH_TEACHERS } from "@/lib/scheduleData";

const ALL_KIDS = ["주원", "지아", "예원"];

export default function LessonsPage() {
  const [teachers, setTeachers] = useState<LessonTeacher[]>([]);
  const [sessions, setSessions] = useState<Record<string, LessonSession[]>>({});
  const [payments, setPayments] = useState<Record<string, LessonPayment[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedingJiah, setSeedingJiah] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newSession, setNewSession] = useState({ date: "", time_start: "", participants: [...ALL_KIDS], notes: "" });
  const [newPayment, setNewPayment] = useState({ amount: "", paid_date: "", note: "" } as { amount: string | number; paid_date: string; note: string });
  const [newTeacher, setNewTeacher] = useState({
    name: "", subject: "", notes: "",
    feeType: "session" as "session" | "monthly",
    fee: "", payment_day: "",
  });

  const loadAll = async () => {
    const ts = await getLessonTeachers();
    setTeachers(ts);
    const sm: Record<string, LessonSession[]> = {};
    const pm: Record<string, LessonPayment[]> = {};
    for (const t of ts) {
      sm[t.id] = await getLessonSessions(t.id);
      pm[t.id] = await getLessonPayments(t.id);
    }
    setSessions(sm);
    setPayments(pm);
    if (ts.length > 0) setSelectedId((prev) => prev ?? ts[0].id);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    let choId = "";
    for (const t of DEFAULT_TEACHERS) {
      const created = await createLessonTeacher(t);
      if (created) {
        if (created.name === "조재용 원장님") choId = created.id;
      }
    }
    if (choId) {
      for (const s of DEFAULT_SESSIONS) {
        await addLessonSession({ ...s, teacher_id: choId });
      }
      for (const p of DEFAULT_PAYMENTS) {
        await addLessonPayment({ ...p, teacher_id: choId });
      }
    }
    await loadAll();
    setSeeding(false);
  };

  const handleSeedJiah = async () => {
    setSeedingJiah(true);
    for (const t of JIAH_TEACHERS) {
      await createLessonTeacher(t);
    }
    await loadAll();
    setSeedingJiah(false);
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.name) return;
    await createLessonTeacher({
      name: newTeacher.name,
      subject: newTeacher.subject,
      notes: newTeacher.notes,
      fee_per_session: newTeacher.feeType === "session" && newTeacher.fee ? Number(newTeacher.fee) : null,
      fee_monthly: newTeacher.feeType === "monthly" && newTeacher.fee ? Number(newTeacher.fee) : null,
      payment_day: newTeacher.payment_day ? Number(newTeacher.payment_day) : null,
    });
    setNewTeacher({ name: "", subject: "", notes: "", feeType: "session", fee: "", payment_day: "" });
    setShowAddTeacher(false);
    await loadAll();
  };

  const handleAddSession = async () => {
    if (!selectedId || !newSession.date) return;
    const ts = sessions[selectedId] ?? [];
    const nextNum = ts.length > 0 ? Math.max(...ts.map((s) => s.lesson_number)) + 1 : 1;
    await addLessonSession({ teacher_id: selectedId, lesson_number: nextNum, ...newSession });
    setNewSession({ date: "", time_start: "", participants: [...ALL_KIDS], notes: "" });
    setShowAddSession(false);
    await loadAll();
  };

  const handleAddPayment = async () => {
    if (!selectedId || !newPayment.amount || !newPayment.paid_date) return;
    await addLessonPayment({ teacher_id: selectedId, amount: Number(newPayment.amount), paid_date: newPayment.paid_date, note: newPayment.note });
    setNewPayment({ amount: "", paid_date: "", note: "" });
    setShowAddPayment(false);
    await loadAll();
  };

  const toggleParticipant = (name: string) => {
    setNewSession((prev) => ({
      ...prev,
      participants: prev.participants.includes(name)
        ? prev.participants.filter((n) => n !== name)
        : [...prev.participants, name],
    }));
  };

  const teacher = teachers.find((t) => t.id === selectedId);
  const teacherSessions = selectedId ? (sessions[selectedId] ?? []) : [];
  const teacherPayments = selectedId ? (payments[selectedId] ?? []) : [];

  const getStats = (t: LessonTeacher) => {
    const ts = sessions[t.id] ?? [];
    const ps = payments[t.id] ?? [];
    const totalPaid = ps.reduce((a, p) => a + p.amount, 0);
    const paidSessions = t.fee_per_session ? Math.floor(totalPaid / t.fee_per_session) : 0;
    const done = ts.length;
    return { totalPaid, paidSessions, done, remaining: paidSessions - done };
  };

  const getNextPaymentDate = (t: LessonTeacher) => {
    if (!t.payment_day) return null;
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), t.payment_day);
    if (d < today) d.setMonth(d.getMonth() + 1);
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    return { date: `${d.getMonth() + 1}월 ${t.payment_day}일`, daysLeft: diff };
  };

  if (loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="text-4xl animate-bounce">📝</div></div>;

  return (
    <div className="px-4 pt-6 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">📝 레슨 관리</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddTeacher(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${showAddTeacher ? "bg-gray-100 text-gray-500" : "bg-indigo-600 text-white"}`}>
            {showAddTeacher ? "취소" : "＋ 선생님"}
          </button>
          {teachers.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full disabled:opacity-50">
              {seeding ? "추가중..." : "📥 기본"}
            </button>
          )}
          {teachers.length > 0 && (
            <button onClick={handleSeedJiah} disabled={seedingJiah}
              className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-full font-bold disabled:opacity-50">
              {seedingJiah ? "추가중..." : "🎵 지아 레슨"}
            </button>
          )}
        </div>
      </div>

      {/* 선생님 추가 폼 */}
      {showAddTeacher && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-black text-gray-800">새 선생님 추가</h3>
          <input value={newTeacher.name} onChange={e => setNewTeacher(v => ({ ...v, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="이름 (예: 홍길동 선생님)" />
          <input value={newTeacher.subject} onChange={e => setNewTeacher(v => ({ ...v, subject: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="과목/학원명" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-semibold">결제 방식</label>
            <div className="flex gap-2">
              <button onClick={() => setNewTeacher(v => ({ ...v, feeType: "session" }))}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${newTeacher.feeType === "session" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                회당 결제
              </button>
              <button onClick={() => setNewTeacher(v => ({ ...v, feeType: "monthly" }))}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${newTeacher.feeType === "monthly" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                월 정액
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block font-semibold">
                {newTeacher.feeType === "session" ? "회당 금액 (원)" : "월 금액 (원)"}
              </label>
              <input type="number" value={newTeacher.fee} onChange={e => setNewTeacher(v => ({ ...v, fee: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="예: 50000" />
            </div>
            {newTeacher.feeType === "monthly" && (
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block font-semibold">납부일 (매월)</label>
                <input type="number" min="1" max="31" value={newTeacher.payment_day}
                  onChange={e => setNewTeacher(v => ({ ...v, payment_day: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="예: 10" />
              </div>
            )}
          </div>
          <input value={newTeacher.notes} onChange={e => setNewTeacher(v => ({ ...v, notes: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="메모 (선택)" />
          <button onClick={handleAddTeacher}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm">저장</button>
        </div>
      )}

      {/* Teacher tabs */}
      {teachers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {teachers.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${selectedId === t.id ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-gray-600 shadow-sm"}`}>
              <div>{t.name.split(" ")[0]}</div>
              <div className="text-xs font-normal opacity-80">{t.name.split(" ").slice(1).join(" ")}</div>
            </button>
          ))}
        </div>
      )}

      {teacher && (
        <>
          {/* Teacher card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-900 text-lg">{teacher.name}</div>
            <div className="text-sm text-gray-500 mt-0.5">{teacher.subject}</div>
            {teacher.fee_per_session && (
              <div className="mt-2 text-sm flex items-center gap-2">
                <span>💰</span>
                <span>회당 <strong className="text-indigo-600">{teacher.fee_per_session.toLocaleString()}원</strong></span>
                {teacher.notes && <span className="text-gray-400 text-xs">({teacher.notes})</span>}
              </div>
            )}
            {teacher.fee_monthly && (() => {
              const next = getNextPaymentDate(teacher);
              return (
                <div className="mt-2 space-y-1">
                  <div className="text-sm flex items-center gap-2">
                    <span>💰</span>
                    <span>월 <strong className="text-indigo-600">{teacher.fee_monthly.toLocaleString()}원</strong></span>
                    {teacher.payment_day && <span className="text-gray-400 text-xs">(매월 {teacher.payment_day}일)</span>}
                  </div>
                  {next && (
                    <div className={`text-xs px-3 py-1.5 rounded-xl inline-block font-medium ${next.daysLeft <= 3 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                      다음 납부일: {next.date} (D-{next.daysLeft})
                    </div>
                  )}
                  {teacher.notes && <div className="text-xs text-gray-400">{teacher.notes}</div>}
                </div>
              );
            })()}
          </div>

          {/* Stats for session-based */}
          {teacher.fee_per_session && (() => {
            const { totalPaid, paidSessions, done, remaining } = getStats(teacher);
            return (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "완료", value: `${done}회`, bg: "bg-blue-50", color: "text-blue-600" },
                  { label: "선지급", value: `${paidSessions}회`, bg: "bg-green-50", color: "text-green-600" },
                  { label: "잔여", value: `${remaining}회`, bg: remaining <= 2 ? "bg-red-50" : "bg-amber-50", color: remaining <= 2 ? "text-red-500" : "text-amber-500" },
                  { label: "총납부", value: `${(totalPaid / 10000).toFixed(0)}만`, bg: "bg-gray-50", color: "text-gray-600" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Lesson Sessions - 월정액 전용(토익학원 등)은 숨김 */}
          {teacher.fee_per_session !== null && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-800">레슨 회차</h2>
                <button onClick={() => setShowAddSession((v) => !v)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold ${showAddSession ? "bg-gray-100 text-gray-500" : "bg-indigo-600 text-white"}`}>
                  {showAddSession ? "취소" : "+ 추가"}
                </button>
              </div>

              {showAddSession && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex gap-2">
                    <input type="date" value={newSession.date}
                      onChange={(e) => setNewSession((v) => ({ ...v, date: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                    <input type="time" value={newSession.time_start}
                      onChange={(e) => setNewSession((v) => ({ ...v, time_start: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">참여 아이들</div>
                    <div className="flex gap-2">
                      {ALL_KIDS.map((name) => (
                        <button key={name} onClick={() => toggleParticipant(name)}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${newSession.participants.includes(name) ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={newSession.notes}
                    onChange={(e) => setNewSession((v) => ({ ...v, notes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="메모 (선택)" />
                  <button onClick={handleAddSession}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">저장</button>
                </div>
              )}

              {teacherSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">레슨 기록이 없어요</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {[...teacherSessions].reverse().map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                        {s.lesson_number}회
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{s.date}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {s.time_start && `🕐 ${s.time_start} · `}
                          {s.participants.join(", ")}
                          {s.notes && ` · ${s.notes}`}
                        </div>
                      </div>
                      <button onClick={() => deleteLessonSession(s.id).then(loadAll)}
                        className="text-gray-300 hover:text-red-400 text-xl shrink-0">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800">납부 내역</h2>
              <button onClick={() => setShowAddPayment((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold ${showAddPayment ? "bg-gray-100 text-gray-500" : "bg-green-600 text-white"}`}>
                {showAddPayment ? "취소" : "+ 납부 추가"}
              </button>
            </div>

            {showAddPayment && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                <input type="date" value={newPayment.paid_date}
                  onChange={(e) => setNewPayment((v) => ({ ...v, paid_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" value={newPayment.amount}
                  onChange={(e) => setNewPayment((v) => ({ ...v, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="금액 (원)" />
                <input value={newPayment.note}
                  onChange={(e) => setNewPayment((v) => ({ ...v, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="메모 (선택)" />
                <button onClick={handleAddPayment}
                  className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-bold">저장</button>
              </div>
            )}

            {teacherPayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">납부 내역이 없어요</p>
            ) : (
              <div className="space-y-2">
                {teacherPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-2xl">💰</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{p.amount.toLocaleString()}원</div>
                      <div className="text-xs text-gray-400">{p.paid_date}{p.note && ` · ${p.note}`}</div>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">납부완료</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
