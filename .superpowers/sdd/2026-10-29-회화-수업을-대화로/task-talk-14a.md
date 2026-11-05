# 브리프: 회화 plan 묶음 14-가 — 관찰 쪽 '단원 바로 가기'에 단계 고르기 · 새 회차 열기(구현자 · Opus · high, 2026-11-05 20:3x, 가벼운 루프)

## 맥락
- plan `intent/2026-10-29-회화-수업을-대화로/plan.md` 정한 것 21(62줄): "새 개정 카드는 그 개정으로 시작한 단원 회차에서만 보인다(5절). 그래서 관찰 쪽 '단원 바로 가기'에 단계 고르기와 '그 단원 새 회차로 열기'(시작 개정 = 지금 최신) 갈래를 더한다. 관찰 쪽 전용이라 운영 빌드에 없다." 묶음 14 파일 표(188줄): `src/server/preview/index.ts` · `src/app/dev/teacher-probe/teacher-probe.tsx`.
- 왜 지금: 첫 프리뷰 배포가 20:33 에 끝났고, 요청자가 회화 3단계 단원 1(카드 두 장, 개정 3)을 열려면 시험 프로필의 회화 단계 · 단원을 3단계 단원 1 로 옮기고 그 개정으로 시작하는 새 회차가 있어야 한다. 지금 `jumpUnitForPreviewFor` 는 `PREVIEW_JUMP_LEVEL = 1` 고정이고, 회차가 이미 있으면 그 회차를 그대로 쓴다. 1단계 회화는 둘째 프리뷰까지 닫혀 있다(묶음 12 정한 것 2).
- 지키는 설계: 관찰 쪽 도구는 운영 배포(VERCEL_ENV=production)면 아무것도 쓰지 않는다(`previewToolsAllowed`). 새 규칙을 만들지 않고 단원 들기(`unitEntryOf`, `@/core/profile/start`)의 회차 복사본 · 사건을 다시 쓴다. 아이 이름 · 오류 글을 로그에 내지 않는다. 설계 숫자는 설정값(단계 수 · 단원 수는 `@/core/seed/structure`).
- 세션 기억은 없다. 먼저 `src/server/preview/index.ts` 전체, `src/app/dev/teacher-probe/`(쪽 파일은 운영 빌드에서 빠지는 확장자일 수 있음 — 폴더를 본다), `src/server/actions/teacher-preview.ts`, `unitEntryOf`, 5절 회차 · 시작 개정 칸(`src/db/schema/learning.ts` unit_progress), 기존 시험 `tests/unit/teacher-probe.test.ts` · `tests/integration/teacher.test.ts` 의 jump 몫을 읽는다.

## 할 것
1. **서버.** `jumpUnitForPreviewFor` 입력에 `level`(정수, `isUnitOf(area, level, unit)` 로 검사)과 `newRound`(boolean, 기본 false)를 더한다. `PREVIEW_JUMP_LEVEL` 고정은 없앤다(기본값 1 은 두어도 됨). newRound 가 참이면 그 단원 회차가 있어도 새 회차(round = 마지막 + 1, 시작 개정 = `currentSeedRevision`)를 `unitEntryOf` 와 같은 복사본 규칙으로 넣는다. 거짓이면 지금처럼 있는 회차를 쓴다. 프로필 track 은 `{ level, unit }` 로 바꾼다. 사건 까닭은 `preview_jump` 그대로(oldValue 에 지난 단계 · 단원). 열린 옛 회차 · 그 회차의 진행 중 세션은 건드리지 않는다 — 다만 새 회차를 연 뒤 세션 쪽 · 수업 목록이 어느 회차를 읽는지(최신 회차 기준인지) 코드로 확인해 보고에 적는다.
2. **단원 목록.** `previewUnitsOf(area, level)` 로 단계 매개변수를 받는다. 적재된 자료가 있는 단원만 고르게 하는 것은 범위 밖 — 안내 글 한 줄('자료가 없는 단원은 수업 목록이 비어요')로 대신한다.
3. **관찰 쪽 화면.** 단원 바로 가기에 단계 고르기(1~12, 기본은 지금 그 영역의 단계 또는 1)와 두 단추('그 단원으로' = 있는 회차 쓰기, '새 회차로 열기')를 둔다. 결과 줄에 영역 · 단계 · 단원 · 회차 번호 · 시작 개정 · 새로 열었는지를 적는다. 화면 글은 한국어 해요체.
4. **액션.** `jumpUnitForPreview` 는 입력을 그대로 넘기고 Zod 검사는 서버에서(지금 꼴 유지).
5. **시험.** 단위 `teacher-probe.test.ts`(단계 고르기 · 단추 둘 · 결과 줄), 통합 `teacher.test.ts` 에 level 3 · newRound 참(회차 둘, 둘째 회차 시작 개정 = 최신) · 거짓(있는 회차 재사용) · 운영 배포 refused 경우 — 통합은 이 Mac 에서 못 돌리니 정적(tsc · biome). 단위는 먼저 실패 확인. 관문 biome ci · tsc · `vitest run --project unit` 0.

## 하지 않을 것
- 다른 파일 · 새 갈래 동작 · 시드 · 정본. 커밋 · push(컨트롤러). 개발 DB 쓰기. 환경 파일 값 출력.

## 지키는 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD 87b102d). 명령은 `( cd … && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. 긴 출력은 스크래치패드 파일로. 시험 파일은 있으면 Edit 로만.

## 보고
`task-talk-14a-report.md`(본 저장소 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/`): 바꾼 파일 · 줄, 새 회차 규칙(회차 번호 · 시작 개정 칸 · 복사본), 세션 · 수업 목록이 읽는 회차 확인, 관문, 우려. 답은 요지 다섯 줄 안.
