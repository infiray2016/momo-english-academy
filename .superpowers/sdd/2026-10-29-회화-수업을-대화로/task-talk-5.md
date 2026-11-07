# 브리프: 회화 plan 묶음 5 — 흐름 핵심 순수 모듈(구현자 · Opus · high, 2026-10-30 08:2x — 묶음 3 과 나란히, 새 파일만)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192) 묶음 5 행(묶음 표 22줄: 토막 · 질문 자리 · 받침 · 이어진 막힘 · 들리지 않음 · 따라가기 · 같은 질문 · 기회 · 참고 턴 · 끝난 길 · move 꼴 — 증명 AC-15g · 15i · 15r · 15s · 15t 단위), 파일 표 '5 · 6 · 7 · 8 · 9 · 흐름 · 호출 · 서버' 절의 묶음 5 행 셋(`src/core/conversation/lesson-flow.ts` · `chances.ts` · `question-check.ts` · `ending.ts` · `move.ts` 신규, spoken.ts · hints.ts · wrap-up.ts · said.ts 는 옮김 · 수정이라 이번엔 새로 필요한 함수만), '이름 · 설정값 · 문구' 절(move 꼴 표 · 이름), 정한 것 5 · 6 · 7 · 11 · 12 · 17 · 18 · 19(흐름 몫), 첫 프리뷰 범위(정한 것 17 — 바닥선 · 1단계 첫 꼴 · 4 · 5단계는 둘째, 이어진 막힘은 세기만)를 구현한다. 설계는 spec 4판 `intent/2026-10-29-회화-수업을-대화로/spec.md` 설계 1~4(네 토막 · 대화 토막 카드 자리와 AI 차례 · 받침 · 바닥선 · 기기 쪽 · 참여 완료 · 끝난 길 · 참여가 거의 없음)와 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록(C189)이다. 시험 이름: `tests/unit/talk-lesson-flow.test.ts` · `talk-chances.test.ts` · `talk-question-check.test.ts` · `talk-ending.test.ts` · `talk-move.test.ts`(제안), 정본 AC 번호.

## 지키는 것(5 · 6 공통)
- **묶음 3 과 나란히 돈다(컨트롤러 08:2x, 요청자 '동시에 할 수 있는 건' 물음).** 묶음 3(impl-talk-3)이 `src/core/seed/schema/{talk,lesson,reference}.ts` · `structure.ts` · `check-*.ts` · `validate.ts` · `src/core/conversation/flow.ts` · `src/core/ai/calls/talk.ts` · `src/server/conversation/*` · `src/components/conversation/*` · 시험 builders 를 고치는 중이다. 이 묶음은 **새 파일만** 만들고 위 파일은 고치지 않는다. 묶음 3 이 아직 안 낸 새 꼴 카드 형이 필요하면 plan '이름 · 설정값 · 문구' 절 · spec 설계 6 의 칸 이름대로 이 묶음 안에 입력 형(인터페이스)을 두고, 묶음 3 이 Approved 되면 그 형으로 바꾸는 한 줄을 보고의 '묶음 3 뒤 할 것'에 적는다. 기존 파일을 옮기거나 바꿔야 하는 몫(5 의 flow.ts → spoken.ts 옮김, 6 의 calls/talk.ts 수정)은 이번에 하지 않고 '묶음 3 뒤 할 것'으로 남긴다.
- 같은 워크트리의 다른 손: 학습 설계자(seed/unit-specs.json), 가르치고 시드 정정(tests/.tmp/), 쓰기 재검토 · 평가 plan(문서). 건드리지 않는다.
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 순수 함수(DB · 화면 없음), 숫자는 설정값(정본 12절 · seed/settings.json — 묶음 1 이 24행을 넣었다), 용어(토막 · 자리 · 기회 · 참여 완료 · 이월), T2 · R2 · 녹음 없음 · AI 는 서버만 · Zod.
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸(세션 cd 금지), 커밋 · push 금지. 로컬 관문 lint · tsc · 단위 · check:deps · check:ids · spec:trace 가 늘 0 이어야 한다(다른 손의 변경으로 깨지면 그 파일은 두고 보고에).

## 관문 · 보고
위 관문. 보고 `task-talk-5-report.md`(같은 폴더): 새 파일 · 내보낸 함수(입력 · 출력) · move 꼴 · 시험 이름(AC 번호) · 관문 결과 · 설계와 다르게 한 것 · '묶음 3 뒤 할 것'(형 바꾸기 · flow.ts 옮김) · 우려. 답은 요지 열 줄 안.
