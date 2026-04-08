import { ScheduleItem, LessonTeacher, LessonSession, LessonPayment } from "./types";

export const DEFAULT_SCHEDULES: Omit<ScheduleItem, "id">[] = [
  // 주원 컴퓨터 - 월화목금 17:30-19:30
  {
    title: "컴퓨터",
    teacher: "",
    color: "#6366f1",
    participants: ["주원"],
    type: "weekly",
    weekdays: [1, 2, 4, 5],
    time_start: "17:30",
    time_end: "19:30",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
  // 주원 컴퓨터 - 수요일 16:30-18:30
  {
    title: "컴퓨터 (수)",
    teacher: "",
    color: "#6366f1",
    participants: ["주원"],
    type: "weekly",
    weekdays: [3],
    time_start: "16:30",
    time_end: "18:30",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
  // 3명 큐티 - 매일 (완료 체크 가능)
  {
    title: "큐티",
    teacher: "신재연 선생님",
    color: "#f59e0b",
    participants: [],
    type: "weekly",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    time_start: "",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: true,
  },
  // 예원 영어파닉스+수학+국어받아쓰기 - 매일 (완료 체크 가능)
  {
    title: "영어파닉스·수학연산·국어받아쓰기",
    teacher: "신재연 선생님",
    color: "#10b981",
    participants: ["예원"],
    type: "weekly",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    time_start: "",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: true,
  },
  // 지아 토익 - 월~금 18:30
  {
    title: "토익",
    teacher: "",
    color: "#8b5cf6",
    participants: ["지아"],
    type: "weekly",
    weekdays: [1, 2, 3, 4, 5],
    time_start: "18:30",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
  // 지아 보컬 레슨 - 화,목 16:00
  {
    title: "보컬 레슨",
    teacher: "",
    color: "#ec4899",
    participants: ["지아"],
    type: "weekly",
    weekdays: [2, 4],
    time_start: "16:00",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
  // 지아 건반레슨 단독 - 월,목 13:00
  {
    title: "건반레슨 (단독)",
    teacher: "",
    color: "#06b6d4",
    participants: ["지아"],
    type: "weekly",
    weekdays: [1, 4],
    time_start: "13:00",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
  // 지아+예원 컴퓨터 사무자동화 - 4/27~6/13 매일 14:00-17:00
  {
    title: "컴퓨터 사무자동화",
    teacher: "",
    color: "#f97316",
    participants: ["지아", "예원"],
    type: "range",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    time_start: "14:00",
    time_end: "17:00",
    date_start: "2025-04-27",
    date_end: "2025-06-13",
    is_completable: false,
  },
  // 3명 음악레슨 (조재용 원장님) - 주3회, 주로 11시 (변동적)
  {
    title: "음악레슨 (건반·기타)",
    teacher: "조재용 원장님",
    color: "#84cc16",
    participants: [],
    type: "weekly",
    weekdays: [1, 3, 5], // 월수금 (기본값, 변동 가능)
    time_start: "11:00",
    time_end: "",
    date_start: "",
    date_end: "",
    is_completable: false,
  },
];

export const DEFAULT_TEACHERS: Omit<LessonTeacher, "id">[] = [
  {
    name: "조재용 원장님",
    subject: "음악레슨 (건반 코드, 기타)",
    fee_per_session: 50000,
    fee_monthly: null,
    payment_day: null,
    notes: "3명 합산 회당 5만원",
  },
  {
    name: "신재연 선생님",
    subject: "큐티 (3명) · 영어파닉스·수학연산·국어받아쓰기 (예원)",
    fee_per_session: null,
    fee_monthly: 500000,
    payment_day: 10,
    notes: "매월 10일 지급",
  },
];

export const DEFAULT_SESSIONS: Omit<LessonSession, "id">[] = [
  {
    teacher_id: "__cho__",
    lesson_number: 1,
    date: "2025-04-08",
    time_start: "11:00",
    participants: ["주원", "지아", "예원"],
    notes: "",
  },
  {
    teacher_id: "__cho__",
    lesson_number: 2,
    date: "2025-04-09",
    time_start: "11:00",
    participants: ["주원", "지아", "예원"],
    notes: "예정",
  },
];

export const DEFAULT_PAYMENTS: Omit<LessonPayment, "id">[] = [
  {
    teacher_id: "__cho__",
    amount: 600000,
    paid_date: "2025-04-08",
    note: "선지급 (12회 해당)",
  },
];
