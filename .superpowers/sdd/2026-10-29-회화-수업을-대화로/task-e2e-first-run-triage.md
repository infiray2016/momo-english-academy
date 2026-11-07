# e2e 첫 실행 실패 분류(2026-11-05, GitHub Actions 실행 42024152908, 워크트리 p13d HEAD ed5d845)

분석가 보고입니다. 코드 · 시험 · 설정은 바꾸지 않았습니다. 판정은 로그와 코드 대조이며, 묶음마다 확신 정도를 적었습니다.

## 1. 대조 범위와 본 자료

- 로그: 스크래치패드 `ci-3-e2e-clean.log`(2,970줄). 결과는 실패 52 · flaky 1 · 통과 145, 32.2분입니다(L2913~2968).
- 실행 순서 대조: `CI=1 playwright test --list` 로 뽑은 198건 목록과 진행 기호(`·` 통과, `×F` 실패, `×T` 재시도 시간 초과, `×±` flaky)를 한 건씩 맞췄습니다. 실패 52건의 자리가 목록과 정확히 일치합니다. 만든 파일(스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/`):
  - `e2e-run-order.txt`: 진행 번호 · 결과 · 시험 제목 198줄
  - `e2e-triage-digest.txt`: 실패마다 첫 오류 · locator · 시험 줄(550줄)
  - `e2e-settings-diff.txt`: e2e DB 설정값과 `tests/fixtures/settings.ts`(TEST_SETTINGS)의 차이
- 읽은 코드: `tests/e2e/`(talk.ts · lessons.ts · db.ts · household.ts · child-size.ts · 실패한 spec 열셋), `tests/fixtures/seed/`(dev-tree.ts · loadable.ts · builders.ts), `scripts/dev-db.ts` seedIfEmpty, `playwright.config.ts`, `.github/workflows/ci.yml` e2e 작업, `src/server/conversation/index.ts` · `state.ts`, `src/core/conversation/chances.ts` · `listen.ts` · `lesson-flow.ts`, `src/components/conversation/follow-along.tsx` · `talk-frame.tsx`, `src/app/(child)/home-cards.tsx` · `[area]/lessons/lesson-board.tsx` · `use-lesson-start.ts`, `src/components/board/decor.tsx` · `board.tsx` · `paper-key.ts`, `src/components/session/activity-progress.tsx`, `src/server/session/index.ts`, `src/core/session/preview.ts`, `src/db/schema/content.ts`, 정본 13절 C80.
- 한계: CI 는 `test-results/photos` 만 올려서 error-context.md 와 trace 가 없습니다. 화면 상태는 로그의 locator 호출 기록으로만 봤습니다.
- e2e DB 적재 경로: `seed:load` 명령이 아니라 `scripts/dev-db.ts` `--ephemeral` 의 seedIfEmpty(484~527줄)가 시험용 나무 `devSeedTree()` 를 넣습니다. 적재 범위는 `DEV_SEED_THROUGH = LOADABLE_THROUGH = 1`(`tests/fixtures/seed/loadable.ts:34`)입니다. 참조 자료(단계 규격 · 단원 규격 · 어휘)는 1~12단계 모두 들어갑니다(`builders.ts:738~744` levelSpecRows 가 levels() 를 돎). 수업은 1단계뿐이고 `seed.complete_through_level` 은 1 입니다.
- 설정값 차이: e2e DB 설정은 smallFrameSettings 를 먼저 쓰고 없는 키만 TEST_SETTINGS 에서 채웁니다(`loadable.ts:57~71`). 그래서 다섯 키가 TEST_SETTINGS 와 다릅니다: `placement.items_per_level` 1(시험표 3), `talk.prep_words.1-3 · 4-6 · 7-9 · 10-12` 1(시험표 3 · 2 · 2 · 2).

## 2. 원인 묶음 표

판정 머리글: 시험 = 시험 코드 · 도우미 결함, 견본 = 시험 견본 결함, 격리 = 시험 사이 자료 충돌, 앱 = src 결함, 환경 = e2e DB 시드 · 설정 결함. 이번 실행에서 '환경' 판정은 없습니다(시드 · 설정은 설계대로 들어갔고, 시험이 그 범위를 잘못 가정했습니다).

| 묶음 | 수 | 해당 시험(spec:줄) | 근거 로그 줄 | 코드 줄 | 판정 · 확신 | 고칠 방향 | 누가 |
|---|---|---|---|---|---|---|---|
| A. 회화 시작 단계가 시드 범위(1단계)를 넘어 집 넣기에서 던짐 | 18 | talk-lesson 17건 전부(160~872), required-utterance:363(4단계) | L967~985 등 talk-lesson 17건 모두 `RangeError: 시작 단계는 1~1 정수다: talk 3`, L436~452 `talk 4` | `tests/e2e/talk.ts:135` talkHousehold 가 범위를 올리지 않음, `src/core/profile/start.ts:209~216` 범위 검사, `tests/e2e/household.ts:81`. 대조: `tests/e2e/lessons.ts:107` atLevel 은 `withHouseholdSetting("seed.complete_through_level", LEVEL_MAX)` 로 감싸지만 talk 를 받지 않음(Exclude talk). `required-recovery.spec.ts:843~846`(N-12, 4단계)은 직접 감싸서 통과함 | 시험(도우미) · 높음 | talkHousehold 안에서 level > 1 이면 withHouseholdSetting 으로 감싸거나, atLevel 이 talk 를 받게 함 | 시험 구현자 |
| B. 1단계 '인사 → 대화' 견본에도 짧은 준비가 붙어 대화 첫 질문 대신 준비 쪽지가 뜸 | 7 | required-utterance:302 · :421, required-recovery:559, teacher-window:329 · :659 · :848 · :899 | `[data-child-turn]` 없음 30초: L376~399(둘째 measuredTurn, 346줄), L585~610, L2509~2535, L2573~2595, L2629~2653. 말풍선이 인사 응답에서 멈춤: L263~269 `Great!Great!LeLet's talk.`(기대 `What do you see?`), L2396~2402 | `talk.ts:381~393` greetingTalkLesson 은 card.prep 만 지우고 필수 질문 · 더 이야기할 거리는 남김. `src/server/conversation/index.ts:1122~1131` prep_mode 가 always 면 startPrepWordsOf, `src/core/conversation/chances.ts:294~298` card.prep 이 비면 노리는 단어에서 고름(C33), `index.ts:1086~1094` 노리는 단어 = required · more 의 targets, `index.ts:432~448` 인사가 끝나면 준비로 넘김. 설정 `talk.prep_mode.1-3` = always | 견본(가정 틀림) · 높음. 앱은 C33 대로 움직임. 보강 근거: 같은 견본의 4단계(prep_mode when_needed)인 N-12 는 대화 턴까지 갔음(재시도 통과) | 1~3단계에서 준비 없이 대화로 가려면 (1) 견본 노리는 단어를 미리 '안다'로 넣거나(`talk.ts` meetSayWords known), (2) 그 시험 동안 `talk.prep_mode.1-3` 을 when_needed 로 두거나, (3) 시험이 준비 쪽지를 지나가게(talk-lesson throughGreetingAndPrep 꼴) 함. talk.ts:377~380 주석의 '짧은 준비 토막이 없다'도 고침 | 시험 구현자 |
| C. 인사 턴의 인식 확인을 기다리지 않는 5초 셈 | 3 | speech-feedback:166 · :231 · :295 | L701~718, L747~764, L827~844: `expect.poll(turnRequests).toBe(1)` 5초 동안 0 | `speech-feedback.spec.ts:184 · 253 · 314` 기본 5초. `src/core/conversation/listen.ts:110~111` 견줄 문장이 없는 1~3단계 턴(인사)은 확인 칸을 `talk.confirm_seconds`(2초) 동안 보인 뒤 보냄. 끝 침묵 `speech.end_silence_seconds.talk.1-3` 3초, saidRun 결과 300ms(`talk.ts:172~186`). 합 약 5.3초 > 5초 | 시험(시간 창) · 높음. 결정적이라 재시도도 같음 | 확인 칸이 보이면 '보내기'를 누름(`required-utterance.spec.ts:155~163` sendTurn 꼴) 또는 poll 시간을 설정값 합 + 여유로. 고친 뒤 :295(U5-4)는 B 에도 걸림 | 시험 구현자 |
| D. 짧은 준비 낱말이 하나뿐인 견본 | 2 | speech-feedback:256 · :381 | L795, L875 `견본 꼴 — 짧은 준비 낱말 둘` | `builders.ts:274` smallFrameSettings `talk.prep_words` 1 → `builders.ts:2084~2089` 견본 prep 1개. 시험 `speech-feedback.spec.ts:267~268 · 385~386` 은 둘을 요구 | 견본 · 높음 | 시험 안에서 prep 둘인 카드를 만들어 넣음(새 단어 둘을 prep 와 오늘 쓸 말에). 숫자는 시험표(3)가 아니라 DB 값(1)을 읽게 | 시험 구현자 |
| E. 준비 쪽지 따라 말하기 대본이 낱말만 말함 | 1 | teacher-window:620 | L2455~2464 결과가 `한 번 더 들어 볼까요`(기대 `잘 말했어요`) | `src/components/conversation/follow-along.tsx:530~539` 1~3단계 쪽지 들려줄 말 = modelLine, `builders.ts:2210~2212` 견본 modelLine = `I see a <낱말>.` 꼴, 시험 `teacher-window.spec.ts:624~629` 는 `saidRun(w0)`(낱말만) | 시험 · 높음 | 대본을 card.todayWords 의 그 낱말 modelLine 으로 | 시험 구현자 |
| F. WebKit 자원 시간 기록이 붙잡은 요청의 시작을 늦게 잼 | 1 | required-utterance:393 | L484~517 표본: 아이 말풍선 · 기다림 5683~6907, 잰 보낸 시각 6990, 쉼 7111(보낸 시각 뒤 첫 표본이 이미 쉼이라 '반응 앞 표본 0') | `required-utterance.spec.ts:174~191` sentAtOf 는 Resource Timing 시작 시각, `:197~208` delayTurnRequests 1.5초 붙잡음. 보낸 때(5683)와 잰 시각(6990)의 차가 붙잡은 시간과 비슷함 | 시험(잼 방법) · 중간 | 보낸 시각을 화면 쪽 표지(아이 말풍선이 처음 보인 표본, 또는 route 처리기 안에서 기록한 시각)로 잡음. :421 도 B 를 고친 뒤 같은 문제에 걸릴 수 있음 | 시험 구현자 |
| G. 수업 칸 충돌: 앞 파일이 넣은 다른 내용 행을 돌려받음 | 10 | teach-result:129(reading) · :129(writing) · :218, teach:217 · :313 · :359 · :546(×T), teacher-choice:469, speaking:569, speech-feedback:655 | 가르치는 수업 첫 활동이 `today` 가 아니라 `preview`: L1963~1974, L2027~2038, L2091~2102. 결과 첫머리 `[data-recap-head]` 없음: L1789~1798, L1847~1856, L1905~1914. `[data-teacher-choice]` 없음: L2329~2338. `잘 말했어요` 없음: L649~668. 듣기 대신 `question`: L909~920 | `tests/e2e/lessons.ts:81` insertSampleLesson `.onConflictDoNothing()` 뒤 있는 행을 돌려줌, `db.ts:146` cloneLessons 도 같음, `src/db/schema/content.ts:316~327` 칸 유일(area · level · unit · kind · lessonNo · variant · revision · correction), `db.ts:51` resetHousehold 는 수업을 지우지 않음. 충돌 쌍: `first-run.spec.ts:443~449`(읽기 1→3단계 단원 1 복제, teach 없음) ↔ 가르치는 읽기 수업, `resume.spec.ts:161~166`(쓰기 3단계 견본 빌더, teach 없음) ↔ 가르치는 쓰기 수업, `required-utterance.spec.ts:577~591`(말하기 1단계 수업 92, 질문만) ↔ `speaking.spec.ts:584~590`(92, 따라 말하기), `speaking.spec.ts:637~639`(93, 질문만) ↔ `speech-feedback.spec.ts:556~569`(93, 듣기만). `src/core/session/preview.ts:251~264` teach 가 없으면 여섯 자리 차례가 없음 | 격리 · 높음. 대조: 말하기 3단계 단원 1 은 앞서 넣는 시험이 없어 가르치는 말하기 시험(진행 152 · 158~160)은 모두 통과 | (1) insertSampleLesson · cloneLessons 가 충돌하면 있는 행 내용과 넣으려던 내용을 견주어 다르면 던지게(조용히 다른 수업으로 도는 것을 막음), (2) e2e 가 쓰는 수업 칸 · 번호를 한 표로 모아 파일마다 겹치지 않게, (3) 같은 칸이면 지우고 넣기(`talk.ts:88~` insertTalkLesson 꼴, 단 적재된 1단계 시드 칸은 지우지 않게 막음) | 시험 구현자 |
| H. 진행 막대 묶음 이름과 같은 글이라 strict 위반 | 3 | writing:371 · :755 · :929 | L2691~2697, L2751~2757(`과제` 두 요소), L2811~2817(`고쳐 쓰기` 두 요소) | `src/components/session/activity-progress.tsx`(UI · UX 묶음 5-가, 묶음 이름 표시), `src/core/session/progress.ts:26`, 시험 `writing.spec.ts:425 · 785 · 978` 은 page 전체에서 찾음 | 시험(UI 변경을 따라가지 않음) · 높음 | 활동 안으로 좁힘: `page.locator("[data-activity]").getByText(…, { exact: true })` | 시험 구현자 |
| I. 홈 세로(2×2)에서 줄마다 카드 높이가 다름 | 2 | home:329 · :564 | L112~128 세로 높이 차 12px, L156~172 세로 5px. 가로(한 줄 넷)는 통과 | `src/app/(child)/home-cards.tsx:414` `grid grid-cols-2 items-stretch … landscape:grid-cols-4`: items-stretch 는 같은 줄만 늘리고 두 줄의 높이는 내용 따라 다름. 같은 파일 56~60줄 주석은 '한 판의 카드는 줄 높이로 늘어 같은 높이(C114)' | **앱** · 중상. C114 · AC-23h '같은 크기 카드 넷'과 어긋남 | 격자에 같은 몫 줄(auto-rows-fr 등)을 줌. 세로 1180 안에 드는지 사진으로 확인 | 화면 구현자 |
| J. 아이 화면 크기 · 대비 · 꾸밈 훑기 | 1 | font-size:92 | L48~66 위반 9건: 홈 세로 · 가로 꾸밈(wave · swirl · heart)이 영역 카드와 겹침 5건, 수업 목록 · 회화 수업 목록 세로 · 가로 '다지기' 글 바로 아래가 책상 4건 | (1) `src/app/(child)/[area]/lessons/lesson-board.tsx:513` '다지기' 이름표 p 가 종이 없이 책상 위(NFR-U1 · AC-23e (2)). (2) `src/components/board/decor.tsx:10~12` 낙서는 화면 끝 3~21px(옆 여백 24px 안), `src/components/board/paper-key.ts:16` 카드 기울기 −1.4 · 1 · −0.6 · 1.2°: 400px 넘는 카드의 회전 상자가 옆으로 약 4~5px 나와 낙서 띠에 1~2px 닿음. 시험 `tests/e2e/child-size.ts:271~322` 는 회전을 포함한 getBoundingClientRect | (1) **앱** · 높음. (2) **앱** · 중간(겹침이 1~2px 이고 회전한 모서리라 눈으로는 작음) | (1) 이름표를 종이 띠(테이프 이름표나 포스트잇) 위에 둠. (2) 낙서를 가장자리로 더 붙이거나 좁힘(예: 너비 14 · 안쪽 1). 시험 기준은 AC-23e (3) 문장과 맞아 그대로 두기를 권함 | 화면 구현자 |
| K. 소수점 아래 높이 차를 같다고 보지 않음 | 1 | lesson-list:601 | L202~216 `164.05682` 대 `164.05685` | `lesson-list.spec.ts:631~634` toEqual | 시험 · 높음 | 1px 안 허용으로 견줌 | 시험 구현자 |
| L. 초상 src 속성이 절대 주소로 읽힘 | 1 | teacher-choice:261 | L2215~2224 받은 값 `http://localhost:3100/teachers/mina.fdc5f7f2.webp` | 시험 `teacher-choice.spec.ts:278`. 앱은 `/teachers/…` 를 넘김(`src/core/teacher/roster.ts:29`, `src/components/teacher/teacher-portrait.tsx:60~70` next/image unoptimized). 주소를 바꾸는 앱 코드는 찾지 못함 | 시험(단언 꼴) · 중간. 같은 파일을 보이므로 기능 결함은 아님 | 경로 끝으로 견줌(`new URL(src).pathname` 또는 정규식) | 시험 구현자 |
| M. 홈 회화 카드에 '단원 3'이 없음 | 1 | teacher-choice:365 | L2271~2282 받은 글 `회화1단계첫 수업을 해 봐요이야기 고르기` | `home-cards.tsx:3~7` 단원 5칸 · 막대는 수업 목록 위 띠로 옮김(R-13), 카드는 단계만. 시험 `teacher-choice.spec.ts:399~405`. 앞 단언(DB 트랙 단원 3)은 통과 | 시험(UI 변경을 따라가지 않음) · 높음 | 회화 수업 목록 위 띠의 지금 단계 · 단원으로 확인 | 시험 구현자 |
| N. 홈 '첨삭이 왔어요' 쉼 장면이 C80 과 어긋남 | 1 | required-recovery:648 | L318~341 `[data-ai-rest-line]` 30초 없음, 재시도도 같음 | `src/server/session/index.ts:603~607` '쓰기 둘째 세션(고쳐 쓰기)은 AI 를 부르지 않아 막지 않는다(C80)'. 정본 `specs/10-결정-기록.md:230` C80 '둘째 세션(고쳐 쓰기)은 AI 가 없어 막지 않음'. 시험 `required-recovery.spec.ts:652~667` 은 첨삭이 이미 온 초고 + 상한에서 쉼을 기대 | 시험(정본 C80 과 다른 장면) · 중간. 앱이 둘째 세션을 연 것으로 추정함(주소 단언 전에 끊겨 직접 증거는 없음) | 4절 결정 뒤 장면을 고침 | 결정 필요 → 시험 구현자 |
| 합계 | 52 | | | | | | |
| flaky: N-12 대화 기록 행 차례 | (1) | required-recovery:840 | L2871~2900 같은 turnNo 1 인 선생님 행과 아이 행의 차례가 바뀜. 재시도 통과 | `required-recovery.spec.ts:302` `orderBy(talkTurns.turnNo)` 만 | 시험(정렬 동률) · 높음 | 둘째 정렬 열(생성 시각이나 id)을 더함 | 시험 구현자 |

서버 로그의 오류 줄은 실패 원인이 아닙니다.
- `SettingMissingError: speech.skip_notice_seconds`(L21~39): 앱 오류 화면 시험이 일부러 지운 설정입니다(`screen-family.spec.ts:58 · 262`, `required-recovery.spec.ts:110 · 748`, `db.ts:236` removeHouseholdSetting).
- `끝맺음 실패(Error)` 6줄(L15~20): 실행 처음 구간에 찍혔고 그 구간 시험은 모두 통과했습니다.
- `회화 시도 기록 실패(Error 23503)` 2줄(L41~42): 3절 우려 사항에 적었습니다.

## 3. 물으신 것에 대한 답

(가) talk-lesson 17건 전부 실패는 공통 원인 하나(묶음 A)입니다. 17건 모두 `openLesson` 첫 줄 `talkHousehold(3)` 에서 던져 화면에 닿지 않았습니다. 다른 후보는 이렇게 확인했습니다.
- 3단계 회화 단계 규격: e2e DB 에 있습니다. 참조 자료는 1~12단계를 다 적재합니다(`builders.ts:738~744`).
- 카드 새 꼴: 시험이 insertTalkLesson 으로 새 꼴 견본을 직접 넣습니다(`talk.ts:88`).
- 첫 화면 표지: `[data-talk-start]` · `[data-mic-notice]` 는 1단계 회화 시험(teacher-window · required-recovery)이 지나갔으므로 맞습니다.
- 적재 범위: `seed:load --complete-through` 가 아니라 `dev-db --ephemeral` 의 1단계 적재입니다. 범위는 설계대로이고, 도우미가 범위를 올리지 않은 것이 결함입니다.
- 주의: 17건은 화면을 하나도 지나지 않았습니다. A 를 고친 뒤 첫 실행에서 새 실패가 나올 수 있습니다. 3단계 견본의 준비 낱말은 1개입니다(prep_words 1).

(나) UI · UX 변경과의 관계는 다음과 같습니다.
- home 2건: 앱 결함입니다(I, 세로 두 줄 높이).
- font-size 1건: 앱 결함입니다(J, '다지기' 이름표 · 낙서 자리).
- writing 3건: 시험이 낡았습니다(H, 진행 막대 묶음 이름).
- lesson-list 1건: 시험의 비교 방식 문제입니다(K).
- speaking 1건 · teach 4건: UI 와 관계없는 시험 사이 충돌입니다(G).
- teacher-choice:365: 시험이 낡았습니다(M, R-13).

(다) 시간 초과로만 보인 실패는 느린 CI 때문이 아닙니다. 재시도에서도 모두 같은 자리에서 같은 값으로 실패했습니다.
- '아예 없음' 꼴: `[data-child-turn]` 7건은 그 자리에 준비 쪽지가 떴습니다(B). '잘 말했어요' · 오늘 배울 것 · 결과 첫머리 · 선생님 고르기 없음은 다른 수업 행이 열렸기 때문입니다(G). 쉼 줄 없음은 C80 때문입니다(N).
- '찾았는데 조건이 안 맞음' 꼴: 말풍선 2건은 `Great! Let's talk.` 에 멈췄습니다(B). 활동 `preview` · `question` 은 다른 수업입니다(G).
- 시간 창 꼴: 회화 턴 요청 0은 시험의 5초 창이 끝 침묵 3초 + 확인 2초보다 짧아서입니다(C). 결정적입니다.
- 재시도 시간 초과(×T, teach:546): 시험 제한 30초 안에서 33초(`START_TIMEOUT_MS` 3초 + `WAIT_MS` 30초, `teach.spec.ts:70~77 · 559~561`)를 기다리게 짜였고, 기다린 글은 G 때문에 나오지 않았습니다.
- 실행 시간 32.2분(평소 21~27분)은 실패 52건의 재시도와 30초 기다림 때문입니다.

(라) flaky 1건은 N-12 의 정렬 동률입니다(2절 표 끝 줄).

## 4. 앱 결함으로 보이는 것(따로 강조)

| 항목 | 심각도 | 근거 | 영향 |
|---|---|---|---|
| I. 홈 세로 2×2 판의 두 줄 높이가 다름 | Important | `home-cards.tsx:414`, C114, L112~172 | 첫 프리뷰 첫 화면(세로 태블릿)에서 카드 크기가 어긋나고 시작 단추가 같은 줄 아래 끝에 맞지 않음 |
| J-1. 수업 목록 '다지기' 이름표가 책상 위 | Minor | `lesson-board.tsx:513`, NFR-U1 · AC-23e (2), L62~65 | 대비 규칙 위반(모눈 · 여백 선 위 글) |
| J-2. 꾸밈 낙서가 기울인 카드 회전 상자와 1~2px 겹침 | Minor | `decor.tsx:10~12`, `paper-key.ts:16`, L56~61 | AC-23e (3) 위반(눈으로는 작음) |

나머지 49건은 시험 · 견본 · 격리 결함입니다. 회화 새 흐름(인사 → 짧은 준비 → 대화 → 정리)의 앱 결함은 이번 로그에서 찾지 못했습니다. 단 talk-lesson 17건은 화면에 닿지 못해 이번 실행으로 검증되지 않았습니다.

## 5. 고치는 차례 제안(풀리는 실패가 많은 것부터)

1. **A(18)**: `talk.ts` 도우미 한 곳만 고칩니다.
2. **G(10)**: `lessons.ts` · `db.ts` 의 충돌 검사와 수업 칸 · 번호 표, 충돌 쌍 넷의 번호 · 칸 바꿈, `teach.spec.ts` 선생님 줄 안내 describe 의 test.setTimeout 을 함께 고칩니다.
3. **B(7) + F(1)**: 같은 파일(required-utterance · teacher-window · required-recovery · talk.ts)이라 한 구현자에게 맡깁니다.
4. **C(3) + D(2) + E(1)**: speech-feedback · teacher-window 를 고칩니다. G 의 speech-feedback:655 번호 바꿈도 이 묶음에 넣으면 같은 파일을 두 사람이 만지지 않습니다.
5. **H(3) · K(1) · L(1) · M(1) · flaky**: 각각 한두 줄짜리 단언 고침이라 한 구현자에게 맡깁니다.
6. **앱 I(2) · J(1)**: src 만 고치므로 위 시험 묶음과 나란히 띄울 수 있습니다. 세로 · 가로 사진으로 확인합니다.
7. **N(1)**: 7절 결정 뒤에 고칩니다.

파일 겹침 주의: teacher-window.spec 은 B(:329 · :659 · :848 · :899)와 E(:620)에 걸리고, required-utterance.spec 은 B · F · G(번호 92)에 걸립니다. 묶음 3 에 teacher-window 의 E 와 required-utterance 의 G 번호 바꿈을 넣으면 파일이 겹치지 않습니다. 그러면 묶음 4 는 speech-feedback 만 맡습니다.

고친 뒤 예상: A 를 고치면 talk-lesson 이 처음 화면을 지나므로 새 실패가 나올 수 있습니다. B 를 고치면 required-utterance:421 이 F 에 걸릴 수 있습니다.

## 6. 우려 사항

- **teach:546 첫 시도가 `seed.complete_through_level` 을 12 로 남겼습니다.** 시험 제한 시간 초과 뒤 finally 의 되돌림이 `write CONNECTION_ENDED` 로 실패했습니다(L2157~2172, `db.ts:97`). 재시도는 그 값(12)을 '이전 값'으로 읽어 12 로 되돌렸습니다. 그래서 진행 157~198(teacher-choice · teacher-window · timeout · writing)은 범위 12 에서 돌았습니다. 이 구간의 통과 결과는 범위 1 에서 다시 확인이 필요합니다. withHouseholdSetting 은 시험 제한 시간 초과에 약합니다(afterAll 의 closeE2eDb 가 먼저 연결을 닫는 것으로 추정함).
- **23503(외래 키 위반) 2줄이 다시 보입니다(L41~42).** 10-23 CI 18차에서 0 으로 맞춘 값입니다(커밋 87ea684 메시지 'e2e 140 · 23503 0'). 시각 없는 로그라 어느 시험인지 정할 수 없습니다. 진행 표시 둘째 줄(진행 71~137) 뒤에 찍혔으나 출력 섞임 때문에 자리가 정확하지 않습니다. 회화 시험이 집을 비운 뒤 늦게 닿은 회화 시도 저장으로 추정합니다(근거 약함). 다음 실행에서 서버 로그에 시각을 붙이거나 실패 시험의 error-context 를 받아 확인하기를 권합니다.
- **시험이 숫자를 TEST_SETTINGS 에서 읽지만 DB 값은 다섯 키가 다릅니다.** `talk.prep_words.*` 는 DB 1 · 시험표 3/2 입니다. D 의 뿌리이고, 앞으로 준비 낱말 수를 TEST_SETTINGS 로 셈하는 시험이 생기면 또 틀립니다.
- **실패 증거가 아티팩트에 없습니다.** ci.yml 은 `test-results/photos` 만 올립니다. 실패 때 `test-results/**/error-context.md` 와 trace 도 올리면 다음 분류가 코드 추정에 덜 기댑니다(분 비용은 업로드 몇 초).
- **G 는 조용히 지나갈 수 있는 결함입니다.** 충돌 행이 우연히 단언을 만족하면 시험이 엉뚱한 수업으로 통과합니다. 이번에 통과한 시험 가운데도 같은 꼴이 있을 수 있어 (1) 충돌 검사를 먼저 넣기를 권합니다.

## 7. 결정이 필요한 것

- **N-9 장면과 C80 이 겹치는 자리.** UI · UX spec 표(`intent/2026-10-29-UI-UX-개선/spec.md:187`, N-9)는 홈 '첨삭이 왔어요'를 눌렀을 때 'AI 쉬는 중'이면 홈에 머문 채 한 줄 칸을 보인다고 적습니다. 13절 C80 은 둘째 세션(고쳐 쓰기)은 AI 가 없어 상한 날에도 막지 않는다고 적습니다. 첨삭이 이미 온 쪽지를 누르면 열리는 것이 둘째 세션이라, 상한만으로는 N-9 쉼이 나지 않습니다.
  - 선택지 (가) C80 그대로: N-9 의 '첨삭이 왔어요' 경우는 상한 날 쉼이 나지 않는다고 UI · UX spec 표에 한 줄 보태고, 시험은 상한 날에도 둘째 세션이 열리는지를 봅니다. 비용은 spec 한 줄과 시험 한 건입니다.
  - 선택지 (나) N-9 를 따름: 상한 날 둘째 세션도 막습니다. C80 을 바꾸므로 13절 한 줄이 먼저이고, 서버 한 줄과 단위 시험이 따릅니다.
  - 권고: (가). 아이가 첨삭을 받은 날 고쳐 쓰기를 막을 까닭이 없고, 앱은 이미 C80 대로 움직입니다. 그 전까지 이 시험 한 건은 실패로 남깁니다.
- **J-2 낙서 겹침의 기준.** 시험의 회전 상자 기준을 두고 앱(낙서 자리)을 고칠지, 시험을 기울기 없는 상자로 바꿀지 정해야 합니다. 권고는 앱 고침입니다. AC-23e (3) 은 눈에 보이는 겹침을 막는 문장이고, 회전한 모서리는 실제로 여백 띠에 들어갑니다.

## 8. 집계

- 어긋남(실패 원인 묶음): 14. 앱 두 묶음(I · J, 결함 셋), 시험 · 견본 · 격리 열두 묶음(A~H · K~N), flaky 1 은 따로
- 우려: 5
- 결정 필요: 2
