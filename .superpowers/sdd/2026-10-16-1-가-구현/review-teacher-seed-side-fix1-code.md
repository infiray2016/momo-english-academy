# 범위 한정 재검토: 회화 선생님 시드 쪽 fix 1(code-reviewer · Opus · xhigh, 2026-10-23 10:0x)

(검토자는 읽기 전용이라 컨트롤러가 답장 요지를 옮겼다.)

**라운드 판정: Approved.** 지난 Important 1 · Minor 3 모두 닫힘. 새 Minor 4(N-1~N-4), Critical · Important 없음. 범위 밖 1(회화 단계 규격 '대화 방식' 칸)은 컨트롤러 결정.

확인: p08 specs = 본 저장소(diff -rq) · 이름 찾기 시험 scratchpad/rv/names2.ts · 규격 글 검사 scratchpad/rv/specs.ts · seed:validate 442 통과 · 규격 파일 오류 0 · check:ids 지난번과 같음(ledger-open 125행) · git stash list 비어 있음.

## 1. 지난 지적
| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 한국어 이름 놓침 | ADDRESSED((나) 길) | check-teacher.ts:58-66 빼는 목록 · :99-120 찾기. 놓친 아홉 꼴 + '토릴' 모두 걸림(seed-teacher.test.ts:103-151), 헛걸림 14꼴 안 걸림 |
| M-1 이름표 대비 짝 | ADDRESSED(장부) | ledger-open 128행 |
| M-2 시험 안 닿는 길 | ADDRESSED | 쓰기 · 말하기 견본 안 걸림 단언(:281-313) · assetExists 갈래 · runValidate 셋째 인자(:553-583) |
| M-3 자산 경로 빈 조각 | ADDRESSED | schema/teachers.ts:22-29 · 시험 :585-596 |
| 지난 범위 밖 1 · 2 | 닫힘 | 규격 파일 '토리' — HEAD 13건(회화 canDo 12 · 주제 1) → 작업 트리 0. 예상 흐름 길이 — C132 (3) · C134 |

## 2. 이번에 볼 것
1. (나) 길 헛걸림 · 놓침 ✅(Minor 둘 — '미남' N-2, '토리이' 빼기 N-1)
2. C132 (2) 회화 행만 봄 ✅(checkTeacherNamesInSpecs check-teacher.ts:154-188 · reference-index.ts:527-529 · 시험 :314-345)
3. C134 새 역할 flow ✅(schema/talk.ts:194 · check-talk.ts:30-38 목록 밖 → 길이 · 형태 check-lesson.ts:398 · 단원 단어 :339 · 통계 check-cross.ts:400-406 · 덮기 :58-68 에서 빠짐, 금지어 · 선생님 이름 · 틀 자리는 그대로, 미션 영어는 prompt 역할 그대로)
4. M-2 · M-3 ✅
5. 새로 깨뜨린 것 없음(442 그대로 · check:ids 같음 · 시험용 나무 canDo '선생님과 …' · 예상 흐름 되돌림 맞음)

## 3. 새 지적(모두 Minor)
- **N-1** 빼는 목록이 앞부분만 맞으면 빼서 '토리이'가 '토리이야기' · '토리이야' · '토리이랑'을 가림(check-teacher.ts:62 · :116 rest.startsWith) — '토리이' · '미나토'를 목록에서 빼고 시험 :136 '토리이 앞에서'를 '걸림' 쪽으로.
- **N-2** 받침 줄임을 모든 받침으로 받아 '미남' · '미납' · '토림' · '리온'이 걸림(check-teacher.ts:105-107, 주석 :96 은 'ㄴ · ㄹ 줄임') — 끝 음절 받침 0 이면 그대로이거나 ㄴ(4) · ㄹ(8)만, 시험에 '미남이야 → 안 걸림'.
- **N-3** 빼는 목록이 코드 상수라 이름이 보통 낱말 앞머리인 선생님(예 '준' → '준비')을 더하면 코드 고침(C130 (1) '항목과 파일만 더하면') — 선생님 화면 plan 때 명단 항목 칸으로 옮김(장부).
- **N-4** C134 의 '받는 검사'와 '미션 영어 그대로'를 단언하는 시험 없음(seed-teacher.test.ts:218-239 는 길이 빠짐만) — 예상 흐름 금지어 · 5단계 미션 영어 길이 상한 · 예상 흐름에만 나온 단원 단어가 덮기 · 단원 단어 확인에서 안 세짐, check-talk.ts:28 주석을 C134 다섯으로.

## 4. 범위 밖 관찰
1. **회화 단계 규격의 '대화 방식'(mode) 칸도 AI 프롬프트로 가는데 C132 (2) 검사 밖** — p13 src/core/ai/calls/talk.ts:381 ["Conversation mode", spec.mode]. HEAD level-specs.json 회화 mode 7행에 '토리'(예 '토리가 상대역')가 있었고 지금 작업 트리는 설계자가 고쳐 0. 다시 들어와도 막을 길 없음 → C132 (2)에 '회화 단계 규격의 대화 방식'을 더하는 결정 한 줄과 6.4 문구 · checkTeacherNamesInSpecs 에 조각 하나.
2. check:ids 남은 것 · p13 합침 순서는 ledger-open 125행 그대로.

## 5. 라운드 판정
Approved. N-1 · N-2 는 다음 손질에, N-3 은 장부, N-4 는 시험 셋과 주석 한 줄. 범위 밖 1은 결정 필요.
