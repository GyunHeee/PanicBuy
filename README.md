# PanicBuy

S&P500 기반 시장 신호 알림, 점수 기록, 백테스트 대시보드입니다.

## Local Setup

```bash
npm install
npm run dev
```

`.env.local.example`을 참고해 `.env.local`을 준비합니다.

## Vercel KV

일일 점수 기록과 유사 과거 날짜 조회는 Vercel KV를 사용합니다.

로컬에서 KV 기능까지 테스트하려면 Vercel 프로젝트에 KV를 연결한 뒤 환경변수를 받아와야 합니다.

```bash
vercel env pull .env.local
```

KV 환경변수가 없으면 로컬 개발 서버는 종료되지 않고, 점수 추이와 비슷한 과거 날짜 영역은 기록이 부족하다는 안내를 보여줍니다.
