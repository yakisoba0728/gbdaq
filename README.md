<div align="center">

# 🪙 GBDAQ · 지비닥

### 경북소프트웨어마이스터고 교내 라이브 예측시장

“다음 주 급식에 탕수육 나온다?” 같은 **교내 사건**에 `예 / 아니오`로 베팅하고,<br/>
가격(= 확률)이 **실시간으로 살아 움직이는** 폴리마켓 스타일 예측시장 데모입니다.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square&logo=framer&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=flat-square&logo=vercel&logoColor=white)

**[▶ 라이브 데모 — gbdaq.vercel.app](https://gbdaq.vercel.app)**

<br/>

<img src="docs/screenshots/home.png" width="860" alt="GBDAQ 홈 화면 — 티커 · 히어로 마켓 · 라이브 차트" />

</div>

---

## ✨ 주요 기능

- 🎯 **실시간 예측시장** — 8개 교내 마켓, 4초마다 시세가 움직이는 라이브 가격 + 차트 + 티커
- 📈 **LMSR 가격 책정** — 로그 시장 점수 규칙으로 매수·매도 시 확률·비용·수령액을 정확히 계산
- 🤖 **AI 애널리스트** — 시세 기반 휴리스틱이 ‘예/아니오’ 전망·신뢰도·근거를 제시
- 💰 **희소 정수 경제** — 30 상점으로 시작, 1 상점 단위 거래라 한 푼이 아쉬운 긴장감
- 🏆 **랭킹 · 내 지갑** — 리더보드, 보유 포지션 평가액, 거래 내역
- 🌗 **라이트 / 다크 테마** — 애플풍 디자인 시스템 + 부드러운 framer-motion 모션
- 🔌 **백엔드 0** — 100% 클라이언트, `localStorage`만으로 동작 (오프라인·즉시 실행, 기기별 독립)

## 🖼️ 미리보기

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/home-dark.png" alt="다크 모드 홈" /><br/>
      <sub><b>🌙 다크 모드</b> — 라이트/다크 토글, 티커의 ▲▼ 실시간 플래시</sub>
    </td>
    <td width="50%">
      <img src="docs/screenshots/markets.png" alt="모든 마켓 그리드" /><br/>
      <sub><b>📊 모든 마켓</b> — 카드 그리드 + 교내 속보 · 인기 마켓 · AI 오늘의 픽</sub>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <img src="docs/screenshots/detail.png" alt="마켓 상세 페이지" /><br/>
      <sub><b>🔍 마켓 상세</b> — 라이브 확률 차트 · LMSR 거래 패널 · 지비닥 AI 애널리스트</sub>
    </td>
  </tr>
</table>

## ⚙️ 작동 방식

### 📈 LMSR — 가격이 곧 확률

각 마켓은 **LMSR**(Logarithmic Market Scoring Rule)로 가격을 매깁니다. `예` 가격은 0~1 사이의
값이고, 이는 곧 시장이 매긴 **확률**입니다. 매수하면 그 방향 가격이 오르고 반대쪽은 내려가며,
두 가격의 합은 항상 1입니다. 확률·매수 지분·매도 수령액은 모두 [`lib/lmsr.ts`](lib/lmsr.ts)의
순수 함수로 계산되며 단위 테스트로 검증됩니다.

### ⏱️ 클라이언트 가격 엔진

서버·DB 없이 [`lib/demo/store.tsx`](lib/demo/store.tsx)의 `DemoProvider`가 **4초마다** 각 마켓을
random-walk(0.03~0.97 클램프)시켜 새 가격을 history에 push합니다. 차트·티커·카드는 스토어를
읽기만 하면 자동으로 살아 움직입니다. 모든 상태(잔액·포지션·원장·시세)는 `localStorage`에
영속되고, 내비게이션의 **리셋** 버튼으로 초기 시드 상태로 되돌릴 수 있습니다.

### 🤖 AI 애널리스트 (시뮬레이션)

“지비닥 AI 애널리스트”는 실제 LLM/API 호출이 **아닙니다**. [`lib/ai/fakeAnalyst.ts`](lib/ai/fakeAnalyst.ts)의
결정적 휴리스틱이 현재가·모멘텀·변동성·거래량으로부터 전망·신뢰도·한국어 근거를 만들어내는
연출입니다. 같은 입력엔 항상 같은 결과를 돌려주며, 분석 중… 연출 뒤 결과를 공개해 “살아 있는” 느낌을 줍니다.

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | **Next.js 16** (App Router · Turbopack) · **React 19** |
| 언어 | **TypeScript 5** |
| 스타일 | **Tailwind CSS v4** · 애플풍 디자인 토큰 (`app/globals.css`) |
| 애니메이션 | **Framer Motion 12** |
| 테스트 | **Vitest 4** (LMSR · AI 애널리스트) |
| 배포 | **Vercel** (`icn1` · 서울 리전) |

## 🚀 시작하기

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 → http://localhost:3000
```

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npm test` | 단위 테스트 (Vitest) |

## 📁 프로젝트 구조

```
app/
  layout.tsx           # 루트 레이아웃 — 테마/스토어/토스트/내비 Provider
  page.tsx             # 홈 — 티커 + 카테고리 탭 + 히어로 + 마켓 그리드
  market/[slug]/       # 마켓 상세 — 차트 · 거래 · AI · 규칙
  leaderboard/         # 랭킹
  portfolio/           # 내 지갑 — 보유 포지션 + 거래 내역
lib/
  demo/store.tsx       # localStorage 스토어 + 클라 가격 엔진 (useDemo 훅)
  demo/seed.ts         # 마켓 8개 · 데모 유저 · 시작 잔액(30 상점)
  lmsr.ts              # LMSR 순수 함수 (+ 단위 테스트)
  ai/fakeAnalyst.ts    # 휴리스틱 AI 애널리스트 (+ 단위 테스트)
  format.ts            # 표시 포맷 (상점 · 퍼센트)
components/
  market/              # 카드 · 히어로 · 라이브 차트 · 거래 패널 · 우측 레일
  ai/                  # AI 분석 패널
  ui/ · theme/         # 토스트 · 애니메이션 퍼센트 · 테마 토글
```

## 📝 참고

- 교내 해커톤용 **데모**입니다. 정산(resolution) 없이 상시 시세차익만 다룹니다.
- **AI 애널리스트는 실제 모델이 아니라** 시세 기반 결정적 휴리스틱입니다.
- 상태는 **기기별 `localStorage`** 에만 저장되어 사용자 간 공유되지 않습니다.

<div align="center"><sub>Made for 경북소프트웨어마이스터고 · GBDAQ</sub></div>
