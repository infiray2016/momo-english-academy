# 브리프: UI · UX 묶음 0-가 코드 검토(검토자 · Opus · xhigh, 2026-10-30 00:0x)

구현자 impl-ux0-ga 의 작업(브리프 `task-ux0-ga.md`, 보고 `task-ux0-ga-report.md`)을 검토한다. 관문은 모두 통과했다고 보고됐다(lint · tsc · 단위 1093 · check:deps · check:ids design-number 49 · spec:trace unknown-ac 0). 계획과 다른 것 둘(범위 밖 `use-lesson-start.ts` 고침, 새 서버 액션 `micCheckSpeech`)과 우려 넷은 보고에 있다.

## 검토 범위(diff 만)
`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d` 에서 묶음 0-가 가 고친 파일만: `src/components/session/mic-blocked.tsx` · `ai-rest.tsx` · `src/server/actions/session.ts` · `src/app/(child)/session/[id]/session-frame.tsx` · `src/components/conversation/talk-frame.tsx` · `src/app/(child)/[area]/placement/placement-flow.tsx` · `src/app/(child)/result/[id]/result-view.tsx` · `src/components/conversation/closing-cards.tsx` · `src/app/(child)/[area]/lessons/lesson-board.tsx` · `past/past-lessons.tsx` · `src/app/(child)/home-cards.tsx` · `use-lesson-start.ts` · 시험(`tests/unit/ux-recover.test.ts` · `mic-blocked.test.ts` · `speech-feedback.test.ts` · e2e `speech-feedback.spec.ts` · `writing.spec.ts` · `conversation.spec.ts`). 보고의 '바뀐 파일' 목록을 정본으로 보고 `git -C <워크트리> diff -- <파일들>` 로 본다. 같은 워크트리의 다른 변경(불편 1차 묶음 64파일 — 검토 A · B Approved, 시드 규격 · 검증기 — 따로 검토 중)은 범위 밖이다. 주의: 1차 묶음 변경과 0-가 변경이 같은 파일에 섞여 있으니, 보고가 적은 '이번에 고친 것'만 판정한다.

## 대조할 설계
- spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 4 '필수 (나) 막다른 화면이 없다'(화면 목록 · 돌아갈 길) · 4.1 복구 예외 · 설계 6 정본 밖 문구 표 · [승인 UX3](막힘은 큰 '다시 해 볼래요' · 작은 '홈', 쉼은 큰 '홈' · 작은 '다시 해 볼래요') · [승인 UX4](쉬는 화면 '다시 해 볼래요' — 다음 확인 시각이 지났을 때만 확인 호출, 1-가는 판정 함수만 다시 읽음, plan 위험 10).
- plan `intent/2026-10-29-UI-UX-개선/plan.md` 묶음 0-가 표 · plan 이 정한 것 1 · 위험 1 · 9 · 10.
- 정본 7절 '막힘 화면' 행 · 8절 '아이 화면' · '앱 오류' · '복구 예외' 행(C180 반영) · 13절 C178 · C179.
- 원칙: 아이 화면 문구 해요체 · 한 화면 한 행동 · 큰 글자, 설계 숫자 코드 금지(설정값 · 토큰), 서버 액션은 접근 쿠키 확인(없으면 401), 녹음 없음, 식별자는 영어.

## 판정할 것
1. 설계 준수: 단추 차례(UX3)가 막힘 · 쉼 · 끊김 · 결과 · 마무리 · 목록 · 홈 자리마다 spec 과 같은가, 쉼 '다시 해 볼래요'가 같은 자리로 돌아오는가(session-frame router.refresh · talk-frame 같은 시도 id · 결과 그 수업 시작), 문구가 설계 6 표 그대로인가, 범위 밖 변경 둘(use-lesson-start.ts · micCheckSpeech)이 필요했고 spec 에 어긋나지 않는가(새 액션의 접근 쿠키 · 비용 0).
2. 품질: 순수 함수(stuckButtonsOf 등)의 시험이 갈래를 다 덮는가, 쉼 다시 확인 액션이 ai_status 를 읽지 않고 판정 함수만 부르는지(1-가 범위), 이어 하기 · 같은 활동 복귀가 저장된 시도 번호를 지키는지, 1차 묶음 코드와의 겹침에서 깨진 것이 없는지, e2e 정적 작성의 고르개 · 단언이 바뀐 단추 꼴과 맞는지, 보고의 우려 넷(쓰기 쉼 e2e 미실행 · home.spec 마이크 확인 · 회화 쉼 e2e 없음 · 쓰기 확인 도중 쉼 뒤 단추 다시 누름) 각각의 심각도.
3. 부작용: 1차 묶음 검토 Approved 였던 동작(건너뜀 안내 · '모름' 안내 · 감시 타이머)이 바뀌지 않았는지, 'AI 쉬는 중' 하루 상한 판정이 그대로인지.

## 보고(`task-ux0-ga-review-report.md`, 같은 폴더, 80줄 안)
Critical · Important · Minor, 근거(파일 · 줄 · spec 절). 근거 없는 지적은 넣지 않는다. 마지막에 Approved / Changes requested 와 fix 항목 번호. 마지막 답은 판정 · C · I · M 수만. 코드를 고치지 않는다. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`, 작업 폴더를 옮기지(cd) 않는다.
