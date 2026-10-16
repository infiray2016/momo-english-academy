# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P2 음성 접점과 실기 확인

spec: `specs/` 정본(7절 음성 처리 전부 · 8절 '마이크를 쓸 수 없음' 행 · 6.2 일치율 · 9절 음성 점검 · 11절 1-가 첫 작업 · 12절 speech.* · 15절 AC-5a · AC-5e · AC-N3, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P2 행 · 조사 `docs/research/2026-10-16-reverse-engineering.md`(역분석 제안 4) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved(컨트롤러 2026-10-16 14:4x)
승인: 컨트롤러, 2026-10-16 14:4x(요청자는 PR 병합 때 본다, H14. 결정은 '정할 것' 끝 문단과 13절 C53) · 브랜치 · 워크트리: P2a `feature/1a-p02a-speech-core`(08cce00 에서) → P2b `feature/1a-p02b-speech-probe`(P2a 끝에서), 워크트리 하나씩(컨트롤러가 만든다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P2 는 파일 열 개 · 단계 여덟을 넘어 PR 둘로 나눈다(묶음 plan 위험 12). P2a 는 순수 함수 넷(일치율 · 한 번 듣기 판정 · 기기 판정 · 대본 규격)과 단위 시험이다. P2b 는 브라우저 구현 · 가짜 · 관찰 페이지 · e2e · 점검표 · H1 · H2 이고, P2a 가 끝난 브랜치 끝에서 시작한다. 컨트롤러 지시로 plan 파일은 하나로 두었다. 원하면 두 파일로 가르고 머리에서 서로를 가리킨다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)' 이다. 외부 사실은 2026-10-16 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 목표 (Goal)

11절은 1-가 첫 작업을 iPad Safari 실기 확인으로 둔다(회화 읽어 주기 → 인식 교대 10턴, Siri · 받아쓰기를 끈 상태, 마이크 거부 뒤 다시 허용, 7절). P2 는 그 확인을 할 관찰 페이지와, 말하기 · 배치 평가(P10 · P11)와 회화(1-나)가 함께 쓸 음성 접점을 만든다.
인식과 읽어 주기는 브라우저 Web Speech API 를 각각 인터페이스 하나 뒤에 둔다(7절 첫 문단, 10절 '교체 가능'). 녹음하지 않는다. 인식 · 읽어 주기 언어는 speech.lang(en-US)이다.
듣기 끝은 7절 표대로다. 한 문장 답은 마지막 중간 결과 뒤 speech.end_silence_seconds.<구간>(3 · 1.5 · 1.5 · 1.5) 조용하면 앱이 stop 을 부른다. 두 문장 이상 답은 말하기 버튼('다 말했어요')이나 활동 시간 상한으로 끝낸다. 한 번에 speech.max_listen_seconds(15)까지 듣고, 발표처럼 긴 말은 그만큼마다 끊어 듣고 이어 붙인다. 브라우저가 스스로 인식을 끝내면(Chrome Android 는 continuous 를 무시) 바로 다시 시작해 이어 붙인다. 감시 타이머는 speech.max_listen_seconds + speech.watchdog_extra_seconds(3) 동안 결과 · 오류 · 끝이 없으면 한 번 다시 시작하고, 또 멈추면 '멈춤'으로 끝낸다.
일치율은 6.2 대로 목표 문장 단어 가운데 순서를 지켜 맞은 수를 목표 단어 수로 나눈 값이다. 소문자 · 문장 부호 지움 · 숫자를 영어 낱말로 · 축약형 펼침 · 시드 동음이의어 묶음을 거친다. 덧붙인 말은 감점하지 않고, {NAME} 자리는 무엇이 와도 맞으며, 허용 답이 여럿이면 가장 높은 값이다(AC-5a).
관찰 페이지 `/dev/speech-probe` 는 프리뷰 보호(Vercel Authentication)로만 가리고 운영 빌드에서 뺀다. 이벤트와 시각을 화면에 남기고 대본(JSON)으로 내보낸다. 그 기록이 Playwright 가짜 음성의 대본이 된다(역분석 제안 4).
끝나면 H2 결과표 `docs/checklists/speech-check.md` 가 남는다. 실패면 서버형 음성 인식을 붙일지 요청자가 정하고(S7) 13절에 한 줄이 있다.

## 바뀌는 파일 (Files that change)

### P2a 음성 판정 함수(파일 열, 모두 새 파일)

| 파일 | 무엇을 |
|---|---|
| `src/core/speech/match-rate.ts` | 6.2 일치율. 정규화 · 맞은 수 · 여러 허용 답(아래 '파일별 값' 1) |
| `src/core/speech/listen.ts` | 음성 설정 읽기 꼴 · 듣기 끝 규칙 고르기 · 한 번 듣기 판정 · 오류 갈래(값 2). 단계 → 구간은 아래 `level-band.ts` 를 가져온다 |
| `src/core/level-band.ts` | 단계 1~12 → 구간(1-3 · 4-6 · 7-9 · 10-12) `Band` · `bandOf`. 공용 자리 — P3 · P4 도 가져다 쓴다(컨트롤러 결정, 정할 것 다-6) |
| `src/core/speech/device.ts` | 기기 판정(7절 브라우저 표)과 알림에 적을 브라우저 이름(값 3) |
| `src/core/speech/script.ts` | 대본 규격(Zod)과 형. 가짜 · 관찰 페이지 · 단위 시험이 같이 쓴다(값 4) |
| `tests/unit/match-rate.test.ts` | AC-5a 와 정규화 규칙 |
| `tests/unit/listen-end.test.ts` | AC-5e 말하기 몫, 감시 타이머, 오류 갈래, 시험용 설정 = 12절, 기록 대본 다시 돌려 보기 |
| `tests/unit/speech-device.test.ts` | 기기 판정. UA 표본은 시험 안에 글로 둔다 |
| `tests/fixtures/speech/settings.json` | 시험용 음성 설정(12절 키 이름 그대로, 기본값) |
| `tests/fixtures/speech/homophones.json` | 시험용 동음이의어 묶음 |
| `tests/fixtures/speech/scripts/*.json` | 손으로 쓴 대본 열쯤(값 5 표). 한 묶음으로 센다 |

### P2b 음성 접점 · 관찰 페이지 · 실기 확인(파일 열, 모두 새 파일)

| 파일 | 무엇을 |
|---|---|
| `src/lib/speech/types.ts` | 접점 인터페이스 `SpeechPort`(제안) · 결과 꼴 · Web Speech 최소 형(값 6) |
| `src/lib/speech/browser.ts` | 브라우저 구현. 듣기마다 새 인식 객체, 읽어 주기와 겹침 처리, 마이크 확인(값 7) |
| `src/lib/speech/fake-web-speech.ts` | 같은 Web Speech 꼴의 가짜. 대본으로 돈다(값 8) |
| `src/app/dev/speech-probe/page.preview.tsx` | 관찰 페이지(서버 구성 요소). 운영 빌드에서 빠지는 이름(값 9) |
| `src/app/dev/speech-probe/speech-probe.tsx` | 관찰 페이지 본체('use client') |
| `tests/fixtures/speech/probe-text.json` | 시험 문장 열과 1분 발표 글 |
| `tests/e2e/fixtures.ts` | 모든 e2e 가 가져올 `test`. 가짜 음성을 addInitScript 로 넣는다(P1a 가 P2 에 맡김) |
| `tests/e2e/speech-probe.spec.ts` | 관찰 페이지 e2e(가짜 음성 · Playwright 시계) |
| `docs/checklists/speech-check.md` | H2 점검표, 결과 칸 비움(값 10) |
| `tests/fixtures/speech/recorded/*.json` | H2 뒤 기기 기록 대본(작업 순서 P2b-8) |

### 요청하는 공용 변경(컨트롤러가 합친다)

1. `next.config.ts`(P2b 필수). 관찰 페이지를 Vercel 운영 배포 빌드에서 뺀다. P3 · P4 브리프 범위에 이 파일이 없으므로 P2b 구현자에게 허락해도 된다.

```ts
// 관찰 페이지(page.preview.tsx)는 Vercel 운영 배포(VERCEL_ENV=production) 빌드에서 뺀다. 로컬 · 프리뷰 빌드는 넣는다.
const isProductionDeployment = process.env.VERCEL_ENV === "production";
// nextConfig 안에 더한다. 목록을 바꾸면 기본 넷도 적어야 한다(proxy.ts · instrumentation 은 기본 확장자로 잡힌다).
pageExtensions: isProductionDeployment ? ["tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js", "preview.tsx"],
```

   P5 의 시드 보기 화면(로컬 개발 서버만)도 같은 길로 접미 하나를 더할 수 있다.
2. `.github/workflows/ci.yml`(선택, 정할 것 다-2). e2e 자리 작업을 채운다. 준비 네 줄 + `pnpm exec playwright install --with-deps webkit` + `pnpm e2e`.
3. `.dependency-cruiser.cjs`(선택, 정할 것 다-3). 앱 코드는 가짜를 가져오지 않는다. `{ name: "no-fake-speech-in-app", severity: "error", from: { path: "^src/", pathNot: "^src/lib/speech/fake-web-speech" }, to: { path: "^src/lib/speech/fake-web-speech" } }`.
4. `tests/e2e/fixtures.ts` 는 P2b 파일이지만 P3b 가 접근 쿠키 준비를 더할 자리다(정할 것 다-4).

`package.json` · `pnpm-lock.yaml` · `vitest.config.mts` · `playwright.config.ts` · `.env.example` 은 고치지 않는다. 새 패키지가 없다. 인식 형은 자체로 정의하고 숫자 낱말은 직접 만든다.

### 파일별 값(구현자가 옮겨 쓸 것)

1. `match-rate.ts`. 내보내기(제안)는 `normalizeForMatch(text, homophones): string[]` · `matchRate(target, heard, options): number` · `bestMatchRate(targets, heard, options): number` 다. options 는 `{ homophones: readonly (readonly string[])[]; nameSlot: "any-word" | "excluded" }` 이다. 기본은 any-word(6.2 '무엇이 들어가도 맞은 단어')이고, excluded 는 talk.hint_read_match 의 견줌(1-나)이다.
   - 정규화 차례. (1) 소문자로, 굽은 따옴표(’ ‘)는 ' 로. (2) 시각 `h:mm` 을 낱말로(`:00` 은 'oclock', `7:05` 는 'seven oh five', `7:30` 은 'seven thirty'). (3) 축약형 펼침. n't → not(won't → will not, can't → can not, shan't → shall not), 'm → am, 're → are, 've → have, 'll → will, 'd → would, let's → let us, cannot → can not. 's → is 는 대명사(i 빼고) · this · that · there · here · what · where · who · how 뒤에서만 펼친다. 소유의 's 는 두고 (5)에서 따옴표만 지운다. (4) 숫자(쉼표 든 것 포함) 0~999,999 를 기수 낱말로 바꾼다('and' 없이, 105 → one hundred five). 1st · 2nd · 3rd · 21st 같은 꼴은 서수 낱말로 바꾼다. 그 밖의 숫자 꼴은 그대로 둔다. (5) 하이픈은 빈칸으로, 나머지 문장 부호는 지운다({NAME} 은 남긴다). (6) 빈칸으로 자르고, 동음이의어 묶음의 낱말을 그 묶음의 첫 낱말로 바꾼다(목표 · 인식 둘 다).
   - 맞은 수는 목표 낱말열과 인식 낱말열의 가장 긴 공통 부분열 길이다. {NAME} 은 인식 낱말 아무것 하나와 같다고 본다. 바꿔치기 없는 단어 단위 편집 거리 정렬과 같다(정할 것 나-1).
   - 일치율은 맞은 수를 목표 낱말 수로 나눈 값이다. excluded 면 {NAME} 을 분자 · 분모에서 뺀다. 인식이 비면 0 이고, 목표가 비면 던진다(시드 검증기가 막을 일).
   - 회화 단계 평가 허용 답의 틀 자리(품사 · 단계 어휘 범위, 6.2)는 1-나가 목표 낱말 꼴을 하나 더해 넣는다.
2. `listen.ts`. 내보내기(제안)는 `Band` · `bandOf(level)` · `SpeechSettings` · `speechSettingsFrom(read)` · `EndRule` · `endRuleFor(input, settings)` · `startListen(rule, settings, now)` · `stepListen(state, input)` · `classifyRecognitionError(code)` 와 형 `ListenInput` · `ListenEffect` · `ListenOutcome` 이다.
   - `bandOf` 는 단계 1~12 를 1-3 · 4-6 · 7-9 · 10-12 로 바꾼다(12절 '<구간>'). 범위 밖이면 던진다.
   - `speechSettingsFrom(read: (key: string) => unknown)` 는 아래 키를 Zod 로 읽고, 하나라도 없거나 꼴이 틀리면 던진다(조용한 기본값 금지). 초는 ms 로 바꾼다. 키는 `speech.lang` · `speech.max_listen_seconds` · `speech.end_silence_seconds.1-3` · `speech.end_silence_seconds.4-6` · `speech.end_silence_seconds.7-9` · `speech.end_silence_seconds.10-12` · `speech.watchdog_extra_seconds` 다. 회화 키(`speech.end_silence_seconds.talk.<구간>` · `speech.end_silence_seconds.talk_long` · `talk.max_answer_seconds`)는 1-나가 더한다.
   - `EndRule = { endSilenceMs?: number; capMs?: number; chunkMs: number }`. 말하기 버튼은 어느 규칙에서나 듣기를 끝낸다(7절 '말하는 중에 다시 누르면 바로 끝난다').
   - `endRuleFor({ area: "speaking" | "placement", level, answer: "one-sentence" | "multi-sentence", capSeconds? })`. one-sentence(따라 말하기 · 말하기 1~4단계 질문 답 · 배치 평가 따라 말하기, 7절)는 endSilenceMs 가 그 단계 구간의 speech.end_silence_seconds 이고 capMs · chunkMs 가 speech.max_listen_seconds 다. multi-sentence(5단계부터의 질문 답 · 그림 보고 말하기, 9~12단계 발표 · 확인 질문)는 endSilenceMs 가 없고, capMs 는 부르는 쪽이 준 capSeconds(정할 것 가-3), chunkMs 는 speech.max_listen_seconds 다. answer 꼴은 부르는 쪽이 시드 활동에서 정한다. 이 함수는 3.3 단계표 경계를 박지 않는다. 배치 평가는 그 문항의 단계로 구간을 고른다(정할 것 나-7).
   - 한 번 듣기 판정은 `stepListen(state, input) → { state, effects, wakeAt }` 이다. 들어오는 일은 begin · result(그 인식 객체의 지금까지 글 전체) · error(code) · end · button · cancel(hidden · speak · leave) · timer · start-failed 이고 모두 now 를 갖는다. 인식 객체에서 온 일은 객체 번호도 갖는다. 돌려주는 일은 start-recognizer(새 번호) · stop-recognizer · abort-recognizer · done(결과) 이다. wakeAt 은 가장 이른 기한이다.
   - 기한. capAt 은 begin + capMs, chunkAt 은 그 객체 시작 + chunkMs, silenceAt 은 마지막 결과 + endSilenceMs(결과가 하나라도 온 뒤에만), watchdogAt 은 마지막 신호 + speech.max_listen_seconds + speech.watchdog_extra_seconds 다. 신호는 객체 시작 · 결과 · 오류 · 끝이다(정할 것 나-2). 같은 때 여럿이면 cap → silence → chunk → watchdog 차례로 본다.
   - 판정 표. 글은 끝난 조각과 지금 객체의 글을 빈칸 하나로 이은 것이다. '한 문장 답'은 endSilenceMs 가 있는 규칙, '두 문장 이상 답'은 없는 규칙이다.

| 상태 | 일 | 판정 |
|---|---|---|
| 듣는 중 | 결과 | 지금 객체의 글을 바꾸고 silenceAt · watchdogAt 을 다시 잰다 |
| 듣는 중 | capAt · silenceAt 도달, 말하기 버튼 | stop(까닭 cap · silence · button), 멈추는 중으로. 버튼도 abort 가 아니라 stop 이다(마지막 결과를 받으려고) |
| 듣는 중 | chunkAt 도달 | stop(까닭 chunk). 끝이 오면 조각을 모으고 새 객체 |
| 듣는 중 | 끝(브라우저가 스스로) | 글이 있으면 조각을 모으고 새 객체(다시 시작 수 +1). 글이 없으면 done '결과 없음'(정할 것 나-6) |
| 듣는 중 | 오류 no-speech | 글이 있으면 한 문장 답은 done 결과(까닭 browser), 두 문장 이상 답은 새 객체. 글이 없으면 done 오류 |
| 듣는 중 | 오류 그 밖 | done 오류(갈래는 classifyRecognitionError, 모은 글을 붙인다) |
| 듣는 중 | watchdogAt 도달, 감시 다시 시작 0회 | 그 객체 abort, 조각을 모으고 새 객체(감시 다시 시작 1) |
| 듣는 중 | watchdogAt 도달, 감시 다시 시작 1회 | abort, done '멈춤'(모은 글을 붙인다) |
| 멈추는 중 | 결과 | 글을 바꾼다(마지막 확정) |
| 멈추는 중 | 끝 · 오류 no-speech · 오류 aborted | done 결과(까닭 = stop 까닭), 글이 없으면 '결과 없음'. 까닭이 chunk 면 위 chunk 줄 |
| 멈추는 중 | 오류 그 밖 | done 오류 |
| 멈추는 중 | watchdogAt 도달 | abort, 모은 글로 done(까닭 stall-after-stop). 다시 시작하지 않는다 |
| 어느 때나 | cancel | abort, done '끊김'(까닭 hidden · speak · leave) |
| 어느 때나 | 앱이 abort 한 객체 · 옛 번호의 일 | 버린다 |
| 어느 때나 | start-failed(새 객체의 start 가 던짐) | done 오류(retry, 모은 글을 붙인다) |

   - 결과 꼴 `ListenOutcome`(제안). result 는 text · pieces · endedBy(silence · button · cap · browser · stall-after-stop) · restarts · watchdogRestarts 를, error 는 code · group · partialText 를, stalled 는 partialText 를, interrupted 는 reason · partialText 를 갖는다. no-result 도 있다.
   - 갈래와 부르는 쪽(P10 · P11 · 1-나)이 할 일(7절 · 8절). 셈(speech.max_retries · 여섯 번 · audio-capture 세 번 · speech.silent_items_max)은 부르는 쪽 몫이다.

| 결과 | 갈래 | 부르는 쪽이 할 일 |
|---|---|---|
| result | — | 판정(일치율 · 허용 답 · 말하기 평가) |
| no-result | retry | '다시 한 번 말해 볼까요' 같은 안내로 다시 듣기, 여섯 번 셈에 넣음 |
| error no-speech | retry | 다시 듣기, 여섯 번 셈에 넣지 않음, 말소리 없음 세기(C22) |
| error aborted(브라우저가 일으킴) | retry | 다시 듣기, 여섯 번 셈에 넣음 |
| error audio-capture | retry | 같은 활동에서 세 번 이어지면 '마이크를 쓸 수 없음', 여섯 번 셈에 넣음 |
| error not-allowed · service-not-allowed | mic-unavailable | '마이크가 필요해요. 부모님께 말해 주세요', 말하기 · 회화 카드 닫힘 |
| error network | network | '인터넷이 끊겼어요. 연결되면 다시 해요', 셈에 넣지 않음 |
| stalled | — | '마이크가 잘 안 돼요. 부모님께 말해 주세요', '마이크가 멈춤' 알림(브라우저 이름 · 시각) |
| interrupted | — | 셈에 넣지 않고 말하기 버튼을 다시 보임(정할 것 나-4) |
| error language-not-supported · phrases-not-supported · bad-grammar | 정할 것 가-1 | — |

3. `device.ts`. `describeDevice(facts)`(제안)는 userAgent · maxTouchPoints · hasStandardRecognition · hasWebkitRecognition · hasSynthesis · isSecureContext 를 받는다. 돌려주는 것은 verdict(ok · no-api · not-listed · insecure) · listed(7절 표의 지원 줄인지) · synthesis 유무 · 이름이다. 이름은 알림에 적을 '<기기> <브라우저> <판>' 꼴이다(예 'iPad Safari 26.1').
   - 판정 차례. 안전한 출처가 아니면 insecure(명세의 [SecureContext]). 인식 생성자가 없으면 no-api. Firefox 는 not-listed. iPad(UA 에 'iPad', 또는 'Macintosh' 이면서 터치 점이 둘 이상)에서 Safari 가 아니면(CriOS · FxiOS · EdgiOS · 인앱 토큰) not-listed. 인앱 브라우저(KAKAOTALK · NAVER(inapp 등, 토큰은 추측)는 기기와 관계없이 not-listed(정할 것 가-4). 나머지는 ok 이고, 7절 표의 지원 줄(Windows · macOS 의 Chrome · Edge, Android 의 Chrome, iPad 의 Safari)이 아니면 listed 를 거짓으로 적는다.
   - iPadOS 최소 판(7절 '17 이상, 최소 판은 사용 시험 기기로 확정')은 막지 않고 이름의 판으로만 남긴다(정할 것 가-4).
4. `script.ts`. 대본 규격(Zod, 형은 `z.infer`)이다. 가짜 · 관찰 페이지 내보내기 · 단위 다시 돌려 보기가 같은 꼴을 쓴다.

```ts
SpeechScript = {
  name: string
  source: string  // '손으로 씀 — <근거>' 또는 'H2 기록 — <기기 · OS · 브라우저 판 · 날짜>'
  expose?: { recognition: "standard" | "webkit" | "both" | "none"; synthesis: boolean }  // 없으면 webkit · true
  recognitions: RecognitionRun[]  // start() 마다 차례로 하나. 모자라면 마지막 것을 되풀이
  synthesis?: { voices: { name: string; lang: string; localService: boolean; default: boolean }[]; utterances?: UtteranceRun[] }
  device?: { userAgent: string; label: string; verdict: string }  // 관찰 페이지가 내보낼 때
  observed?: { label: string; rule: EndRule; settings: SpeechSettings; buttonAt?: number; outcome: ListenOutcome }[]
}
RecognitionRun = { events: ScriptEvent[]; onStop?: ScriptEvent[]; onAbort?: ScriptEvent[]; hang?: boolean; startThrows?: boolean }
ScriptEvent =
  | { at: number; type: "start" | "audiostart" | "soundstart" | "speechstart" | "speechend" | "soundend" | "audioend" | "nomatch" | "end" }
  | { at: number; type: "result"; results: { transcript: string; isFinal: boolean }[] }  // 그 객체의 결과 목록 전체
  | { at: number; type: "error"; error: string; message?: string }
UtteranceRun = { startAfter?: number; endAfter?: number; neverStart?: boolean; neverEnd?: boolean; error?: string }
```

   at 은 start() · stop() · abort() 를 부른 뒤의 ms 다. onStop 이 없으면 [end], onAbort 가 없으면 [error aborted, end] 로 본다(Chrome 꼴로 봄, 추측). hang 이면 아무 일도 내지 않는다.
5. 시험용 자료. `settings.json` 은 12절 키 이름 그대로 기본값을 두고 `_source` 칸에 '12절 기본값(2026-10-16)'을 적는다. `homophones.json` 은 `[["to","too","two"],["for","four"],["there","their"],["right","write"],["see","sea"]]` 같은 시험용 묶음이다. 실시드 목록은 P6 의 `seed/lists/` 이고 꼴은 P4 규격이다(정할 것 다-7). JSON 도 Biome 꼴(빈칸 두 칸)을 따른다. 손으로 쓴 대본은 아래와 같다.

| 대본 | 쓰는 곳 | 줄거리 |
|---|---|---|
| `default-ok.json` | e2e 기본 | 결과 하나 뒤 조용함, stop 에 끝. 영어 음성 하나 |
| `one-sentence-ok.json` | AC-5e 단위 | 중간 결과 둘 뒤 조용함, stop 에 확정과 끝 |
| `multi-sentence-pauses.json` | AC-5e 단위 | 2초 쉼 둘이 든 세 문장 |
| `first-pause-end.json` | AC-5e 단위 · e2e | 첫 객체가 첫 쉼에서 스스로 끝, 둘째 객체가 나머지 |
| `alternation-ok.json` | e2e | 읽어 주기와 인식 교대 세 턴 |
| `hang-twice.json` | 감시 타이머 단위 · e2e | 두 객체 모두 아무 일도 없음 |
| `hang-then-ok.json` | 감시 타이머 단위 | 첫 객체 멈춤, 둘째 정상 |
| `not-allowed.json` · `network.json` · `no-speech.json` | 오류 단위 · e2e | start 뒤 그 오류와 끝 |
| `no-recognition-api.json` | e2e | expose.recognition 이 none(Firefox 흉내) |

6. `types.ts`. 접점 인터페이스(제안)다. 앱 화면은 이것만 안다.

```ts
interface SpeechPort {
  device(): DeviceVerdict                     // 렌더 뒤(useEffect)에서만 부른다
  unlockFromGesture(): void                   // 누름 처리 안에서 동기로. iOS 첫 읽어 주기 제약을 푼다
  speak(text: string): Promise<SpeakOutcome>  // ended · cancelled · error(code) · unsupported
  cancelSpeaking(): void
  listen(rule: EndRule, on?: { text?(text: string): void }): ListenHandle
  checkMicrophone(): Promise<{ ok: true } | { ok: false; code: string; group: string }>
  dispose(): void
}
interface ListenHandle { press(): void; cancel(): void; outcome: Promise<ListenOutcome>; capAt?: number }
```

   TypeScript 5.9.3 의 lib.dom 에는 SpeechRecognition · 그 이벤트 · 오류 이벤트 형이 없다. 쓰는 만큼만(생성자 · lang · continuous · interimResults · maxAlternatives · start · stop · abort · onX) 이 파일에 정의하고, 결과 목록은 lib.dom 의 SpeechRecognitionResultList 를 쓴다. window 전역 형은 늘리지 않고 함수 안에서 좁혀 읽는다.
7. `browser.ts`. `createBrowserSpeech({ settings, onTrace?, recognitionCtor? })`(제안).
   - 파일 머리에 `import "client-only"` 를 둔다(Next 가 설치 없이 안에서 처리한다는 문서 문장 근거, 추측. 빌드가 깨지면 그 줄만 뺀다). window · document 는 함수 안에서만 읽는다.
   - 인식 생성자는 window.SpeechRecognition, 없으면 window.webkitSpeechRecognition 이다. 듣기마다, 다시 시작마다 새 인식 객체를 만든다(WebKit 321436 우회). lang = settings.lang, continuous = true, interimResults = true, maxAlternatives = 1 이다. processLocally 는 두지 않는다(태블릿에 없음, 7절).
   - 결과 글은 그 객체 results 전체의 첫 후보를 확정 · 중간 가리지 않고 이어 붙이고 빈칸을 하나로 줄인 것이다.
   - listen.ts 판정을 돌리고 wakeAt 에 타이머 하나를 둔다. 현재 시각은 performance.now() 다. 앱이 abort 한 객체와 옛 번호의 이벤트는 버린다.
   - 겹침. listen 앞에 읽어 주는 중이면 speechSynthesis.cancel() 로 끊고 그 읽어 주기를 cancelled 로 끝낸 뒤 새 객체를 시작한다(토리 목소리를 인식하지 않게, 7절). speak 앞에 듣는 중이면 그 듣기를 cancel('speak')로 끝내고, speechSynthesis.cancel() 로 밀린 줄을 비운 뒤 읽는다(321436 댓글: end 가 안 온 발화 뒤 speak 는 cancel 전까지 대기).
   - speak 는 await 없이 같은 차례에서 speechSynthesis.speak 를 부른다(누름 처리 안에서 불릴 수 있다). 음성은 getVoices() 에서 고른다(정할 것 나-3). 아직 비었으면 voice 없이 lang 만 두고 읽고, voiceschanged 뒤 다음부터 고른다. 읽는 동안 발화 객체를 붙들어 둔다(추측: 놓치면 Chrome 에서 end 가 안 올 수 있다).
   - unlockFromGesture 는 아직 안 풀었으면 소리 0 인 빈칸 한 글자 발화를 speak 한다. WebKit 은 누름 처리 중에 speak() 를 부를 때 제약을 푼다(코드 확인). 읽어 주는 동안에도 말하기 버튼을 누를 수 있게 한다(정할 것 가-2 권함).
   - checkMicrophone 은 새 객체를 start 하고, audiostart 나 첫 결과가 오면 성공으로 보고 abort 한다. 오류면 실패(code · 갈래)다. speech.max_listen_seconds + speech.watchdog_extra_seconds 동안 아무것도 없으면 실패('timeout')로 보고 abort 한다(정할 것 나-5). getUserMedia 는 쓰지 않는다(녹음하지 않음, 321436 댓글의 충돌).
   - visibilitychange 로 쪽이 숨으면 듣기는 cancel('hidden'), 읽어 주기는 cancel 한다. 숨은 동안 다시 시작하지 않는다(정할 것 나-4).
   - onTrace(일)와 recognitionCtor 는 관찰 페이지만 넘긴다. recognitionCtor 로 '이벤트 무시(멈춤 흉내)'와 '같은 객체 되풀이(321436 재현)'를 감싼 생성자를 넣는다.
8. `fake-web-speech.ts`. `installFakeWebSpeech(script)` 하나를 내보낸다(제안).
   - Playwright `addInitScript(fn, arg)` 는 함수 글을 쪽으로 옮긴다. 함수 밖 이름(가져온 값 · 모듈 상수)을 쓰지 않고 `import type` 만 쓴다. 클래스 필드 대신 생성자 안 대입을 쓴다(변환 도구가 도우미 함수를 끼우지 않게).
   - expose 대로 window.SpeechRecognition · window.webkitSpeechRecognition 을 가짜 생성자로 두거나 지운다(Object.defineProperty). speechSynthesis 와 SpeechSynthesisUtterance 도 가짜로 바꾼다.
   - 인식. start() 마다 recognitions 의 다음 실행을 쓰고 events 를 at 뒤로 예약한다. stop() 은 남은 예약을 지우고 onStop 을, abort() 는 onAbort 를 예약한다. hang 은 아무것도 예약하지 않는다. startThrows 면 InvalidStateError 를 던진다. onX 속성과 addEventListener 를 둘 다 받는다. result 이벤트는 results[i][0].transcript · results[i].isFinal · resultIndex 꼴로 만든다.
   - 합성. getVoices() 는 voices 를 돌려주고, speak 는 utterances 차례(startAfter · endAfter · neverStart · neverEnd · error)를 따른다. cancel 은 지금 발화에 error 'interrupted', 줄의 나머지에 'canceled' 를 낸다(추측: 브라우저 꼴). speaking · pending 을 맞춘다.
   - 예약은 부를 때마다 window.setTimeout 을 읽는다. init script 끼리 순서가 정해지지 않으므로, Playwright 시계가 덮은 것을 타려면 설치 때 붙잡지 않는다.
   - window.__fakeSpeech = { created, calls, spoken } 를 남겨 e2e 가 본다.
9. 관찰 페이지. `page.preview.tsx` 는 시험용 설정 · 시험 글 · 시험용 동음이의어(`tests/fixtures/speech/*.json`)를 가져와 `speech-probe.tsx` 에 넘긴다. 관찰 도구라 시험용 값을 쓴다(정할 것 다-5). 부분은 일곱이다.
   - 기기. describeDevice 결과 · UA · 안전한 출처 · 보이는 상태 · 마이크 권한 조회(Permissions API 'microphone', 있으면) · 영어 음성 목록과 고른 음성.
   - 설정. 쓰는 키와 값(읽기만). 단계 1~12 와 답 꼴을 고르면 그 EndRule 을 보인다.
   - 마이크 확인. checkMicrophone 결과(성공 · 코드 · 갈래).
   - 교대 시험. [시작] 누름 처리 안에서 unlockFromGesture 와 첫 문장 읽어 주기를 부른다. 끝나면 [말하기] → 듣기 결과(글 · 일치율 · 결과 꼴 · 다시 시작 수 · 감시 다시 시작). 다음 문장은 누름 없이 저절로 읽어 준다(회화에서 토리 말이 누름 없이 나오는 것과 같게). 턴 수를 보인다. 인식 객체는 '새 객체(앱 기본)' · '같은 객체 되풀이' 가운데 고른다.
   - 긴 말 시험. 두 문장 이상 규칙으로 듣고 '다 말했어요'로 끝낸다. 조각 · 조각 사이 틈(ms) · 이어 붙인 글 · 원문과 일치율을 보인다.
   - 감시 타이머 흉내. '이벤트 무시'를 켜고 듣는다. 한 번 다시 시작하고 또 멈추면 '멈춤'이다.
   - 기록. 모든 일(시각 · 객체 번호 · 종류 · 글 · 오류 code · message · 읽어 주기 일)을 표로 남긴다. '대본으로 내보내기'는 글 상자 · 복사 · .json 내려받기이고 꼴은 대본 규격 + device + observed 다.
   소리를 저장하지 않고 서버로 보내지 않는다. 아이 화면이 아니므로 글은 어른용 한국어이고 화면 검토(design-reviewer)는 없다.
10. 점검표 `docs/checklists/speech-check.md`. 머리에 목적(9절 음성 점검 · 11절 1-가 첫 작업 · AC-N3), 관찰 페이지 주소(H1 뒤 적음), 하는 사람(어른이 시험 문장을 읽는다. Chrome 은 소리를 서버로 보낸다. 사람 이름을 말하지 않는다), 기기 표(기기 · OS 판 · 브라우저 판 · 날짜 · 내보낸 대본 파일)를 둔다. 결과 칸은 '통과 · 실패 · 기기 없음'과 메모이고 모두 비운다.

   (가) 관찰 페이지로 보는 것(P2, H2)

| 번호 | 기기 | 항목 | 하는 법 | 기대(근거) |
|---|---|---|---|---|
| I-1 | iPad Safari | 기기 판정 | 연다 | ok, webkit 인식, 영어 음성(7절 표) |
| I-2 | iPad Safari | 마이크 확인(처음) | 누르고 권한을 허용한다 | 성공. 물음이 몇 번 나왔는지 적는다 |
| I-3 | iPad Safari | 교대 10턴(새 객체) | 교대 시험 10턴 | 결과 10, 멈춤 0, 감시 다시 시작 수(11절 · 9절) |
| I-4 | iPad Safari | 교대 3턴(같은 객체, 참고) | '같은 객체 되풀이' | 멈춤이 나는지(WebKit 321436). 판정에 넣지 않는다 |
| I-5 | iPad Safari | Siri · 받아쓰기 끔 | 설정에서 끄고 마이크 확인 | 오류 코드(예상 service-not-allowed), 갈래 mic-unavailable(7절 '마이크를 쓸 수 없음') |
| I-6 | iPad Safari | Siri 다시 켬 | 켜고 마이크 확인 | 성공. 쪽을 새로 고쳐야 했는지 적는다 |
| I-7 | iPad Safari | 마이크 거부 → 다시 허용 | 거부 → 마이크 확인 → 주소창 aA 의 웹 사이트 설정이나 설정 앱 Safari 에서 허용 → 마이크 확인 | 거부 때 not-allowed · mic-unavailable, 허용 뒤 성공. 경로와 새로 고침 필요 여부 |
| I-8 | iPad Safari | 감시 타이머 | '이벤트 무시' 켜고 듣기 | 한 번 다시 시작, 또 멈추면 멈춤(7절 감시 타이머 행) |
| I-9 | iPad Safari | 말 안 하기 | 듣기 누르고 조용히 | no-speech 인지 '결과 없음'인지 |
| I-10 | iPad Safari | 네트워크 끊기 | 와이파이 끄고 듣기 | network 인지, 그래도 되는지 |
| I-11 | iPad Safari | 듣는 중 쪽 숨기기 | 듣는 중 홈 화면에 갔다 온다 | 끊김, 돌아와 다시 됨 |
| I-12 | iPad(선택) | 다른 브라우저 | iPad Chrome 이나 카카오톡 링크로 연다 | not-listed |
| A-1 | Android Chrome | 기기 판정 | 연다 | ok |
| A-2 | Android Chrome | 권한 허용 · 거부 · 다시 허용 | 사이트 설정에서 바꾼다 | 거부 때 not-allowed, 다시 허용 뒤 성공(경로를 적는다) |
| A-3 | Android Chrome | 인식 오류 | 말 안 하기 · 비행기 모드 | no-speech(또는 결과 없음) · network |
| A-4 | Android Chrome | 읽어 주기 | 교대 3턴 | 고른 영어 음성, 끝 이벤트가 옴 |
| A-5 | Android Chrome | 감시 타이머 | '이벤트 무시' | I-8 과 같음 |
| A-6 | Android Chrome | 쉼 세 번 든 1분 발표 | 긴 말 시험, 원문을 읽으며 [쉼]마다 2~3초 쉰다 | 이어 붙인 글에 빠진 구절 없음(사람이 원문과 견줌), 조각 수 · 틈(9절) |
| E-1~E-5 | Windows Edge | A-1~A-5 와 같은 다섯 | A-1~A-5 와 같게 | 같음(9절) |
| F-1 | Firefox(있는 기기) | 기기 판정 · 마이크 확인 | 연다 | no-api 또는 not-listed(AC-N3) |

   (나) 화면이 생긴 뒤 보는 것(그 하위 plan 이 결과를 채운다)

| 번호 | 기기 | 항목 | 하위 plan |
|---|---|---|---|
| N-1 | iPad Safari | Siri · 받아쓰기를 끈 채 홈의 말하기 · 회화 카드가 '마이크가 필요해요. 부모님께 말해 주세요'로 닫힘 | P10 · P11 |
| N-2 | iPad Safari | Siri 를 켠 뒤 부모 화면 '마이크 다시 확인'으로 두 카드가 열림 | 1-나 |
| N-3 | 마이크 거부 기기 | 두 카드 닫힘, 부모 화면에 설정 경로 | P10 · 1-나 |
| N-4 | Firefox | 말하기 · 회화 카드 닫힘, 읽기 · 쓰기는 끝까지 | P10 · P11 |
| N-5 | 모든 기기 | 첫 실행 '마이크 확인'이 실패해도 넘어가고 부모 알림이 생김 | P10 |

   끝에 '판정'(통과 · 실패, 정할 것 가-5 기준, 실패면 요청자의 S7 결정과 13절 줄)을 비워 둔다.

### 뒤 하위 plan(P10 · P11 · 1-나)이 쓰는 법

- 화면이 `createBrowserSpeech` 로 SpeechPort 하나를 만든다. 설정은 서버가 P3 설정 읽기로 읽어 넘긴 값을 speechSettingsFrom 으로 바꾼다. e2e 는 `tests/e2e/fixtures.ts` 의 `test` 를 가져오면 가짜가 들어 있다.
- 말하기 · 회화 화면을 여는 누름 처리 안에서 unlockFromGesture() 를 부른다. 화면 이동 뒤의 효과에서 부르면 iOS 에서 소리가 나지 않는다.
- 듣기는 listen(endRuleFor(...)) 이고 결과는 위 '갈래' 표대로 다룬다. 첫 실행 '마이크 확인'(P10)과 부모 화면 '마이크 다시 확인'(1-나)은 checkMicrophone() 이다. 기기 판정이 ok 가 아니면 '마이크를 쓸 수 없음'이다(7절).
- 회화(1-나)는 endRuleFor 에 talk 갈래(speech.end_silence_seconds.talk.<구간> · talk_long · talk.max_answer_seconds)와 그 시험(AC-5e 회화 몫)을, 일치율에 틀 자리를 더한다.

## 작업 순서 (Order of work)

명령은 모두 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. PR 마다 구현자 하나(implementer · Opus · high)가 하고, 검토는 code-reviewer(Opus · xhigh), fix 라운드는 세 번까지다(C52 전체 루프).

### P2a 음성 판정 함수

1. [문서] 착수 전 결정. 컨트롤러가 정할 것 가-1 · 가-4 를 정하고(설계 보완이면 13절 한 줄 먼저), 나 묶음은 이 plan 승인으로 정한다. 완료: 장부에 결정이 있다.
2. [검증] 시험용 자료와 대본 규격. `script.ts` → `tests/fixtures/speech/{settings,homophones}.json` · `scripts/*.json` → `listen-end.test.ts` 의 '음성 설정' 두 시험. 12절 대조 시험은 `specs/09-설정값.md` 표에서 키 줄을 읽는다(경로는 NFC). 완료: 대본이 모두 규격을 통과하고 시험용 설정이 12절 기본값과 같다.
3. [검증] 일치율(3 ∥ 4 ∥ 5, 파일이 겹치지 않으나 한 구현자가 차례로 해도 된다). `match-rate.test.ts` 를 먼저 쓰고 실패를 본 뒤 `match-rate.ts`. 완료: 시험 통과.
4. [검증] 한 번 듣기 판정. `listen-end.test.ts` 의 AC-5e · 감시 타이머 · 오류 갈래 · 다시 돌려 보기 시험을 먼저 쓰고 `listen.ts`. 대본을 시각 순서로 stepListen 에 넣는 흉내 함수는 시험 파일 안에 둔다. 다시 돌려 보기는 `recorded/` 의 파일마다 시험 하나를 만든다(파일이 없으면 시험이 생기지 않는다. skip 은 Biome 이 막는다). 완료: 시험 통과.
5. [검증] 기기 판정. `speech-device.test.ts` 먼저, 그다음 `device.ts`. UA 표본은 공식 문서나 기기에서 받은 글을 쓰고 출처를 주석에 적는다. 완료: 시험 통과.
6. [검증] 마무리. `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`. 완료: 모두 0 이고, spec:trace 의 missing-test 가 AC-5a · AC-5e 만큼 줄었다. 출력이 구현 보고에 있다.
7. [사람] 검토 · 커밋(H14). code-reviewer 검토와 fix 뒤 요청자 지시가 있으면 컨트롤러가 커밋한다. 완료: 커밋.

### P2b 음성 접점 · 관찰 페이지 · 실기 확인

1. [문서] 공용 변경과 결정. 컨트롤러가 `next.config.ts` 에 pageExtensions(요청 1)를 넣거나 구현자에게 허락하고, 정할 것 가-2 · 다-1~다-4 를 정한다. 완료: `pnpm build` 통과, 장부에 결정.
2. [화면] 접점과 가짜. `types.ts` · `browser.ts` · `fake-web-speech.ts`. 완료: `pnpm build`(타입) 통과, `pnpm check:deps` 위반 0.
3. [화면] 관찰 페이지. `page.preview.tsx` · `speech-probe.tsx` · `probe-text.json`(문장 열은 4~8 낱말 A1, 숫자 · 축약형 포함, 사람 이름 없음. 발표 글은 120~150 낱말에 [쉼] 셋). 구현자는 마이크로 말할 수 없으므로 화면 확인은 4 의 e2e(가짜 대본)로 하고, 구현 보고에 그 화면 사진 한 장을 붙인다. 완료: `pnpm build` 통과, `rm -rf .next && VERCEL_ENV=production pnpm build` 의 경로 목록에 `/dev/speech-probe` 가 없고 `rm -rf .next && pnpm build` 에는 있다.
4. [검증] e2e. `tests/e2e/fixtures.ts` · `speech-probe.spec.ts` 를 먼저 쓰고 실패를 본 뒤 고친다. page.clock.install() 은 goto 앞에 두고, 시계를 미는 값은 대본과 시험용 설정에서 읽는다. 완료: `pnpm e2e` 통과(첫 화면과 관찰 페이지).
5. [문서] 점검표(값 10). 완료: (가) · (나) 행이 모두 있고 결과 칸이 비어 있다.
6. [검증] 마무리 · 검토. `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm e2e` · `pnpm check:deps` · `pnpm check:bundle` · `pnpm spec:trace` 출력 → code-reviewer · fix. 완료: 모두 0, 검토 Approved.
7. [사람] H1 → H2(6 과 나란히 해도 된다. 프리뷰는 보호되고 운영 빌드에는 없다). 요청자가 아래 H1 을 하고, 공유 링크로 기기마다 점검표 (가)를 한다. 기기마다 관찰 페이지에서 대본을 내보내 장부로 보낸다. 검토 fix 로 접점 동작이 바뀌면 바뀐 항목만 다시 본다. 완료: (가) 결과 칸이 찼다.
   - H1(P2 몫). (1) Vercel 프로젝트를 만들고 이 저장소를 연결한다. GitHub 연동은 H15 뒤이고, 그 전에는 요청자 터미널에서 `vercel link` 와 `vercel deploy`(프리뷰)로 한다. (2) 빌드 명령 `pnpm build && pnpm check:bundle`(C51 바)과 함수 지역 icn1(`vercel.json`)을 확인한다. (3) 'Enable access to System Environment Variables' 가 켜져 있는지 본다(VERCEL_ENV). (4) Deployment Protection 이 Standard Protection + Vercel Authentication 인지 본다(새 프로젝트 기본값은 문서에 없다, 추측). (5) 새 프로젝트의 첫 배포는 늘 운영 배포라 관찰 페이지가 없다. 관찰 페이지는 둘째(프리뷰) 배포부터 있다. `--prebuilt` 는 쓰지 않는다. (6) 프리뷰 배포에 공유 링크 하나(Hobby 는 계정당 하나)를 만들어 기기에서 열고, H2 가 끝나면 거둔다. (7) 운영 승격을 막는 길(묶음 위험 11)은 요청자가 고른다.
8. [문서][검증] H2 결과 반영. 내보낸 대본을 `tests/fixtures/speech/recorded/<기기>-<날짜>.json` 으로 넣고 `pnpm test` 의 다시 돌려 보기가 통과하는지 본다(다르면 판정 함수를 fix 라운드로 고친다). 판정(정할 것 가-5)을 점검표 끝에 적는다. 실패면 요청자가 S7 을 정하고 컨트롤러가 13절에 한 줄을 넣은 뒤 P10 · P11 을 다시 계획한다. 커밋(H14). 완료: H2 결과표가 남고, 실패면 13절 줄이 있다.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | iPad 에서 읽어 주기 뒤 인식이 아무 이벤트 없이 멈춘다. WebKit 321436(미해결)에 iOS 26.6~27.0 보고가 있고, speechSynthesis 뒤에도 같다는 댓글이 있다(iPhone · 홈 화면 웹 앱) | 회화 교대 · 말하기 질문 뒤 듣기가 기기에서 멈춘다. 1-가 전체의 갈림길이다 | 듣기 · 다시 시작마다 새 인식 객체, 읽어 주기 앞에 남은 인식 abort(댓글의 우회, 21회 넘게 됨), 감시 타이머. H2 의 교대 10턴과 '같은 객체' 3턴으로 견준다. 실패면 S7(요청자) |
| 2 | iOS 는 누름 처리 밖의 첫 speak() 를 이벤트 없이 버린다(WebKit 코드). Chrome 은 문서가 사용자 동작을 받기 전 speak() 를 오류로 막는다 | 첫 문장이 소리 없이 지나가고 화면이 '읽어 주는 중'에 멈춘다 | 화면을 여는 누름 처리 안에서 unlockFromGesture() 를 동기로 부른다(P10 · P11 · 1-나 브리프에 옮김). speak() 는 await 전에 speechSynthesis.speak 를 부른다. 정할 것 가-2 |
| 3 | 7절 오류 행에 없는 코드 셋(language-not-supported · phrases-not-supported · bad-grammar) | 갈래가 비어 구현자가 지어낸다 | 정할 것 가-1. WebKit 은 언어 미지원을 service-not-allowed 로 낸다(코드 확인) |
| 4 | 쪽이 숨으면 WebKit 이 start 를 not-allowed 로 거절하고, 쪽이 멈출 때(suspend) 인식을 끊는다 | 자동 다시 시작(이어 붙이기 · 감시 타이머)이 '마이크를 쓸 수 없음'으로 잘못 굳는다 | 숨은 동안 다시 시작하지 않고 '끊김'으로 끝낸다(정할 것 나-4) |
| 5 | 7절 감시 타이머는 '시작 뒤 첫 이벤트'만 말한다. 첫 결과 뒤 멈춤(2021 보고)이나 stop 뒤 끝이 오지 않는 경우가 빈다 | 화면이 '듣는 중'에 멈춘다 | 결과 · 오류 · 끝마다 다시 재고, 멈추는 중의 멈춤은 모은 글로 끝낸다(정할 것 나-2) |
| 6 | 두 문장 이상 활동의 시간 상한 키가 12절에 없다(5~8단계 질문 답 · 그림 보고 말하기, 9~12단계 확인 질문). 9~12단계 발표도 단계표 시간이 상한인지 정해지지 않았다 | P11 이 숫자를 지어낸다. 상한을 주지 않으면 듣기가 말하기 버튼으로만 끝난다 | P2 는 capSeconds 를 입력으로만 받는다(관찰 페이지의 긴 말 시험은 버튼으로 끝내므로 괜찮다). 앱 화면은 가-3 이 정해진 뒤 쓴다. 정할 것 가-3 |
| 7 | iPad 의 다른 브라우저 · 인앱 브라우저(카카오톡 · 네이버 앱). 호환 자료는 iOS WebView 를 Safari 와 같게 적는다 | 지원 목록 밖인데 인식이 반쯤 된다. 부모가 카톡 링크로 열 수 있다 | UA 로 가른다(CriOS 는 데스크톱 모드에도 있다, 나머지 토큰은 추측). H2 의 I-12. 정할 것 가-4 |
| 8 | 영어 음성이 없거나 늦게 실린다(voiceschanged 는 Safari 16 부터, Chrome 은 비동기) | 다른 목소리로 읽거나 첫 문장이 들리지 않는다 | 고르는 차례(정할 것 나-3), 기다리지 않고 lang 만으로 읽기, H2 에 기기별 음성 목록을 남긴다 |
| 9 | 일치율 정규화(숫자 · 시각 · 축약형 · 동음이의어)와 시드 문장 표기가 어긋난다 | 바르게 말해도 일치율이 낮다 | 규칙을 이 plan 에 고정하고 P4 검증기 · P8 생성 브리프에 같은 표기를 넣는다(정할 것 다-7) |
| 10 | 가짜 대본은 손으로 쓴 것이다 | e2e 는 통과하는데 기기에서 깨진다 | H2 기록을 `recorded/` 대본으로 옮겨 단위 다시 돌려 보기로 고정한다(역분석 제안 4) |
| 11 | addInitScript 는 함수 글을 옮긴다. 밖 이름이나 변환 도우미가 끼면 가짜가 돌지 않는다. init script 끼리 순서가 정해지지 않는다 | 가짜 설치 실패, 가짜가 Playwright 시계를 타지 않음 | 함수 하나 안에 모두, 생성자 안 대입, setTimeout 은 부를 때마다 window 에서 읽음. e2e 가 증명한다 |
| 12 | 관찰 페이지 빼기가 VERCEL_ENV 에 기댄다. 시스템 변수가 꺼져 있거나 `--prebuilt` 면 운영 빌드에도 들어간다 | 운영 주소에 관찰 페이지가 열린다(비밀값은 없다) | H1 에서 시스템 변수를 확인하고 `--prebuilt` 를 쓰지 않으며 두 빌드의 경로 목록을 본다. 대안은 정할 것 다-1 |
| 13 | 새 Vercel 프로젝트의 첫 배포는 늘 운영 배포이고, Standard Protection 은 운영 도메인을 막지 않는다 | 첫 배포에는 관찰 페이지가 없다. 덜 찬 앱이 운영 주소에 뜬다 | H1 순서(첫 배포 뒤 프리뷰), 묶음 위험 11 |
| 14 | Hobby 는 비밀번호 보호가 없고 공유 링크와 외부 사용자가 계정당 하나다 | 기기에서 프리뷰를 못 연다 | 공유 링크 하나를 H2 동안 쓰고 거둔다. 아니면 기기마다 Vercel 로그인 |
| 15 | SpeechRecognition 은 명세상 [SecureContext] 다 | 로컬 http(LAN 주소)로는 기기에서 인식 API 가 없다 | 기기 확인은 프리뷰(HTTPS)로만 한다(묶음 위험 2). 데스크톱의 localhost 는 안전한 출처다 |
| 16 | P3 의 proxy.ts 가 들어오면 관찰 페이지와 e2e 도 접근 쿠키를 거친다 | e2e 가 접근 코드 화면에 막힌다 | `tests/e2e/fixtures.ts` 에 P3b 가 쿠키 준비를 더한다(정할 것 다-4). 관찰 페이지를 proxy 에서 빼지 않는다 |
| 17 | 녹음 · getUserMedia | 원칙 위반(녹음하지 않음, 7절). iOS 에서 인식과 부딪힌다(321436 댓글: getUserMedia 로 받은 마이크 입력이 0 이 됨) | 쓰지 않는다. 코드 검토 점검 항목 |
| 18 | TypeScript 5.9.3 lib.dom 에 인식 형이 없다 | 형 패키지를 새로 들이면 잠금 파일이 P3 · P4 와 부딪힌다 | 자체 최소 형(`types.ts`) |
| 19 | 앱이 일으킨 aborted 를 브라우저 것과 못 가르면 여섯 번 셈이 앱 탓 실패를 센다 | '마이크가 멈춤' 오경보 | 객체 번호로 앱이 abort 한 객체의 일을 버린다(단위 시험) |
| 20 | 감시 타이머의 다시 시작은 옛 객체가 끝나기 전에 새 객체를 시작한다 | 브라우저가 둘째 객체를 거절하거나 옛 것을 끊을 수 있다(추측) | 옛 객체 일은 버린다. H2 의 감시 타이머 흉내(I-8 · A-5 · E-5)로 기기마다 본다 |
| 21 | 구현자(에이전트)는 마이크로 말할 수 없다 | 로컬 확인은 가짜까지이고 실제 인식은 확인되지 않은 채 검토를 통과한다 | 실제 확인은 H2 뿐이라고 완료 판정에 적는다. H2 를 검토와 나란히 당겨 한다 |

### 정할 것(컨트롤러)

가는 정본에 없는 것이라 정하면 13절에 한 줄을 먼저 넣는다. 나는 정본 문장 안에서 이 plan 이 고른 해석이라 plan 승인으로 정한다. 다는 다른 하위 plan · 공용 파일과의 조율이다.

| 번호 | 무엇 | 왜 | 권함 | 언제 |
|---|---|---|---|---|
| 가-1 | 7절 오류 행에 없는 오류 코드 셋 | MDN 의 오류 값은 아홉이고 7절은 여섯을 다룬다 | language-not-supported 는 service-not-allowed 와 같게 '마이크를 쓸 수 없음'(그 기기에서 en-US 가 안 된다. WebKit 은 같은 경우 service-not-allowed 를 낸다). phrases-not-supported · bad-grammar 는 앱이 쓰지 않는 기능의 오류라 '결과 없음'처럼 다시 듣기 | P2a 착수 전 |
| 가-2 | 읽어 주기가 시작하지 않거나 끝나지 않을 때 | iOS 는 제약 아래 speak 를 조용히 버리고, end 가 안 온 발화 뒤 speak 는 막힌다(321436 댓글). 정본은 '읽어 주기가 끝난 뒤 말하기 버튼'만 말한다 | 읽어 주는 동안에도 말하기 버튼을 누를 수 있고, 누르면 읽어 주기를 멈추고 듣는다(새 숫자 없음, 4절 · 7절 보완). 대안은 읽어 주기 감시 시간 키를 12절에 더하기 | P2b 착수 전 |
| 가-3 | 두 문장 이상 말하기 활동의 시간 상한 | 7절은 '활동 시간 상한'을 말하지만 5~8단계 질문 답 · 그림 보고 말하기와 9~12단계 확인 질문의 값이 없고, 9~12단계 발표의 단계표 시간이 곧 상한인지도 없다 | 새 키(이름 제안 `speaking.answer_max_seconds.<구간>`)를 12절에 두고 값은 P6(학습 설계자)이 단계표와 함께 정한다. P2 는 capSeconds 입력만 받는다 | P11 plan 전 |
| 가-4 | 7절 표 밖의 브라우저와 iPadOS 최소 판 | 7절 표는 지원(Windows · macOS 의 Chrome · Edge, Android Chrome, iPadOS 17 이상 Safari)과 제외(Firefox, iPad 의 다른 브라우저)만 적는다 | 인앱 브라우저(카카오톡 · 네이버 앱 등)는 어디서나 제외. 그 밖(macOS Safari · 삼성 인터넷 · iPhone 등)은 인식 API 가 있으면 쓰고 '목록 밖'만 남긴다. 최소 판은 막지 않고 판만 남긴다(7절 '사용 시험 기기로 확정') | P2a 착수 전 |
| 가-5 | H2 통과 기준 | 정본은 '실패면 S7'만 적는다 | iPad 교대 10턴이 결과 10 · 멈춤 0(감시 타이머로 살아난 턴은 넣되 따로 적음), Siri 를 끈 채 mic-unavailable · 켠 뒤 마이크 확인 성공, 거부 뒤 다시 허용해 성공, Android 1분 발표에 빠진 구절 없음(사람이 원문과 견줌). 하나라도 어기면 요청자에게(S7) | H2 전 |
| 나-1 | 일치율의 '순서를 지켜 맞은 수' | 6.2 의 '단어 단위 편집 거리 정렬'은 바꿔치기 비용에 따라 맞은 수가 달라질 수 있다 | 가장 긴 공통 부분열(바꿔치기 없는 정렬). AC-5a 의 두 예가 맞는다 | plan 승인 |
| 나-2 | 감시 타이머가 재는 때 | 7절은 '시작 뒤 결과 · 오류 · 끝이 하나도 없으면'만 말한다 | 결과 · 오류 · 끝마다 다시 잰다. stop 뒤 끝이 안 오면 모은 글로 끝내고 다시 시작하지 않는다 | plan 승인 |
| 나-3 | 영어 음성 고르는 차례 | 7절은 'en-US 음성을 고르고'만 말한다 | lang 이 en-US(대소문자 · '_' 무시)인 것 가운데 기본 → 기기 안(localService) → 첫째. 없으면 'en' 으로 시작하는 것, 그것도 없으면 voice 없이 lang 만. 영어 음성이 아예 없는 기기의 안내는 H2 결과를 보고 정한다 | plan 승인 |
| 나-4 | 쪽이 숨을 때 | WebKit 이 숨은 쪽의 start 를 not-allowed 로 거절한다 | 듣기 · 읽어 주기를 '끊김'으로 끝내고 실패 셈에 넣지 않는다. 돌아오면 말하기 버튼을 다시 보인다(P11) | plan 승인 |
| 나-5 | 마이크 확인의 성공 · 시간 | 4절 · 7절은 '권한을 묻고 인식을 한 번 시작해 오류가 없는지 본다'만 말한다 | audiostart 나 첫 결과면 성공, 오류면 실패(코드 · 갈래), speech.max_listen_seconds + speech.watchdog_extra_seconds 동안 아무것도 없으면 실패 | plan 승인 |
| 나-6 | 결과 없음 · 브라우저 스스로 끝 · 글 뒤 no-speech | 7절은 '결과 없음'과 '이어 붙인다'를 따로 말한다 | 글 하나 없이 끝나면 결과 없음(다시 시작 안 함). 글이 있으면 다시 시작해 이어 붙인다. 글 뒤 no-speech 는 한 문장 답이면 끝, 두 문장 이상이면 다시 시작 | plan 승인 |
| 나-7 | 배치 평가 따라 말하기의 구간 | 배치는 단계를 오르내린다 | 그 문항의 단계 구간 | plan 승인 |
| 다-1 | 관찰 페이지를 운영 빌드에서 빼는 방법 | 프리뷰도 운영과 같은 `next build` 라 NODE_ENV 로 못 가른다 | `page.preview.tsx` 와 next.config 의 pageExtensions 를 VERCEL_ENV 로 바꾸기(요청 1). 대안은 프리뷰 환경에만 이름 변수를 두기(빠지는 쪽이 기본) 또는 쪽 안 notFound()(빌드에는 남는다) | P2b 착수 전 |
| 다-2 | CI e2e 작업 | P1a 는 P10 몫으로 자리만 두었다 | P2b 에서 켠다. 가짜 음성 e2e 가 첫 쓸모 있는 e2e 이고, 가짜가 낡지 않게 한다(요청 2) | P2b 착수 전 |
| 다-3 | 앱 코드가 가짜를 못 가져오게 하는 의존 규칙 | 가짜가 운영 화면에 섞이면 안 된다 | 넣는다(요청 3) | P2b 착수 전 |
| 다-4 | `tests/e2e/fixtures.ts` 와 P3 | P1a 가 모든 e2e 의 준비 파일을 P2 에 맡겼고, P3b 는 접근 쿠키 준비를 더해야 한다 | P2b 가 먼저 만들고 P3b 가 더한다. 순서가 거꾸로면 P3b 가 만들고 P2b 가 더한다(컨트롤러가 병합) | P2b · P3b 착수 전 |
| 다-5 | 시험용 설정의 자리 | 묶음 위험 4 의 '시험용 settings' 자리가 정해지지 않았다 | P2 는 `tests/fixtures/speech/settings.json`(음성 키만, 12절과 같은지 시험)에 둔다. 공용 자리가 생기면 옮긴다. 관찰 페이지도 이 파일을 읽는다(운영 빌드에 들지 않음) | plan 승인 |
| 다-6 | 단계 → 구간 함수 | P3(설정 키 <구간>) · P4(단원 틀 구간)와 겹칠 수 있다 | P2 는 `listen.ts` 안에 두고, 공용 자리가 생기면 그것을 쓴다 | plan 승인 |
| 다-7 | 정규화 표기 · 동음이의어 목록 꼴 | P4 규격 · P6 목록 · P8 생성 브리프와 맞아야 한다 | 이 plan 의 표기 규칙(값 1)을 P4 · P8 브리프에 옮긴다. 목록은 '낱말 묶음의 배열'로 받고 다르면 읽을 때 바꾼다 | P4 승인 전 |
| 다-8 | 감시 타이머 단위 시험의 AC-N3 접두 | 붙이면 spec-trace 가 N3 를 '시험 있음'으로 세어 P11 e2e 가 빠져도 못 잡는다 | 붙이지 않는다(브리프대로 N3 의 P2 몫은 점검표) | plan 승인 |
| 다-9 | 브랜치 · plan 파일 | 브리프는 `feature/1a-p02-speech` 와 파일 하나를 적었다 | PR 둘이라 브랜치 둘. 파일은 지시대로 하나, 원하면 가른다 | plan 승인 |

컨트롤러 결정(2026-10-16 14:4x, plan 승인): 가-1~가-5 는 권함대로 — 13절 C53 에 한 줄로 넣고 7절(오류 행 · '마이크를 쓸 수 없음' 행 · 브라우저 표 · 읽어 주는 동안 말하기 버튼)과 12절(`speaking.answer_max_seconds.<구간>` 행, 값은 P6 때)에 반영했다. 나-1~나-7 권함대로. 다-1 pageExtensions + VERCEL_ENV 로 하고 `next.config.ts` 는 P2b 구현자에게 허락. 다-2 P2b 에서 CI e2e 작업을 켠다(`ci.yml` 허락. P3a 가 더할 integration 작업과는 컨트롤러가 합친다). 다-3 의존 규칙 `no-fake-speech-in-app` 을 넣는다(`.dependency-cruiser.cjs` 허락). 다-4 P2b 가 `tests/e2e/fixtures.ts` 를 먼저 만들고 P3b 가 접근 쿠키 준비를 더한다. 다-5 그대로. **다-6 은 바꾼다**: 단계 → 구간 함수는 공용 `src/core/level-band.ts`(`Band` · `bandOf`)로 P2a 가 만들고 `listen.ts` 가 가져오며 P3 · P4 도 그것을 쓴다. 다-7 정규화 표기와 동음이의어 목록 꼴('낱말 묶음의 배열')을 P4 · P8 브리프에 옮긴다. 다-8 붙이지 않는다. 다-9 브랜치 둘(`feature/1a-p02a-speech-core` · `feature/1a-p02b-speech-probe`), plan 파일 하나.

### 제약

- 설계를 바꾸지 않는다. 가 묶음은 컨트롤러가 13절에 한 줄을 넣은 뒤 구현한다. 구현 중 정본과 다르게 해야 하면 멈추고 장부에 올린다.
- 숫자는 settings(12절)에서 읽는다. src/core 는 SpeechSettings 로 받고, 시험과 관찰 페이지는 시험용 설정 파일에서 읽는다. 시험 · 대본의 시각(ms)은 장면을 적은 자료이고 설계 숫자가 아니다.
- 녹음하지 않는다. MediaRecorder · getUserMedia 를 쓰지 않고, 인식 글과 이벤트를 서버로 보내지 않는다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험 문장과 대본에 사람 이름을 넣지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 다른 하위 plan 의 파일 묶음은 손대지 않는다. 공용 파일은 '요청하는 공용 변경'으로만 바꾼다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 관찰 페이지는 아이 화면이 아니라 화면 검토가 없다.
- 커밋 · PR 은 요청자 지시 때만 한다(H14).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| SpeechRecognition 은 Chrome 139 부터 접두사 없이(33 부터 webkit), Safari 14.1 부터 webkit 접두사, Firefox 는 미리보기판만이다. Edge · Chrome Android · 삼성 인터넷 · iOS WebView 는 위와 같게 적혀 있다(mirror) | MDN browser-compat-data `api/SpeechRecognition.json`(main, 2026-10-16 받음) |
| continuous 는 Chrome Android 에서 '설정은 되나 효과 없음', Safari 17 부터 온전(14.1~16 은 false 여도 여러 결과). processLocally · available · install 은 데스크톱 Chrome 139 만, phrases 는 Chrome 142, unspokenPunctuation 은 Chrome 151 | 같은 파일 |
| 오류 값은 아홉이다. aborted · audio-capture · bad-grammar(명세에서 빠짐) · language-not-supported(브라우저마다 다르고 코드로 미리 알 수 없음) · network · no-speech · not-allowed · phrases-not-supported · service-not-allowed | https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error (2025-09-30 수정) |
| 명세. SpeechRecognition 은 [SecureContext] 다. start() 는 이미 시작했으면 InvalidStateError. stop() 은 모은 소리로 결과를 내려 하고, abort() 는 end 만 정하고 aborted 오류는 정하지 않는다. 이벤트 순서는 audiostart 가 앞선다는 것 등 일부만 정한다. 마이크가 거부되면 not-allowed | https://webaudio.github.io/web-speech-api/ (CG 초안 2026-10-15) |
| SpeechSynthesis 는 Safari 7 부터, voiceschanged 는 Safari 16 부터다. Chrome Android 의 pause 는 cancel 과 같다. boundary 는 Chrome 에서 기대대로 나지 않는다 | MDN browser-compat-data `api/SpeechSynthesis.json` · `api/SpeechSynthesisUtterance.json`(main) |
| Chrome 71 부터 문서가 사용자 동작을 받지 않았으면 speechSynthesis.speak() 가 오류다 | https://developer.chrome.com/blog/chrome-71-deps-rems (2018-10-29 갱신) |
| WebKit(iOS). 문서가 소리 재생에 누름을 요구하면 합성에 제약을 걸고, 누름 처리 중의 speak() 가 제약을 풀며, 그 전의 speak() 는 이벤트 없이 돌아간다. cancel() 은 지금 발화의 오류를 바로 낸다 | WebKit `Source/WebCore/Modules/speech/SpeechSynthesis.cpp`(main, 마지막 수정 2026-10-12 845b737) · 버그 223473(2021-03-18 FIXED) |
| WebKit 인식. start() 에 누름 검사가 없다. 비활성이 아니면 InvalidStateError, 마이크 권한 정책이 막으면 not-allowed, 쪽이 멈추면(suspend) abort, 오류와 끝은 따로 낸다 | WebKit `Source/WebCore/Modules/speech/SpeechRecognition.cpp`(main, 2026-06-26 2f88bc0) |
| WebKit 권한. 마이크 거부는 not-allowed, 음성 인식 서비스 거부와 그 언어의 서비스 없음은 service-not-allowed, 사이트 권한 거부는 not-allowed, 쪽이 보이지 않으면 not-allowed 다 | WebKit `Source/WebKit/UIProcess/SpeechRecognitionPermissionManager.cpp`(main, 2026-03-11 bf66536) |
| Safari 인식은 Siri 나 받아쓰기를 켜야 하고, 2021 년에는 SFSafariViewController · 홈 화면 웹 앱에서 안 됐다(RESOLVED LATER, 마지막 댓글 2025-03-01) | WebKit 버그 225298, 검토 2회차 기록 `.superpowers/sdd/2026-10-15-intent-spec-review/round-2-b.md`(2026-10-15 원문 확인) |
| iOS · iPadOS Safari 18.7.3 · 26.2 · 26.6 에서 오디오 재생 뒤 인식이 오류 · 끝 없이 멈춘다는 보고. 이슈는 2026-01-20 닫힘, 마지막 댓글 2026-08-27. Web Audio 로 바꿔 피했다는 보고 | https://github.com/WebAudio/web-speech-api/issues/96 |
| 버그 321436(NEW, 2026-08-10 올림, 2026-09-27 수정). 오디오 · 영상 재생 뒤 인식 멈춤. 둘째 댓글(iOS 27.0 · iPhone 17 · 홈 화면 웹 앱)은 speechSynthesis 뒤 같은 인식 객체가 멈추고, 읽어 주기 앞 abort 와 끝난 뒤 새 객체로 21회 넘게 됐으며, 읽어 주는 동안 인식은 아무것도 받지 못하고, getUserMedia 로 받은 마이크 입력이 0 이 되며, end 가 안 온 발화 뒤 speak 는 cancel 전까지 기다린다고 적었다 | https://bugs.webkit.org/show_bug.cgi?id=321436 |
| 버그 317741(FIXED 2026-06-26, 315887@main). 인식 마이크가 잡는 동안 오디오 세션을 유지한다. 담긴 Safari 판은 적혀 있지 않다 | https://bugs.webkit.org/show_bug.cgi?id=317741 |
| Chrome iOS 의 UA 는 데스크톱 사이트 요청에도 CriOS 를 넣는다(M85 부터) | https://chromium.googlesource.com/chromium/src/+/HEAD/docs/ios/user_agent.md · https://blog.chromium.org/2020/09/changing-chrome-on-ios-user-agent-for.html |
| TypeScript 5.9.3 lib.dom 에는 SpeechSynthesis 묶음과 SpeechRecognitionResult · ResultList · Alternative 가 있고, SpeechRecognition · 그 이벤트 · 오류 이벤트는 없다 | `node_modules/typescript/lib/lib.dom.d.ts`(이 저장소) |
| Next 16.4.2. 'use client' 가 경계이고 브라우저 전용 API 는 클라이언트 구성 요소에서 쓴다. client-only 는 설치 없이 Next 가 안에서 처리한다. `ssr: false` 는 클라이언트 구성 요소에서만 된다 | `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` · `02-guides/lazy-loading.md`(16.4.2) |
| pageExtensions 는 목록을 통째로 바꾼다(proxy · instrumentation 파일도 접미가 맞아야 한다). App Router 의 page 파일은 `(page\|route)\.(<확장자들>)$` 로 고른다. Turbopack 미지원 목록에 없다 | `…/05-config/01-next-config-js/pageExtensions.md` · `…/03-file-conventions/proxy.md` · `node_modules/next/dist/server/lib/find-page-file.js` · `…/03-api-reference/08-turbopack.md`(16.4.2) |
| VERCEL_ENV 는 빌드 · 실행 때 모두 있고 값은 production · preview · development 다. 'Enable access to System Environment Variables' 가 켜져 있어야 한다 | https://vercel.com/docs/environment-variables/system-environment-variables (2026-07-15) |
| 새 프로젝트의 첫 배포는 --prod 가 없어도 운영 배포다. --prebuilt 면 빌드 때 시스템 변수가 없다 | https://vercel.com/docs/cli/deploy (2026-09-18) |
| Standard Protection(운영 도메인 밖 모두)과 Vercel Authentication 은 모든 요금제, 비밀번호 보호는 Hobby 에 없다. 새 프로젝트 기본값은 문서에 없다 | https://vercel.com/docs/deployment-protection (2026-09-15) · …/methods-to-protect-deployments/vercel-authentication (2026-09-15) |
| 공유 링크는 모든 요금제이고 쿼리 매개변수로 연다. Hobby 는 공유 링크와 외부 사용자가 계정당 하나다 | …/methods-to-bypass-deployment-protection/sharable-links (2026-08-28) · …/vercel-authentication |
| addInitScript 는 문서가 생긴 뒤 쪽 스크립트 전에, 이동과 하위 프레임마다 돈다. arg 는 직렬화되고, 여럿이면 순서가 정해지지 않는다 | https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script |
| Playwright 시계는 install 이 setTimeout · setInterval · Date · performance · requestAnimationFrame 등을 덮고, runFor · fastForward · pauseAt 로 움직인다 | https://playwright.dev/docs/clock |
| spec-trace 는 `.test.ts` · `.spec.ts` 에서 한 줄 따옴표 이름의 맨 앞 AC 토큰(과 '·' 등으로 이어진 토큰)만 센다 | `scripts/spec-trace.ts`(이 저장소, cf97f62) |
| Edge 의 인식은 Azure 온라인 서비스로 소리를 보낸다(2차 자료뿐, 추측) | 검색 결과의 개발자 안내 글 |

## 증명 (Proof)

공통은 묶음 plan 증명 절 머리대로다. P2a 끝에 spec-trace 의 missing-test 가 AC-5a · AC-5e 둘만큼 준다.

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 | PR |
|---|---|---|---|
| AC-5a | 단위 "AC-5a 목표 'I have two dogs' 에 인식 'i have 2 dogs.' 는 1, 'I have dogs' 는 0.75 다" · "AC-5a 목표에 없는 말을 덧붙여도 감점하지 않는다" | `tests/unit/match-rate.test.ts` | P2a |
| AC-5e(말하기 몫) | 단위 "AC-5e 말하기 1단계 한 문장 답은 마지막 중간 결과 뒤 speech.end_silence_seconds.1-3 만큼 조용하면 stop 을 부르고 끝난다" · "AC-5e 말하기 4단계 한 문장 답은 speech.end_silence_seconds.4-6 만큼 조용하면 끝난다" · "AC-5e 말하기 6단계 그림 보고 말하기(두 문장 이상)는 2초 쉼 두 번에도 끝나지 않고 말하기 버튼('다 말했어요')을 누를 때 끝난다" · "AC-5e 브라우저가 첫 쉼에서 인식을 끝내면 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다", e2e "AC-5e 관찰 페이지: 첫 쉼에서 끝나는 가짜 인식에서 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다". 배치 실패 3번 → 예비는 P10, 회화 몫은 1-나 | `tests/unit/listen-end.test.ts` · `tests/e2e/speech-probe.spec.ts` | P2a · P2b |
| AC-N3(P2 몫) | 수동 점검표 (가)의 결과와 판정(H2). e2e 몫은 P11 | `docs/checklists/speech-check.md` | P2b |
| 7절 듣기 끝 · 감시 타이머 · 오류 | 단위(AC 접두 없음) "듣기 끝: 한 문장 답은 speech.max_listen_seconds 에서 끝나고 두 문장 이상 답은 그만큼마다 끊어 듣고 이어 붙인다" · "감시 타이머: 결과 · 오류 · 끝이 없으면 한 번 다시 시작하고 또 멈추면 '멈춤'으로 끝난다" · "감시 타이머: 다시 시작한 뒤 결과가 오면 이어 간다" · "감시 타이머: stop 뒤 끝이 오지 않으면 모은 글로 끝내고 다시 시작하지 않는다" · "오류 갈래: not-allowed · service-not-allowed 는 mic-unavailable, network 는 network, no-speech · aborted · audio-capture 는 retry" · "듣기 끝: 앱이 끊은 객체와 옛 객체의 일은 버린다" · "듣기 끝: 글 없이 끝나면 '결과 없음', 글 뒤 no-speech 는 한 문장 답이면 끝나고 두 문장 이상이면 다시 시작한다" · "듣기 끝: 말하기 버튼은 abort 가 아니라 stop 을 부른다" · "듣기 끝: cancel 은 abort 하고 '끊김'으로 끝난다" · "음성 설정: 시험용 음성 설정값은 12절 기본값과 같다" · "음성 설정: 키가 하나라도 없으면 읽기가 실패한다" · "기록 대본 다시 돌려 보기: <파일> <이름>"(H2 뒤 생김) | `tests/unit/listen-end.test.ts` | P2a · P2b-8 |
| 6.2 규칙 | 단위 "일치율: 축약형을 펼쳐 견준다" · "일치율: 동음이의어 묶음은 같은 낱말로 본다" · "일치율: 숫자 · 서수 · 시각을 낱말로 바꾼다" · "일치율: 순서를 지킨 낱말만 센다" · "일치율: {NAME} 자리는 아무 낱말 하나와 맞고 빼기를 고르면 분자 · 분모에서 빠진다" · "일치율: 허용 답이 여럿이면 가장 높은 값을 쓴다" · "일치율: 인식이 비면 0, 목표가 비면 오류다" | `tests/unit/match-rate.test.ts` | P2a |
| 7절 브라우저 표 | 단위 "기기 판정: iPad Safari(데스크톱 UA · 터치)는 ok 이고 이름이 'iPad Safari <판>' 이다" · "기기 판정: iPad 의 Chrome(CriOS) · 인앱 브라우저는 not-listed" · "기기 판정: Firefox 는 not-listed, 인식 API 가 없으면 no-api" · "기기 판정: Android Chrome · Windows Edge · Windows Chrome 은 ok" · "기기 판정: 7절 표 밖(macOS Safari · 삼성 인터넷)은 API 가 있으면 ok 이고 listed 는 거짓" · "기기 판정: 안전한 출처가 아니면 insecure" | `tests/unit/speech-device.test.ts` | P2a |
| 접점 · 가짜 · 관찰 페이지 | e2e "관찰 페이지: 읽어 주기 → 인식 교대 세 턴이 턴마다 새 인식 객체를 쓰고 둘째 턴부터 누름 없이 읽어 준다" · "관찰 페이지: 이벤트가 오지 않는 가짜에서 감시 타이머가 한 번 다시 시작하고 또 멈추면 '멈춤'이다" · "관찰 페이지: 인식 API 가 없으면 기기 판정이 no-api 이고 마이크 확인이 실패한다" · "관찰 페이지: not-allowed 는 mic-unavailable 갈래로 보인다" · "관찰 페이지: 내보낸 대본이 대본 규격을 통과한다" | `tests/e2e/speech-probe.spec.ts` · `tests/e2e/fixtures.ts` | P2b |
| 운영 빌드에서 관찰 페이지 빠짐 | `rm -rf .next && VERCEL_ENV=production pnpm build` 의 경로 목록에 `/dev/speech-probe` 없음, `rm -rf .next && pnpm build` 에는 있음(구현 보고에 두 출력) | `next.config.ts`(공용) | P2b |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int`(지금처럼 0개 통과) · `pnpm e2e` · `pnpm check:deps` · `pnpm check:bundle` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`, CI `ci / lint · build · unit · depcruise · spec-trace · bundle-secrets`(다-2 를 켜면 e2e 도) | `.github/workflows/ci.yml` | 둘 다 |

## 완료 보고 (Done)

구현 뒤 채운다.
