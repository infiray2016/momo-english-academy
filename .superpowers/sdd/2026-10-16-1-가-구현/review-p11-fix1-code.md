# 재검토: P11a 차례 1 fix 1 — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 06:5x, 범위 한정)

대상: 워크트리 `.claude/worktrees/p11`(HEAD 6e09901 — P10 78db3a2 합침) 작업 트리. 범위는 첫 검토 `review-p11-1-code.md` 의 I-1 · M-1 · M-2 · M-3 · M-4(M-5 는 차례 2 가 닫으므로 안 봄). 구현자 보고 `task-p11-report.md` '차례 1 fix 1' 절과 대조했다.
직접 돌린 것: `pnpm check:ids`(design-number 35 · code-setting-unknown 0 · fixture-setting 0, 차례 1 파일에서 나온 줄 0) · `pnpm check:deps`(위반 0). 단위 시험은 다시 돌리지 않았다(구체적 의심 없음, 보고 482 통과).

## 판정: Approved — 다섯 지적 모두 ADDRESSED, 새 결함 0 → 차례 2 로

## 지적별

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 건너뛴 시도 | ADDRESSED | `src/core/session/attempt.ts` `repeatResult`(323~)가 시도 입력 전체를 받아 `texts.length === 0 \|\| input.skipped !== undefined` 면 `{ score: null, wordResults: [], wordCount }`. `questionResult`(358~)도 조건에 `input.skipped !== undefined` 를 더함. 단어 수는 인식 글 낱말 수의 합 그대로. `englishSentencesOf`(`src/core/speaking/judge.ts` 274~290)는 셈이 그대로이고 입력 꼴에 `skipped?` 칸만 더함. 시험: `tests/unit/session-attempt.test.ts` 두 이름에서 '인식 글 없이'를 뺐고(275 · 323, 저장소에 그 글이 더 없음), 반쯤 맞은 인식 글 + `skipped: "recognition"` 사례 둘이 `toEqual({ score: null, wordResults: [], wordCount: 2 })` 로 셋을 한꺼번에 단언한다. `tests/unit/speaking-judge.test.ts` 문장 수 사례에 인식 글 있는 건너뜀이 들어가 기대값이 5 다. 결정 1 의 세 줄(점수 · 단어별 정오 · 문장 수)이 모두 증명됨 |
| M-1 하이픈 · 따옴표 단원 단어 | ADDRESSED | `matchFormOf`(`attempt.ts` 161 — 일치율과 같은 정규화를 빈칸으로 이음)로 `unitWordOf`(214~226)가 표기형 · 원형 · 단원 단어 셋을 같은 꼴로 견준다. `lemmaLookup`(164~179)은 적힌 꼴과 견줌 꼴 둘 다 넣고 둘 다로 찾는다(빈 열쇠는 안 넣음). 따라 말하기 · 조립 · 질문 답은 같은 `unitWordSpans` 를 지나므로 셋 다 고쳐졌다. 시험 '단어별 정오: 하이픈 · 따옴표가 든 단원 단어도 …'(504~)가 'yo-yo' · 'yo yo' · 'yo-yos'(활용형) · "o'clock" 의 맞음과, 빠졌을 때 틀림을 본다. 쓰기 낱말 문항 쪽(원래 꼴 견줌)도 같은 꼴로 견주게 되어 앞과 결과가 같거나 넓다 |
| M-2 허용 답 기준 경계 | ADDRESSED | AC-5f 첫 사례(`speaking-judge.test.ts` 86~107)가 `PASS` 에서 n · k 를 세워(PASS × n 이 정수인 가장 작은 n) 지어낸 낱말 허용 답의 앞 k 개 → 일치율 k/n · 맞음, k − 1 개 → 다시를 단언한다. 기대값은 상수 true · false 와 k/n 이고 구현을 다시 부른 값이 아니다. 지어낸 낱말 'word1' 은 숫자 앞이 글자라 숫자 낱말 바꾸기에 걸리지 않는다(`match-rate.ts` CARDINAL_PATTERN 앞 보기) |
| M-3 결정 2 | ADDRESSED | 새 사례 둘. '들은 뒤의 실패도 …'(285~299)는 들음 뒤 aborted × max_retries → skip, 실패 · 들음 · 실패(합 max_retries) → skip. 'start-failed · 모르는 코드 …'(301~318)는 지어낸 코드 하나 → retry, 네 코드를 돌려 max_retries × 2 번(활동이 바뀌어도) → 마지막 판정 mic-stalled. 동작은 원래 있었으므로 처음부터 초록인 것이 맞다(보고) |
| M-4 설정 숫자 · 빈 단언 · 이름 | ADDRESSED | `session-attempt.test.ts:28` `MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value` 를 133 · 298 · 311 · 349 · 583 이 씀(남은 `failures: 0` · `1` 은 설정과 관계없는 입력 값). `ATTEMPTS_PER_BATCH_MAX` 단언과 가져오기가 없어짐. `tests/unit/session-preview.test.ts:246` 이름이 본 것만 말함('말하기 6단계 … 10단계 …') |

## 새로 깨뜨린 것

없음. 확인한 위험: (1) `matchFormOf` 는 동음이의어 없이 정규화하므로 단원 단어끼리 같은 꼴로 겹치지 않는다(축약 펼침 'it's' → 'it is' 는 'its' 와 다름). (2) `lemmaLookup` 은 먼저 넣은 것이 이기는 규칙 그대로라 앞 동작(적힌 꼴 찾기)이 바뀌지 않는다. (3) 차례 1 파일에서 check:ids design-number 줄 0, 의존 위반 0.

## 범위 밖 관찰

첫 검토의 범위 밖 관찰(7절 · 12절 '다시 듣기 최대 3회' 글)은 13절 C83 으로 정본 글을 구현에 맞췄다고 컨트롤러가 알렸다. 이 재검토에서 정본 글은 다시 보지 않았다.
