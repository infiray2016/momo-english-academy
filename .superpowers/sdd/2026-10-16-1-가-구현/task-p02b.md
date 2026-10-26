# 브리프: P2b 음성 접점 · 관찰 페이지 · 실기 확인(implementer impl-p02a · Opus · high, 같은 워크트리 이어 하기)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`(approved 14:4x, 값 2 는 19:0x 고친 판)의 **P2b 몫**을 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. P2a 가 끝난 같은 워크트리(브랜치 `feature/1a-p02a-speech-core`)에서 P2a 코드는 그대로 두고 그 위에 쌓는다. 메인 저장소의 plan 파일을 읽는다(워크트리 사본은 옛 판): `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`.

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리. git 쓰기 금지. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. `pnpm spec:trace` 는 인자 없이. `pnpm e2e` 는 P1a 의 `playwright.config.ts`(WebKit 10.9형, 로컬 서버)로 돈다 — 브라우저는 이미 설치돼 있다.
- 이스케이프(`\uXXXX`)는 도구 층이 글자로 바꿀 수 있으니 쓴 뒤 바이트로 확인한다.

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p02 전부 — 특히 'P2b 음성 접점' 파일 표, '요청하는 공용 변경' 1~4, '파일별 값' 6~10, '뒤 하위 plan 이 쓰는 법', '작업 순서' P2b 1~6, '위험' 1~2 · 4 · 7~8 · 10~21, '정할 것' 가-2 · 나-3 · 나-4 · 나-5 · 다-1~다-5 와 '컨트롤러 결정' 문단(14:4x · 18:4x · 19:0x · 20:2x), '증명' 표의 P2b 행. 3. P2a 코드 — `src/core/speech/listen.ts`(`startListen` · `stepListen` · `EndRule` · `ListenOutcome` · `ListenInput` · `ListenEffect`, 상태 `windowStartAt` · `capMs`) · `script.ts`(대본 규격 · `DEFAULT_EXPOSE` · `DEFAULT_ON_STOP` · `DEFAULT_ON_ABORT`) · `device.ts` · `match-rate.ts` · `src/core/level-band.ts`, 그리고 `tests/unit/listen-end.test.ts` 의 흉내 함수(같은 ms 의 차례 이벤트 → 버튼 → 타이머). 4. 메인 저장소 `.superpowers/sdd/2026-10-16-1-가-구현/review-p02a.md` 6절 '범위 밖 관찰' 2~4 와 워크트리 `task-p02a-report.md` '요청하는 변경' 2. 5. 정본 `specs/07-음성과-오류.md` 7절(C53 반영) · `specs/08-테스트와-기술.md` 9절 음성 점검 행 · `specs/10-결정-기록.md` C53. 6. 기존 파일 `playwright.config.ts` · `tests/e2e/smoke.spec.ts` · `next.config.ts` · `.github/workflows/ci.yml` · `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`.

## 허용 파일
- P2b 표의 새 파일: `src/lib/speech/types.ts` · `src/lib/speech/browser.ts` · `src/lib/speech/fake-web-speech.ts` · `src/app/dev/speech-probe/page.preview.tsx` · `src/app/dev/speech-probe/speech-probe.tsx` · `tests/fixtures/speech/probe-text.json` · `tests/e2e/fixtures.ts` · `tests/e2e/speech-probe.spec.ts` · `docs/checklists/speech-check.md`. `tests/fixtures/speech/recorded/` 는 H2 뒤(지금 만들지 않는다).
- 더 허락하는 새 파일 하나: `tests/unit/fake-web-speech-defaults.test.ts` — 가짜 안에 다시 적은 기본값(expose · onStop · onAbort)이 `script.ts` 의 `DEFAULT_*` 와 같은지 보는 단위 시험(검토 의견. addInitScript 제약으로 가짜가 모듈 값을 가져올 수 없기 때문).
- 공용 변경(plan '요청하는 공용 변경', 컨트롤러가 구현자에게 허락 — 글자 그대로): 1 `next.config.ts`(pageExtensions 와 `VERCEL_ENV === "production"` 조건, 주석 포함) · 2 `.github/workflows/ci.yml`(e2e 작업: 다른 작업과 같은 준비 네 줄 + `pnpm exec playwright install --with-deps webkit` + `pnpm e2e`, `if: ${{ false }}` 빼기) · 3 `.dependency-cruiser.cjs`(규칙 `no-fake-speech-in-app`) + `tests/unit/dependency-rules.test.ts`(막는 예 · 허용 예 한 줄씩).
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02b-report.md` 와 관찰 페이지 화면 사진 `.superpowers/sdd/2026-10-16-1-가-구현/p02b-speech-probe.png`(e2e 가짜 대본으로 띄운 화면).
- 그 밖은 손대지 않는다: P2a 파일(`src/core/**` · `tests/unit/{match-rate,listen-end,speech-device}.test.ts` · `tests/fixtures/speech/{settings,homophones}.json` · `scripts/*.json`), `tests/e2e/smoke.spec.ts`(P3b 몫), `package.json` · 잠금 파일 · `vitest.config.mts` · `playwright.config.ts` · `.env.example`. 새 패키지 없음. 인식 형은 `types.ts` 에 자체 정의.

## 지킬 것(plan 값 6~10 그대로 + 컨트롤러가 더한 것)
- 접점은 P2a `listen.ts` 판정을 돌린다. 현재 시각은 `performance.now()`, 타이머는 `wakeAt` 하나. 듣기마다 · 다시 시작마다 새 인식 객체(WebKit 321436). 읽어 주는 동안에도 말하기 버튼을 받고 누르면 읽어 주기를 멈춘다(C53 (2)). speak 앞 듣기 cancel('speak'), listen 앞 speechSynthesis.cancel, `unlockFromGesture` 동기, `checkMicrophone` 은 getUserMedia 없이, 쪽 숨김 때 cancel('hidden').
- 검토 '범위 밖 관찰' 반영: (3) `ListenHandle.capAt` 은 속성 하나가 아니라 걸음마다 state(`windowStartAt + capMs`)에서 읽는 getter(감시 다시 시작으로 상한이 바뀔 수 있다). (4) 같은 ms 에 일이 겹치면 단위 흉내와 같은 차례(이벤트 → 버튼 → 타이머)로 `stepListen` 에 넣는다(기록 대본 다시 돌려 보기가 갈라지지 않게). (2) 상한 없는 두 문장 답에서 브라우저가 새 객체를 곧바로 끝내 시작 · 끝이 빠르게 되풀이되면 막지 않고 관찰 페이지의 '다시 시작 수'로 보인다(정본에 숫자가 없다. H2 A-6 뒤 컨트롤러가 정한다). 보고에 적는다.
- P2a 구현자 요청 2: 관찰 페이지 '대본으로 내보내기'는 듣기마다 start() 순서대로 실행(recognitions)을 적고 observed 도 같은 순서로 둔다(단위 `replayObserved` 가 그 순서를 전제한다). 내보낸 대본이 `parseSpeechScript` 를 통과해야 한다(증명 표 e2e).
- 가짜(값 8): 함수 하나 안에 모두, `import type` 만, 생성자 안 대입, setTimeout 은 부를 때마다 `window` 에서, `window.__fakeSpeech` 기록. e2e 는 `page.clock.install()` 을 goto 앞에, 시계 미는 값은 대본과 `tests/fixtures/speech/settings.json` 에서 읽는다.
- 관찰 페이지(값 9): 일곱 부분, 어른용 한국어, 아이 화면이 아니라 design-reviewer 없음, 소리 저장 · 전송 없음, 사람 이름 없음. 시험용 설정 · 글 · 동음이의어는 `tests/fixtures/speech/*.json` 에서(다-5). `probe-text.json` 문장 열은 4~8 낱말 A1(숫자 · 축약형 포함, 사람 이름 없음), 발표 글은 120~150 낱말에 [쉼] 셋.
- 운영 빌드 제외(공용 변경 1): `rm -rf .next && VERCEL_ENV=production pnpm build` 경로 목록에 `/dev/speech-probe` 없음, `rm -rf .next && pnpm build` 에는 있음 — 두 출력을 보고에.
- 시험 이름은 증명 표 P2b 행 글자 그대로("AC-5e 관찰 페이지: 첫 쉼에서 끝나는 가짜 인식에서 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다" 와 '관찰 페이지: …' 다섯). 새 시험에 AC 접두를 더 붙이지 않는다(AC-N3 는 점검표 몫, 다-8).
- 숫자는 fixture 에서. 기술 값(타이머 여유 등)은 파일 위 이름 붙인 상수. 비밀값 없음. `src/lib` 는 `src/server` · db 를 가져오지 않는다(`pnpm check:deps`).
- 점검표(값 10)는 (가) · (나) 행 전부, 결과 칸은 비운다. H1 · H2 는 요청자 몫이라 하지 않는다.
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm e2e` · `pnpm check:deps` · `pnpm check:bundle`(build 뒤) · `pnpm spec:trace`(인자 없이) · 운영 · 프리뷰 빌드 경로 목록 둘. 보고 `task-p02b-report.md`: 바뀐 파일:줄(공용 변경 따로 절), 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부(e2e 포함), 명령과 출력(통과 수 · e2e 수 · 빌드 경로 목록), 화면 사진 경로, P10 · P11 · 1-나가 쓸 접점 이름(`createBrowserSpeech` · `SpeechPort` · `ListenHandle`), 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝내기 관문은 기록만 남기므로(C59) 명령 출력을 꼭 보고에 적는다.
