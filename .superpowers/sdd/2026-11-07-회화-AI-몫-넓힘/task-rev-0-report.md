# 검토 보고 — 묶음 0-가(설정 키 둘) · 0-나(계약) 범위 한정 코드 검토

검토자 Opus · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 미커밋) · 브리프 `task-rev-0.md`(이 보고는 브리프를 덮지 않으려고 `-report` 를 붙였다)
diff: 스크래치패드 `rev0-0ga.diff`(162줄) · `rev0-0na.diff`(484줄) + 신규 파일 여섯. 4-가 파일(talk-observe*)은 보지 않았다. 시험은 다시 돌리지 않았다.

## 판정: 수정 필요(Important 1 · Minor 1)

코드 변경 자체는 브리프 1 · 2 · 3 을 모두 지킨다. plan 이 0-가 몫으로 둔 녹음 안 함 시험 파일 하나가 빠졌다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 0-가 키 꼴 | ✅ | `talk-lesson.ts:318~319 · 326` Positive(1 이상 정수) · OnOff("off" · "on"), `seed/settings.json:109~110` household · 3 · "off" · advanced. 정본 `specs/09-설정값.md:88~89`(3 · 끔, 2~6 은 화면 범위)와 plan 정한 것 2 와 같다 |
| turnSettings 펼침 · TurnRequestSchema 불변 | ✅ | `turn.ts:76~78` 펼침만 더했고, turn.ts diff 는 가져오기와 turnSettings 두 덩이뿐이다. `turn.ts:37` strictObject 그대로 |
| 빠진 키가 턴 입구에서 드러남 | ✅ | `settings/index.ts:95` 가 SettingMissingError 를 던지고 runTalkTurnRequest 의 catch 가 error 줄로 끝낸다. 시험은 구조로 가른다: turnSettings 에서 펼침을 빼면 `talk-setting-keys.test.ts:48~51` 이, 시드 · TEST_SETTINGS 에서 키를 빼면 `:31~42` 가 붉어진다 |
| talkLessonRulesOf 호출부 | ✅ | 호출은 `talk-lesson.ts:1929~1930` 의 호출 규격 하나뿐이고 같은 SETTING_SCHEMAS(:344 펼침)로 읽는다. 손으로 만든 설정 사전은 `talk-lesson-call.test.ts:218` 하나이고 TEST_SETTINGS 를 펼쳐 쓴다 |
| check-ids dev 빼기 | ✅ | `check-ids.ts:521~524` 만 바뀌었다. collectDesignNumbers 의 호출은 design-number 규칙(:839) 하나이고, design-color(:593) · 상한 · ci.yml 은 그대로다. 상수는 DESIGN_COLOR_DEV_DIR 를 함께 쓴다(plan 50줄). 시험 `check-ids.test.ts:569` 은 dev 파일의 30 · 0.8 이 빠지고 src/a.ts 의 같은 수는 남음을 본다 |
| dev 폴더 전제 | ✅ | 폴더 밖에서 가져오는 곳은 `src/app/api/dev/mic-probe-log/route.ts:9` 하나이고, 그 끝점은 운영 배포에서 404 다(route.ts 2~3줄 주석 · :30) |
| 0-나 sceneOpener 선택 칸 | ✅ | `talk.ts:165` optional, `talk-ai-scope-contract.test.ts:68~75` 가 실제 개정 4 카드 두 장을 new 로 읽는다(정한 것 3). 칸 꼴(:105~)은 plan 53줄과 같다 |
| textsOfTalkCard 역할 | ✅ | `talk.ts:328` 칸이 있을 때만 내고, 역할은 인사 질문 · 필수 질문(greetingQuestionTexts · itemTexts)과 같다. 시험 `:105~136` 이 경로 · 역할 · 글과 다른 칸 불변을 본다 |
| 목록 넷의 이름 · 칸 | ✅ | `structure.ts` TALK_CUE_PLACES · TALK_CUE_BANDS · TALK_SITUATION_PLACES · 금지 구 묶음이 plan 정한 것 5 · spec 설계 6 · 9 · 정본 02-2:208(인사 끝 · 받침 셋 · 들리지 않음) · 02-2:212(자리 셋 × 구간 둘)와 같다. 줄은 en · ko 필수 |
| SEED_FILES 확장 | ✅ | seed:validate(`validate.ts:583~586` 등록 + `:726` 훑기), 서버 읽기(`seed-lists.ts` LIST_SCHEMAS), 빌드 포함(`next.config.ts:38~39` 기존 `./seed/lists/**/*.json`, 시험 `:294~303`) 모두 들었다. 적재기(`load.ts:1000~1013`)는 settings 등 여섯만 쓰므로 목록을 DB 에 넣지 않는다. 다른 시드 트리 빌더(통합 · e2e)는 넓힌 referenceSet 을 쓴다 |
| 정한 것 6(신호 말 저장 안 함) | ✅ / ⚠️ | 계약 몫은 지켰다: 목록은 빌드 파일이고 줄에 id 가 없으며 drizzle · DB 변경이 없다. 흘림 줄 kind "cue" 와 기록에서 빼기(log.ts liveTeacherEntryOf)는 plan 68줄의 묶음 2 몫이라 이 diff 로 확인할 수 없다 |
| 녹음 안 함(AC-8 (마)) | ✅ | 두 묶음 diff · 신규 파일에 MediaRecorder · getUserMedia · AudioContext · Blob · FormData · 소리 칸이 없다. TurnRequestSchema 그대로 |
| plan 0-가 시험 talk-no-audio | ❌ | 아래 I-1 |

## 2. 잘한 점

- 새 키를 호출 규격과 턴 입구에 같은 객체(TALK_PROMPT_SETTING_SCHEMAS)로 펼쳐, 두 곳의 규격이 갈라질 수 없게 했다. T-157 의 '조용한 칭찬 대사' 길을 턴 입구에서 막는다.
- greetingRecall 을 규칙 객체에서 참거짓으로 바꿔, 묶음 1 이 "on" 글자 비교를 흩지 않게 했다.
- 목록 Zod 가 `z.record(z.enum(...))` 로 자리 · 구간을 모두 요구하고 모르는 열쇠를 거부한다. 시험 `:206~260` 이 빠진 자리 · 모르는 자리 · 빈 목록 · 뜻 없는 줄 · 겹침 · 대문자 · 정규화 안 한 구를 하나씩 거부하는지 본다.
- SEED_FILES 를 넓히며 타입이 요구하는 곳(REFERENCE_SCHEMAS · ReferenceFiles · 견본 빌더 · 시험 표)을 빠짐없이 찾아 보고에 적었다.
- 시험은 빈 단언이 없다. 두 신규 시험 모두 구체 값(3 · 거짓 · 경로 · 역할 · 글 · 경고 4번)을 단언한다.

## 3. 지적

### Important

**I-1. plan 이 0-가 몫으로 둔 `tests/unit/talk-no-audio.test.ts` 가 없다.**
- 무엇이: plan 파일 표 52줄(0-가 신규), 묶음 표 97줄(0-가 증명 '단위 talk-setting-keys · check-ids · talk-no-audio'), 증명 표 172줄(AC-8 (마) (1) 의 증명 파일)이 이 시험을 요구한다. 워크트리에 파일이 없고, TurnRequestSchema 가 소리 칸을 거부하는지 보는 다른 시험도 없다(`tests/` 에서 TurnRequestSchema · audio 검색 결과 없음).
- 왜: 코드 위험은 없다(turn.ts:37 strictObject 그대로). 그러나 AC-8 (마) (1) 을 자동으로 증명하는 것이 없어, plan 의 0-가 완료 조건이 채워지지 않았다. 원인은 구현 브리프 `task-0ga.md:11` 의 '할 것'에 이 행이 없던 것이다(브리프 7줄은 옛 줄 번호 43~48 을 적었다).
- 어떻게: 시험 하나를 더한다. `runTalkTurnRequest({ ...정상 요청, input: { ...input, audio: "x" } }, deps)` 와 맨 위 칸 `audio` 를 더한 요청 두 꼴에서, 쓰면 던지는 가짜 deps.db 로 write 가 `[{ t: "error" }]` 하나만 받는지 본다. turn.ts:117~121 이 getDb(:123) 앞에서 끝나므로 DB 없이 단위 시험으로 된다. 컨트롤러가 다음 묶음(예: 5)에 옮길지 정해도 된다.

### Minor

**M-1. 개정 4 카드 증명이 살아 있는 시드 파일에 기대어, 묶음 3 뒤 사라진다.**
- 무엇이: `talk-ai-scope-contract.test.ts:43~47 · 68~75` 가 `seed/lessons/talk/3/1.json` 을 읽어 revision 4 · sceneOpener 없음을 단언한다.
- 왜: 묶음 3 이 두 장을 개정 5 로 바꾸면(plan 76줄 · 정한 것 4) 이 줄이 깨지고, 정한 것 10 대로 그 줄만 고치면 'DB 에 든 개정 4 카드를 새 코드가 new 로 읽는다'는 증명이 저장소에서 빠진다. 그 증명이 필요한 때는 새 코드 배포 뒤 · 카드 적재 C 전이다(plan 위험 2 · 작업 17).
- 어떻게: 6e86881 의 두 장을 시험 견본(예 `tests/fixtures/talk-l3u1-rev4.json`)으로 굳히고 이 시험이 그것을 읽게 한다.

## 4. 범위 밖 관찰(지적 아님)

- 목록 파일이 빌드에서 빠지면 읽기 함수가 빈 목록과 경고 한 번으로 넘어간다(`seed-lists.ts` seedListOrEmpty, plan 54줄이 정한 seedHomophones 꼴). 지어낸 경험 꼴이 빈 목록이면 C211 (1) 검사가 꺼지므로, 묶음 2 가 빈 목록일 때의 길을 정할 때 이 경우를 함께 보면 좋다.
- 목록 첫 내용은 꼴만 맞췄다(0-나 보고 우려). 어휘 범위 · 아이 눈 검토는 묶음 3 · design-reviewer 몫이고 지금은 부르는 코드가 없어 아이에게 닿지 않는다.

## 판정

수정 필요. I-1 을 채우면 Approved 로 본다. M-1 은 컨트롤러가 직접 고치거나 묶음 3 브리프에 넣는다.
