# 자기주도학습 앱 (Self-Learning App)

홈스쿨링 가정 3남매(주원·지아·예원)를 위한 학습 관리 웹앱.

## 기술 스택
- **Next.js 16** (App Router, "use client")
- **TypeScript + Tailwind CSS**
- **Supabase** (PostgreSQL) — 클라우드 DB
- **Vercel** — 배포
- **GitHub** — `gamer-217/self-learning-app`

## 배포 URL
- 메인: `https://self-learning-app-black.vercel.app`

## 환경 변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://fshlmnjjkfcneswxzvym.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_J_6Xk_rSvcV62zy5n6pNiQ_PNFZ2Z68
```

---

## 주요 파일 구조

```
app/
  page.tsx          # 프로필 선택 (주원·지아·예원)
  home/page.tsx     # 아이별 대시보드 (레벨·포인트·오늘 요약·목표)
  schedule/page.tsx # 스케줄 (일/주/월 뷰)
  lessons/page.tsx  # 레슨 관리
  rewards/page.tsx  # 보상·배지
  goals/page.tsx    # 목표 설정
  timer/page.tsx    # 공부 타이머
  parent/page.tsx   # 부모 대시보드 (/parent 직접 접속)
components/
  Navigation.tsx    # 하단 탭바 (홈·스케줄·레슨·보상)
lib/
  types.ts          # 모든 TypeScript 인터페이스
  db.ts             # Supabase DB 함수 모음
  supabase.ts       # Supabase 클라이언트
  constants.ts      # SUBJECTS, BADGES, 아바타/색상
  scheduleData.ts   # 기본 스케줄 시드 데이터
context/
  ProfileContext.tsx # 현재 프로필 전역 상태 (localStorage 저장)
```

---

## Supabase 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | 아이 프로필 (이름·아바타·색상) |
| `user_stats` | 레벨·포인트·공부시간·연속일 |
| `study_sessions` | 공부 세션 기록 |
| `goals` | 목표 |
| `unlocked_badges` | 획득 배지 |
| `schedule_items` | 고정 스케줄 (weekly/once/range) |
| `schedule_completions` | 스케줄 완료 체크 |
| `schedule_overrides` | 일정 추가/취소/시간변경 (특정 날짜) |
| `lesson_teachers` | 레슨 선생님 |
| `lesson_sessions` | 레슨 회차 기록 |
| `lesson_payments` | 납부 내역 |

---

## 스케줄 기능

- **일간 뷰**: 하루 일정 + 완료 체크
  - `+ 일정 추가` / `✕ 취소` / `✏️ 시간변경` (당일 오버라이드)
- **주간 뷰**: 요일별 행으로 모든 일정 표시 (클릭 → 일간 이동)
- **월간 뷰**: 날짜 그리드 + 색상 도트 (클릭 → 일간 이동)
- **＋ 새 일정**: 고정 일정 추가 (매주반복 / 캠프·기간 / 단1회)
- **아이 필터**: 전체·주원·지아·예원 탭
- **기본 스케줄 시드**: `DEFAULT_SCHEDULES` in `scheduleData.ts`
- **4월 특별일정 시드**: `APRIL_EVENTS` (캠프·ITQ·비전스쿨)

### ScheduleItem 타입
```typescript
type: "weekly" | "once" | "range"
weekdays: number[]  // 0=일, 1=월 ... 6=토 (JS getDay() 기준)
```

### 날짜 처리 주의
`toDateStr()`은 반드시 **로컬 날짜** 사용 (한국 UTC+9 환경에서 `toISOString()` 사용 시 자정에 하루 밀림):
```typescript
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

---

## 레슨 관리 기능

현재 등록된 선생님 (5명):
| 선생님 | 과목 | 결제 |
|--------|------|------|
| 조재용 원장님 | 음악레슨 (건반·기타) | 회당 5만원 |
| 신재연 선생님 | 큐티·영어파닉스·수학연산 (예원) | 월 50만원 (매월 10일) |
| 신혜원 선생님 | 보컬·퍼포먼스 (본스타학원) | 회당 5만원 |
| 정다운 선생님 | 피아노 레슨 | 회당 5만원 |
| 토익학원 | 토익 (지아, 매일) | 월 30만원 |

- 선생님 추가·수정·삭제 가능
- 회당 결제: 회차 기록 + 선지급/잔여 통계
- 월정액: 납부 내역 + D-day 표시
- 토익학원처럼 횟수 없는 경우 `fee_per_session=null`로 회차 섹션 숨김
- **🎵 지아 레슨** 버튼: 신혜원·정다운·토익학원 한꺼번에 시드

---

## 아이들 정보

- **주원** (정주원): 컴퓨터학원 (월화목금 17:30 / 수 16:30), ITQ 자격증 준비
- **지아**: 토익, 보컬·건반 레슨, 본스타학원
- **예원**: 영어파닉스·수학연산·국어받아쓰기

---

## 부모 대시보드

- URL: `/parent` (네비게이션 바에 없음, 직접 접속)
- 3명 전체 스탯 비교

---

## 시드 데이터 버튼 목록

앱 내에서 클릭해야 DB에 데이터가 들어감:
1. **스케줄 페이지** → `📥 기본 스케줄 불러오기` (처음 한번만)
2. **스케줄 페이지** → `🗓️ 4월 특별일정` (4/10~11 캠프·ITQ·비전스쿨)
3. **레슨 페이지** → `📥 기본` (조재용·신재연 선생님, 처음 한번만)
4. **레슨 페이지** → `🎵 지아 레슨` (신혜원·정다운·토익학원)
