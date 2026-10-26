# 구현 보고: P13d 묶음 d3 — 회화 AI 고정부의 선생님 블록(impl-teacher-d3 · Opus · high, 2026-10-23 13:5x)

상태: DONE. 자리: 워크트리 `.claude/worktrees/p13d`(feature/1a-p13d-teacher, 바탕 f9651ea). 커밋 · push 없음.

## 바뀐 파일(d3 범위만)

| 파일 | 무엇을 |
|---|---|
| `src/core/ai/calls/talk.ts` | `TORI_NAME` 지움. `TalkTeacher` 형(123행) · `TalkTurnInput.teacher`(128행). `teacherBlockOf`(342행 — 6.1 블록 글 그대로)가 `commonRules(teacher)` 첫 줄. 'Never say you are a human.' 바로 뒤 사람의 삶 줄(356행). 스키마 설명 셋(tori_en 'Your English words …' · recast 'The correct sentence you said back …' · self_used_words '… your previous line'), 칸 이름은 그대로. `talkUserMessage` 겹친 꼴(455~470행 — 첫 말이 있으면 `${teacherNameEn} (app): …`). `talkMessages` 가 `input.teacher.nameEn` 을 넘김. `LowLevelCheckOptions.teacherName`(873행)과 낱말 범위의 선생님 이름(886~889행). 머리 주석 · 검사 주석 |
| `src/server/conversation/state.ts` | `talkTeacherOf`(938행 — `state.teacher ?? 명단 첫 항목` → `teacherPromptOf`, 명단이 비면 던짐) · `talkInputOf` 의 `teacher`(1003행). 회화 턴 · 끝맺음 턴이 같이 씀(closing.ts 고치지 않음) |
| `src/server/conversation/turn.ts` | `aiQuestionCheckOf` 에 `teacherName` 인자(568 · 617행) · 보낸 사용자 메시지에 `input.teacher.nameEn`(962행) · 검사 부르는 자리(1065행) |
| `src/server/ai/talk.ts` | N-1: 시도마다 `tellStuck`(290행, 한 번만 알림) · `finishTalk` 가 흘려 보내기 전에 응답의 `stuck` 이 참 · 거짓이면 아직 알리지 않았을 때 먼저 알림(488행). N-4: 하루 안전 상한 닫힘 기록을 `keepTurnOnRecordFailure(…, "회화 안전 상한 기록")` 로 감쌈(676행) |
| `tests/fixtures/ai/sample-inputs.ts` | `SAMPLE_TEACHER`(미나) · `SAMPLE_TEACHER_LEO`(견본 명단 `teacherRoster()` 에서), `talkSample` 기본 `teacher: SAMPLE_TEACHER` |
| `tests/unit/conversation-call.test.ts` | 아래 시험. 기존 `TORI_NAME` · 'Tori (app):' 기대를 선생님 기대로 |
| `tests/unit/talk-stream-call.test.ts` | 이름 고침 + N-1 사례(stuck 참 · 거짓) + 이미 알렸으면 다시 안 알림 |
| `tests/unit/conversation-stream.test.ts` | 이름 고침 하나(N-2 몫) |
| `tests/integration/conversation-call.test.ts` | AC-19d 요청 본문 · N-4 기록 실패 · `talkUserMessage` 새 꼴 |
| `tests/integration/conversation-turn.test.ts` | AC-19d 처음 스냅숏 키 |

## 시험 이름

단위(이 Mac 에서 통과):
- `AC-19d 미나로 만든 회화 턴 시스템 프롬프트 첫머리에 'You are Mina' 와 미나 성격 글이 있고 'Never say you are a human.' 과 사람의 삶을 지어내지 않는 줄이 있으며 'Tori' · 'squirrel' 이 없다`(1 · 4 · 10단계 × 회화 턴 · 끝맺음 턴)
- `AC-19d 같은 입력을 리오로 만들면 시스템 프롬프트의 선생님 블록 밖의 글이 글자까지 같다`
- `AC-19d 출력 스키마 글에 명단 이름 · Tori 가 없고 미나 · 리오에서 같다`
- `AC-19d 첫 사용자 메시지의 이름표가 'Mina (app):'이고 앞 턴이 있으면 이름표 줄이 없으며 요청 본문 어디에도 'Tori' · 'squirrel' 이 없다`
- `AC-19d 실시간 검사는 답 예시 'Hi, Mina!'를 낱말 범위 밖으로 보지 않는다(선생님 영어 이름은 대소문자 없이 범위 안)` — 다른 선생님 이름(Leo)은 범위 밖
- `회화 턴 흐름: 앞 칸이 stuck · tori_en 이 아니면 흘려 보내지 않고 응답 끝에서 한 번에 내보내며 그 전에 막힘 판단을 알린다(rev-p13b N-1)`
- `회화 턴 흐름: 흘려 받는 동안 막힘 판단을 이미 알렸으면 응답 끝에서 다시 알리지 않는다`
- `회화 흘려 받기: 앞 칸이 stuck · tori_en 이 아니면 흘려 보내지 않는다(failed)`(이름만)

통합(쓰기만 — CI 에서 봄, 이 Mac 은 새 Postgres 가 뜨지 않음):
- `AC-19d 회화 턴 요청 본문의 시스템 첫머리는 그 대화 선생님의 블록이고 첫 사용자 메시지 이름표는 그 선생님의 영어 이름이며 'Tori' · 'squirrel' 이 없다`(conversation-call)
- `회화 턴: 하루 안전 상한 닫힘의 기록 쓰기가 실패해도 safety_cap 으로 돌아오고 이름 · 코드만 든 기록 한 줄을 남긴다(rev-p13b N-4)`(conversation-call — ai_calls 쓰기만 던지는 Proxy DB)
- `AC-19d 이어 하는 세션은 처음 스냅숏의 선생님 키(리오)로 고정부를 만들고 스냅숏 키가 명단에 없으면 프로필의 지금 선생님(미나)으로 만든다`(conversation-turn — 리오 집 → 화면 읽기(스냅숏 리오) → 프로필 미나 → 인사 · 대화 턴은 'You are Leo' · 첫 메시지 · 저장된 sentUserMessage 'Leo (app):' → 스냅숏 키 'tori' → 다음 턴 'You are Mina')

## 관문(Node 24 PATH, 워크트리 전체)

```
pnpm exec next typegen && pnpm exec tsc --noEmit   → exit 0
pnpm test                                           → Test Files 88 passed · Tests 924 passed | 6 todo (계약 ai-schemas 포함)
pnpm check:deps                                     → no dependency violations found (211 modules, 1124 dependencies cruised)
pnpm lint                                           → Found 1 error — tests/e2e/conversation.spec.ts format (d4 가 고치는 중인 파일, d3 범위 밖)
pnpm biome ci <d3 파일 열>                          → No fixes applied
pnpm ai:contract --dry-run                          → exit 0(사례 목록만 — 회화 고정부는 출력하지 않아 아래처럼 따로 뽑음)
```

중간에 tsc · lint 에 d4 의 쓰는 중인 화면 파일 오류가 보였다가 d4 가 고친 뒤 tsc 는 0 이 됐다. 남은 lint 한 건은 d4 파일이다.

## 미나 · 리오 고정부 글 차이

스크래치패드 스크립트로 견본 입력(1 · 4단계, 첫 말 있음)의 회화 턴 시스템 · 끝맺음 턴 시스템 · 출력 스키마 JSON · 첫 사용자 메시지를 미나 · 리오로 만들어 `diff` 했다.
- 시스템(회화 턴 · 끝맺음 턴 모두): 다른 줄은 2행 `- You are Mina, … Your personality: Warm and patient. … It never changes the rules below.` ↔ `- You are Leo, … Your personality: Curious and relaxed. …` 하나뿐. 블록 밖은 글자까지 같다.
- 출력 스키마: 같음(이름 · Tori 없음).
- 첫 사용자 메시지: `Mina (app): Hi {NAME}!` ↔ `Leo (app): Hi {NAME}!` 만 다름.
- 'Tori'(대문자 낱말) · 'squirrel': 모든 출력에 0.

## plan 으로 풀리지 않아 정한 것

1. `talkUserMessage` 는 TypeScript 겹친 꼴이다 — `(turn)` 또는 `(turn, openingLine, teacherNameEn)`. 첫 말만 있고 이름이 빠진 부름을 형으로 막는다(plan 값 8 의 세 인자 꼴 그대로).
2. 낱말 범위의 선생님 이름은 그 대화 선생님 하나만이고 소유격 `Mina's` 도 범위 안으로 본다(이름 자리라 {NAME} 과 같은 뜻). 다른 선생님 이름은 범위 밖 그대로다.
3. 1~3단계 AI 질문 검사의 이름은 `state.teacher` 가 아니라 `input.teacher.nameEn` 에서 가져온다 — 드문 길(명단 첫 항목)에서도 고정부와 검사 이름이 같게.
4. N-1 은 흘려 받기 · 끝 내보내기가 같은 `tellStuck`(시도마다 한 번)을 쓴다. 끝맺음 턴(흘려 받지 않음)에는 부르지 않는다.
5. 드문 길에서 명단이 비면 던진다(명단 규격이 `min(1)` 이라 실제로는 나지 않음).

## 우려 · 남은 것

- 통합 셋은 이 Mac 에서 돌리지 못했다(CI 에서 확인 필요). 특히 N-4 시험은 drizzle DB 를 Proxy 로 감싸 `insert(aiCalls)` 만 던지게 했다 — 다른 메서드는 원래 DB 에 묶어 넘긴다.
- AC-19d 의 수동 표본 20 대본은 plan 대로 P13c c4 몫이라 하지 않았다.
- 정본 6절 표 행의 '첫 속성은 tori_en' 문장(rev-p13b N-2 의 정본 몫)은 컨트롤러 정본 편집 몫이라 손대지 않았다.
- 주석의 '토리 차례'(toriRewriteOf 등 그대로 두는 식별자 설명)는 C130 (9) 대로 남겼다.
