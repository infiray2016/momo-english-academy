# 묶음 3-(다) 보고: 개정 5 두 장 · 시드 목록 넷 내용 · 생성 브리프

작성: 학습 설계자(curriculum-designer, Opus xhigh) · 2026-11-07 · 워크트리 p13d · 상태 DONE_WITH_CONCERNS(우려는 6절 1 · 2)

## 1. 바꾼 파일

| 파일 | 바꾼 것 |
|---|---|
| `seed/lessons/talk/3/1.json` | 배정 1 · 다지기 6 두 장만 개정 5(correction 0). 장면 여는 질문 한 줄씩(요청자 답 전 추천 1번 · 1번), 예상 흐름 첫 줄. 차이 6줄(개정 줄 둘 · 칸 줄 둘 · 흐름 줄 둘), 다른 칸은 개정 4 와 같음(차이 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/card.diff`) |
| `seed/lists/talk-cue-lines.json` | 자리 셋 × 구간 둘마다 긴 꼴 2 · 짧은 꼴 3(전에는 1 · 2) |
| `seed/lists/talk-situation-lines.json` | 자리 다섯의 줄을 설계 1 자리별 몫에 맞게 다시 씀(자리마다 3~4), 금지 구 all 7 · nospeech 9 |
| `seed/lists/talk-made-up-phrases.json` | 지어낸 경험 꼴 3 → 20 |
| `seed/lists/talk-allowed-words.json` | allowed 를 3-(가) 절차로 다시 만듦(최종 41: 3-(가) 목록 대비 help · will 더함, going 빠짐), feeling 정리(12). 7절 |
| `seed/prompts/talk-3.md` | 다섯째 판: 0절 판 정보 · 5절 대화 행 · 번호 행 · 새 소절 '장면 여는 질문 쓰는 법' · flow 행 · 12절 표 행과 예시 카드 · 14절 확인 목록 · 규칙 표 · 스스로 확인 스크립트 · 16절 보고 줄 · 17절 제안 셋(차이 147줄, `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/talk-3.diff`) |
| `seed/prompts/_template.md` | 35줄 회화 항목에 장면 여는 질문 규칙 · 흐름 첫 줄 · 꼴 돌려 쓰기 |
| 남의 시험 세 파일 | 의도한 카드 · 목록 변화로 깨진 줄만 Edit(plan 정한 것 10). 5절 |

코드 · 검증기는 고치지 않았고 적재 · 커밋은 하지 않았습니다. generation 칸은 개정 4 때(b462c21)처럼 그대로 두었습니다.

## 2. 목록 넷에서 정한 것

- **한국어 뜻은 반말로 두었습니다.** 컨트롤러 브리프는 '해요체 ko'라고 했지만, 정본 02-2:39 는 '선생님 한국어 줄은 해요체, 영어 문장의 한국어 뜻은 반말'이라고 정합니다. 목록 스키마 주석(reference.ts '뜻은 반말')과 카드의 대사 뜻도 반말입니다. 신호 말 · 상황 줄의 ko 는 영어 문장의 뜻이라 반말이 맞다고 보았습니다.
- **신호 말**: 정본 예('Listen and say it with me!' · 'Your turn!')는 계약 시험이 고정한 자리에 그대로 두었습니다. 짧은 꼴을 셋으로 늘려 '긴 꼴 한 번 뒤 짧은 꼴 돌림'이 두 줄 번갈이가 되지 않게 했습니다. 'Together!' · 'With me!' · 'You try!' · 'You pick!' · 'Your pick!' 은 'Now, with me!' · 'One, two, say it!' · 'Now pick one!' 같은 꼴로 바꿨습니다. 묶음 2 의 cue-line.ts 는 시드 줄을 문장 전체가 같을 때만 지우므로 오삭제 위험은 원래 작았습니다. 바꾼 까닭은 낱말 하나짜리 꼴보다 신호로 또렷하게 들리게 하려는 것입니다. 1단계는 5낱말, 2~3단계는 6낱말 안입니다.
- **상황 줄**: 받침 첫째 줄에서 '같이 말하자'를 뺐습니다('That's okay! You can do it!' 꼴). 앱이 바로 뒤에 신호 말을 붙이고, 설계 1 도 그 안내를 신호 말 몫으로 두었기 때문입니다(옛 줄 셋은 모두 'say it together' 꼴이었습니다). 인사 끝은 아이 기분이 나빠도 맞는 말('Okay!' · 'Thank you!')과, 다음이 짧은 준비든 대화든 맞는 말('Let's start!' · 'Here we go!')로 바꿨습니다. 받침 셋째에서는 막힌 아이에게 맞지 않는 'Good try!' 칭찬을 빼고, 답을 들려주고 넘어가는 말('Here is the answer.')을 넣었습니다. 들리지 않음은 소리 · 선생님 쪽 말이고 정본 예를 첫 줄에 두었습니다.
- **금지 구**: all 에 탓 · 실패 꼴 다섯(that's not right · you're wrong · try harder · too bad · bad answer), nospeech 에 들은 척 칭찬 일곱(nice answer · good job · great job · well done · you're right · that's right · i heard you)을 더했습니다. 상황 줄 · 고정부 예 · 정본 예가 걸리지 않음을 검증기로 확인했습니다.
- **지어낸 경험 꼴**: 시간 + 1인칭(last night i · this morning i · one day i …), 기억 꼴(i remember · i once · i used to · when we were), 1인칭 과거 동사(i went · we went · i saw · i ate · i played · i visited)를 더해 20개입니다. 1~3단계 AI 는 과거형이 형태 범위 밖이라, 이 꼴의 문장은 지어낸 경험일 수밖에 없습니다. 카드 안전한 대사 · 신호 말 · 상황 줄이 걸리지 않음을 확인했습니다.
- **허용 낱말**: 손으로 적지 않았습니다. 시드 신호 말 · 상황 줄 전부, talk-lesson.ts 의 TALK_SITUATION_EXAMPLES(손으로 옮기지 않고 모듈에서 바로 읽음), 짧은 반응 예 셋, 정본 · spec 예 넷을 1단계 범위 검사(허용 빈 목록)에 돌려 걸린 낱말을 원형으로 모았습니다. 스크립트는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed.ts`, 낱말별 출처는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed-out.txt` 입니다. 3-(가) 목록과 견주면 help 가 늘고(새 받침 첫째 줄), going 은 원형 go 가 덮어 빠졌습니다. 고정부 예가 바뀐 뒤 다시 뽑은 결과는 7절입니다.
- **느낌 낱말**: good · great 을 빼고 thirsty · sick · angry · scared · bored · excited 를 더했습니다(happy · sad · tired · hungry · sleepy · fun 은 그대로). 이 목록은 'Child said more: yes'(둘째 문장 허용)를 켭니다(spec 설계 3). good · great 은 'I'm good.' · 'Great!' 같은 기본 답이라, 두면 거의 모든 짧은 답이 '내용 있는 말'이 되어 선생님 말이 늘어납니다(설계 8 '말 양은 고침 전 이하'). hot · cold 는 장면 질문의 한 낱말 답으로 흔해서 넣지 않았습니다.

## 3. 생성 브리프(뒤 26장용)

- talk-3.md 5절에 '장면 여는 질문 쓰는 법'을 두었습니다. 글 · 질문 꼴(3단계 단원 1 은 Do · Is · Are · Can), 낱말(이 단원 단어 25개 전부 빼기, 범위 밖 낱말 예), 같은 질문(정본 예가 배정 1 카드와 겹친 사례), 좋은 질문 기준 (가)~(마), 꼴 돌려 쓰기, 받침 칸, 예상 흐름 첫 줄을 담았습니다.
- 꼴 돌려 쓰기(3-(나) 보고 9절 3)는 이렇게 정했습니다. 질문 문장의 첫 세 낱말을 꼴로 보고, 같은 꼴은 변형마다 세 장까지만 둡니다. 차례가 바로 앞인 카드와 같은 꼴은 쓰지 않습니다. 단원 안의 질문 글은 모두 다르게 하고, 'Do you like' 꼴은 쓰지 않습니다. 모두 '(제안)'이고 17절에 모았습니다.
- 14절 스스로 확인 스크립트가 장면 여는 질문의 꼴 · 첫 낱말 · or · 답 예시 첫머리 · 틀 · 단원 단어 · 같은 열쇠 · 흐름 첫 줄 · 단원 단위 꼴 셈을 봅니다. 3-(가) 보고가 남긴 '개정 1 새 카드는 칸 없이 통과' 문제는 브리프가 모든 카드에 칸을 요구하고 이 스크립트가 없음을 잡는 것으로 메웠습니다(검증기 조건은 그대로).
- 12절 예시 카드(배정 2 · 변형 2)에 장면 여는 질문 'Toys and books at home! Do you read books?' 와 흐름 첫 줄을 넣었습니다. 이 카드만 든 사본으로 검증기를 돌려 칸 오류 0 · 칸 경고 0 을 확인했습니다(단원 덜 참 경고 하나는 맞는 것). 스크립트도 '걸림 없음'입니다.
- 브리프 해시는 1f72e4ff…bf9b0 에서 964f3c6e…569be8 로 바뀌었습니다. 판이 바뀌었으므로 뒤 카드는 처음부터 만들고, 개정 5 두 장은 14절 붙이기 명령으로 고정 카드로 둡니다(0절 규칙 그대로).

## 4. 검증 결과(출력 전문은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/`)

| 명령 | 결과 |
|---|---|
| `pnpm seed:validate`(전체) | 종료 0 · 칸 797 · 통과 794 · 실패 0 · 규격 파일 오류 0 · 경고 17(앞부터 있던 것, 이 카드는 단원 덜 참 경고 하나) |
| `pnpm seed:load --complete-through 3 --areas talk --partial --dry-run` | 종료 0 · 칸 넣음 2(lesson:talk:3:1:assigned:1:1 · reinforce:6:1, 개정 5 · correction 0) · 건너뜀 316 · 최신 개정 4→5 · 위반 0. 적재는 하지 않음 |
| 브리프 14절 스스로 확인(실제 두 장) | 걸림 없음. 꼴 'do you ride' 1 · 'can you swim' 1 |
| 같은 스크립트, 틀린 사본 둘 | or · Do you like · 답 예시 첫머리 · 힌트 · 단원 단어 · 흐름 첫 줄 · 칸 없음 · 다른 질문과 같은 열쇠 · 이어진 꼴 · 단원 안 같은 질문을 모두 잡음 |
| checkSceneOpener 대조 | 개정 5 두 장에서 오류 0. 3-(나) 때 대조 사본으로 이 검사가 실제로 걸리는 것을 확인함 |
| `vitest run --project unit`(전체) | 161 파일 · 2127 통과 · 실패 0(처음 돌렸을 때는 11 실패 가운데 4건이 이 묶음 몫이라 5절대로 고침. 남은 7건은 신호 구 · 고정부 문구 쪽 남의 묶음 진행분이었고, 다시 돌렸을 때 모두 통과) |
| `tsc --noEmit` · `biome ci`(고친 시험 세 파일) | 0 · 0. seed 의 JSON 은 Biome 대상 밖(biome.json `!seed/**/*.json`) |

## 5. 고친 남의 시험 줄(plan 정한 것 10, 그 줄만 Edit)

| 파일 | 줄 | 까닭 · 고친 꼴 |
|---|---|---|
| `tests/unit/talk-ai-scope-contract.test.ts`(0-나) | 금지 구 all · nospeech, 지어낸 경험 꼴 | 목록 내용을 글자 그대로 고정했음. 정본 · spec 예가 들어 있는지(`arrayContaining`)로 바꿈 |
| `tests/unit/talk-metrics.test.ts`(4-나) | `k.sceneOpener` | 카드에 칸이 없다는 전제(null)였음. 개정 5 부터 있으므로 `not.toBeNull()` |
| `tests/unit/talk-observe.test.ts`(4-가) | 대화 첫 질문 · 첫 질문 막힘의 답 소리 · 쉬운 질문 | 첫 질문이 필수 질문 1 이라는 전제였음. 카드의 sceneOpener 칸 값으로 견줌 |
| 같은 파일 | 늦은 카드 답 시험 둘 · 도우미 | 첫 질문이 카드 기회여야 뜻이 있는 시험이라, 도우미 `afterGreeting(false)` 와 `withoutSceneOpener`(칸 없는 개정 4 꼴, plan 정한 것 3)로 돌림. 장면 여는 질문은 카드 기회가 아니므로(spec 설계 5) 그대로 두면 다른 까닭으로 통과·실패하게 됨 |

## 6. 결정이 필요한 것 · 남은 우려

1. **컨트롤러: 목록 ko 말투.** 브리프의 '해요체 ko'와 달리 정본 02-2:39 를 따라 반말로 두었습니다. 해요체가 뜻이었다면 정본 문구와 함께 정해야 합니다.
2. **컨트롤러: 느낌 낱말 good · great 빼기.** 'Child said more' 가 켜지는 빈도를 줄이는 쪽의 판단이라 대본 지표(설계 8 선생님 발화량 · 혼자 긴 차례)에 닿습니다. 기준선 (가)는 옛 목록으로 돌았으니, 대본 판정에서 이 차이를 함께 보면 됩니다.
3. **허용 낱말은 고정부 예에 묶여 있습니다.** 묶음 1 이 TALK_SITUATION_EXAMPLES 를 더 고치면 아래 명령으로 다시 만들어야 합니다. 스크립트가 모듈을 바로 읽으므로 옮겨 적을 것은 없습니다.
   ```
   (cd .claude/worktrees/p13d && pnpm exec tsx /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed.ts)
   ```
4. **요청자가 다른 번호를 고르면** 두 카드의 sceneOpener 한 줄씩만 바꿉니다(3-(나) 표본 원본 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3b/samples.json`). 개정은 5 그대로 두면 됩니다(적재 전). 고친 시험들은 카드 값을 읽으므로 다시 고칠 줄이 없습니다. 바꾼 뒤 seed:validate 와 14절 스크립트를 다시 돌립니다.
5. **design-reviewer 아이 눈 검토 대상**: 두 장의 장면 여는 질문(표본 쪽 1번), 신호 말 30줄 · 상황 줄 17줄의 en · ko, 받침 첫째 줄에서 '같이 말하자'를 뺀 판단입니다.

## 7. 고정부 예가 바뀐 뒤 허용 낱말 다시 뽑음(컨트롤러 알림 뒤)

- 묶음 1 이 TALK_SITUATION_EXAMPLES 의 받침 셋째(close) 두 줄을 바꿨습니다. 'That's okay! Listen to this one.' · 'No problem. Here is the answer, and then we go on.' 이 'That's okay! Here is the answer.' · 'No problem. I will help, and then we go on.' 이 되었고, 주석 [M-1] 은 받침 셋째에 'Listen …' 꼴을 두지 않는다고 적습니다. 다른 자리의 예는 그대로였습니다.
- 그래서 상황 줄의 받침 셋째 'It's okay! Listen, then we go on.' 을 'It's okay! Now we go on.'(괜찮아! 이제 계속하자.)로 바꾼 뒤 다시 뽑았습니다.
- **뽑은 스크립트**: 3-(가) 스크립트(`scratchpad/ai-scope-3a-allowed.ts`)는 고정부 예를 바뀌기 전 글로 손으로 옮겨 적어 두어서, 그대로 돌리면 옛 예로 뽑힙니다. 실제로 돌려 보니 will 이 나오지 않았고, 원형으로 줄이기 전 표기(going · let's · words)가 나왔습니다. 그래서 절차는 같고 고정부 표를 모듈에서 바로 읽는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed.ts` 의 결과를 썼습니다. 두 결과와 차이는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed-out-2.txt` · `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/allowed-out-3a-script.txt` 에 있습니다.

| 견준 것 | 더해진 낱말 | 빠진 낱말 |
|---|---|---|
| 이 묶음 첫 결과(40) → 다시 뽑음(41) | will(고정부 새 예 'I will help') | 없음 |
| 3-(가) 목록(40) → 다시 뽑음(41) | help · will | going(원형 go 가 덮음) |

- 결과: `pnpm seed:validate` 종료 0 · 칸 797 · 실패 0 · 규격 파일 오류 0. 목록 · 카드를 읽는 단위 시험 여섯 파일 162 통과. 적재 미리 보기는 그대로 '넣음 2 · 개정 4→5 · 위반 0' 입니다.
- **우려(Minor, 묶음 1 몫)**: will 은 형태 표에서 7단계 단원 4 형태입니다. 상황 차례 검사(situation.ts checkSituationSentence)는 어휘만 보고 형태는 보지 않으므로 앱 검사에는 걸리지 않습니다. 다만 1~3단계 AI 상황 줄에 미래형이 허용되는 셈입니다. 고정부 예를 'No problem. I can help, and then we go on.' 꼴로 바꾸면 will 은 목록에서 빠집니다(예가 바뀌면 위 스크립트로 다시 뽑기).


## fix 1(설계 검토 `task-des-3-report.md` 뒤, 2026-11-07)

| 지적 | 고친 것 | 판정 근거 |
|---|---|---|
| I-1 12절 예시 카드의 장면 여는 질문이 필수 1 과 주제 겹침 | 예시를 'Red kites and big trees! Do you fly kites?'(빨간 연이랑 큰 나무야! 너는 연 날려?)로 바꿈. 받침 칸은 'Yes, I fly kites.' · 'Yes, I ___ kites.' · 쉬운 질문 'Do you like kites?' 이고, 예시 카드의 필수 · 더 이야기할 거리 주제(집 · 차 · 침대 · 책상 · 새 놀이 · 식탁 · 컵 · 친구 · 버스)와 겹치지 않음. 5절 (라)에 '주제 겹침은 14절 스크립트가 보지 못하므로 카드 계획표에서 사람이 확인' 줄과 예를 더함. 같은 확인을 2절 계획표 · 14절 확인 목록 4 · 16절 보고 줄에도 넣음. 12절 검증 메모에 고친 사실을 적음 | 예시 카드만 든 사본에서 seed:validate 칸 27 · 실패 0(단원 덜 참 경고만), 14절 스크립트 '걸림 없음' |
| M-1 2~3단계 꺼내기 긴 꼴 'say this word' | 'Listen and say this!'(듣고 이걸 말해 봐!) | 꺼내기 소리 줄은 짧은 문장('I wash.')이라 '낱말' 이라 부르지 않음 |
| M-3 인사 끝 'Thank you!' · 'Thanks!' 의 맥락 빔 | 'Okay then! Here we go!'(좋아, 그럼! 가 보자!) · 'Hmm, okay! Let's start now.'(음, 알겠어! 이제 시작하자.) | 기분이 어떻든 맞는 반응이고 낱말이 모두 1단계 · 허용 목록 안. 'All right' 은 right 가 4단계라 쓰지 않음 |
| M-4 'I can't hear it' 의 it | 'Sorry, I can't hear well. Let's go on.' | 고정부 예와 같은 뜻, well 은 허용 낱말 |
| M-5 표본 5 받침 줄 앞뒤 불일치 | 쉬운 질문 'Is it hot?' → 'Is it cold?'(차가워?). 표본 쪽 · 3-(나) 보고 표 · 표본 원본 samples.json 을 함께 고침 | 3-(나) 재현 검사 [1-5] 통과(장면 여는 질문 열쇠 'is the water cold' 와 다름) |
| M-6 지어낸 경험 꼴 거짓 양성 후보 | 'i remember' · 'one day i' 를 빼고 'i remember when' · 'i remember my' 를 더함(20 → 20) | 아래 점검 표 |
| M-7 'you don't know' 가 다독이는 문장도 잡음 | 고치지 않음 | 검토자 '참고로 둔다'. 바뀌는 상황 줄도 다독이는 말이라 해가 없음 |
| M-2 둘째 긴 꼴이 쓰이지 않음 | 목록은 그대로 | 묶음 2 코드 몫(컨트롤러가 넘김) |

M-6 점검(묶음 2 의 madeUpHit 로 돌림, 스크립트 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/madeup-probe.ts` · 출력 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3c/madeup-probe-out.txt`):

| 목록 | 정상 문장 걸림(10개 중) | 지어낸 문장 놓침(12개 중) |
|---|---|---|
| 고치기 전 | 5('I remember! You like fish.' 꼴 되짚기 셋 · 'One day I want to see a whale!' 꼴 바람 둘) | 0 |
| 좁힌 뒤 | 0 | 0 |

정상 문장은 이 대화 되짚기 · 바람 · 좋아하는 것 · 되받기('You went to the lake!') · 글자만 겹치는 문장('When I wash …' · 'Kiki saw it.')이고, 지어낸 문장은 'Yesterday I went …' · 'I remember my first bike.' · 'One day I went to the sea.' · 'We went to the beach.' 꼴입니다. 'one day i' 를 빼도 'One day I went …' 는 'i went' 가 잡습니다.

**남의 시험 줄**: 계약 시험(`talk-ai-scope-contract.test.ts`)에서 제가 앞서 고친 지어낸 경험 꼴 줄을 다시 Edit 했습니다. 정본 예 둘('yesterday i' · 'when i was')이 들어 있는지와 'i remember …' 꼴이 하나 이상 있는지를 봅니다.

**허용 낱말**: 목록 본문을 바꾼 뒤 같은 스크립트로 다시 뽑았습니다. 41개 그대로이고 더해진 낱말 · 빠진 낱말은 없습니다(새 줄의 then · hmm · well 은 이미 목록에 있고 나머지는 1단계).

**결과**: `pnpm seed:validate` 종료 0 · 칸 797 · 실패 0 · 규격 파일 오류 0. 적재 미리 보기 '칸 넣음 2 · 최신 개정 4→5 · 위반 0'(적재 안 함). 실제 두 장 14절 스크립트 '걸림 없음'. 목록 · 카드를 읽는 단위 시험 6파일 162 통과, tsc 0, biome ci(고친 시험 파일) 0.
