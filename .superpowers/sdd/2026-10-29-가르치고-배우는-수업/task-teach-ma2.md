# 브리프: 가르치고 배우는 수업 plan 묶음 마-2 — 선생님 고르는 때 당기기 · 첫 화면 읽어 주기 잠금 풀기(구현자 · Opus · high, 2026-10-30 03:5x 작성 — 라-2 검토 Approved 뒤 시작, 라-3 전)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 묶음 마-2 행(27줄: 선생님 고르는 때 당기기 · 첫 화면 읽어 주기 잠금 풀기 | 마-1 · 라-2(session-frame) · UI · UX 4-가 | 코드 + 화면 | 델타 3c → 정본 AC-3i)과 정한 것 11 을 구현한다. 근거는 델타 spec `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 4 '[L3 · 승인됨, C177] 선생님을 고르는 때'와 목소리 표 · 설계 10(읽어 주기 실패 · 새로 고침 · 이어 하기는 감시 길), 정본 `specs/03-화면.md` 선생님 문단(03:9) · '선생님을 골라요' 행(C141 (3) 문구) · 13절 C177 · C130 (2) · (8) 고침이다. 앞 묶음: 라-2(`task-teach-ra2-report.md` — session-frame 의 여는 차례 · 화면 자료 teaching(선생님 · 칭찬 초, readHouseholdTeacher) · 고르지 않은 집은 기본 초상), 마-1(voiceFor · 한국어 감시), UI · UX 4-가(TeacherChoice `src/components/teacher/teacher-choice.tsx` — 회화 틀 talk-frame.tsx:1080 이 choices · speech · rate · onChosen 으로 씀, 둥근 창 꼴 초상), 회화 서버의 선생님 고르기 액션(`src/server/actions/teacher.ts` · `src/server/teacher/index.ts`).

## 할 것
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 세 영역 세션을 여는 차례에 '선생님을 골라요'를 끼운다: 막힘 · 쉼 화면 뒤, 오늘 배울 것 앞(말하기는 그 앞에 마이크 못 씀). 조건은 teach 칸이 있는 수업(정한 것 1 — 선생님이 나오는 수업)이고 집에 고른 선생님이 없을 때뿐이다. 이미 골랐으면 묻지 않고 그 값을 쓴다. 회화의 TeacherChoice 조각을 그대로 쓰고(초상 · '인사 듣기' · '○○ 선생님과 할래요' · 부모 안내 줄 — 문구 TEACHER_TEXT 그대로), 고른 뒤 router.refresh 로 화면 자료(teaching)를 다시 읽어 오늘 배울 것으로 간다. 세션 상태는 바뀌지 않는다(선생님 고르기는 활동이 아니다) |
| `src/server/session/index.ts` | 수정 | 화면 자료에 teacherChoices(회화 view 와 같은 꼴 — 고른 선생님이 없을 때만)를 더한다. 고르기 저장은 회화의 기존 액션을 재사용한다(새 액션 없음). 다른 칸 · 시도 저장 길은 바꾸지 않는다 |
| `src/app/(child)/[area]/lessons/use-lesson-start.ts` | 수정 | 수업 목록 카드 누름(사용자 제스처) 안에서 음성 층의 문서 단위 잠금 풀기를 부른다(정한 것 11 — 클라이언트 이동으로 연 세션의 첫 줄(오늘 배울 것 한국어 줄)이 iPad 사파리에서도 읽히게). 음성 층(`src/lib/speech/*`)에 이미 있는 잠금 풀기 함수를 쓰고, 없으면 거기에 한 함수만 더한다(마-1 · 0-라 규칙 안, 발화 결과는 바꾸지 않음). 같은 문서에서 풀림이 이어진다는 것은 추측이라 음성 점검 항목(장부 L-2)에 적는다. 새로 고침 · 이어 하기로 연 세션은 감시 길(설계 10)대로 단추가 밝아진다 — 바꾸지 않는다 |
| `tests/unit/teach-frame.test.ts`(라-2 파일에 더함) · `tests/unit/lesson-start.test.ts`(있으면) · e2e(정적) `tests/e2e/teacher-choice.spec.ts` · `teach.spec.ts` | 수정 | 정본 AC-3i(델타 3c — 선생님이 나오는 첫 수업에서 한 번 고르고 이미 골랐으면 묻지 않음, 여는 차례 자리) 갈래: 고르지 않은 집 + teach 수업 → 고르기 화면 → 고른 뒤 오늘 배울 것, 이미 고른 집 → 바로 오늘 배울 것, teach 없는 수업 → 고르기 없음, 말하기는 마이크 못 씀이 먼저. 잠금 풀기는 호출 여부 단위 시험(가짜 접점) |

## 지키는 것
- 화면 문구는 TEACHER_TEXT 의 기존 글(chooseTitle '선생님을 골라요' · chooseGreet · chooseParents · chooseGo)만 — 새 문구 금지. 회화 틀(`src/components/conversation/*`)과 TeacherChoice 조각은 고치지 않는다(필요한 props 가 없으면 '요청하는 변경'에).
- 손대지 않는 파일: `src/components/session/speaking.tsx` · `answer/repeat.tsx`(라-3), `src/components/session/teach/*`(라-1), `src/server/session/result.ts` · `result-view.tsx`(라-4), `src/core/session/attempt.ts` 판정 함수, 시드 · specs · `globals.css`. session-frame 은 라-2 검토가 끝난 뒤의 상태 위에서 여는 차례만 고친다.
- 숫자는 설정값, 순수 셈은 teach-frame.ts(라-2)에 더한다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸(세션 cd 금지), 커밋 · push 금지, e2e · 통합은 정적(실행은 11-01 뒤 CI).

## 관문 · 보고
lint · tsc · 단위 · check:deps · check:ids · spec:trace --fail-on unknown-ac. 보고 `task-teach-ma2-report.md`: 바뀐 파일(줄) · 설계와 다르게 한 것 · 시험 이름(AC-3i) · 관문 · 요청하는 변경 · 우려(iPad 잠금 풀기 확인 항목 포함).
