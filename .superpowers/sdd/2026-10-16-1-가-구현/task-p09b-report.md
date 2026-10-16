# 구현 보고: P9b AI 호출 넷(implementer impl-p09a 이어 하기, 2026-10-17 00:5x~01:0x)

상태: DONE_WITH_CONCERNS

plan-p09b(approved)의 파일 열둘(새 11 · 고침 1)을 만들었다. 작업 8 (가) 명령이 모두 종료 0 이다. 모두 순수 함수(`src/core`)이고 시각 · DB · Next · SDK 를 가져오지 않는다(check:deps 0). 우려는 '계획과 다르게 한 것'의 1 · 2 · 5 와 '검토자에게 알릴 것' 1 이다. 모두 설계 범위 안의 해석이다. 커밋 · 하위 에이전트 · 실제 호출 · 키 · 아이 이름은 없다. 견본 이름은 지어낸 `가나다` · `Ganada`, 전화번호는 `010-1234-5678` 이다.

## 바뀐 파일

| 파일 | 신규 / 수정 | 무엇 |
|---|---|---|
| `src/core/seed/structure.ts` | 수정 | 파일 끝에 'AI 출력 꼴' 절(값 1 상수 아홉, 글자 그대로) |
| `src/core/ai/mask.ts` | 신규 | 7 CONTACT_MASK · 10 TWO_SYLLABLE_SURNAMES · 24 BUILTIN_CONTACT_PATTERNS · 88 nameVariantsOf · 140 createMasker · 181 fillName |
| `src/core/ai/output-check.ts` | 신규 | 18 CheckField · 20 FieldHit · 71 checkOutputFields(P4a forbiddenHits · splitSentences · sentenceWords · isEnglishSentence) |
| `src/core/ai/calls/common.ts` | 신규 | 10 SAFE_LINE_KO · 13 LevelContext · 27 CallSettingError · 51 CallSpec · 79 COMMON_FIXED_RULES · 98 answerTextOf · 150 prepareAnswer · 160 firstLine · 170 firstSentence · 175 levelVariable · 192 buildSystem · 207 hitUnder · 218 clampScore |
| `src/core/ai/calls/writing.ts` | 신규 | 94 writingCheckSpec(title writing_check) · 290 writingFeedbackSpec(title writing_feedback, writing.max_corrections 단계 사전) |
| `src/core/ai/calls/speaking.ts` | 신규 | 38 speakingRulesOf · 113 speakingAnswerSpec · 270 speakingPresentationSpec · 396 speakingConfirmSpec(title speaking_eval.answer · .presentation · .confirm) |
| `src/core/ai/calls/thinkout.ts` | 신규 | 43 THINKOUT_LAST_TURN_NOTE · 126 thinkoutSpec(multiTurn · historyEntry, writing.thinkout_max_turns) |
| `src/core/ai/request.ts` | 신규 | 19 AiRequestBody · 30 BuiltRequest · 56 buildAiRequest |
| `tests/fixtures/ai/sample-inputs.ts` | 신규 | 지어낸 이름 · 견본 연락처 · 단계 맥락(3 · 4 · 5 · 6 · 9 · 10, can-do · 문장 길이 상한은 P4a level_specs 견본에서) · 호출마다 견본 입력 · 관찰용 변형 다섯씩(여섯 규격) · 견본 forbidden · contact 정규식 |
| `tests/unit/normalize.test.ts` | 신규 | AC-4b 셋 · AC-5d 둘 · 6.2 정규화 여섯 · 6.4 출력 검사 · 걸린 칸 바꾸기 넷 = 15 |
| `tests/unit/mask.test.ts` | 신규 | AC-N4 둘 · 6.1 가림 셋 · 6.1 화면 하나 · 표 밖 하나 = 7 |
| `tests/unit/ai-request.test.ts` | 신규 | 6.1 요청 여섯 |

증명 표의 이름은 글자 그대로다. 표 밖에 AC 를 붙이지 않은 시험 하나를 더했다. "6.1 가림: 전화번호 · 전자 우편과 시드 contact 정규식을 가린 자리로 바꾼다"이고, 값 2 의 연락처 규칙을 따로 본다.

## 시험 수

| 묶음 | 바탕(01ff0a9) | 지금 |
|---|---|---|
| 단위 `pnpm test` | 200 | 228(normalize 15 · mask 7 · ai-request 6) |
| 통합 `pnpm test:int` | 30 | 30 |
| spec-trace missing-test | 54 | 52(AC-4b · AC-5d) |

시험을 먼저 쓰고 실패를 본 뒤 구현했다. 쓰기 시험은 구현과 같은 차례에 돌려 실패를 따로 보지 못했다. 그래서 쓰기 코드를 일부러 망가뜨려 확인했다. 고칠 곳 자르기 · 교정 자르기 · 채점표 자르기 · 빠진 판정 null 을 하나씩 지운 판에서 시험이 깨졌고, 되돌렸다.

## 작업 8 (가) 명령과 출력

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 384ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 88 files in 56ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  228 passed (228)` |
| `pnpm test:int` | 0 | `Tests  30 passed (30)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (49 modules, 133 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… AC 이름 시험 82 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 52` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `grep -rn "sk-ant-" src tests` | — | 바탕의 `tests/unit/check-bundle.test.ts:58` 주석 1건뿐, 이 작업 파일 0건 |

이스케이프는 바이트로 확인했다. `mask.ts:37` 의 한글 범위가 도구 층에서 글자로 바뀌어 `가-힣` 으로 되돌렸다.

## 계획과 다르게 한 것(이유)

1. **연락처를 먼저, 이름을 뒤에 가린다**(값 2 는 이름 먼저). 이름을 먼저 바꾸면 이름이 든 전자 우편(`ganada@example.com`)이 `{NAME}@example.com` 이 되어 연락처 정규식에 걸리지 않고 도메인이 남는다. 시험이 이것을 본다.
2. **시드 contact 정규식을 `giu` 로 컴파일한다**(값 2 는 `gu`). 시드 검증 · forbiddenHits 가 `iu` 로 보므로 대소문자를 같게 다룬다. 전자 우편이 대문자여도 가린다.
3. **출력 검사가 시드 forbidden 목록에 더해 앱의 연락처 정규식(전화번호 · 전자 우편)도 본다.** 값 3 의 '연락처 꼴'을 시드 contact 가 없을 때도 잡으려는 것이다. 같은 걸림은 한 번만 적는다.
4. **`CallSpec.system` · `messages` 가 `rules` 도 받는다**(값 4 는 input 만). 첨삭의 '교정은 최대 N개', 생각 꺼내기의 '턴 k / N' · 마지막 턴 말이 rules 에서 온다.
5. **수업(과제 · 예시 · 질문 · 장면 · 발표 주제 · 힌트 · 새 단어)은 시스템 프롬프트 가변부에 두고, 사용자 메시지에는 아이 글만 둔다**(값 5 표의 사용자 메시지에는 과제 · 예시가 있다). 6.1 '가변부에는 … 이번 시드 수업'과 증명 표 이름('가변부(… 수업)')을 따랐다. 생각 꺼내기의 첫 사용자 메시지는 과제 · 새 단어를 되풀이하지 않고 '시작'과 턴 표시만 둔다.
6. **필수 칸 null 의 범위를 넓혔다.** 쓰기 확인 · 첨삭 칭찬이 빈 글이면 null 이다. 생각 꺼내기는 묻는 턴인데 질문이 비어도 null 이다. 값의 '필수 칸이 없으면 null'을 빈 글에도 적용했다.
7. **생각 꺼내기 정규화가 그 턴에 안 쓰는 칸을 비운다.** 끝낸 턴은 질문 · 보기를, 묻는 턴은 요약 · 단어 · 틀을 비운다(6.2 회화 턴 규격과 같은 원칙). 그래서 historyEntry 가 늘 같은 꼴이다.
8. **`BuiltRequest` 에 가린 수 `masked: { names, contacts }` 를 더했다.** 위험 3 '가림 수를 흐름이 받아 둔다'의 자리다.
9. **공통 도우미를 더 내보낸다.** `CallSettingError`(설정 키가 없거나 그 단계 값이 없을 때, P9c 가 '설정 문제'로)와 `levelVariable` · `hitUnder` · `clampScore` 다.
10. **견본 입력은 바로 쓰지 않고 형이 생길 때마다 이어 썼다.** 작업 1 에서는 이름 · 연락처만 쓰고 쓰기 · 말하기 · 생각 꺼내기 부분은 그 규격을 만들 때 더했다. can-do · 문장 길이 상한은 P4a `referenceSet(defaultSettings())` 에서 읽는다.
11. **말하기 바른 답이 빈 글이어도 null 로 보지 않는다**(값 6 '바른 답은 그대로 남긴다'). 발표 확인 질문은 빈 글을 뺀 뒤 앞에서 N 개를 쓰고, 모자라면 같은 차례 예비 질문으로 채운다.

## 남긴 것

- 회화 턴 · 끝맺음 턴 · 확인 호출 규격(1-나, 자리만).
- P9c 파일 전부: 흐름 · 공개 함수 · 계약 · 관찰. `output_config.format` 은 P9c 가 `zodOutputFormat(wireSchema)` 로 붙인다.
- 공용 파일 · 정본 · plan 은 고치지 않았다. 요청하는 공용 변경은 없다.
- 검토 `review-p09a.md` 8절 메모 일곱은 모두 P9c · P11 · P5 몫이라 P9b 에 적용한 것이 없다.

## 검토자에게 알릴 것

1. **정규화를 엄격 통과 값에도 돌려야 한다(P9c 에 넘김).** 첫 줄 · 첫 문장 자르기(C63 (4))는 `normalize` 안에 있다. P9c 의 흐름은 다음 차례를 권한다. `answerTextOf` → JSON.parse → `prepareAnswer` → `wireSchema` → `validate` 를 거쳐, 엄격을 통과해도 `normalize` 를 지난다. 그 뒤 `checkOutputFields` → `applyChecks` 다. 모든 `normalize` 는 이미 맞는 값에 같은 결과를 낸다(멱등).
2. **두 글자 한글 이름 변형의 지나친 가림.** 세 글자 이름의 뒤 두 글자(견본 '나다')가 아이 글의 다른 낱말 안에서도 바뀐다. plan 위험 3 이 받아들인 지나침이다.
3. **생각 꺼내기 기록의 토리 글(assistant)은 가리지 않는다.** 앞 턴 AI 출력이고, 가린 입력으로 만들어졌다. 아이 답만 가린다.
4. **`speakingRulesOf` 는 level_specs `questions.modelAnswer` 를 문법 지적 경계로 읽는다**(정할 것 다, plan 위험 6). P6 이 그 칸을 1~3단계 밖에 켜면 문법 지적이 사라진다.
5. **고정부 규칙 글은 영어 지시다.** 해요체 예로 목업 B_Writing2 문구 '대문자와 마침표를 빠짐없이 썼어요.'를 넣었다. H4 뒤 관찰표(P9c)가 규칙 위반을 재면 이 글만 고친다(plan H4 뒤).
6. **견본 입력이 P4a 견본 묶음(`tests/fixtures/seed/builders.ts`)을 가져온다.** 단계 규격 값을 다시 적지 않으려는 것이다. P9c 의 tsx 스크립트가 쓰면 그 묶음도 함께 읽힌다. 모두 순수 함수다.
