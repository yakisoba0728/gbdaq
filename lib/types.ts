// 도메인 공용 타입. DB 백엔드 제거(localStorage 데모) 후 남은 건 거래 방향뿐.
// 마켓/포지션/원장 형태는 lib/demo/seed.ts·lib/demo/store.tsx가 자체 정의한다.
export type Side = 'yes' | 'no'
