# 브리프: UI · UX plan 묶음 0-나 — 앱 오류 화면 · 없는 주소(구현자 · Opus · high, 2026-10-30 00:0x)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185)의 묶음 0-나 를 구현한다. spec 은 `intent/2026-10-29-UI-UX-개선/spec.md`(2판) 설계 4 '필수 (나) 막다른 화면이 없다'(앱 오류 화면 R-52 · 없는 주소 N-15 · N-16) · 설계 6 문구 표. 정본은 8절 '앱 오류' 행(C180). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위 커밋 전: 불편 1차 묶음 64파일 · 시드 규격 작업 · 묶음 0-가 — 모두 그 위에 고친다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. 작업 폴더를 옮기지(cd) 않는다. 통합 · e2e 는 못 돌린다(정적으로만).

## 범위(plan '바뀌는 파일' 묶음 0-나 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/session/app-trouble.tsx`(제안) | 신규 | 앱 오류 판('잠깐 문제가 생겼어요' · 큰 '다시 해 볼래요' · 작은 '홈')과 없는 주소 판('찾는 화면이 없어요' · 큰 '홈'), 문구 표(설계 6) |
| `src/app/(child)/error.tsx` · `src/app/error.tsx` | 신규 | 오류 경계. '다시 해 볼래요'는 router.refresh() 와 reset() 을 한 전환 안에서 부른다. 루트 쪽은 (child) 틀의 오류를 받는다(plan 위험 9) |
| `src/app/not-found.tsx` · `src/app/(child)/not-found.tsx` | 신규 | 없는 주소 판 |
| `src/app/(child)/session/[id]/page.tsx` · `result/[id]/page.tsx` | 수정 | 모르는 세션은 notFound(). 닫힌 세션 · 남의 세션은 지금처럼 그 영역 수업 목록으로(기존 e2e 단언이 깨지면 그 단언만 맞춤, plan 위험 9) |
| 단위 · e2e 시험 | 신규 · 수정 | 오류 판 · 없는 주소 판 조각 시험, e2e 는 정적으로(앱 오류 e2e 는 plan 이 정한 것 6: 시험 DB 설정 행 하나를 지워 던지게 한 뒤 되돌리고 '다시 해 볼래요'를 잼 — 0-마 와 겹치면 0-마 몫으로 두고 적는다) |

묶음 0-가 가 만든 단추 차례 순수 함수(`stuckButtonsOf` 등, `src/components/session/mic-blocked.tsx`)와 문구 꼴을 그대로 쓴다. 디자인 토큰은 지금 것(토큰 바꿈은 묶음 2). 아이 화면 문구는 해요체 · 한 화면 한 행동 · 큰 글자. 설계 숫자 코드 금지. 앱 코드에 시험용 갈래를 두지 않는다.

## 하지 않는 것
0-가(끝남, 검토 중) · 0-다 · 0-라 · 0-마 · 2 이상은 손대지 않는다. `src/core/seed/**` · `specs/` · 시드 · 0-가 파일(mic-blocked.tsx 등은 읽어 쓰기만)은 건드리지 않는다. 커밋하지 않는다.

## 절차 · 관문
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49 넘지 않기) · `pnpm spec:trace --fail-on unknown-ac` 를 돌리고 결과 그대로. 다른 손 때문에 실패하면 고치지 말고 적는다.

## 보고(`task-ux0-na-report.md`, 같은 폴더, 50줄 안)
바뀐 파일(계획과 다른 것 표시) · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
