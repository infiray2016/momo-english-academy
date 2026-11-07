# 묶음 0-나 구현 보고 — 계약(카드 칸 sceneOpener · 시드 목록 넷의 꼴)

구현자 Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(커밋 없음) · 상태 DONE_WITH_CONCERNS(관문의 붉은 줄은 모두 4-가 몫)

## 바뀐 파일:줄(워크트리 기준)

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/seed/schema/talk.ts` | 99~117 · 164~165 · 273~288 · 309 · 328~330 | TalkSceneOpenerSchema(question {en, ko?} · hintKo · hintEn · frameEn? · answerExample · easyQuestion {en, ko?} · choices? [Text, Text]) · TalkCardSchema.sceneOpener 선택 칸(prep 뒤 · required 앞) · sceneOpenerTexts(필수 질문과 같은 역할: question.en · easyQuestion.en tori, 뜻 ko, hintEn · frameEn hint, answerExample child, choices pair) · textsOfTalkCard 에서 칸이 있을 때만 냄. talkCardKindOf 그대로 |
| `src/core/seed/structure.ts` | 256~272 · 736~743 | 상수 TALK_CUE_PLACES(introduce · together · choices) · TALK_CUE_BANDS("1" · "2-3") · TALK_SITUATION_PLACES(greeting_end · together · easy · close · nospeech) · TALK_SITUATION_FORBIDDEN_SCOPES(all · nospeech) · SEED_FILES 넷(talkCueLines · talkSituationLines · talkAllowedWords · talkMadeUpPhrases → `lists/talk-*.json`) |
| `src/core/seed/schema/reference.ts` | 16~20 · 536~597 | 목록 넷 Zod: 신호 말 `z.record(자리, z.record(구간, {long, short}))`(열쇠 다 요구 · 모르는 열쇠 거부), 상황 줄 `{lines: record(자리, 줄[] min1), forbidden: record(all · nospeech, 겹침 없는 글[] min1)}`, 허용 낱말 `{allowed, feeling}`(소문자 한 낱말, 겹침 없음, min1), 지어낸 경험 `{phrases}`(normalizeSpoken 꼴 정규화 구, 겹침 없음, min1). 줄은 모두 en · ko 필수 |
| `src/server/seed-lists.ts` | 15~21 · 25~31 · 45~48 · 161~236 | LIST_SCHEMAS 넷 · 읽기 함수 넷 seedTalkCueLines · seedTalkSituationLines · seedTalkAllowedWords · seedTalkMadeUpPhrases(seedHomophones 꼴: 파일 없음 → 빈 꼴 + 목록마다 경고 한 번, 규격 틀림 → 던짐) |
| `seed/lists/talk-cue-lines.json` · `talk-situation-lines.json` · `talk-allowed-words.json` · `talk-made-up-phrases.json` | 신규 | 규격을 지나는 첫 내용. spec 예 'Listen and say it with me!'(together 2-3 긴 꼴) · 'Your turn!' · 'Oops, my ears! Let's go on.'(nospeech 첫 줄) · 금지 구 바탕 넷 · 지어낸 경험 꼴 셋('yesterday i' · 'when i was' · 'i remember'). 자리마다 상황 줄 셋 · 신호 말 긴 꼴 하나 · 짧은 꼴 둘 |
| `next.config.ts` | 바꾸지 않음 | outputFileTracingIncludes 의 '/' · '/*' 가 이미 `./seed/lists/**/*.json` 을 묶는다(새 시험이 확인) |
| `tests/unit/talk-ai-scope-contract.test.ts` | 신규 | 아래 시험 11 |

### 브리프 표 밖에 손댄 것(SEED_FILES 넷을 더하면 타입이 요구함)
- `src/core/seed/validate.ts` 68~71 · 583~586: `REFERENCE_SCHEMAS: Record<SeedFileName, …>` 에 넷 등록. 빠지면 tsc 가 깨진다. 이 등록으로 seed:validate 가 네 파일의 있음 · Zod 꼴을 본다(검사 규칙은 더하지 않음).
- `src/core/seed/reference-index.ts` 26~29 · 83~87: `ReferenceFiles` 타입에 넷(타입만). 검사 등록(check-talk-lists)은 묶음 3 몫으로 남겼다.
- `tests/fixtures/seed/builders.ts` 49~53 · 950~953 · 1287~1328: ReferenceSet 타입과 견본 값 talkAiScopeLists(). 없으면 견본 시드 트리가 reference-missing 으로 막힌다.
- `tests/unit/seed-schema.test.ts` 41~44 · 1087~1090: 규격 파일 schemaOf 표에 넷(빠지면 tsc TS7053).
- 이 넷은 나란히 도는 0-가 · 4-가 소유 파일이 아니다. 묶음 3 이 reference-index.ts 를 고칠 때 위 타입 줄을 그대로 쓰면 된다.

## 설계와 다르게 한 것 · plan 이 열어 둔 것을 정한 것
- Zod 는 빈 목록을 거부한다(min 1). 서버 읽기가 빈 자리에서 고를 줄이 없게 하려는 꼴 최소다. '긴 꼴 하나 이상 · 짧은 꼴 둘 이상 · 상황 줄 셋 이상' 같은 꼴 수는 검사 상수로 묶음 3 이 본다.
- 허용 · 느낌 낱말은 소문자 한 낱말(`^[a-z][a-z'-]*$`), 지어낸 경험 꼴은 normalizeSpoken 꼴 정규화 구(`^[a-z0-9]+( [a-z0-9]+)*$`)로 묶었다. 상황 금지 구는 정본 예('that's wrong')처럼 자연 글(Text)로 두었다. 견줄 때 정규화하는 것은 묶음 2 몫이다.
- 파일이 없을 때 읽기 함수는 빈 꼴을 낸다. 빈 목록일 때 어떻게 할지(신호 말 없음 · 상황 줄 대신 길 · 지어낸 경험 검사 안 함)는 부르는 묶음 2 가 정한다.
- sceneOpener 에 imageKey 칸은 두지 않았다(plan 0-나 행에 없음).

## 덮는 시험(tests/unit/talk-ai-scope-contract.test.ts, 11)
- 개정 4 카드 두 장은 칸이 없어도 새 꼴로 읽힌다
- 같은 카드에 칸을 더해도 새 꼴이다(3단계 틀 · 1단계 선택지 꼴 모두)
- 칸 꼴이 틀리면 카드가 틀림이다(모르는 키 · 빠진 받침 칸 · 선택지 하나)
- textsOfTalkCard 는 칸이 있으면 sceneOpener.* 경로를 필수 질문과 같은 역할로 내고, 없으면 내지 않는다
- SEED_FILES 에 넷이 들고, 시드 파일은 규격을 지나며, loadSeedList 가 같은 값을 읽는다
- 신호 말은 자리 셋 × 구간 둘이 다 있고 줄마다 en · ko 다(긴 꼴 · 짧은 꼴)
- 상황 줄은 자리 다섯이 다 있고, 금지 구는 all · nospeech 다
- 허용 낱말 · 느낌 낱말 · 지어낸 경험 꼴 읽기
- 규격은 빠진 자리 · 모르는 자리 · 빈 목록 · 뜻 없는 줄 · 겹침 · 대문자 낱말 · 정규화 안 한 구를 거부한다
- loadSeedList 는 missing 으로 던지고, 읽기 함수 넷은 빈 꼴을 내며 목록마다 경고를 한 번 남긴다
- 빌드 추적(next.config.ts outputFileTracingIncludes)이 넷을 묶는다

## 실행 명령과 결과(출력 전문은 스크래치패드 `ai-scope-0na-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-ai-scope-contract.test.ts` | 11 통과 |
| `pnpm biome check --write <바꾼 파일>` · `pnpm lint` | 0(616 파일, 고칠 것 없음) |
| `npx tsc --noEmit` | 오류 4, 모두 `scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`(4-가 진행 중). 그 밖 0 |
| `pnpm seed:validate` | 종료 0(오류 0, 경고는 앞부터 있던 단원 목표 없음뿐) |
| `pnpm test` | 156 파일 중 155 통과 · 시험 2008 통과 · 5 실패(모두 talk-observe.test.ts, 4-가) · 6 todo |
| `pnpm check:ids`(CI 인자 그대로) | 종료 0 · 내 파일의 design-number 없음 |

스크래치패드: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-0na-{unit1,biome,tsc,seed-validate,unit-all,lint,check-ids}.txt`

## 남은 우려
- 단위 전체 · tsc 의 붉은 줄은 4-가 가 대본 도구 꼴을 바꾸는 중이라 생긴다. 4-가 가 끝난 뒤 컨트롤러가 관문을 다시 돌려야 한다(plan 정한 것 10).
- 목록 첫 내용은 꼴만 맞췄다. 어휘 범위(1단계 · 2~3단계 첫 단계) · 문장 길이 · 금지 구 · 지어낸 경험 꼴 검사는 아직 돌지 않는다. 그래서 'Listen and say this word!' · 'Oops! I can't hear you.' 같은 줄이 묶음 3 검사에 걸릴 수 있다. allowed 는 plan 대로 묶음 3 이 예 문장을 돌려 다시 만든다.
- validate.ts 에 등록했으므로 이제 네 파일이 없으면 seed:validate 가 reference-missing 으로 막는다. 다른 워크트리 · 브랜치에서 seed 폴더만 옮겨 쓰면 이 넷도 함께 옮겨야 한다.

## fix round 1(검토 rev-0 Minor M-1)

- 지적: '개정 4 카드가 new 로 읽힘' 증명이 살아 있는 시드 파일 `seed/lessons/talk/3/1.json` 에 기대어, 묶음 3 이 카드를 개정 5 로 바꾸면 증명이 사라진다.
- 고침: 머리 6e86881 의 그 파일(워크트리에서 바뀌지 않음을 git diff 로 확인)에서 두 장(kind · lessonNo · revision · correction · card)을 떠 `tests/fixtures/talk-cards-rev4.json`(신규, 고정 사본 · `_note` 에 '시드가 바뀌어도 고치지 않는다')에 두었다. `tests/unit/talk-ai-scope-contract.test.ts` 의 SEED_CARDS 가 이 사본을 읽고, 첫 시험은 lessonNo [1, 6] · revision 4 · sceneOpener 없음 · new 를 본다. 나머지 시험(칸 더함 · 틀림 · 글 조각)도 같은 사본을 바탕으로 쓴다.
- 관문: 내 시험 11 통과 · `pnpm lint` 0(618 파일) · `npx tsc --noEmit` 0(오류 0 — 앞 회의 talk-observe 오류도 이제 없음). 출력은 스크래치패드 `ai-scope-0na-fix1-{biome,unit,lint,tsc}.txt`.
