# 구현 브리프: P11a 차례 1 fix 1 — 검토 A1 지적(implementer impl-p11 이어 보기 · Opus · high, 2026-10-18 06:2x)

`review-p11-1-code.md`(rev-p11, **Changes requested** · C 0 · I 1 · M 5)의 I-1 과 M-1~M-4 를 고친다. M-5(꿰맞춤 React key)는 차례 2 가 틀을 다시 쓰며 닫는다 — 손대지 않는다. 워크트리 p11, 커밋 없음. **가지 HEAD 가 6e09901 로 바뀌었다**(P10 78db3a2 합침 — 차례 7 · fix 6 · 7: `tests/e2e/child-size.ts` · `font-size.spec.ts` · `src/server/db/safe-error.ts` `isUniqueViolation` · `data-size-guide` · `data-mic-notice` · 홈 `data-hydrated`). 네 변경은 그대로 있고 합친 뒤 단위 479 · tsc 0 이다. 단위 · tsc · biome 로컬.

## 할 것
1. **(I-1) 건너뛴 시도는 인식 글이 있어도 점수 null · 단어별 정오 `[]`** — `src/core/session/attempt.ts` `appActivityResult` 의 `repeat-*` · `question` 갈래(398~418)에서 `input.skipped !== undefined` 면 `{ score: null, wordResults: [], wordCount }`. 단어 수는 지금처럼 인식 글 낱말 수의 합. `englishSentencesOf` 도 지금처럼 인식 글 수대로. 시험: `tests/unit/session-attempt.test.ts` 276 · 308 이름에서 '인식 글 없이'를 빼고, `heard: [반쯤 맞은 글]` + `skipped: "recognition"` 사례(따라 말하기 · 질문 답 각각)에서 점수 null · 단어별 정오 `[]` · 단어 수는 낱말 수임을 단언. `speaking-judge.test.ts` 문장 수 사례에 인식 글 있는 건너뜀 하나(그것도 셈).
2. **(M-1) 하이픈 · 따옴표 든 단원 단어('yo-yo' · "o'clock")** — `unitWordOf` · `unitWordSpans`(208~238)가 단원 단어 쪽도 `normalizeForMatch` 와 같은 정규화로 견주고, `lemmaLookup` 도 forms 를 같은 꼴로 넣어 'yo-yos' 가 맞게. 시험에 'yo-yo' 든 따라 말하기 사례 하나.
3. **(M-2) 허용 답 기준 경계** — `speaking-judge.test.ts` AC-5f 첫 사례에 일치율 = `speaking.answer_match_pass` 인 사례(k/n = PASS → correct) 와 k − 1(→ false) 둘. 기대값은 구현을 다시 센 값이 아니라 n · k 로 세운 값.
4. **(M-3) 결정 2 시험** — (가) `heard` 한 번 뒤 `aborted` × max_retries → 마지막 판정 `skip`(실패 수가 성공으로 안 지워짐), (나) `start-failed` · 모르는 코드로 max_retries × 2 → `mic-stalled`.
5. **(M-4) 설정 숫자** — `session-attempt.test.ts` 133 · 504 의 `failures: 3` → `TEST_SETTINGS["speech.max_retries"]`; 171 의 `ATTEMPTS_PER_BATCH_MAX > 0` 단언은 지움(차례 2 '대기열: 50개씩 …' 시험이 맡음); `session-preview.test.ts` 246 이름 '6 · 8단계' → 본 것만('6단계') 또는 8단계 꼴을 지어 한 번 더 봄.
6. 확인: `pnpm lint` · `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm check:deps` · `pnpm check:ids`(design-number 새 줄 0). 보고 `task-p11-report.md` '차례 1 fix 1' 절(지적마다 어디를 어떻게 · 시험 수) → SendMessage team-lead 한 줄 → rev-p11 범위 한정 재검토 → Approved 면 차례 2(`task-p11-2.md`, 컨트롤러가 specs · intent 를 문서 가지 최신과 맞춘 뒤 시작 알림).

## 참고(13절 C83, 코드 변화 없음)
7절 '최대 3회 다시 듣는다' · 12절 '다시 듣는 횟수' 글을 구현(실패 수가 speech.max_retries 에 닿으면 건너뜀, 처음 듣기 포함)에 맞춰 고쳤다 — `judge.ts` 의 셈은 그대로 둔다.

## 지킬 것
설계 숫자는 인자 · `TEST_SETTINGS`. core 는 db · next · react 없음. 시도 입력 · 인식 글은 오류 글에 안 넣음. 아이 이름 · 비밀값 없음. 검토가 ✅ 로 본 자리는 바꾸지 않는다.
