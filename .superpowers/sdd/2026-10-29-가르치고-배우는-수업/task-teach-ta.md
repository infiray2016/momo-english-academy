# 브리프: 가르치고 배우는 수업 plan 묶음 타 — 검증기 보탬 · 의미 검사 순수 함수 · 풀이 대상(구현자 · Opus · high, 2026-10-30 01:0x 작성, 가 관문(재검토 Approved) 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 92~101줄 '타 · 검증기 보탬' 표와 작업 순서 4 를 구현한다. 근거는 spec 3판 `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 7(검증 표 — 새 검사 행, 310~318줄) · 설계 8(말하기 질문 판정 · **의미 검사**, 348~351줄) · AC-1a · 2e · 4b · 4c · 5a · 5b · 7c · 6g(시드 몫) · 8a, 정본 6.4(C184 반영 뒤) · 06:106~(풀이 검사 · 한 호출). 시드 규격 구현 보고 `task-seed-schema-report.md`(3판, fix 1 · fix 2 절)가 이미 넣은 검사(규칙 이름 teach-differ · speaking-question · ask-role · recap-line · teach-type · teach-layout · slot-seconds · recap-evidence · checkSpareShape · 글로서리 · 범위 · 문법 용어)는 다시 만들지 않고, 그 위에 남은 것만 더한다. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. 통합 · e2e 는 못 돌린다.

## 할 것(plan 타 표)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/speaking/meaning.ts`(제안) | 신규 | **의미 검사 순수 함수**(spec 설계 8 '의미 검사' 문단 그대로): 정규화는 6.2 일치율(`src/core/speech/match-rate.ts`)과 같은 것(소문자 · 축약 펼침 · 문장 부호 빼기 · 동음이의어 묶음)을 가져다 쓰고, 어휘 목록(seed/vocab.json)의 기본형과 forms 는 같은 낱말로 본다. 핵심 낱말은 품사에 function · pronoun 이 없는 낱말. 바른 답에서는 they 뒤의 핵심 낱말, 질문에서는 do 뒤 첫 동사부터의 핵심 낱말을 뽑아 바로잡은 정보 · 틀린 정보를 구한다. 아이 답은 (가) 방향 (나) 핵심 정보(예 질문은 do · it · them 으로 받아도 됨) (다) 부정(not 의 범위) (라) 틀린 정보 넷을 모두 채워야 맞다. 결과는 plan 이름 표의 `judge.meaning`("ok" · "direction" · "key" · "negated" · "wrong_info") 꼴. 입력은 질문 · 바른 답 · 아이 답 · 낱말 품사 표(plan 정한 것 7 — 세션 자료가 싣는 표와 검증기가 읽는 vocab 이 같은 꼴)다. 묶음 다 가 그대로 가져다 쓴다 |
| `src/core/seed/check-teach.ts`(또는 그 이웃) | 수정 | 남은 검사: (7) 짝 · 같이 해 보기의 정답 검사(answerNo 가 보기 안, 쓰기 조립의 허용 정답이 남은 카드로 놓이는지, 빈칸마다 올바른 카드 — fix 1 의 I2 · teach-layout 이 못 보는 부분만) (8) 말하기 질문의 바른 답 · 허용 답(accepted · acceptedMeaning)이 그 문항의 의미 검사를 통과하고, 아니요 질문의 질문 글에 틀린 정보 낱말이 있다(fix 3). 그 밖에 plan 타 표 (1)~(6)에서 fix 1 이 이미 넣은 것은 뺀다(보고에 '이미 있음' 표시로 하나씩) |
| `src/core/seed/solve-check.ts` | 수정 | 정답이 있는 같이 해 보기 · 짝을 풀이 대상에 넣고, 한 수업의 짝은 한 호출로 푼다(06 풀이 검사 규칙). 실호출은 하지 않는다(요청자 키, 자-2 에서 컨트롤러가 돌림) — 대상 고르기 · 요청 묶기 · 결과 대조만 단위로 |
| `tests/unit/speaking-meaning.test.ts`(제안) · `seed-validator-teach.test.ts` · `solve-check.test.ts` | 신규 · 수정 | 의미 검사: 정규 시드 셋 말하기 수업의 바른 답 · 허용 답 전부(시드 파일을 읽어서, 생성 수업이 들어오면 함께 돎)가 통과; plan 증명 절 '말하기 질문 판정의 증명'의 부정 예문(방향 · 핵심 정보 · 부정 · 틀린 정보, 일치율이 문턱을 넘는 글 포함)과 긍정 예문('They drink milk, not juice.' 등)이 뜻한 대로 갈림. 검증기: 새 검사마다 어긴 가짜 시드 조각이 오류로 걸리고 원본 셋은 통과. 풀이 대상 · 한 호출 |

## 지키는 것
- 원본 정규 시드 셋이 그대로 통과해야 한다. 새 검사가 원본 시드를 막으면 시드를 고치지 말고 보고에 적는다(학습 설계자 몫). 경고 우회 · 걷은 사본 금지(C182 (4)).
- 설계 숫자 코드 금지(문턱은 speaking.answer_match_pass 등 설정 키). 식별자 영어. 규칙 이름은 기존 꼴(kebab-case)로.
- 이야기 낱말 검사가 낱말 원형(eats ↔ eat)까지 받는 지금 동작은 그대로 둔다(컨트롤러 결정: 의미 검사의 '기본형과 forms 는 같은 낱말' 규칙과 같은 결).
- 다른 묶음 파일(세션 · 화면 · 음성 층 · 시드 JSON · specs)은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(CI 꼴) · `pnpm seed:validate --areas reading,writing,speaking`(종료 0 · 실패 0) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호 — C184 반영 보고의 대응표). 보고 `task-teach-ta-report.md`(40줄 안): 더한 검사(규칙 이름 · 이미 있던 것 표시) · 의미 검사 함수의 입력 꼴 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:1x): 델타 → 정본 15절 번호(C184 반영 보고 대응표): 1a~1d → AC-22a~d · 2a~2d → AC-3c~3f · 2e → AC-4d · 3a~3c → AC-3g~3i · 4a 4b → AC-3j 3k · 4c 4d → AC-5i 5j · 5a 5b → AC-3l 3m · 6a~6g → AC-22e~k · 7a~7c → AC-6f~6h · 8a 8b → AC-22l m · 9a → AC-22n · 10a → AC-22o · N1~N4 → AC-N18~N21. 시험 이름은 정본 번호로.
