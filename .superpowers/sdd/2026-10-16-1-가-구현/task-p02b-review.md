# 검토 브리프: P2b 음성 접점 · 관찰 페이지 · 점검표(code-reviewer rev-p02a 이어 보기 · Opus · xhigh, 읽기 전용)

impl-p02a 가 P2a 위에 같은 워크트리에서 끝낸 P2b(접점 · 브라우저 구현 · 가짜 · 관찰 페이지 · e2e · 점검표 · 공용 변경 셋)를 설계 준수와 품질로 판정한다. P2a 는 재검토 Approved 와 fix 2 로 닫혔다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 구현자(에이전트)는 마이크로 말할 수 없어 실제 인식 · 읽어 주기는 H2 만이 증거다(plan 위험 21) — 이 검토는 코드 · 가짜 · e2e 로 볼 수 있는 것만 판정한다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p02b.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(브랜치 `feature/1a-p02a-speech-core`). 새 파일: `src/lib/speech/types.ts`(134) · `browser.ts`(544) · `fake-web-speech.ts`(334) · `src/app/dev/speech-probe/page.preview.tsx` · `speech-probe.tsx`(1008) · `tests/fixtures/speech/probe-text.json` · `tests/e2e/fixtures.ts` · `tests/e2e/speech-probe.spec.ts` · `tests/unit/fake-web-speech-defaults.test.ts` · `docs/checklists/speech-check.md`. 고친 공용 파일: `next.config.ts` · `.github/workflows/ci.yml` · `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(`git -C <워크트리> diff`). 화면 사진 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/p02b-speech-probe.png`.
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p02b-report.md`('지킬 것 대조', '설계와 다르게 한 것' 1~4, 'TDD 차례' 참고, 우려 셋).
- 명령은 읽기와 시험 실행만: `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` · `pnpm e2e`(WebKit, 약 7초). 컨트롤러 재확인(21:0x): lint 0 · 단위 93 · check:deps 0 · spec-trace missing-test 64 · `VERCEL_ENV=production pnpm build` 경로에 `/dev/speech-probe` 없음 · 일반 빌드에는 있음 · check:bundle 0 · e2e 7 통과.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`: 'P2b 음성 접점' 파일 표, '요청하는 공용 변경' 1~4, '파일별 값' 6(types) · 7(browser) · 8(fake) · 9(관찰 페이지 일곱 부분) · 10(점검표), '뒤 하위 plan 이 쓰는 법', '작업 순서' P2b 1~6, '위험' 1 · 2 · 4 · 7 · 8 · 10~21, '정할 것' 가-2 · 나-3 · 나-4 · 나-5 · 다-1~다-5 와 '컨트롤러 결정' 문단(14:4x · 18:4x · 19:0x · 20:2x), '증명' 표 P2b 행(e2e 여섯 · 운영 빌드 제외 · AC-N3 점검표).
2. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02b.md` — 특히 '지킬 것'의 컨트롤러 추가 넷(capAt getter · 같은 ms 차례 이벤트 → 버튼 → 타이머 · 빠른 되풀이는 막지 않고 보임 · observed 는 start() 순서)과 허용 파일.
3. `review-p02a.md` 6절 '범위 밖 관찰' 2~4, 워크트리 `task-p02a-report.md` '요청하는 변경' 2(observed 순서), P2a 코드(`listen.ts` 의 `startListen` · `stepListen` · `ListenInput` · `ListenEffect`, `script.ts` 의 대본 규격 · `DEFAULT_*`, 시험 흉내 `tests/unit/listen-end.test.ts`).
4. 정본 `specs/07-음성과-오류.md` 7절(인식 · 읽어 주기 · 오류 · 브라우저 표, C53), `specs/08-테스트와-기술.md` 9절 음성 점검 행 · AC-N3, `specs/10-결정-기록.md` C53, `specs/11-요구사항과-수용-기준.md` AC-5e · AC-N3. 아이 화면 원칙은 해당 없음(관찰 페이지는 어른용).

## 판정할 것
1. 접점(값 6 · 7). `SpeechPort` · `ListenHandle` 꼴이 값 6 과 같은지(capAt 은 getter — 컨트롤러 추가 3). `browser.ts` 가 값 7 의 규칙을 다 지키는지: 듣기마다 · 다시 시작마다 새 인식 객체, lang · continuous · interimResults · maxAlternatives, 결과 글 이어 붙이기, `listen.ts` 판정 + `wakeAt` 타이머 하나(+ 같은 ms 묶음 타이머 — 다르게 한 것 1: `setTimeout(0)` 묶음이 실기기에서 몇 ms 늦추는 것이 7절 동작을 바꾸는지, Playwright 시계에서 단위 흉내와 같은 차례가 되는 근거), 겹침 처리(listen 앞 읽어 주기 cancel · speak 앞 듣기 cancel('speak') · `speechSynthesis.cancel()`), `speak` 를 await 없이 같은 차례에서, 음성 고르기(나-3, `pickVoice`), `unlockFromGesture` 동기 빈칸 발화, `checkMicrophone`(getUserMedia 없음 · audiostart 또는 첫 결과 성공 · 오류 실패 · timeout, 다르게 한 것 4 `ended-without-audio`), visibilitychange(나-4), onTrace · recognitionCtor, 앱이 abort 한 객체 · 옛 번호 이벤트 버리기, `import "client-only"`(설치되지 않은 꾸러미 — Next 가 안에서 처리하는지 설치판 원본으로 확인, 단위 시험 · tsx 에서 browser.ts 를 가져오는 곳이 없는지).
2. 가짜(값 8). addInitScript 제약(함수 하나 안, `import type` 만, 생성자 안 대입, 밖 이름 없음) · expose · events 예약 · stop/abort · startThrows · onX 와 addEventListener · result 이벤트 꼴 · 합성 가짜(getVoices · utterances 차례 · cancel 의 interrupted/canceled — 우려 1 추측) · setTimeout 매번 읽기 · `__fakeSpeech`(created · calls · spoken · defaults — 다르게 한 것 3). 가짜 기본값 = `script.ts` `DEFAULT_*` 를 보는 단위 시험이 실제로 비교하는지.
3. 관찰 페이지(값 9). 일곱 부분이 다 있는지, 어른용 한국어 · 사람 이름 없음 · 소리 저장 · 전송 없음(`src/` 에 getUserMedia · MediaRecorder · fetch 전송 0), 시험용 설정 · 글 · 동음이의어를 fixture 에서(다-5), '같은 객체 되풀이' · '이벤트 무시' 생성자 감싸기, 교대 시험이 둘째 턴부터 누름 없이 읽는지, 긴 말 시험(조각 · 틈 · 이어 붙인 글 · 일치율 · 인식 객체 수 · 다시 시작 수 — 컨트롤러 추가 2), 기록 표와 '대본으로 내보내기'(규격 + device + observed, 끝까지 들은 듣기만 start() 순서 — 컨트롤러 추가 4 · 구현자 요청 2, 마이크 확인 객체 제외의 타당성), `page.preview.tsx` 가 서버 구성 요소이고 robots noindex, 운영 빌드 제외(공용 변경 1, 기본 확장자 넷 함께). `probe-text.json`: 문장 열 4~8 낱말 A1 · 숫자 · 축약형 · 사람 이름 없음, 발표 글 120~150 낱말 · [쉼] 셋.
4. e2e(증명 표). 여섯 이름이 글자 그대로인지, `page.clock.install()` 이 goto 앞인지, 미는 값이 대본 · 시험용 설정에서 오는지, 각 시험이 이름대로 단언하는지(새 객체 수 · 둘째 턴 자동 읽기 · 감시 다시 시작 뒤 멈춤 · no-api · not-allowed 갈래 · 내보낸 대본의 `parseSpeechScript` 통과), `tests/e2e/fixtures.ts` 의 `test`(speechScript 옵션 fixture, P3b 가 쿠키를 더할 자리), 기존 smoke 가 그대로인지, 'TDD 차례를 지키지 않았다'는 고백 — 시험이 코드에 맞춰 느슨해진 곳이 있는지(특히 고친 교대 시험 기대).
5. 공용 변경 셋(+ 시험)이 plan · 브리프 글자대로인지: `next.config.ts`(조건 · 기본 넷 · 주석), ci.yml e2e 작업(준비 네 줄 · playwright install --with-deps webkit · pnpm e2e), `no-fake-speech-in-app` 규칙과 시험 둘.
6. 점검표(값 10): (가) I-1~I-12 · A-1~A-6 · E-1~E-5 · F-1, (나) N-1~N-5, 머리(목적 · 주소 자리 · 하는 사람 · 기기 표), 결과 칸 비움, 판정 칸(가-5 기준).
7. 구현자 '다르게 한 것' 1~4 와 우려 셋(가짜 합성 cancel · 기본값은 추측, `client-only`, e2e WebKit 만) 판정. 허용 파일 밖 변화 0, P2a 파일 변화 0(`git status` 와 보고 대조), 비밀값 없음, 설계 숫자 박힘 없음(기술 값은 상수).

## 보고 꼴(`review-p02b.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도 · 파일:줄 · 근거(정본 절 · plan 줄 · 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 값 6~10 의 항목마다 '맞음 · 어긋남(무엇)'. 표 하나: '다르게 한 것' 1~4 · 우려 셋 · 컨트롤러 추가 넷 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표 P2b 행마다 '시험 있음(이름) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
