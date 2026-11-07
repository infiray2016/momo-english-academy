# 보고: P2 하위 plan 작성(음성 접점과 실기 확인)

브리프: `task-p02-plan.md` · 쓴 사람: 계획자(general-purpose · Opus · xhigh) · 일시: 2026-10-16 · 상태: DONE_WITH_CONCERNS(착수 전에 컨트롤러가 정할 것이 있다. P2a 전 가-1 · 가-4, P2b 전 가-2 · 다-1~다-4, H2 전 가-5, P11 전 가-3)

## 쓴 파일

| 파일 | 줄 | 파일 수 | 작업 수 |
|---|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`(상태 draft) | 386 | P2a 10 · P2b 10(새 파일만), 공용 변경 요청 넷 | P2a 7 · P2b 8 |
| 이 보고 | — | — | — |

합치면 파일 20 · 작업 15 라 묶음 plan 위험 12 기준(열 · 여덟)을 넘어 PR 둘로 나눴다. P2a 는 순수 함수(일치율 · 한 번 듣기 판정 · 기기 판정 · 대본 규격)와 단위 시험이다. P2b 는 브라우저 구현 · 가짜 · 관찰 페이지 · e2e · 점검표 · H1 · H2 다.
팀장 메시지가 '그 두 파일 밖의 저장소 파일은 고치지 않는다'고 해서 plan 파일은 하나로 두고 안에서 둘로 나눴다. 두 파일로 가르려면 컨트롤러가 정한다(다-9).
코드 · 설치 · 생성 명령은 돌리지 않았다. 저장소에서는 읽기 명령만 썼다. MDN 호환 자료 JSON 과 WebKit 원본 파일은 스크래치 폴더에 받아 읽었다. 새 패키지가 없어 `npm view` 는 쓰지 않았다.

## 확인한 사실(26건, 2026-10-16)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | SpeechRecognition 은 Chrome 139 부터 접두사 없이(33 부터 webkit), Safari 14.1 부터 webkit, Firefox 는 미리보기판만. Edge · Chrome Android · 삼성 인터넷 · iOS WebView 는 mirror | MDN browser-compat-data `api/SpeechRecognition.json`(main) |
| 2 | continuous 는 Chrome Android 에서 '설정은 되나 효과 없음', Safari 17 부터 온전 | 같은 파일 |
| 3 | processLocally · available · install 은 데스크톱 Chrome 139 만(Android · Safari 없음), phrases 는 Chrome 142, unspokenPunctuation 은 Chrome 151 | 같은 파일 |
| 4 | 오류 값 아홉(aborted · audio-capture · bad-grammar · language-not-supported · network · no-speech · not-allowed · phrases-not-supported · service-not-allowed). 7절은 여섯을 다룬다 | https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error (2025-09-30 수정) |
| 5 | 명세상 SpeechRecognition 은 [SecureContext]. start() 중복은 InvalidStateError, abort() 는 end 만 정하고 aborted 오류는 정하지 않음, 이벤트 순서는 일부만 정함 | https://webaudio.github.io/web-speech-api/ (CG 초안 2026-10-15) |
| 6 | SpeechSynthesis 는 Safari 7 부터, voiceschanged 는 Safari 16 부터. Chrome Android 의 pause 는 cancel 과 같음. boundary 는 Chrome 에서 기대대로 안 남 | MDN browser-compat-data `api/SpeechSynthesis.json` · `api/SpeechSynthesisUtterance.json`(main) |
| 7 | Chrome 71 부터 문서가 사용자 동작을 받지 않았으면 speechSynthesis.speak() 가 오류 | https://developer.chrome.com/blog/chrome-71-deps-rems (2018-10-29 갱신) |
| 8 | WebKit(iOS): 문서가 소리 재생에 누름을 요구하면 합성에 제약, 누름 처리 중 speak() 가 제약을 풂, 그 전 speak() 는 이벤트 없이 돌아감, cancel() 은 지금 발화의 오류를 바로 냄 | WebKit `Source/WebCore/Modules/speech/SpeechSynthesis.cpp`(main, 2026-10-12 845b737) · 버그 223473(2021-03-18 FIXED) |
| 9 | WebKit 인식 start() 에 누름 검사 없음, 쪽이 멈추면(suspend) abort, 오류와 끝은 따로 | WebKit `Source/WebCore/Modules/speech/SpeechRecognition.cpp`(main, 2026-06-26 2f88bc0) |
| 10 | WebKit 권한: 마이크 거부 not-allowed, 인식 서비스 거부 · 그 언어 서비스 없음 service-not-allowed, 사이트 권한 거부 not-allowed, 쪽이 안 보임 not-allowed | WebKit `Source/WebKit/UIProcess/SpeechRecognitionPermissionManager.cpp`(main, 2026-03-11 bf66536) |
| 11 | W3C 이슈 96: iOS · iPadOS Safari 18.7.3 · 26.2 · 26.6 에서 오디오 재생 뒤 인식이 오류 · 끝 없이 멈춤. 2026-01-20 닫힘, 마지막 댓글 2026-08-27 | https://github.com/WebAudio/web-speech-api/issues/96 |
| 12 | WebKit 버그 321436(NEW, 2026-09-27 수정): 둘째 댓글(iOS 27.0 · iPhone 17 · 홈 화면 웹 앱)이 speechSynthesis 뒤 같은 인식 객체가 멈춘다고 적었다. 읽어 주기 앞 abort 와 끝난 뒤 새 객체로 21회 넘게 됐다고 했다 | https://bugs.webkit.org/show_bug.cgi?id=321436 |
| 13 | WebKit 버그 317741(FIXED 2026-06-26, 315887@main), 담긴 Safari 판은 적혀 있지 않음 | https://bugs.webkit.org/show_bug.cgi?id=317741 |
| 14 | Chrome iOS UA 는 데스크톱 사이트 요청에도 CriOS 를 넣음(M85 부터) | https://chromium.googlesource.com/chromium/src/+/HEAD/docs/ios/user_agent.md · https://blog.chromium.org/2020/09/changing-chrome-on-ios-user-agent-for.html |
| 15 | TypeScript 5.9.3 lib.dom 에 SpeechRecognition · 그 이벤트 · 오류 이벤트 형이 없음(결과 목록 · 합성 형은 있음) | `node_modules/typescript/lib/lib.dom.d.ts`(이 저장소) |
| 16 | Next 16.4.2: 'use client' 경계, 브라우저 전용 API 는 클라이언트 구성 요소에서, client-only 는 설치 없이 Next 가 처리 | `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`(16.4.2) |
| 17 | pageExtensions 는 목록을 통째로 바꿈. App Router page 파일은 `(page\|route)\.(<확장자들>)$` 로 고름. Turbopack 미지원 목록에 없음 | `…/pageExtensions.md` · `…/proxy.md` · `node_modules/next/dist/server/lib/find-page-file.js` · `…/08-turbopack.md`(16.4.2) |
| 18 | VERCEL_ENV 는 빌드 · 실행 때 있음(production · preview · development), 시스템 변수 쓰기 설정이 켜져 있어야 함 | https://vercel.com/docs/environment-variables/system-environment-variables (2026-07-15) |
| 19 | 새 프로젝트의 첫 배포는 늘 운영 배포. --prebuilt 면 빌드 때 시스템 변수가 없음 | https://vercel.com/docs/cli/deploy (2026-09-18) |
| 20 | Standard Protection · Vercel Authentication 은 모든 요금제, 비밀번호 보호는 Hobby 에 없음, 새 프로젝트 기본값은 문서에 없음 | https://vercel.com/docs/deployment-protection (2026-09-15) · …/vercel-authentication (2026-09-15) |
| 21 | 공유 링크는 모든 요금제, Hobby 는 공유 링크와 외부 사용자가 계정당 하나 | …/sharable-links (2026-08-28) · …/vercel-authentication |
| 22 | Playwright addInitScript 는 문서가 생긴 뒤 쪽 스크립트 전, 이동 · 하위 프레임마다, arg 직렬화, 여럿이면 순서 미정 | https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script |
| 23 | Playwright 시계 install 이 setTimeout · Date · performance · requestAnimationFrame 등을 덮고 runFor 로 움직임 | https://playwright.dev/docs/clock |
| 24 | spec-trace 는 한 줄 따옴표 이름의 맨 앞 AC 토큰과 이어진 토큰만 셈 | `scripts/spec-trace.ts`(cf97f62) |
| 25 | P1a 가 '모든 e2e 는 P2 가 만들 `tests/e2e/fixtures.ts` 의 `test` 를 가져온다'고 정함. CI e2e 작업은 P10 몫 자리 | `plan-p01a-뼈대.md` 값 11 · `.github/workflows/ci.yml` |
| 26 | 브리프가 가리킨 `docs/research/2026-10-15-program-reverse-engineering.md` 에는 브라우저 음성 관찰이 없다(참고 프로그램 비교 문서). 브라우저 음성 사실은 `2026-10-16-reverse-engineering.md` 의 '쓰는 외부 API와 브라우저 기능' 절과 검토 기록 `round-2-b.md` · `round-3-b.md` · `round-4-b.md` 에 있어 거기서 가져와 오늘 다시 확인했다 | 이 저장소 |

## (추측)으로 둔 것(15건)

1. iPad 에서 Siri · 받아쓰기를 끄면 Safari 가 service-not-allowed 를 낸다(WebKit 의 '서비스 없음' 갈래에서 끌어냄). H2 의 I-5 가 확인한다.
2. 321436 의 멈춤(보고는 iPhone · 홈 화면 웹 앱)이 iPad Safari 탭에서도 같다. 새 객체 우회도 iPad 에서 된다.
3. onAbort 의 기본 꼴(error aborted 뒤 end)은 Chrome 꼴이다.
4. 합성 cancel 때의 오류 이름(interrupted · canceled).
5. 발화 객체를 붙들지 않으면 Chrome 에서 end 가 안 올 수 있다.
6. 소리 0 인 빈칸 한 글자 발화로도 iOS 제약이 풀린다(코드상 speak 를 부를 때 풀리므로 내용과 무관하다고 봄).
7. `import "client-only"` 가 설치 없이 빌드된다.
8. Turbopack 이 pageExtensions 의 복합 접미(`preview.tsx`)를 webpack 쪽 고르기 코드와 같게 다룬다. 두 빌드의 경로 목록으로 증명한다.
9. 감시 타이머 다시 시작 때 옛 객체가 끝나기 전에 새 객체를 시작해도 브라우저가 받는다.
10. 인앱 브라우저 UA 토큰(KAKAOTALK · NAVER(inapp)과 FxiOS · EdgiOS 의 데스크톱 모드 꼴.
11. 새 Vercel 프로젝트의 Deployment Protection 기본값.
12. Edge 인식은 Azure 온라인 서비스다(2차 자료).
13. Playwright 의 TS 변환이 가짜 함수에 도우미를 끼우지 않는다(클래스 필드를 피하면).
14. 0~999,999 밖의 숫자 꼴은 아이 답에 드물다.
15. 마이크 확인의 audiostart 가 모든 대상 브라우저에서 온다.

## 묶음 plan 과 다르게 한 것

1. PR 둘(P2a · P2b)로 나눴다(위험 12). plan 파일은 팀장 지시로 하나다.
2. 파일 묶음에 더했다. `src/core/speech/device.ts`(7절 지원 표 판정 · 알림의 브라우저 이름)와 `src/core/speech/script.ts`(대본 규격), `src/lib/speech/` 셋, `tests/unit/speech-device.test.ts`, `tests/fixtures/speech/{settings,homophones,probe-text}.json` 이다. 모두 배정표 폴더 안이다. `tests/e2e/fixtures.ts` 는 배정표 밖이지만 P1a 가 P2 에 맡긴 파일이다.
3. 관찰 페이지 파일 이름을 `page.preview.tsx` 로 해 운영 배포 빌드에서 뺀다. 그래서 `next.config.ts` 공용 변경이 필요하다.
4. 증명의 AC-5e 는 말하기 몫만이다. '배치 실패 3번 → 예비'는 P10, 회화 몫은 1-나다. 관찰 페이지 e2e 하나를 AC-5e 로 이름 붙였다(15절 증명 방식이 'Playwright + 단위'). 감시 타이머 단위 시험에는 AC 접두를 붙이지 않았다(AC-N3 의 P2 몫은 브리프대로 점검표, 다-8).
5. 브랜치는 브리프의 `feature/1a-p02-speech` 하나 대신 `feature/1a-p02a-speech-core` · `feature/1a-p02b-speech-probe` 둘이다.
6. H2 를 둘로 나눴다. (가)는 관찰 페이지로 보는 것(P2)이다. (나)는 9절 · H2 가운데 화면이 있어야 보는 것(카드가 닫히는지, 부모 화면의 '마이크 다시 확인'으로 열리는지, 부모 화면의 설정 경로)이고 P10 · P11 · 1-나가 결과를 채운다. P2 는 같은 사실을 음성 층(오류 코드 · 갈래 · 마이크 확인)에서 본다.
7. H1 에 P2 몫의 세부를 더했다. 첫 배포는 운영 배포라 관찰 페이지가 없고, 시스템 변수 설정을 확인하고, `--prebuilt` 를 쓰지 않으며, Hobby 공유 링크는 하나다.
8. 실기 확인(H2)을 코드 검토와 나란히 당겨 할 수 있게 했다. 프리뷰는 보호되고 운영 빌드에는 없다. 구현자(에이전트)는 마이크로 말할 수 없어 실제 확인은 H2 뿐이기 때문이다.

## 컨트롤러가 정할 것(21건, 표와 까닭은 plan '정할 것')

가는 정본에 없는 것이라 정하면 13절에 한 줄을 먼저 넣는다. 나는 정본 문장 안의 해석이라 plan 승인으로 정한다. 다는 조율이다.

| 번호 | 무엇 | 권함 | 언제 |
|---|---|---|---|
| 가-1 | 7절에 없는 오류 코드 셋 | language-not-supported 는 '마이크를 쓸 수 없음', phrases-not-supported · bad-grammar 는 '결과 없음'처럼 다시 듣기 | P2a 전 |
| 가-2 | 읽어 주기가 시작 · 끝나지 않을 때 | 읽어 주는 동안에도 말하기 버튼을 누를 수 있고 누르면 읽어 주기를 멈춘다(새 숫자 없음) | P2b 전 |
| 가-3 | 두 문장 이상 말하기 활동의 시간 상한 | 새 키(제안 `speaking.answer_max_seconds.<구간>`), 값은 P6 | P11 plan 전 |
| 가-4 | 7절 표 밖 브라우저 · 인앱 · iPadOS 최소 판 | 인앱은 제외, 그 밖은 API 가 있으면 쓰고 '목록 밖'만 기록, 최소 판은 기록만 | P2a 전 |
| 가-5 | H2 통과 기준 | iPad 교대 10턴 결과 10 · 멈춤 0, Siri 끔 · 켬, 거부 뒤 허용, Android 1분 발표 빠짐 없음 | H2 전 |
| 나-1~나-7 | 일치율 = 가장 긴 공통 부분열, 감시 타이머를 결과마다 다시 잼, 영어 음성 고르는 차례, 숨은 쪽은 '끊김', 마이크 확인 기준, 결과 없음 · 이어 붙이기 · 글 뒤 no-speech, 배치의 구간 | plan 대로 | plan 승인 |
| 다-1 | 관찰 페이지 빼기 | pageExtensions + VERCEL_ENV(대안: 프리뷰 전용 이름 변수, 쪽 안 notFound()) | P2b 전 |
| 다-2 | CI e2e 작업 | P2b 에서 켬 | P2b 전 |
| 다-3 | 앱 코드가 가짜를 못 가져오는 의존 규칙 | 넣음 | P2b 전 |
| 다-4 | `tests/e2e/fixtures.ts` 와 P3b 접근 쿠키 | 먼저 만든 쪽 뒤에 다른 쪽이 더함 | P2b · P3b 전 |
| 다-5 | 시험용 설정 자리 | `tests/fixtures/speech/settings.json`(12절과 같은지 시험), 공용 자리가 생기면 옮김 | plan 승인 |
| 다-6 | 단계 → 구간 함수 | `listen.ts` 안, 공용 자리가 생기면 그것 | plan 승인 |
| 다-7 | 정규화 표기 · 동음이의어 목록 꼴 | plan 값 1 규칙을 P4 · P8 브리프에 옮김 | P4 승인 전 |
| 다-8 | 감시 타이머 시험의 AC-N3 접두 | 붙이지 않음 | plan 승인 |
| 다-9 | 브랜치 · plan 파일 | 브랜치 둘, 파일 하나(원하면 가름) | plan 승인 |

## 요청하는 공용 변경

1. `next.config.ts`(P2b 필수). `pageExtensions` 를 VERCEL_ENV 가 production 이면 `["tsx","ts","jsx","js"]`, 아니면 거기에 `"preview.tsx"` 를 더한 것으로 둔다. 코드는 plan '요청하는 공용 변경' 1. P3 · P4 브리프 범위에 이 파일이 없어 P2b 구현자에게 허락해도 된다.
2. `.github/workflows/ci.yml`(선택, 다-2). e2e 자리를 채운다(준비 네 줄 + `pnpm exec playwright install --with-deps webkit` + `pnpm e2e`).
3. `.dependency-cruiser.cjs`(선택, 다-3). 규칙 `no-fake-speech-in-app`(src 는 `src/lib/speech/fake-web-speech` 를 가져오지 않는다).
4. `tests/e2e/fixtures.ts` 는 P2b 가 만들고 P3b 가 접근 쿠키 준비를 더한다(다-4).

`package.json` · `pnpm-lock.yaml` · `vitest.config.mts` · `playwright.config.ts` · `.env.example` 은 바꾸지 않는다. 새 패키지가 없다.

## 남은 우려

- WebKit 321436 이 iPad Safari 탭에서도 생기고 새 객체 우회가 듣지 않으면 회화 · 말하기 교대가 기기에서 멈춘다. 1-가 전체의 갈림길이라 H2 를 가장 먼저 당겨 하기를 권한다. 실패면 S7(서버형 음성 인식) 결정과 P10 · P11 다시 계획이 뒤따른다.
- iPadOS 27.0 이 2026-09 에 나왔고 321436 둘째 댓글이 27.0 에서 생긴 문제라고 적었다. 가정 iPad 의 OS 판을 H2 기기 표에 꼭 적는다.
- 관찰 페이지는 실제 마이크가 있어야 해서 구현자 · 검토자는 가짜까지만 본다. 실제 동작의 증거는 요청자의 H2 뿐이다.
- 가-3(두 문장 이상 활동의 시간 상한)이 정해지지 않으면 P11 이 말하기 5단계부터를 마무리할 수 없다.
