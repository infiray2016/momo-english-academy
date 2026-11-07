# 브리프: UI · UX plan 묶음 0-가 — 돌아갈 길(막힘 단추 차례 · 쉼 '다시 해 볼래요' · 쉼 한 줄 칸 · 끊김 단추 · 닫힌 카드 다시 확인)(구현자 · Opus · high, 2026-10-29 23:5x)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved, 컨트롤러 C185)의 묶음 0-가 를 구현한다. spec 은 `intent/2026-10-29-UI-UX-개선/spec.md`(2판 approved C179 — 설계 4 '필수 (나) 막다른 화면이 없다' · 4.1 복구 예외 · 설계 6 문구 표 · [승인 UX3] · [승인 UX4]). 정본은 본 저장소 `specs/`(7절 '막힘 화면' 행 · 8절 '아이 화면' · '앱 오류' · '복구 예외' 행 · 정본 밖 문구는 spec 설계 6 표, 13절 C178 · C179 · C180). 코드 워크트리는 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위 커밋 전: 불편 1차 묶음 64파일 — 이 묶음은 그 위에 고친다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. 작업 폴더를 옮기지(cd) 않는다. 통합 · e2e 는 이 Mac 에서 못 돌린다(정적으로 쓰고 tsc · lint 만).

## 범위(plan '바뀌는 파일' 묶음 0-가 표 그대로)
| 파일 | 무엇을 |
|---|---|
| `src/components/session/mic-blocked.tsx` | 막힘 판 조각(제안 `MicBlockedPanel`): 안내 줄 + 큰 '다시 해 볼래요' + 작은 '홈'(onHome). 단추 차례 순수 함수(제안 `stuckButtonsOf` — 막힘은 다시 해 보기가 큼, 쉼은 홈이 큼; UX3) |
| `src/components/session/ai-rest.tsx` | onRetry 를 받으면 큰 '홈' · 작은 '다시 해 볼래요', 안 풀리면 '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요' 한 줄. 카드 아래 한 줄 꼴(제안 `AiRestLine`)(UX4) |
| `src/server/actions/session.ts` | 쉼 다시 확인 액션(제안 `recheckAiRest`): 접근 쿠키 확인 뒤 `aiRestingToday`(ai-gate.ts)를 다시 읽는다. 확인 호출은 1-나 몫 — 지금은 같은 판정 함수만(plan 위험 10) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 막힘 → 막힘 판, 쉼 → onRetry(풀리면 router.refresh 로 같은 활동) |
| `src/components/conversation/talk-frame.tsx` | 막힘 판 단추 차례, 쉼 onRetry(풀리면 끊김 줄의 다시 부를 일을 같은 시도 id 로), 끊김 · 실패 줄은 큰 '다시 해 볼래요'(TALK_TEXT.retry) |
| `src/app/(child)/[area]/placement/placement-flow.tsx` | 막힘 판 단추 차례(판정 전이면 마이크 안내 — 지금 길 그대로) |
| `src/app/(child)/result/[id]/result-view.tsx` · `src/components/conversation/closing-cards.tsx` | 결과 '다음 수업' · 셋째 장 '다음 이야기' 쉼: 큰 단추 자리에 안내 + 큰 '홈' · 작은 '다시 해 볼래요'(풀리면 그 수업 시작) |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` · `past/past-lessons.tsx` | 쉼이면 목록을 그대로 두고 누른 카드 아래 한 줄 칸(기다림 줄 자리)에 쉼 글, 다시 누르면 다시 판정 |
| `src/app/(child)/home-cards.tsx` | '첨삭이 왔어요' 쉼 → 쪽지 아래 한 줄. 닫힌 카드 다시 확인 줄은 막힘 판과 같은 확인(runMicRetry) |
| `tests/unit/ux-recover.test.ts`(새) · `mic-blocked.test.ts` · `speech-feedback.test.ts` · e2e `speech-feedback.spec.ts` · `writing.spec.ts` · `conversation.spec.ts` | 단추 차례 · 쉼 다시 확인 갈래, 바뀐 큰 · 작은 단추 고르개(e2e 는 정적으로만) |

문구는 spec 설계 6 표(정본 밖 문구, C72 · C78 꼴)의 글을 그대로 쓴다. 아이 화면 문구는 해요체 · 한 화면 한 행동 · 큰 글자. 설계 숫자를 코드에 박지 않는다(설정값 · 토큰). 모든 서버 액션은 접근 쿠키 확인(없으면 401).

## 하지 않는 것
묶음 0-나(앱 오류 · 없는 주소) · 0-다(문구 · 이름 바꿈 · ①② 저장) · 0-라(음성 감시 결과) · 0-마(필수 e2e) · 2 이상(토큰 · 디자인)은 손대지 않는다. `src/core/seed/**` · `tests/unit/seed-*` · `tests/e2e/reading.spec.ts` · `specs/` · 시드는 다른 손이 고치고 있으니 건드리지 않는다. 커밋하지 않는다.

## 절차 · 관문
TDD(실패 시험 먼저). 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test`(단위) · `pnpm check:deps` · `pnpm check:ids`(보고 모드 결과 그대로) · `pnpm spec:trace --fail-on unknown-ac`(있으면)를 돌리고 결과를 그대로 적는다. 다른 손의 작업 때문에 실패하는 것(12절 키 · 시드 규격)은 그대로 보고에 적고 고치지 않는다.

## 보고(`task-ux0-ga-report.md`, 같은 폴더, 60줄 안)
바뀐 파일(계획과 다른 것 표시) · 새 순수 함수 이름 · 시험(이름 · 수) · 관문 결과 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
