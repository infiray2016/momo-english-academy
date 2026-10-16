# fix 1 보고: P9b AI 호출 넷(implementer impl-p09a 이어 하기, 2026-10-17 03:0x)

상태: DONE

검토 `review-p09b.md`(Changes requested, C 0 · I 3 · M 5)의 지적 여덟을 브리프 `task-p09b-fix1.md` 판정대로 모두 고쳤다. 시험을 먼저 더했다. 고치기 전에 여섯 시험이 실패했다(I-1 · I-2 · I-3 · M-2 · M-3 · M-5). M-4 멱등 시험은 지금 코드에서 처음부터 통과했다. 지금 동작을 계약으로 굳히는 시험이다. I-3 시험은 처음 입력(보기 넷)이 엄격 규격에서 먼저 걸려, 보기 셋으로 고친 뒤 확인했다. 검증을 고치기 전 꼴(`value.done` 만)로 되돌리니 실패했고, 되돌렸다. 커밋 · 공용 파일 · plan · 정본 · 실제 호출은 없다.

## 지적마다

| 번호 | 판정 | 파일:줄 | 무엇을 · 시험 |
|---|---|---|---|
| I-1 | ADDRESSED | `src/core/ai/calls/common.ts:170~181` | `firstSentence` 는 `splitSentences` 조각 가운데 처음으로 한글이 든 조각까지를 공백으로 잇고, 한글이 없으면 첫 조각을 쓴다. 시험 "6.4 한 문장: 따옴표 속 영어 인용이 있어도 한국어 문장까지 남긴다"(normalize.test.ts:735)가 검토 재현 세 줄과 말하기 피드백 · 쓰기 이유 인용 사례를 본다 |
| I-2 | ADDRESSED | `src/core/ai/mask.ts:20~37` · `:168~177` · `src/core/ai/output-check.ts` 앱 연락처 묶음 | 전화번호를 `(^|[^0-9])(0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4})(?![0-9])` 로 바꾸고 첫 묶음을 되돌려 넣는다. `BUILTIN_CONTACT_PATTERNS` 는 `{ source, keepsPrefix }` 꼴이 되었고, 출력 검사는 걸린 글로 2번 묶음을 쓴다. 연락처 먼저 차례는 그대로다. 시험은 '6.1 가림: 전화번호 …' 안의 `Ganada010-1234-5678` → `{NAME}***` 과 `call01012345678` → `call***` 이다. '1010-1234-5678 그대로'도 계속 통과한다 |
| I-3 | ADDRESSED | `src/core/ai/calls/thinkout.ts:200~205` | `validate(value, _input, rules)` 가 `value.done \|\| rules.lastTurn` 으로 본다. 시험 "6.2 생각 꺼내기: 마지막 턴에 done 거짓 · 요약 빈 응답은 검증에 걸린다"(normalize.test.ts:779) |
| M-1 | ADDRESSED | `writing.ts:28` SCORE_RANGE · 89줄 근처 보기 범위 · 루브릭 설명 · 채점 규칙, `speaking.ts:28~29` SCORE_RANGE · JUDGEMENT_LIST · 판정 설명 · 판정 규칙 · 점수 설명 · 채점 규칙 | 글로 박힌 '1-2' · '1-4' · 'correct, partial or retry' 를 모두 `structure.ts` 상수(WRITING_CHECK_DISTRACTORS · AI_SCORE · SPEAKING_JUDGEMENTS)로 끼워 넣었다. `calls/` 에 그 글자가 남지 않은 것을 grep 으로 확인했다 |
| M-2 | ADDRESSED | `thinkout.ts:100~113` assertTurn · `:150` rulesOf · `:173~197` messages | 턴 번호는 `input.turn` 하나다. `turn !== history.length + 1` 이면 rulesOf · messages 가 던진다. 마지막 턴 말은 `turn === input.turn` 인 사용자 메시지에만 붙는다. 시험 "6.1 요청: 생각 꺼내기 턴 번호는 입력의 turn 하나이고 기록 수와 어긋나면 던진다"(ai-request.test.ts:266) |
| M-3 | ADDRESSED | `speaking.ts:166~182` · `:337~339` · `:443~445`, `writing.ts:178~186` · `:384~387` | 빈 바른 답은 `seedCorrectAnswer ?? ""` 이다(다르게 한 것 11 을 이렇게 바꿈). 문법 지적은 빈 글을 거른 뒤 자른다. 빈 고칠 곳(원문 · 바른 표현 · 이유) · 빈 교정은 버린다. 빈 피드백(질문 답 · 발표 · 확인 질문 답)은 칭찬과 같이 null 이다. 시험 "6.2 빈 글: …"(normalize.test.ts:799) |
| M-4 | ADDRESSED | 시험만 | "6.1 정규화는 멱등이다: 여섯 규격 모두 normalize 두 번이 한 번과 같다"(normalize.test.ts:864). 일곱 사례로 여섯 규격과 생각 꺼내기 묻는 턴 · 마지막 턴을 본다. P9c 가 엄격 통과 값에도 normalize 를 돌리는 계약이다 |
| M-5 | ADDRESSED | `output-check.ts:17~26` · `:85` · `writing.ts:193~199` · `:399~405` | `CheckField.checkLength?: boolean`(기본 참)을 두고, 쓰기 확인 · 첨삭 원문 칸은 거짓이다. 금지어 · 연락처 검사는 그대로다. 시험 "6.4 출력 검사: 아이 글을 인용한 원문 칸은 길이 검사를 하지 않는다"(normalize.test.ts:926)는 상한보다 긴 원문 인용이 버려지지 않는지와 금지어는 원문에서도 걸리는지를 본다 |
| 알림(선택) | 반영 | `tests/fixtures/ai/sample-inputs.ts` SAMPLE_ADDRESS · SAMPLE_CONTACT_PATTERNS | 견본 contact 정규식에 주소 꼴 `\d{1,4}동 ?\d{1,4}호` 를 더했다. 생각 꺼내기 견본 답에 `101동 202호` 를 넣어, AC-N4 생각 꺼내기 시험이 주소도 본문에서 사라졌는지 보게 했다(통과) |

## 시험 수

| 묶음 | fix 전 | fix 뒤 |
|---|---|---|
| 단위 `pnpm test` | 228 | 234(normalize 15 → 20 · ai-request 6 → 7, mask 는 기존 시험 안에 두 줄) |
| 통합 `pnpm test:int` | 30 | 30 |
| spec-trace missing-test | 52 | 52 |

## CI 순서 명령

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 393ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 88 files in 64ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  234 passed (234)` |
| `pnpm test:int` | 0 | `Tests  30 passed (30)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (49 modules, 133 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 52` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `grep -rn "sk-ant-" src tests` | — | 바탕의 `check-bundle.test.ts:58` 주석 1건뿐, 이 작업 파일 0건 |

이스케이프는 바이트로 확인했다. `common.ts:170` · `mask.ts:47` 의 한글 범위는 `가-힣` 이다. 새 정규식 글은 `\\d` 꼴이다.

## 다르게 한 것

1. **앱 연락처 정규식의 꼴을 바꿨다.** `BUILTIN_CONTACT_PATTERNS` 가 글 목록에서 `{ source, keepsPrefix }` 목록이 되었다(I-2 의 앞 글자 되돌리기를 정규식마다 알아야 해서다). 시드 contact 정규식은 지금처럼 글이고 `keepsPrefix: false` 로 다룬다.
2. **턴 검사를 두 곳에 둔다.** `assertTurn` 을 `messages` 와 `rulesOf` 에서 부른다. P9c 가 rulesOf 를 먼저 부르므로 어긋남을 일찍 알린다.

## 검토자에게 알릴 것

1. **`firstSentence` 는 한글이 든 첫 조각까지 잇는다.** 영어 조각이 둘 이상 앞서면 그것들도 남는다(예: `"A. B. 라고 했어요."` → 그대로). 6.2 '한 문장'보다 길 수 있으나 한국어가 사라지지 않는 쪽을 골랐다(브리프 판정 그대로).
2. **빈 피드백 null 은 그 시도를 '필수 칸 없음'으로 만든다.** 엄격 규격(min 1)이 먼저 걸려 1회 다시 요청한 뒤의 일이다(6.1).
