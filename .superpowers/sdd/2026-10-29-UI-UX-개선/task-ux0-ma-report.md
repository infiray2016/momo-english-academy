# 구현 보고: UI · UX plan 묶음 0-마 필수 e2e 정적 작성(구현자 · Opus · high, 2026-10-30)

상태: **작성됨**(tsc 는 내 파일 오류 0, lint 통과, 실행은 안 함) · 워크트리 p13d · 커밋 안 함 · 앱 코드는 바꾸지 않음(더한 data-* 표지 0).
'실행 통과'는 11-01 뒤 CI e2e 에서 확인한다(plan '필수 둘').

## 바뀐 파일
- 새 파일 `tests/e2e/route-watch.ts`: '/' 요청 셈 도우미다.
  - 순수 가름 `isHomeVisit` 는 '/' 문서 이동과 '/' 의 RSC 요청만 센다.
  - 미리 읽기(next-router-prefetch · segment-prefetch)와 서버 액션(next-action)은 세지 않는다.
  - `watchHomeRequests(page)` 의 `.stop()` 이 빈 배열이어야 한다.
- 새 파일 `tests/e2e/screen-sampler.ts`: 200ms 표본 도우미다.
  - 표지 여섯과 글이 있는 role=status 를 화면 표시로 센다.
  - 이름별 고르개의 글이나 속성 값을 남기고, `longestBlankMs` · `heldUntil` · `firstIndexOf` 로 분석한다.
  - 시험 쪽 상수는 SAMPLE_MS 200(9절)과 MAX_BLANK_MS 5000(AC-23a (4))이고, 파일 머리에 까닭을 적었다.
- 새 파일 `tests/e2e/required-utterance.spec.ts`: 필수 경로 가, 시험 4.
- 새 파일 `tests/e2e/required-recovery.spec.ts`: 필수 경로 나, 시험 14. N-19 · N-20 은 끝에 자리 주석만 두었다.
- 새 파일 `tests/unit/required-e2e-helpers.test.ts`: 두 도우미의 순수 판정을 잠그는 시험 8이다. 브리프 표에 없던 파일이다(정적 작성이라 셈 논리만이라도 잠금).
- 도우미 수정(필요한 것만):
  - `tests/e2e/db.ts` 에 `settingValueOf` 와 `removeHouseholdSetting` 을 더했다. 후자는 행을 그대로 다시 넣는 되돌리기를 돌려준다.
  - `tests/e2e/talk.ts` 에 `liftSafetyCap` 과 `pastTurnInFlight` 를 더했다.
  - `tests/e2e/lessons.ts` 에 `deliverFeedback`(가짜 첨삭 도착)을 더했다.

## 경로와 재는 법
모든 경로는 첫 화면을 연 뒤 `watchHomeRequests` 를 걸고, 끝에 '/' 요청 0회를 단언한다.
- **가 (AC-23f) 회화 1단계:** 인사 턴은 바로 보낸 턴이다. 대화 첫 턴은 바로 보내지거나 '보내기'를 거친다.
- **가 (AC-23f) 회화 4단계:** 인식 확인 뒤 '보내기'로 보낸 턴 둘을 잰다.
- **가 (AC-23f) 1단계 쉬는 안내:** 다음 반응이 쉬는 안내일 때를 잰다(reachSafetyCap).
  - 위 세 회화 경로는 가짜 SSE 의 첫 문장을 2.5초 늦춘다.
  - 아이 말풍선이 보낸 표본부터 반응 표본 앞까지 인식 글 그대로인지 본다(heldUntil).
  - 기다림 표시는 시험 DB 의 ui.wait_hint_seconds 첫 값 안에 보여야 하고, 빈 구간은 5초 이하여야 한다.
- **가 (AC-23f) 말하기 세션:** 따라 말하기 data-heard 가 data-activity-no 가 바뀔 때까지 남는지 본다.
- **N-1 · N-2 · N-3 막힘:** 가짜 음성 not-allowed 뒤 소리 들어옴으로 막힘을 만든다. 큰 단추는 '다시 해 볼래요', 작은 단추는 '홈'이어야 한다.
  - N-1 은 같은 활동 번호 · 끝 시도 0 · 그 낱말 인식을 본다.
  - N-2 는 같은 인사 질문 · '시작!' 없음 · 아이 행 0 뒤 턴이 이어지는지 본다.
  - N-3 은 같은 문항 id 와 '문제 1' 을 본다.
- **N-5 · N-6 · N-7 쉼:** reachSafetyCap 으로 쉼을 만든다.
  - 큰 단추는 '홈', 작은 단추는 '다시 해 볼래요'이고, 아직 쉬면 data-ai-rest-still 이 보여야 한다.
  - liftSafetyCap 으로 ai_calls 를 지운 뒤 다시 누르면 같은 자리여야 한다.
  - N-5 는 같은 세션 · 활동이다. N-6 은 같은 시도 id 의 아이 행 하나와 다음 선생님 말이다.
  - N-7 은 두 길이다. 결과 '다음 수업'은 둘째 수업의 새 세션이고, 마무리 셋째 장 '다음 이야기'는 '그만하기' → 정리 → 첫 장 → 셋째 장을 거친다.
- **N-8 목록 쉼:** 목록을 떠나지 않고 카드 아래 data-ai-rest-line 이 보인다. 다시 누르면 still 이고, 풀리면 세션이 열린다.
- **N-9 홈 쉼:** '첨삭이 왔어요' 아래 쉼 줄이 보이고 주소는 '/' 그대로다. 풀리면 둘째 세션이 열린다.
- **N-10 홈 다시 확인:** 첫 확인이 실패하면 닫힌 채다. 둘째 확인에 소리가 들어오면 href 가 열리고 저장값이 지워진다.
- **N-15 앱 오류:** `removeHouseholdSetting('speech.skip_notice_seconds')` 뒤 다시 읽으면 '잠깐 문제가 생겼어요'가 보인다.
  - MutationObserver 로 판과 data-trouble-retrying 을 변화마다 기록한다.
  - 행을 되돌린 뒤 큰 '다시 해 볼래요'를 누른다.
  - 흐림이 붙은 뒤 판이 바뀌기 전까지 풀린 적이 없는지 본다(0-나 보탬). 같은 활동 번호인지와 세션이 진행인지도 본다.
- **N-16 없는 주소:** 모르는 id · 틀린 꼴 id · 남의 세션의 세션 · 결과 주소를 연다. 남의 세션은 프로필 행을 본떠 하나 더 넣는다. '찾는 화면이 없어요'와 큰 '홈' 하나가 보이고 주소는 그대로여야 한다.
- **N-12 복구 예외(회화):** 4단계에서 연결 오류 두 번이 나면 저장 안내가 뜬다.
  - '수업 목록' → '하던 수업 이어 하기' → '시작!' 을 거친다.
  - 말 주고받기 수가 같아야 하고, 첫 문장은 2초 늦춘다.
  - 앞 대화 기록이 그대로이고, 같은 시도 id 의 아이 행 하나와 토리 행 하나가 더해져야 한다.
- **N-13 복구 예외(첨삭):** 첨삭 대기(잡힘)를 1시간 앞으로 물린다.
  - 결과 '수업 목록' → '아직 글을 살펴보고 있어요' → 가짜 첨삭 도착 → 목록 다시 읽기 → '첨삭 보기' 를 거친다.
  - feedback-praise 와 칭찬 글이 보여야 하고, 둘째 세션은 같은 수업의 rewrite 여야 한다.

## M4 처리
test.fixme 를 쓰지 않았다. N-6 과 N-12 는 다시 보내기 전에 `pastTurnInFlight` 를 부른다. 이 도우미는 그 세션 마지막 아이 행의 recorded_at 을 5분 앞으로 물린다. 서버 TURN_IN_FLIGHT_MS 는 60초이고, e2e 는 server-only 를 못 가져와 시험 상수로 두었다. 실제로 그만큼 기다린 뒤 다시 보내는 것과 같다. 서버 쉼 길의 결함(60초 안에 풀리면 '시작!'을 다시 거침)은 그대로 남는다. 회화 구현이 고칠 때 물리기 없는 변형을 더하길 권한다.

## check:bundle(0-나 M1)
`pnpm build` 는 다른 손의 시험 형 오류로 멈췄다(아래). 그래서 `next build --experimental-build-mode compile`(형 검사 · 미리 그리기 없음)로 묶음을 만들었다.

| 측정 | 값 |
|---|---|
| check:bundle | 파일 219 · 화면 파일 0(compile 이라 미리 그린 파일 없음) · 위반 0 |
| 첫 JS: '/' | 10 파일 · 262KB · 음성 코드 든 묶음 1 · 3D 0 |
| 첫 JS: 세션 | 12 파일 · 421KB · 음성 1 · 3D 0 |
| 첫 JS: 없는 주소 | 5 파일 · 215KB · 음성 1 · 3D 0 |

없는 주소의 첫 JS 를 보면 app/error · app/not-found 항목이 각각 4파일 약 209KB 이고, 음성 코드(speechSynthesis · webkitSpeechRecognition)를 싣는다. M1 이 사실로 확인됐다. 고치지 않았다(2-가 몫).

## 관문(2026-10-30, p13d — 다른 손의 진행 중 변경 포함)
| 관문 | 결과 |
|---|---|
| pnpm lint | 실패: 오류 6, 모두 다른 손 파일(speech-pace · speech-speak · teacher-voice · speaking-meaning 시험, src/core/speaking/meaning.ts 형식, fake-web-speech-defaults import 차례). 내 8파일은 `biome check` 통과 |
| pnpm exec tsc --noEmit | 실패: 오류 14, 모두 speech-pace.test · teacher-voice.test(rateKo · voiceFor — 음성 층 작업의 먼저 쓴 시험). 내 파일 0 |
| pnpm test | 3 파일 · 10 시험 실패(listen-end · speech-pace · teacher-voice — 같은 작업), 101 파일 통과. 내 required-e2e-helpers 8 통과 |
| pnpm check:deps | 위반 0 (241 modules) |
| pnpm check:ids | 위반 0, design-number 49 |
| pnpm spec:trace --fail-on unknown-ac | 처음에는 unknown-ac 38 로 실패했다. 컨트롤러가 specs 사본을 맞춘 뒤 다시 돌려 종료 0 · unknown-ac 0 · missing-test 16(모두 P12)이다 |
| pnpm build | 실패: 위 시험들과 session-spares.test 의 형 오류. compile 모드는 통과 |

## 우려(3, 풀린 것 1)
1. **(풀림) AC-23 이름과 정본 사본.** 워크트리 specs 사본에 AC-23 줄이 없던 문제는 컨트롤러가 사본을 맞춰 풀렸다. spec:trace 는 이제 종료 0 이다.
2. **실행해 보지 않았다.** 특히 아래 셋은 실행에서 처음 드러난다.
   - 회화 4단계 견본(greetingToTalkLesson(4))이 작은 틀에서 만들어지는지
   - N-7 결과의 next 가 'lesson'(둘째 수업)인지
   - N-16 의 둘째 프로필 행 때문에 readHouseholdProfile(limit 1, 순서 없음)이 다른 프로필을 고르지 않는지
3. **M4 는 시험만 비켜 간다.** pastTurnInFlight 는 시험이 서버 창을 비켜 가는 길이다. 아이가 60초 안에 '다시 해 볼래요'를 누르면 '시작!'을 다시 거치는 결함은 남는다.
4. **빌드와 첫 JS 는 이번 상태로 다시 재야 한다.** 빌드는 다른 손의 시험 형 오류로 막혔다. 첫 JS 는 compile 모드로 쟀으니 형 오류가 풀린 뒤 `pnpm build && pnpm check:bundle` 을 한 번 더 돌려야 한다.
