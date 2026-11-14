# 브라우저 점검(로컬 관문)

실제 화면 조각을 esbuild 로 묶어 Playwright 의 WebKit · Chromium 에서 장면을 돌린다. 서버 · DB · 실제 AI 는 부르지 않는다(대역 조각과 쪽 안의 가짜 흐름만). 화면 동작을 고쳤다고 말하기 전에 돌린다.

- 쓰는 법: `pnpm check:browser [장면 …] [--browser webkit|chromium] [--swap 조각=파일 …] [--keep]`. 장면을 주지 않으면 전부, 장면 이름은 앞부분만 줘도 된다(`talk-log` → `talk-log-*`). 판정마다 한 줄, 장면 × 브라우저마다 `통과 · …` / `실패 · …` 한 줄, 하나라도 실패하면 1(인자 · 묶기 오류는 2)로 끝난다. 전부 돌리면 두 브라우저에서 30분 안팎 걸린다(누름 63회 · 돌림 48회가 대부분).
- 장면 하나만: `pnpm check:browser talk-log-keys --browser webkit`. 빠른 묶음 `pnpm check:browser talk-log-follow talk-log-keys talk-log-wheel talk-log-drag` 은 두 브라우저에서 2분 반쯤이고, 고치는 동안 자주 돌린다. 전부(30분쯤)는 누름 63회 · 돌림 48회 · 고친 e2e 순서 20회 · 손 입력의 누름 21회 같은 통계 장면을 더하므로 '고쳤다'고 말하기 전과 커밋 전에 돌린다.
- 시간에 기대는 장면(누름 · 손 입력 · 돌림 · 붙잡음)은 vitest · tsc · build 같은 무거운 명령과 겹치면 흔들리거나 회귀를 놓칠 수 있다. 홀로 돌리고, 실행기가 처음과 끝에 찍는 기기 부하 평균으로 겹침을 가늠한다.
- 실패로 세는 것: 판정 실패 · 판정이 하나도 없음 · 장면이 던짐 · 장면 시간 상한(15분) 넘김 · 쪽 오류(pageerror) · 키 · 휠 장면에서 입력이 칸을 넘기지 못함(판정 불가). 장면이 던져도 띄운 브라우저는 실행기가 닫고 다음 장면으로 가며, 결과를 다 찍은 뒤 끝 값으로 스스로 끝난다.
- 바꿔 끼우기를 여럿: `--swap` 을 되풀이한다(`--swap src/a.tsx=/tmp/old/a.tsx --swap src/core/b.ts=/tmp/old/b.ts`). 바꾸는 조각은 하나씩이라, 옛 판이 기대는 다른 조각도 그 사이에 바뀌었으면 그것도 같은 커밋의 판으로 함께 끼운다.
- 이 점검은 e2e(`pnpm e2e`, CI)를 대신하지 않는다. 손으로 쓴 CSS 와 대역 조각 위의 실제 조각 하나를 보는 것이라, 실제 쪽의 배치 · 서버 흐름 · 사진은 e2e 가 본다.
- 옛 판으로 돌리기: `git show <커밋>:src/components/conversation/talk-log.tsx > /tmp/old/talk-log.tsx` 뒤 `pnpm check:browser talk-log-follow --swap src/components/conversation/talk-log.tsx=/tmp/old/talk-log.tsx`. 작업 트리의 `src/` 는 바뀌지 않는다. 옛 판의 상대 경로 import 는 원래 자리 기준으로 풀리고, 바꿀 조각을 묶음에서 만나지 못하면 멈춘다. 고치기 전에 실패하는 장면이 있는지 먼저 보는 데 쓴다.

- 수업 화면의 배치(`talk-lesson` 쪽, S5 fix 7): 앱의 실제 스타일(`src/app/globals.css` 를 저장소의 `@tailwindcss/node` 로 묶음)과 실제 조각으로 그리고, 수업 틀의 판 짜임 · 효과는 `pages/talk-lesson/frame-classes.mjs` 에 옮겨 둔다(장면이 `talk-frame.tsx` 의 글과 같은지 먼저 본다). 글꼴은 마지막 빌드(`.next/static`)에 있으면 쓰고, 없으면 대체 글꼴이라고 알린다. 고치기 전 틀로 돌리기: `BROWSER_CHECK_LEGACY=1 pnpm check:browser talk-lesson-fit --swap src/components/conversation/talk-log.tsx=<옛 판>`.

## 짜임

- `build.mjs`: 쪽 목록(`PAGES`)과 묶기. 쪽마다 진입 조각 `pages/<쪽>/entry.tsx` · 손으로 쓴 `pages/<쪽>/index.html`(실제 클래스의 꼴을 CSS 로 옮김) · 대역 조각 표('@/…' 경로 → `stubs/` 의 파일). 나머지 `@/…` 는 `src/` 에서 그대로 가져온다. 묶은 결과는 `.out/`(저장소에 올라가지 않음, 끝나면 지움 · `--keep` 이면 남김).
- `run.mjs`: 인자 · 묶기 · 실행 · 판정 줄 · 끝 값.
- `scenes/<쪽>-<이름>.mjs`: `export const page = "<쪽>"` 과 `export async function run({ browserType, browserName, url, check, log })`. `url("쿼리")` 는 묶은 쪽의 주소, `check(이름, 통과?, 자세히)` 가 판정 한 건, `log(글)` 은 참고 줄이다. 판정이 하나도 없으면 실패로 센다.

## 장면 · 대역을 더하는 법

1. 같은 쪽이면 `scenes/` 에 파일 하나를 더한다. 쪽의 잼 · 열기 도우미는 `pages/<쪽>/measure.mjs` 에 둔다.
2. 새 쪽이면 `pages/<쪽>/entry.tsx` · `index.html` 을 만들고 `build.mjs` 의 `PAGES` 에 한 줄을 더한다. 조각이 기대는 무거운 조각(서버 액션 · 판 · 말풍선 등)은 `stubs/` 에 같은 이름을 내보내는 작은 대역을 두고 표에 적는다. 대역은 화면 동작에 닿는 꼴(크기 · 클래스)만 흉내 낸다.
3. 횟수 · 판정 기준은 장면을 만든 고침의 기록과 같게 두고, 떨리는 장면은 기준을 느슨하게 하지 말고 원인을 적는다.
