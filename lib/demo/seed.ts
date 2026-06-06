// Demo seed — pure client data (no DB). Each browser gets its own world via localStorage.
// Scarce integer economy: you start with 30 상점; small liquidity (b) makes every 1 상점 matter.
export const START_BALANCE = 30
const B = 15

// qYes that yields `price` when qNo = 0 (LMSR: price = sigmoid((qYes-qNo)/b))
function qFor(price: number, b = B) { return b * Math.log(price / (1 - price)) }

// a gentle sine walk ending exactly at the target price (so first-load charts aren't flat)
function seedHistory(target: number, n = 40): number[] {
  const a: number[] = []
  for (let i = 0; i < n; i++) a.push(Math.max(0.04, Math.min(0.96, target + Math.sin((i - n + 1) / 6) * 0.05)))
  a[n - 1] = target
  return a
}

export interface DemoMarket {
  id: string; slug: string; category: string; icon: string; question: string; rules: string
  b: number; qYes: number; qNo: number; volume: number; history: number[]
}

const M = (id: string, slug: string, category: string, icon: string, question: string, rules: string, target: number, volume: number): DemoMarket =>
  ({ id, slug, category, icon, question, rules, b: B, qYes: qFor(target), qNo: 0, volume, history: seedHistory(target) })

export const SEED_MARKETS: DemoMarket[] = [
  M('m1', 'food-tangsu', '급식', '🍱', '다음 주 급식에 탕수육 나온다?', '급식 식단표 공지 기준 정산. 부먹·찍먹 논쟁은 별도 상장 예정 🍖', 0.73, 92),
  M('m2', 'exam-info-perfect', '시험', '📝', '정보 수행평가 만점자 5명 이상?', '담당 교사 성적 공지 기준. 코딩 천재들의 자존심이 걸렸다.', 0.41, 71),
  M('m3', 'dorm-rollcall-10', '기숙사', '🏠', '오늘 기숙사 점호 10시 전에 끝난다?', '점호 종료 시각 기준. 사감쌤 컨디션은 통제 불가 변수.', 0.79, 54),
  M('m4', 'club-festival-band', '동아리', '🎸', '축제 대상은 밴드부가 받는다?', '축제 시상식 결과 기준. 밴드부 vs 댄스부, 운명의 라이벌전.', 0.64, 48),
  M('m5', 'event-sports-rain', '행사', '🌧️', '체육대회 당일 비 와서 연기된다?', '학교 공지 기준. 기상청도 모르는 걸 우리가 맞힌다.', 0.55, 63),
  M('m6', 'schedule-friday-short', '학사일정', '📅', '이번 주 금요일 단축수업 한다?', '학사일정 공지 기준. 전교생의 염원이 담긴 마켓.', 0.88, 32),
  M('m7', 'food-burger', '급식', '🍔', '이번 달 급식에 햄버거 2번 이상 나온다?', '식단표 기준. 햄버거 데이 = 급식실 대혼란의 날.', 0.34, 21),
  M('m8', 'exam-avg-up', '시험', '📈', '2학기 중간 평균, 1학기보다 오른다?', '성적 공지 기준. 이번엔 진짜 오른다고 다들 그랬다.', 0.58, 88),
]

export interface DemoUser { name: string; balance: number; color: string }
export const DEMO_USERS: DemoUser[] = [
  { name: '민준', balance: 98, color: '#0a8f4f' }, { name: '서연', balance: 71, color: '#0066cc' },
  { name: '도윤', balance: 53, color: '#e0334b' }, { name: '하은', balance: 47, color: '#8b7cf0' },
  { name: '지호', balance: 34, color: '#f59e0b' }, { name: '수아', balance: 25, color: '#14b8a6' },
  { name: '예준', balance: 19, color: '#ec4899' }, { name: '지유', balance: 13, color: '#64748b' },
]
