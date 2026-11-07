# 묶음 3-(가) 구현 보고 — 검증기: 장면 여는 질문 검사 · 목록 넷 검사

구현자 Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(커밋 없음) · 상태 BLOCKED(관문의 붉은 줄은 묶음 1 몫과 목록 내용(3-(다) 몫)뿐, 내 몫 시험 · lint · tsc 는 초록)

## 바뀐 파일:줄(워크트리 기준)

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/seed/check-talk.ts` | 15 · 36~42 · 58~96 · 658~895 · 1126~1127 | 상수 TALK_SCENE_OPENER_FROM_REVISION(5) · TALK_SCENE_OPENER_MAX_SENTENCES(2) · YES_NO_QUESTION_STARTS(do · does · did · is · are · am · was · were · can · could · will · would · shall · should · may · have · has) · YES_NO_ANSWER_STARTS(yes · no). checkSceneOpener(06:186 전부) · checkMadeUp(1~3단계 안전한 대사의 지어낸 경험 꼴, 06:187 (4)) 를 checkTalkCard 에 등록 |
| `src/core/seed/check-talk-lists.ts` | 신규 271줄 | 목록 넷 검사 checkTalkLists(06:187 (1)~(4)) · 상수 TALK_CUE_LONG_MIN 1 · TALK_CUE_SHORT_MIN 2 · TALK_SITUATION_LINES_MIN 3 · FIRST_PERSON_WORDS · firstLevelOfBand · offbandListWords · phrasesIn |
| `src/core/seed/reference-index.ts` | 5 · 87 · 165~166 · 606~613 · 729 | buildReferenceIndex 가 checkTalkLists 를 부름(→ seed:validate 규격 파일 오류) · ReferenceIndex.talkMadeUpPhrases(파일 없으면 빈 목록) |
| `tests/unit/seed-validator-talk.test.ts` | 7~11 · 16~20 · 930~1231 | 장면 여는 질문 시험 11 |
| `tests/unit/talk-lists.test.ts` | 신규 | 목록 넷 시험 9 |
| `tests/fixtures/seed/builders.ts` | 1291~1373(talkAiScopeLists 만, Edit) | 정한 것 10: 내 검사가 견본 목록(짧은 꼴 하나 · 상황 줄 하나 · 허용 낱말 둘)을 막아 단위 34건이 깨져서, 짧은 꼴 둘 · 상황 줄 셋 · 견본 어휘 밖 낱말을 허용 낱말에 둔 꼴로 고쳤다 |

## 검사 규칙(06:186 · 06:187 대조)

장면 여는 질문(규칙 talk-scene-opener):
- 있음: 1~3단계이고 revision ≥ 5 인데 칸이 없으면 막는다. 개정 4 카드는 칸 없이 통과한다(plan 정한 것 3 · 4). 4단계부터 칸이 있으면 막는다.
- 질문: 물음표 문장은 하나이고 마지막 문장이다. 그 문장의 첫 낱말(틀 자리 다음)이 조동사 · be 목록에 있고 'or' 가 없다. 문장은 둘 안이다.
- 칸마다: {NAME} 하나까지, 그 단계 어휘 범위(단계 이하 · 이번 수업 새 단어) 안. 문장 길이 · 형태 범위 · 금지어 · 선생님 이름 · 틀 자리 종류는 기존 카드 글 공통 검사가 sceneOpener.* 경로로 본다(시험으로 확인).
- 다름: 인사 · 필수 · 쉬운 · 더 이야기할 거리 질문과 정규화 글(전체) 또는 마지막 물음표 문장 열쇠가 같으면 막는다.
- 받침: question.ko 필수, 답 예시는 Yes · No 로 시작, 쉬운 질문은 물음표로 끝나고 장면 여는 질문과 다르며 뜻이 있다(koMeaning 단계), 선택지 단계(1단계)는 낱말 하나만 다른 선택지 둘이 있고 다른 단계는 두지 않는다. 카드가 노리는 단어가 질문 · 쉬운 질문에 없다.
- '예 뒤 · 아니요 뒤' 대본 칸은 요구하지 않는다(규격에도 없음).

목록 넷(규칙 talk-cue-lines · talk-situation-lines · talk-allowed-words · talk-made-up-phrases):
- 신호 말: 자리 × 구간마다 긴 꼴 1 이상 · 짧은 꼴 2 이상, 물음표 없음, 그 구간 첫 단계('1' → 1, '2-3' → 2)의 문장 길이 상한 · 어휘 범위(허용 낱말 포함) 안.
- 상황 줄: 자리마다 3 이상, 1단계 길이 · 어휘 검사, 상황 금지 구(all 은 모든 자리, nospeech 는 들리지 않음만, normalizeSpoken 으로 줄임꼴을 펼친 낱말 경계 견주기)에 걸리지 않음.
- 허용 낱말: 1단계 범위 안 낱말이면 막는다('걸린 낱말로 만든다'의 검사 몫).
- 지어낸 경험 꼴: 1인칭 낱말이 있어야 하고, 신호 말 · 상황 줄이 걸리면 막는다. 카드 안전한 대사는 check-talk 의 talk-made-up 이 본다.
- 어휘 범위는 축약형을 펼친 조각마다 보고, 허용 낱말은 표기나 원형 id 로 맞춘다('let' 이 "let's" 를 덮는다).

## 설계와 다르게 한 것 · 정한 것

1. **답 예시 첫 낱말 Yes · No 는 어휘 범위로 막지 않는다.** 규칙이 요구하는 낱말이라서다(견본 어휘에는 없고, 실제 vocab 에는 둘 다 1단계).
2. **장면 여는 질문의 영어 틀(frameEn)은 frameInTurns 단계(3단계)에서 필수이고 다른 단계에서는 두지 않는다.** 06:186 행에는 없고, 칸 규격(spec 설계 5 '영어 틀(3단계)') · 인사 질문 검사와 같은 꼴로 맞췄다.
3. **상황 줄의 어휘 · 길이 단계는 1단계(LEVEL_MIN)다.** 상황 줄은 구간이 없고 1~3단계 모두에 쓰여 '첫 단계'를 1로 읽었다.
4. **카드 글 어휘 범위 검사는 원래 회화 카드에 없다.** 06:185 에 적혀 있지만 지금 코드는 읽기 지문만 비율로 본다. 장면 여는 질문만 엄격(범위 밖 0)하게 새로 걸었다.

## 요청하는 변경

- **3-(다) 목록 내용**: 지금 seed:validate 의 규격 파일 오류 33건은 모두 `seed/lists/talk-*.json` 이다. 범위 밖 낱말 합은 can · choose · easy · go · going · good · great · hear · here · keep · let's · listen · pick · problem · say · start · talk · try · turn · we · with · word 이다. 허용 낱말 okay 는 1단계 범위 안이라 빼야 한다. 걸린 줄 전문은 스크래치패드 `ai-scope-3a-seed-validate-3.txt`.
- **묶음 2(situation.ts)와 맞출 것**: 실제 vocab 은 "let's" 를 let(3단계)의 활용형으로 바로 풀어, 'us' 가 아니라 'let'(또는 "let's")이 허용 낱말이 되어야 범위 안이다. text.ts 의 'CONTRACTION_SUFFIXES' 는 "'s" 를 'is' 로 펼친다.
- **카드 개정 규칙**: 장면 여는 질문 필수를 revision ≥ 5 로 걸어, 앞으로 개정 1 로 새로 만드는 1~3단계 카드(다른 단원 · p08 1단계)는 칸이 없어도 통과한다. 새 카드부터 막으려면 생성 브리프가 칸을 요구하거나, 조건을 '개정 4 두 장만 예외' 꼴로 바꾸는 결정이 필요하다(그 경우 견본 카드에도 칸을 넣어야 함).

## 덮는 시험

tests/unit/seed-validator-talk.test.ts "회화 장면 여는 질문(06:186 · C206, AC-5 (가))" 11:
- AC-5 바른 장면 여는 질문을 단 1 · 3단계 카드는 오류가 없다
- AC-5 1~3단계 카드는 개정 5부터 장면 여는 질문이 없으면 거부하고, 그 앞 개정(DB 의 개정 4)은 칸 없이 통과한다
- AC-5 4단계 카드에는 장면 여는 질문을 두지 않고, 개정이 올라도 칸을 요구하지 않는다
- AC-5 물음표 문장 둘 · 물음표가 마지막이 아님 · 세 문장을 거부한다
- AC-5 예 · 아니요 꼴이 아닌 질문(첫 낱말이 조동사 · be 가 아님 · 'or')을 거부한다
- AC-5 범위 밖 낱말 · {NAME} 둘 · 노리는 단어가 든 질문을 거부한다
- AC-5 인사 · 필수 · 쉬운 · 더 이야기할 거리 질문과 같은 글을 거부한다(정규화 · 마지막 물음표 문장)
- AC-5 한국어 뜻 없음 · 답 예시가 Yes · No 로 시작하지 않음 · 쉬운 질문 물음표 없음 · 쉬운 질문이 같은 글을 거부한다
- AC-5 선택지 단계(1단계)는 같은 꼴에 낱말 하나만 다른 선택지 둘을 두고, 다른 단계는 선택지를 두지 않으며 3단계는 영어 틀을 둔다
- AC-5 선생님 이름이 든 칸 · 문장 길이 상한을 넘는 칸은 카드 글 공통 검사가 sceneOpener 경로로 막는다
- AC-6 1~3단계 카드의 안전한 대사가 지어낸 경험 꼴에 걸리면 거부하고, 4단계는 보지 않는다

tests/unit/talk-lists.test.ts "회화 시드 목록 넷 검사(06:187, AC-6 (나))" 9: 견본 통과 · 꼴 수 상수 · 신호 말 물음표 · 길이 · 범위 · 축약형 조각과 원형 허용 · 상황 줄 범위와 금지 구(all · nospeech · 줄임꼴) · 허용 낱말이 범위 안 · 지어낸 경험 꼴(1인칭 · 줄 걸림 · 낱말 경계) · 사전 없음 · buildReferenceIndex 등록과 색인 칸.

## 실행 명령과 결과(출력 전문은 스크래치패드 `ai-scope-3a-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit` 내 시험 둘 + 닿는 넷(talk-ai-scope-contract · seed-validate-cli · seed-validator-complete · dev-tree) | 6 파일 · 98 통과 |
| `pnpm biome ci <내 파일 여섯>` | 0 |
| `npx tsc --noEmit` | 0 |
| `pnpm lint`(biome ci 전체) | 1: 오류 3, 모두 묶음 1 파일(`src/core/ai/calls/talk-lesson.ts` 형식 · `tests/unit/talk-ai-scope-prompt.test.ts` 형식과 noExportsInTest) |
| `pnpm test`(단위 전체) | 159 파일 중 158 통과 · 2056 통과 · 2 실패 · 6 todo. 실패 둘은 `tests/unit/talk-lesson-flow.test.ts`(인사 둘째 질문 · 따라가기 상한, 묶음 1 이 lesson-flow.ts 를 고치는 중) |
| `pnpm seed:validate` | 종료 1: 칸 797 · 통과 794 · 실패 0(개정 4 카드 두 장 통과) · 규격 파일 오류 33(모두 목록 내용, 위 요청) |
| `pnpm check:ids` CI 인자 | 종료 0 · design-number 46(그대로, 새 수는 맨 위 대문자 상수) |

스크래치패드: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3a-{unit-mine-2,unit-all,lint,tsc-2,seed-validate-3,check-ids}.txt`

## 남은 우려

- 완료 조건의 'seed:validate 0' 은 3-(다)가 목록 내용을 고친 뒤에야 닿는다. 컨트롤러에게 07시대에 이 충돌을 알렸고 답이 오기 전 권고(검사는 오류로 두고 내용은 3-(다))대로 했다.
- 지어낸 경험 꼴 검사는 고정부 예 문장(talk-lesson.ts)을 보지 않는다. 시드 검증기 밖이라 묶음 1 · 2 시험이 볼 몫이다.
- 묶음 2 가 core/conversation/made-up.ts 에 madeUpHit 를 만들면 phrasesIn 과 같은 일을 둘이 하게 된다. 같은 정규화(normalizeSpoken · 낱말 경계)를 쓰는지 묶음 5 짝 시험에서 함께 보면 된다.

## 컨트롤러 답 뒤 고침(2026-11-07) — allowed 를 걸린 낱말로 만듦

컨트롤러 답: 검사는 오류로 두고, plan 바뀌는 파일 표 3 행(70줄) 규칙대로 allowed 를 걸린 낱말로 만들어 seed:validate 를 0 으로. 상황 줄 · 신호 말 본문은 고치지 않는다.

**바꾼 파일:** `seed/lists/talk-allowed-words.json` 의 allowed 만. feeling 은 그대로다.

**만든 방법:** 아래 예 문장을 실제 vocab 사전과 1단계 범위 검사에 돌렸다(check-talk-lists 의 offbandListWords, 허용 낱말 빈 목록, 축약형 펼침). 스크립트와 출력(낱말마다 어느 출처에서 걸렸는지)은 스크래치패드 `ai-scope-3a-allowed.ts` · `ai-scope-3a-allowed-out.txt` 에 있다.
- 시드 신호 말 전부와 상황 줄 전부.
- 고정부 1~3단계 상황 차례 예(talk-lesson.ts 의 greetingEndPrep · greetingEndTalk · together · easy · close · nospeech 열여덟 줄)와 짧은 반응 예 'Me too!' · 'Yum!' · 'Good to hear!'.
- 정본 · spec 예 'Listen and say it with me!' · 'Your turn!' · 'Oops, my ears! Let's go on.' · "That's okay!".

**걸린 낱말 → allowed 에 넣은 목록(40):** answer · ask · can · choose · easy · go · going · good · great · hear · here · hmm · keep · learn · let · listen · new · now · oops · pick · problem · say · some · sorry · sound · start · talk · then · time · together · too · try · turn · way · we · well · with · word · yay · yum

**고른 것:**
- 걸린 "let's" 는 원형 let 으로 적었다. let 이 "let's" 와 lets 를 덮는다. 걸린 words 는 word 가 덮어 하나로 적었다.
- 장면 내용어(soccer · rice 같은 것)는 걸린 것이 없다. 모두 수업 말 · 감탄이다.
- 옛 목록의 okay 는 1단계 범위 안이라 뺐다. again 은 위 예 문장 어디에도 없어 걸리지 않아 뺐다. spec N-1 의 예로는 적혀 있으니, 고정부 예에 again 이 생기면 다시 돌려 넣는다.

**남은 오류:** 없음. seed:validate 의 규격 파일 오류는 33에서 0 이 되었다.

| 명령 | 결과 |
|---|---|
| `pnpm seed:validate` | 종료 0 · 칸 797 · 통과 794 · 실패 0 · 규격 파일 오류 0 · 경고 17(앞부터 있던 것) |
| `pnpm test`(단위 전체) | 159 파일 · 2062 통과 · 6 todo · 실패 0 |
| `npx tsc --noEmit` | 0 |
| `pnpm biome ci <내 파일 일곱, json 포함>` | 0 |
| `pnpm lint`(전체) | 1: 묶음 1 파일 둘만(`src/core/ai/calls/talk-lesson.ts` 형식 · `tests/unit/talk-ai-scope-prompt.test.ts` 형식과 noExportsInTest) |
| `pnpm check:ids` CI 인자 | 종료 0 · design-number 46 |

**남은 우려:** 고정부 예 문장은 묶음 1 이 고치는 중이다. 예가 바뀌면 같은 스크립트로 다시 돌려 allowed 를 맞춰야 한다. 3-(다)가 상황 줄 · 신호 말을 고칠 때도 같다.

## fix 1(컨트롤러 결정 2026-11-07 — 필수 조건을 예외 목록 꼴로)

결정: 'revision ≥ 5' 는 앞으로 개정 1 로 만드는 1~3단계 카드가 칸 없이 통과하는 구멍이라 쓰지 않는다. 1~3단계 회화 카드는 모두 sceneOpener 필수이고, DB 의 옛 카드 둘만 코드 상수로 예외에 둔다.

**바뀐 것:**
- `src/core/seed/check-talk.ts`: TALK_SCENE_OPENER_FROM_REVISION 을 지우고 TALK_SCENE_OPENER_EXEMPT 와 sceneOpenerExempt 를 두었다. 예외는 회화 3단계 단원 1 의 배정 1 · 다지기 6(변형 1, 개정 4 이하) 둘이다. checkSceneOpener 는 예외가 아닌 1~3단계 카드에 칸이 없으면 막는다. 3-(다)가 두 장을 개정 5 로 올리면 예외는 쓰이지 않는다.
- `tests/fixtures/seed/builders.ts` 의 talkCard: 정한 것 10 대로 Edit 했다. 1~3단계 견본 카드에 장면 여는 질문 칸을 더했다. 견본 어휘만 쓰고, 3단계는 영어 틀, 1단계는 선택지를 둔다. 견본 카드는 개정 1 이라 예외 밖이므로 칸이 없으면 견본 시드 시험 전부가 막힌다.
- `tests/unit/seed-validator-talk.test.ts`: 개정 시험 하나를 세 갈래 시험으로 바꾸었다.
  - AC-5 예외 밖 1~3단계 카드(견본 · 새로 만드는 카드)는 개정이 낮아도 장면 여는 질문이 없으면 거부한다. 1 · 2 · 3단계를 보고, 변형만 다른 카드도 본다.
  - AC-5 예외 카드(회화 3단계 단원 1 배정 1 · 다지기 6, 개정 4 이하)는 장면 여는 질문 없이 통과한다. 칸이 있으면 검사를 받고, 단원 2 의 같은 번호는 예외가 아니다.
  - AC-5 예외 카드도 개정 5 이상이면 장면 여는 질문이 없으면 거부한다.
  - 4단계 시험은 개정 줄을 빼고 그대로 두었다.

**관문:**

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/seed-validator-talk.test.ts tests/unit/talk-lists.test.ts` | 59 통과 |
| `npx tsc --noEmit` | 0 |
| `pnpm biome ci <내 파일 일곱>` | 0 |
| `pnpm seed:validate` | 종료 0 · 칸 실패 0 · 규격 파일 오류 0 |
| `pnpm check:ids` CI 인자 | 종료 0 · design-number 46 |
| `pnpm test`(단위 전체) | 161 파일 중 160 통과 · 4 실패. 모두 `tests/unit/talk-metrics.test.ts`(묶음 4-나, 새 파일)이다 |

**allowed 와 남은 범위 밖 낱말:** allowed 는 앞 절대로 걸린 낱말 40개다. 상황 줄 · 신호 말 본문에 범위 밖 낱말은 남지 않았다(seed:validate 규격 파일 오류 0).

**talk-metrics 4 실패의 원인:** 옛 allowed 로 잠시 돌려 견주었다. 옛 목록은 1 실패, 새 목록은 4 실패였고, 파일은 곧바로 원래대로 돌렸다. 나머지 1건은 4-나 자체의 진행 중 실패다. 3건은 talk-metrics 가 실제 seed 목록(`seed/lists/talk-allowed-words.json`)을 읽고 'yum' 을 범위 밖 예로 기대하기 때문이다. 해당 줄은 talk-metrics.test.ts 333 · 358 · 513 근처다. 고침은 시험 예 낱말을 바꾸거나 시험용 목록을 넘기는 설계 선택이다. 4-나 가 같은 파일을 쓰는 중이라 Edit 하지 않고 넘긴다.

출력 전문: 스크래치패드 `ai-scope-3a-{unit-fix1-c,unit-fix1-all,tsc-fix1,seed-validate-fix1,check-ids-fix1,metrics-old}.txt`
