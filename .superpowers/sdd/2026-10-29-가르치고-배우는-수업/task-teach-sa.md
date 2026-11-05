# 브리프: 가르치고 배우는 수업 plan 묶음 사 — 되짚기 마무리 줄 고르기 순수 함수(구현자 · Opus · high, 2026-10-30 01:3x 작성, 나 · 다 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 160~168줄 '바 · 사 · 아' 표의 사 행(`src/core/session/recap.ts`(제안) recapLineOf · `tests/unit/session-recap.test.ts`(제안))과 증명 표 AC-7b(정본 **AC-6g**)를 구현한다. 근거는 spec 3판 `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 5(되짚기: 마무리 줄 둘 closeKo · closeKoPracticed 가운데 teach.goals 첫 목표(핵심 can-do)에 이어진 혼자 문항마다 해냄 · 독립 · U 를 정하고, 유효 독립 해냄 수가 lesson.recap_min_evidence 이상이고 비율이 lesson.recap_can_ratio 이상일 때만 closeKo, 아니면 closeKoPracticed — C174 (5) · C175 (4) · C177 조건 (1) · C182) · 설계 8('의사소통 정답은 되짚기의 독립 해냄에 넣지 않는다' · '읽어 주기 · 뜻 보기 도움은 독립 아님') · FR-7 · 정본 02-3 3.8 '수행 근거' 문단 · 04 '수행 근거 칸'(validity · assist 값 이름), 묶음 나(시도 꼴 판 2) · 다(judge · communicative · expressionDone · aid) 보고의 실제 꼴. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/session/recap.ts`(제안) | 신규 | 순수 함수 `recapLineOf({ goals, attempts, settings })`(제안): teach.goals 첫 목표에 이어진 혼자 문항(과 그 짝)마다 (가) 해냄 — 첫 시도 정답(accepted 쪽; 의사소통 정답 acceptedMeaning 은 해냄이 아님) (나) 독립 — 읽어 주기 · 뜻 보기 · '왜' 뒤 다시 · 같이 해 보기 같은 도움 없음(assist none) (다) U — 건너뜀 · 'AI 쉬는 중' · 소리 없음 · 기술 오류(validity technical) · 상한으로 짝을 못 낸 문항은 분모에서 뺌. 유효(U 아님) 독립 기회 수 ≥ lesson.recap_min_evidence 이고 (독립 해냄 ÷ 유효 기회) ≥ lesson.recap_can_ratio 면 closeKo, 아니면 closeKoPracticed. 결과는 { line: "closeKo" \| "closeKoPracticed", evidence: { valid, done, ratio } } 꼴로 결과 화면(라-4)이 읽는다 |
| `src/server/session/result.ts` | 수정(작게) | 결과 자료에 recapLineOf 결과를 싣는 자리만(화면 조각은 라-4). 묶음 나 · 다 가 놓은 꼴을 바꾸지 않는다 |
| `tests/unit/session-recap.test.ts`(제안) | 신규 | AC-6g 합성 경우: U 빼고 하나만 남음 · U 가 많음(→ practiced) · 읽어 주기 쓴 해냄(독립 아님) · 'Yes, they do.'(의사소통 정답 — 해냄 아님) · 상한으로 짝을 못 낸 문항(분모 뺌) · 문턱을 넘으면 closeKo · 문턱 값은 설정에서(숫자 코드 금지) |

## 지키는 것
설계 숫자 코드 금지(recap_min_evidence · recap_can_ratio 설정 키). DB 의존 없는 순수 함수. 식별자 영어. A9 와 상관없이 의사소통 정답은 독립 해냄에 넣지 않는다(설계 8 끝). 화면 · 다른 묶음 파일은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름 AC-6g). 보고 `task-teach-sa-report.md`(30줄 안): 함수 입력 · 출력 꼴 · 해냄 · 독립 · U 판정 규칙 표 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:3x, 나 검토 M2): 묶음 나 가 communicative · expressionDone 을 judge 안에 두었다(`judge { meaning, bundle?, ai?, final, by, communicative?, expressionDone }`). plan 이름 표도 그렇게 맞췄으니 이 꼴을 쓴다. 또 나 검토 fix 1 로 판 2 칸은 v 2 에서만 받고(판 1 은 거부), 기기 짝 고르기 맥락 공용 함수가 생긴다 — 그 보고(`task-teach-na-report-fix1.md`)를 읽고 시작한다.
