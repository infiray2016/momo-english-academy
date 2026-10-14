# momo-english-academy

모모 잉글리시 아카데미 — 초등 4학년부터 중학교 수준까지 집에서 혼자 배우는 영어 학습 웹 앱. 읽기 · 쓰기 · 말하기 세 영역, 영역마다 12단계, 단계마다 단원 5개. 정본은 `specs/README.md` 의 표. 왜 만드는지는 `intent/`, 구현 계획은 `plans/`.

## Commands
- 앱 코드는 1차 구현에서 생긴다. 뼈대가 생기면: `pnpm dev` · `pnpm lint`(Biome) · `pnpm test`(Vitest) · `pnpm e2e`(Playwright) · `pnpm build`
- 목업 캔버스: https://claude.ai/artifact/BaG1A1Ewst9AzMLKHD4Zp2 · 소개 영상 재생성: `docs/media/build-intro-demo-video.py`(스크래치패드 venv 의 Playwright · imageio-ffmpeg 필요, 15분)

## Conventions
- Next.js 16(App Router) · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui · Supabase Postgres + Drizzle · Anthropic 공식 SDK(`claude-opus-5-5`, structured outputs + Zod) · Web Speech API. 린트 · 포맷은 Biome 하나
- 용어는 영역(읽기 · 쓰기 · 말하기) · 단계(1~12) · 단원(단계 안 5개). 문서와 화면에서 "트랙" · "유닛"을 쓰지 않는다(요청자 지시 2026-10-15). 코드 식별자는 영어(track · unit 허용)
- 아이 화면 문구는 한국어 해요체, 한 화면에 행동 하나, 큰 글자. 디자인은 포스트잇 보드(코르크 바탕 · 종이 띠 · 포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기, 글꼴 Jua · Gowun Dodum · Fredoka)
- 피드백 규칙: 쓰기 1~3단계는 AI 없이 정답 비교, 4~5단계는 고칠 곳 최대 1개, 6단계부터 교정 최대 2개 + 모범 답안. 읽기 문제 · 따라 말하기 일치율도 AI 없이 앱이 채점
- AI 호출은 서버 액션에서만, 키는 서버에만, 응답은 Zod 스키마로 검증. 수업은 단원 단위로 Batch API 로 미리 생성하고 저장 전에 검증한다
- 숫자(단원당 최소 수업 6, 통과 80%, 하루 호출 상한 60 …)는 `settings` 설정값 — 코드에 고정하지 않는다
- 서브에이전트는 역할과 무관하게 최신 Opus · 추론 xhigh(`.claude/agents/` 정의를 `subagent_type` 으로, `Agent` 호출에 `model: "opus"` 명시). 동시에 2~3개까지. 구현자와 검토자는 분리한다. 커밋은 요청자가 지시할 때

## Architecture
- 정본은 `specs/2026-10-15-모모-잉글리시-아카데미-spec.md`. 13절 결정 기록이 승인 기록이다 — 설계를 바꾸려면 결정 기록에 한 줄을 먼저 더한다. 참고 조사는 `docs/research/`
- 구현 차수: 1차 프로필 1개 · 홈 · 세 영역 세션 · 결과 · 단원 수업 생성과 검증 → 2차 복습 · 숙달 승급 · 단계 평가 · 배치 평가 · 부모 화면 → 3차 프로필 2~3개 · PWA · 연습지 PDF
- DB 의존 없는 순수 함수로 분리: 단원 통과 · 단계 승급 판정, 간격 반복 스케줄, 생성 결과 검증기, 따라 말하기 일치율

## Things Claude gets wrong
- 초등 4학년에게 문장을 만들게 하지 않는다 — 쓰기 1~3단계는 고르기 · 베끼기 · 조립이다(2026-10-15 에 두 번 지적받고 사다리를 내렸다)
- 횟수로 승급하지 않는다. 어휘 숙달 80% + 최근 5회 80% 가 기준이고, 횟수는 최소 6회라는 바닥일 뿐이다
- 설계 숫자를 화면 · 코드에 그대로 박지 않는다(설정값)
- 정지 화면에 줌(zoompan)을 걸면 영상이 떨린다 — 프레임을 한 장씩 렌더링한다
- 세션을 저장소 밖(`~/workspace`)에서 열면 `.claude/agents/` 가 로드되지 않는다 — `cd ~/workspace/momo-english-academy` 에서 시작한다
