# 첫 프리뷰 CI 첫 실행 통합 실패 셋 고침 보고(2026-11-05)

- 브리프: `task-ci-first-run-fix-brief.md`, 로그: `scratchpad/ci-1-clean.log`.
- 셋 모두 시험 결함이었다. src · 정본 · seed 는 바꾸지 않았다. 바뀐 파일은 시험 셋뿐이다(`git status`).
- 셋은 이 Mac 에서 돌린 적 없는 통합 시험의 첫 실행 실패였다. 이번 고침도 이 Mac 에서 통합을 돌리지 못했다(내장 Postgres shmget).
- 그래서 통과는 CI 다시 실행에서 확인해야 한다. 다만 (2)는 판정 함수를 직접 돌려 실패 값과 기대 값을 둘 다 재현했다.

## 1. `tests/integration/seed-load.test.ts` 적재 요약 꼴

| 칸 | 내용 |
|---|---|
| 원인 | 적재 명령의 요약 줄은 '건너뜀' 뒤에 '목표 채움 n' 토막을 낸다(`scripts/seed-load.ts:160` summaryLine, T-87 · 회화 plan 묶음 8 fix 1). 시험의 SUMMARY 정규식에는 이 토막이 없었다 |
| 판정 | 시험 결함 |
| 고친 줄 | `:876` 정규식의 `건너뜀 \d+ ·` 뒤에 `목표 채움 \d+ ·` 를 더했다. 같은 요약 꼴 단언은 저장소에 이 하나뿐이다(grep). --json 단언은 toMatchObject 라 영향이 없다. 뒤 단언 `replace("넣음", "미리 돌림")` 은 첫 '넣음'(결과 낱말)만 바꾸므로 그대로 맞다 |

## 2. `tests/integration/speaking-eval.test.ts` AC-22k(질문 짝 judge)

| 칸 | 내용 |
|---|---|
| 판정 | 시험 결함(시험 환경). 서버 판정 코드는 정본대로다 |
| 정본 | `specs/02-2-세션과-단계표.md:72` 의미 검사: 질문에서는 'do 뒤 첫 동사(하는 일)부터'의 핵심 낱말을 뽑으므로 누가 자리(이름)는 빠진다. 낱말의 품사는 어휘 목록(vocab)에서 읽는다. `specs/11-…:222` AC-22k: 이름을 넣은 바른 답('No, Dan and Tess go to the lake.')은 acceptedMeaning 이다 |
| 코드 | `src/core/speaking/meaning.ts:106` questionCoreOf 는 어휘 품사로 첫 동사를 찾는다. 못 찾으면 처음부터 자른다(`Math.max(verbAt, 0)`). `:189` 는 틀린 정보 판정이다. 표는 `src/server/speaking/words.ts:16~` meaningWordsOf 가 DB vocab 에서 만든다 |
| 원인 | 이 시험은 정규 시드의 가르치는 말하기 수업(3단계 단원 1)을 넣는다. 그런데 시험 시드의 어휘는 작은 견본이라 그 수업의 동사(eat · drink · go · wash …)가 없다. 그래서 예비 질문 'Do Max and Ted eat cake?' 의 질문 핵심 낱말에 이름 max · ted 가 남는다. 아이 답 'Max and Ted eat rice.'(그 질문의 acceptedMeaning 그대로)가 틀린 정보로 걸린다 |
| 재현 | `scratchpad/fix2/meaning2.ts` → `meaning2-out.txt`. judgeSpeakingQuestion 을 직접 불렀다. 시험 어휘: `{meaning: wrong_info, final: retry, by: app, expressionDone: false}` — CI 실제 값과 같다. 정규 어휘 행을 보탠 표: `{meaning: ok, bundle: meaning, communicative: true, expressionDone: false, final: correct, by: app}` — 시험 기대 값과 같다 |
| 고친 줄 | `beforeAll`(`:78`)에 `insertTeachVocab` 를 더했다(`:81~129`). 그 수업 질문 글 낱말 가운데 시험 어휘에 없는 행을 `seed/vocab.json` 에서 넣는다(26 행, 그림 키 없음 — 판정은 단어 · 품사 · 꼴만 본다). 정규 시드에서는 적재가 어휘를 함께 넣으므로, 시험 환경을 정규 시드와 맞춘 것이다 |
| 다른 시험 영향 | 그 수업 질문 · 예비 질문 전부(114 경우: 바른 답 · 허용 답 · acceptedMeaning · 이 파일이 쓰는 아이 답 아홉)를 세 표로 판정해 견줬다. 세 표는 시험 어휘 · 보탠 어휘 · 정규 어휘다. 보탠 어휘는 정규 어휘와 114 경우 모두 같다. 시험 어휘와 다른 아홉은 모두 이름을 넣은 acceptedMeaning 답이고, 이 파일의 다른 시험은 그런 답을 쓰지 않는다 |
| 정본 변경 | 없다 |

## 3. `tests/integration/talk-lesson-session.test.ts` AC-15j

| 칸 | 내용 |
|---|---|
| 원인 | 시험이 루프 앞에서 같은 프로필 · 회화의 진행 세션을 talk.safety_alert_count 개 한꺼번에 넣었다. 제약 `sessions_one_in_progress_unique`(`src/db/schema/learning.ts:148~150`, profile_id · area, status = in_progress 부분 유일)에 걸린다 |
| 판정 | 시험 결함(묶음 12 fix 1 이 옮길 때의 차림) |
| 고친 줄 | `:473~475`. 세션을 루프 안에서 하나씩 넣는다. 첫째는 newSession, 그다음은 `sessionFor`. 앞 대화는 상한 턴에서 중단으로 닫히므로(`lesson-turn.ts:1658` closeLessonOnTurn, 시험이 `status aborted` 를 단언) 다음 넣기는 제약에 걸리지 않는다 |
| 뜻 | 바뀌지 않았다. 상한 → AI 안 부름(deps 에 AI 없음) · 카드 끝인사 · 중단 · 학습일 · 끝맺음 대기 · 예약 하나 · talk.safety_alert_count 번째에만 부모 알림을 본다. 알림은 safetyClosesOn(`lesson-turn.ts:1662`)이 그 학습일 safety 끝맺음 기록 수를 세고, talkSafetyOf(`core/ai/cost-alert.ts:154~155`)가 `reachedToday === safetyAlertCount` 로 가른다. 설정 키는 talk.safety_max_turns(시험이 1로) · talk.safety_alert_count(시험 설정 2)다 |

## 4. 로그의 '설정 문제' 줄

일부러 만든 경우다.
- `[ai] writing_feedback: 설정 문제(SeedListError)`(로그 29~30줄)는 writing-feedback AC-8n '설정 문제는 실패 수에 들지 않는다' 갈래다.
- `[ai] writing_check: 설정 문제(SeedListError)` 두 줄(115 · 118줄)은 ai-calls '6.4 흐름: 시드 금지어 목록이 없거나 틀리면 AI 를 부르지 않는다' 시험이다.
- `[ai] talk_turn: 설정 문제(SettingMissingError)`(73~74줄)는 fix 1 의 talk-lesson-call '설정 문제면 부르지 않고 config' 시험이다. talk.good_lines 를 지운다.
- 셋 모두 그 시험이 통과한 줄이다.

## 5. 관문

| 관문 | 결과 |
|---|---|
| biome ci | 575 파일, 0 |
| tsc --noEmit | 빈 출력 |
| 단위 `pnpm test` | 1785 통과 · 6 todo |

출력은 스크래치패드 `ci1-biome.txt` · `ci1-tsc.txt` · `ci1-unit.txt` 에 있다. 통합 셋은 이 Mac 에서 돌리지 못했다. 그러니 CI 다시 실행에서 통과를 확인하기 전에는 통과로 치지 않는다.
